"""Readiness must detect the unavailable quota store before paid requests fail."""
import os
import unittest
from unittest.mock import AsyncMock, patch
from types import SimpleNamespace

import httpx
from redis.exceptions import ConnectionError as RedisConnectionError

with patch.dict(os.environ, {'DEBUG': 'false'}):
    from backend.main import app
    from backend.core.rate_limit import RateLimiter


class ReadinessTests(unittest.IsolatedAsyncioTestCase):
    async def test_readiness_reports_missing_store_outage_and_recovery(self):
        previous = getattr(app.state, 'rate_limiter', None)
        client = SimpleNamespace(eval=AsyncMock(return_value=1))
        app.state.rate_limiter = RateLimiter(None, 'test:readiness', 10, 30, 3600)
        try:
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url='http://test') as http:
                response = await http.get('/health/ready')
                self.assertEqual(response.status_code, 503)
                self.assertEqual(response.json()['checks']['rate_limit'], 'unavailable')
                app.state.rate_limiter.client = client
                response = await http.get('/health/ready')
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['checks']['rate_limit'], 'ready')
                # Probe validates Lua availability without spending any user's quota.
                client.eval.assert_awaited_with('return 1', 0)
                client.eval.side_effect = RedisConnectionError('secret must not escape')
                response = await http.get('/health/ready')
                self.assertEqual(response.status_code, 503)
                self.assertNotIn('secret', response.text)
                client.eval.side_effect = None
                self.assertEqual((await http.get('/health/ready')).status_code, 200)
        finally:
            if previous is None:
                del app.state.rate_limiter
            else:
                app.state.rate_limiter = previous


if __name__ == '__main__':
    unittest.main()
