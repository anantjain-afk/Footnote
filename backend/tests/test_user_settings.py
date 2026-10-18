"""Per-user key isolation, encryption, and the deep-mode admission check."""

import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from cryptography.fernet import Fernet
from fastapi.testclient import TestClient

with patch.dict(os.environ, {"DEBUG": "false"}):
    from backend.main import app
    from backend.core.auth import User, get_current_user
    from backend.core.database import get_db
    from backend.core import user_settings
    from backend.api import sessions


class MemoryProfiles:
    def __init__(self):
        self.keys = {}
        self.executed = []

    async def fetchval(self, query, user_id):
        assert "public.users" in query
        value = self.keys.get(str(user_id))
        if "IS NOT NULL" in query:
            return value is not None
        return value

    async def execute(self, query, *args):
        self.executed.append(query)
        if query.startswith("INSERT INTO public.users"):
            self.keys[str(args[0])] = args[1]
        elif query.startswith("UPDATE public.users"):
            self.keys[str(args[0])] = None


class UserSettingsTests(unittest.TestCase):
    def setUp(self):
        self.user_id = str(uuid4())
        self.other_id = str(uuid4())
        self.db = MemoryProfiles()
        self.client = TestClient(app)
        self.key = "fc-secret-for-testing"
        config = SimpleNamespace(
            firecrawl_key_encryption_key=Fernet.generate_key().decode(),
            firecrawl_api_key="fc-app-fallback",
        )
        self.config = patch.object(user_settings, "settings", config)
        self.config.start()
        self.addCleanup(self.config.stop)
        self.addCleanup(app.dependency_overrides.clear)

        async def database():
            yield self.db

        app.dependency_overrides[get_db] = database
        app.dependency_overrides[get_current_user] = lambda: User(id=self.user_id)

    def test_settings_api_never_returns_raw_key_and_is_per_user(self):
        response = self.client.post("/api/user/settings", json={"firecrawl_api_key": self.key})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"has_firecrawl_key": True})
        self.assertNotIn(self.key, self.db.keys[self.user_id])
        self.assertEqual(self.client.get("/api/user/settings").json(), {"has_firecrawl_key": True})
        self.assertNotIn(self.key, self.client.get("/api/user/settings").text)

        app.dependency_overrides[get_current_user] = lambda: User(id=self.other_id)
        self.assertEqual(self.client.get("/api/user/settings").json(), {"has_firecrawl_key": False})
        self.assertEqual(self.client.delete("/api/user/settings/firecrawl").json(), {"has_firecrawl_key": False})
        self.assertIsNotNone(self.db.keys[self.user_id])

        app.dependency_overrides[get_current_user] = lambda: User(id=self.user_id)
        self.assertEqual(self.client.delete("/api/user/settings/firecrawl").json(), {"has_firecrawl_key": False})
        self.assertIsNone(self.db.keys[self.user_id])

    def test_invalid_key_response_does_not_echo_input(self):
        invalid = "fc-" + "sensitive" * 100
        response = self.client.post("/api/user/settings", json={"firecrawl_api_key": invalid})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn(invalid, response.text)

    def test_key_selection_and_deep_mode_gate_before_quota(self):
        import asyncio

        self.assertEqual(asyncio.run(user_settings.resolve_firecrawl_key(self.db, self.user_id, "normal")), "fc-app-fallback")
        with patch.object(sessions, "get_rate_limiter", side_effect=AssertionError("quota used")):
            denied = self.client.post("/api/sessions", json={"topic": "test", "mode": "deep_research"})
        self.assertEqual(denied.status_code, 400)
        self.assertIn("Settings → API Keys", denied.json()["detail"])
        self.assertFalse(any("research_sessions" in query for query in self.db.executed))

        self.client.post("/api/user/settings", json={"firecrawl_api_key": self.key})
        self.assertEqual(asyncio.run(user_settings.resolve_firecrawl_key(self.db, self.user_id, "normal")), self.key)
        self.assertEqual(asyncio.run(user_settings.resolve_firecrawl_key(self.db, self.user_id, "deep_research")), self.key)


if __name__ == "__main__":
    unittest.main()
