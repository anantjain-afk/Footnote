"""Exercise the real FastAPI auth dependency with locally signed user tokens."""
import json
import os
import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import jwt
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

with patch.dict(os.environ, {"DEBUG": "false", "GROQ_API_KEY": "test", "TAVILY_API_KEY": "test", "FIRECRAWL_API_KEY": "test"}):
    from backend.core import auth


class AuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.private_key = ec.generate_private_key(ec.SECP256R1())
        cls.jwk = json.loads(jwt.algorithms.ECAlgorithm.to_jwk(cls.private_key.public_key()))
        cls.jwk.update(kid="test-key", alg="ES256", use="sig")
        app = FastAPI()

        @app.get("/private")
        def private(user=Depends(auth.get_current_user)):
            return {"id": user.id}

        cls.client = TestClient(app)

    def setUp(self):
        self.project = "https://example.supabase.co"
        self.subject = str(uuid4())
        self.config = patch.object(auth, "settings", SimpleNamespace(
            supabase_url=self.project, supabase_jwt_secret="legacy-test-secret",
        ))
        self.config.start()
        self.fetch = patch.object(jwt.PyJWKClient, "fetch_data", return_value={"keys": [self.jwk]})
        self.fetch.start()
        if hasattr(auth, "get_jwks_client"):
            auth.get_jwks_client.cache_clear()
        self.addCleanup(self.config.stop)
        self.addCleanup(self.fetch.stop)

    def token(self, algorithm="ES256", **overrides):
        claims = {
            "sub": self.subject, "email": "test@example.com", "role": "authenticated",
            "iss": f"{self.project}/auth/v1", "aud": "authenticated", "exp": int(time.time()) + 300,
        }
        claims.update(overrides)
        claims = {k: v for k, v in claims.items() if v is not None}
        key = self.private_key if algorithm == "ES256" else "legacy-test-secret"
        return jwt.encode(claims, key, algorithm=algorithm, headers={"kid": "test-key"})

    def request(self, token):
        return self.client.get("/private", headers={"Authorization": f"Bearer {token}"})

    def test_es256_user_can_access_backend(self):
        response = self.request(self.token())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["id"], self.subject)

    def test_legacy_hs256_still_supported(self):
        self.assertEqual(self.request(self.token("HS256")).status_code, 200)

    def test_invalid_claims_are_rejected(self):
        for claims in [
            {"exp": int(time.time()) - 60}, {"exp": None}, {"iss": "https://other.supabase.co/auth/v1"},
            {"aud": "other"}, {"sub": "not-a-user-id"}, {"role": "anon"},
        ]:
            for algorithm in ["ES256", "HS256"]:
                with self.subTest(claims=claims, algorithm=algorithm):
                    self.assertEqual(self.request(self.token(algorithm, **claims)).status_code, 401)

    def test_bad_signature_is_rejected(self):
        other_key = ec.generate_private_key(ec.SECP256R1())
        claims = jwt.decode(self.token(), options={"verify_signature": False})
        token = jwt.encode(claims, other_key, algorithm="ES256", headers={"kid": "test-key"})
        self.assertEqual(self.request(token).status_code, 401)

    def test_missing_or_malformed_token_is_rejected(self):
        self.assertEqual(self.client.get("/private").status_code, 401)
        self.assertEqual(self.request("not-a-jwt").status_code, 401)

    def test_query_token_does_not_authenticate(self):
        self.assertEqual(self.client.get("/private", params={"token": self.token("HS256")}).status_code, 401)


if __name__ == "__main__":
    unittest.main()
