"""Real Redis tests. Set REDIS_SERVER_BINARY or REDIS_TEST_URL to enable.

An auto-started server binds loopback, uses a temporary directory, and never
persists. External Redis tests only remove keys under a random test prefix.
"""
import asyncio
from contextlib import asynccontextmanager
import os
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
from fastapi import Header, HTTPException
from redis.asyncio import Redis

with patch.dict(os.environ, {"DEBUG": "false"}):
    from backend.main import app, lifespan
    from backend.core.auth import User, get_current_user
    from backend.core.database import get_db
    from backend.core.rate_limit import RateLimiter, RateLimitError, create_rate_limiter


class RedisTests(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        cls.process = None
        cls.url = os.environ.get('REDIS_TEST_URL')
        if cls.url:
            return
        binary = os.environ.get('REDIS_SERVER_BINARY') or shutil.which('redis-server')
        if not binary:
            raise unittest.SkipTest('Set REDIS_SERVER_BINARY or REDIS_TEST_URL for real Redis tests')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.directory = tempfile.TemporaryDirectory(prefix='rate-limit-redis-')
        cls.process = subprocess.Popen([binary, '--bind', '127.0.0.1', '--port', str(port),
            '--save', '', '--appendonly', 'no', '--dir', cls.directory.name],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.url = f'redis://127.0.0.1:{port}/0'
        for _ in range(100):
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=.1):
                    return
            except OSError:
                time.sleep(.05)
        cls.tearDownClass()
        raise RuntimeError('Isolated Redis failed to start')

    @classmethod
    def tearDownClass(cls):
        if cls.process:
            cls.process.terminate()
            cls.process.wait(timeout=5)
            cls.directory.cleanup()

    async def asyncSetUp(self):
        self.prefix = f'test:{uuid4().hex}'
        config = SimpleNamespace(redis_url=self.url, rate_limit_key_prefix=self.prefix,
            rate_limit_reports=10, rate_limit_chat=30, rate_limit_window_seconds=3600)
        with patch('backend.core.rate_limit.settings', config):
            self.limiter = create_rate_limiter()
        self.redis = self.limiter.client

    async def asyncTearDown(self):
        keys = [key async for key in self.redis.scan_iter(f'{self.prefix}:*')]
        if keys:
            await self.redis.delete(*keys)
        await self.redis.aclose()

    async def test_concurrent_clients_share_exact_allowance(self):
        second = Redis.from_url(self.url)
        try:
            other = RateLimiter(second, self.prefix, 10, 30, 3600)
            results = await asyncio.gather(*[
                (self.limiter if i % 2 else other).consume('alice', 'reports') for i in range(50)
            ], return_exceptions=True)
            self.assertEqual(sum(result is None for result in results), 10)
            self.assertTrue(all(result is None or isinstance(result, RateLimitError) and result.status == 429 for result in results))
            await self.limiter.consume('bob', 'reports')
            await self.limiter.consume('alice', 'chat')
        finally:
            await second.aclose()

    async def test_rolling_expiry_and_denials_do_not_renew_ttl(self):
        limiter = RateLimiter(self.redis, self.prefix, 1, 1, 1)
        await limiter.consume('alice', 'reports')
        key = f'{self.prefix}:rate-limit:reports:alice'
        ttl = await self.redis.pttl(key)
        await asyncio.sleep(.1)
        with self.assertRaises(RateLimitError) as denied:
            await limiter.consume('alice', 'reports')
        self.assertEqual(denied.exception.retry_after, 1)
        self.assertLess(await self.redis.pttl(key), ttl)
        self.assertEqual(await self.redis.zcard(key), 1)
        await asyncio.sleep(1)
        self.assertFalse(await self.redis.exists(key))
        await limiter.consume('alice', 'reports')

    async def test_old_entries_leave_window_individually(self):
        key = f'{self.prefix}:rate-limit:reports:alice'
        seconds, micros = await self.redis.time()
        now = seconds * 1000 + micros // 1000
        await self.redis.zadd(key, {'expired': now - 3600001, **{f'recent{i}': now for i in range(9)}})
        await self.limiter.consume('alice', 'reports')
        self.assertEqual(await self.redis.zcard(key), 10)
        with self.assertRaises(RateLimitError):
            await self.limiter.consume('alice', 'reports')

    async def test_real_connection_failure_then_recovery(self):
        # Occupy a loopback port without listening: connection attempts must fail.
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            config = SimpleNamespace(redis_url=f'redis://127.0.0.1:{sock.getsockname()[1]}',
                rate_limit_key_prefix=self.prefix, rate_limit_reports=10,
                rate_limit_chat=30, rate_limit_window_seconds=3600)
            with patch('backend.core.rate_limit.settings', config):
                unavailable = create_rate_limiter()
            try:
                with self.assertRaises(RateLimitError) as error:
                    await asyncio.wait_for(unavailable.consume('alice', 'reports'), timeout=3)
                self.assertEqual(error.exception.status, 503)
            finally:
                await unavailable.client.aclose()
        await self.limiter.consume('alice', 'reports')
        await self.redis.connection_pool.disconnect()
        await self.limiter.consume('alice', 'reports')
        self.assertEqual(await self.redis.zcard(f'{self.prefix}:rate-limit:reports:alice'), 2)


class RouteTests(RedisTests):
    async def asyncSetUp(self):
        await super().asyncSetUp()
        self.patches = []
        self.db = SimpleNamespace(execute=AsyncMock(), fetch=AsyncMock(return_value=[]),
                                  fetchrow=AsyncMock(side_effect=self.fetchrow))
        @asynccontextmanager
        async def transaction():
            yield
        self.db.transaction = transaction
        self.status = 'completed'
        self.report_exists = True
        async def database():
            yield self.db
        async def user(x_test_user: str = Header(default='alice')):
            if x_test_user == 'anonymous':
                raise HTTPException(401)
            return User(id=x_test_user)
        app.dependency_overrides[get_db] = database
        app.dependency_overrides[get_current_user] = user
        app.state.rate_limiter = self.limiter
        self.normal = self.mock('backend.api.sessions.run_research_pipeline', AsyncMock())
        self.deep = self.mock('backend.api.sessions.run_deep_research_pipeline', AsyncMock())
        self.mock('backend.api.sessions.resolve_firecrawl_key', AsyncMock(return_value='test-key'))
        self.legacy = self.mock('backend.api.report.graph.ainvoke', AsyncMock(return_value={'report': 'ok'}))
        result = {'intent': 'ANSWER', 'response': 'ok', 'updated_report': ''}
        async def events(*args, **kwargs):
            yield {'event': 'on_chain_end', 'name': 'LangGraph', 'data': {'output': result}}
        self.graph = SimpleNamespace(ainvoke=AsyncMock(return_value=result), astream_events=events)
        self.builder = self.mock('backend.api.chat.build_chat_graph', unittest.mock.Mock(return_value=self.graph))
        @asynccontextmanager
        async def checkpointer():
            yield None
        self.mock('backend.api.chat.get_checkpointer', checkpointer)
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app, raise_app_exceptions=False), base_url='http://test')

    def mock(self, target, value):
        patcher = patch(target, value)
        self.patches.append(patcher)
        return patcher.start()

    async def fetchrow(self, query, *args):
        if 'research_sessions' in query:
            if args[0] == 'not-owned':
                return None
            return {'id': args[0], 'status': self.status}
        if 'reports' in query:
            return {'content': 'report'} if self.report_exists else None
        raise AssertionError(query)

    async def asyncTearDown(self):
        await self.client.aclose()
        app.dependency_overrides.clear()
        del app.state.rate_limiter
        for patcher in reversed(self.patches):
            patcher.stop()
        await super().asyncTearDown()

    async def test_report_modes_and_legacy_share_quota(self):
        for i in range(10):
            path = '/api/report' if i % 3 == 0 else '/api/sessions'
            response = await self.client.post(path, json={'topic': 'topic', 'mode': 'normal' if i % 2 else 'deep_research'})
            self.assertIn(response.status_code, (200, 201), response.text)
        writes = self.db.execute.await_count
        calls = self.normal.await_count + self.deep.await_count + self.legacy.await_count
        for path in ['/api/sessions', '/api/report']:
            response = await self.client.post(path, json={'topic': 'blocked'}, headers={'Origin': 'http://localhost:5173'})
            self.assertEqual(response.status_code, 429)
            self.assertEqual(response.json()['error'], 'Rate limit exceeded')
            self.assertEqual(int(response.headers['Retry-After']), response.json()['reset_in_seconds'])
            self.assertIn('Retry-After', response.headers['access-control-expose-headers'])
        self.assertEqual(self.db.execute.await_count, writes)
        self.assertEqual(self.normal.await_count + self.deep.await_count + self.legacy.await_count, calls)
        response = await self.client.post('/api/sessions', json={'topic': 'other'}, headers={'x-test-user': 'bob'})
        self.assertEqual(response.status_code, 201)
        self.assertEqual((await self.client.post('/api/sessions/one/chat', json={'message': 'hi'})).status_code, 200)

    async def test_chat_endpoints_and_sessions_share_quota(self):
        for i in range(30):
            suffix = '/stream' if i % 2 else ''
            response = await self.client.post(f'/api/sessions/session-{i}/chat{suffix}', json={'message': 'hi'})
            self.assertEqual(response.status_code, 200, response.text)
        writes = self.db.execute.await_count
        builds = self.builder.call_count
        for suffix in ['', '/stream']:
            response = await self.client.post('/api/sessions/another/chat' + suffix, json={'message': 'blocked'})
            self.assertEqual(response.status_code, 429)
            self.assertIn('application/json', response.headers['content-type'])
        self.assertEqual(self.builder.call_count, builds)
        self.assertEqual(self.db.execute.await_count, writes)

    async def test_invalid_requests_do_not_consume(self):
        for path in ['/api/sessions', '/api/report', '/api/sessions/one/chat', '/api/sessions/one/chat/stream']:
            self.assertEqual((await self.client.post(path, json={})).status_code, 422)
            self.assertEqual((await self.client.post(path, json={'topic': 'x', 'message': 'x'}, headers={'x-test-user': 'anonymous'})).status_code, 401)
        for suffix in ['', '/stream']:
            self.assertEqual((await self.client.post('/api/sessions/not-owned/chat' + suffix, json={'message': 'hi'})).status_code, 404)
            self.status = 'running'
            self.assertEqual((await self.client.post('/api/sessions/one/chat' + suffix, json={'message': 'hi'})).status_code, 400)
            self.status = 'completed'
            self.report_exists = False
            self.assertEqual((await self.client.post('/api/sessions/one/chat' + suffix, json={'message': 'hi'})).status_code, 404)
        self.assertEqual([k async for k in self.redis.scan_iter(f'{self.prefix}:*')], [])

    async def test_outage_blocks_paid_work_reads_continue_and_recovery(self):
        from redis.exceptions import ConnectionError
        with patch.object(self.redis, 'eval', AsyncMock(side_effect=ConnectionError('secret must not be logged'))):
            for path in ['/api/sessions', '/api/report', '/api/sessions/one/chat', '/api/sessions/one/chat/stream']:
                with self.assertLogs('backend.core.rate_limit', level='WARNING') as logs:
                    response = await self.client.post(path, json={'topic': 'x', 'message': 'x'})
                self.assertEqual(response.status_code, 503)
                self.assertNotIn('secret', str(logs.output))
            self.assertEqual((await self.client.get('/api/sessions')).status_code, 200)
            self.assertEqual((await self.client.get('/api/sessions/one/chat')).status_code, 200)
        self.db.execute.assert_not_awaited()
        self.normal.assert_not_awaited()
        self.legacy.assert_not_awaited()
        self.builder.assert_not_called()
        self.assertEqual((await self.client.post('/api/report', json={'topic': 'recovered'})).status_code, 200)

    async def test_failed_paid_work_is_not_refunded(self):
        self.legacy.side_effect = RuntimeError('provider failed')
        response = await self.client.post('/api/report', json={'topic': 'x'})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(await self.redis.zcard(f'{self.prefix}:rate-limit:reports:alice'), 1)


class LifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_missing_redis_starts_and_closes_database(self):
        limiter = RateLimiter(None, 'test', 10, 30, 3600)
        with patch('backend.main.init_db_pool', AsyncMock()), patch('backend.main.close_db_pool', AsyncMock()) as close, patch('backend.main.create_rate_limiter', return_value=limiter):
            async with lifespan(app):
                with self.assertRaises(RateLimitError) as error:
                    await app.state.rate_limiter.consume('alice', 'reports')
                self.assertEqual(error.exception.status, 503)
            close.assert_awaited_once()
        del app.state.rate_limiter

    async def test_closes_redis_even_when_application_raises(self):
        client = SimpleNamespace(aclose=AsyncMock())
        limiter = RateLimiter(client, 'test', 10, 30, 3600)
        with patch('backend.main.init_db_pool', AsyncMock()), patch('backend.main.close_db_pool', AsyncMock()) as close, patch('backend.main.create_rate_limiter', return_value=limiter):
            with self.assertRaises(RuntimeError):
                async with lifespan(app):
                    raise RuntimeError('shutdown')
            client.aclose.assert_awaited_once()
            close.assert_awaited_once()
        del app.state.rate_limiter
