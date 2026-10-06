"""Check authentication and ownership at the actual application routes."""
import os
import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
from fastapi.testclient import TestClient

with patch.dict(os.environ, {"DEBUG": "false"}):
    from backend.main import app
    from backend.core import auth
    from backend.core.database import get_db


class ProtectedRouteTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.session_id = str(uuid4())
        self.owner_id = str(uuid4())
        self.other_id = str(uuid4())
        self.database_calls = 0
        self.config = patch.object(auth, "settings", SimpleNamespace(
            supabase_url="https://example.supabase.co", supabase_jwt_secret="test-secret",
        ))
        self.config.start()
        self.addCleanup(self.config.stop)
        self.addCleanup(app.dependency_overrides.clear)

        test_case = self

        class Database:
            async def fetchrow(self, query, *args):
                test_case.database_calls += 1
                test_case.assertIn("user_id=$2", query)
                test_case.assertEqual(args, (test_case.session_id, test_case.other_id))
                return None  # This session belongs to owner_id, not other_id.

        async def database():
            yield Database()

        app.dependency_overrides[get_db] = database

    def headers(self, user_id):
        token = jwt.encode({
            "sub": user_id, "role": "authenticated", "exp": int(time.time()) + 300,
            "iss": "https://example.supabase.co/auth/v1", "aud": "authenticated",
        }, "test-secret", algorithm="HS256")
        return {"Authorization": f"Bearer {token}"}

    def requests(self):
        base = f"/api/sessions/{self.session_id}"
        return [
            ("get", "/api/sessions", None), ("post", "/api/sessions", {"topic": "test"}),
            ("get", base, None), ("delete", base, None), ("get", base + "/stream", None),
            ("get", base + "/chat", None), ("post", base + "/chat", {"message": "test"}),
            ("post", base + "/chat/stream", {"message": "test"}),
        ]

    def test_unauthenticated_requests_do_not_acquire_database_connection(self):
        async def forbidden_database():
            self.fail("Unauthenticated request acquired a database connection")
            yield  # Make this a dependency generator.

        app.dependency_overrides[get_db] = forbidden_database
        for method, path, body in self.requests():
            with self.subTest(method=method, path=path):
                response = self.client.request(method, path, json=body)
                self.assertEqual(response.status_code, 401, response.text)

    def test_other_user_cannot_read_delete_stream_or_chat(self):
        for method, path, body in self.requests()[2:]:
            with self.subTest(method=method, path=path):
                response = self.client.request(method, path, json=body, headers=self.headers(self.other_id))
                self.assertEqual(response.status_code, 404, response.text)
        self.assertEqual(self.database_calls, 6)


if __name__ == "__main__":
    unittest.main()
