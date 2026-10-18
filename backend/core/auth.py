"""Verify Supabase user access tokens before granting API access."""
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from .config import settings

security = HTTPBearer(auto_error=False)


class User(BaseModel):
    id: str
    email: str | None = None


@lru_cache(maxsize=4)
def get_jwks_client(project_url: str) -> jwt.PyJWKClient:
    # Refresh automatically when a new key ID appears; bound the cache lifetime.
    return jwt.PyJWKClient(
        f"{project_url}/auth/v1/.well-known/jwks.json", lifespan=600, timeout=10,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> User:
    if not credentials:
        raise HTTPException(401, "Not authenticated", headers={"WWW-Authenticate": "Bearer"})

    project_url = settings.supabase_url.rstrip("/")
    if not project_url:
        raise HTTPException(503, "Authentication is not configured")

    token = credentials.credentials
    try:
        algorithm = jwt.get_unverified_header(token).get("alg")
        if algorithm in ("ES256", "RS256"):
            signing_key = get_jwks_client(project_url).get_signing_key_from_jwt(token)
            expected_algorithm = jwt.algorithms.get_default_algorithms()[algorithm]
            if not isinstance(signing_key.Algorithm, type(expected_algorithm)):
                raise jwt.InvalidTokenError("Signing algorithm mismatch")
            key = signing_key.key
        elif algorithm == "HS256" and settings.supabase_jwt_secret:
            # Compatibility with projects still using the legacy shared secret.
            key = settings.supabase_jwt_secret
        else:
            raise jwt.InvalidTokenError("Unsupported signing algorithm")

        payload = jwt.decode(
            token, key, algorithms=[algorithm], audience="authenticated",
            issuer=f"{project_url}/auth/v1",
            options={"require": ["exp", "sub", "iss", "aud", "role"]},
        )
        if payload["role"] != "authenticated":
            raise jwt.InvalidTokenError("A user access token is required")
        user_id = str(UUID(payload["sub"]))
        email = payload.get("email")
        if email is not None and not isinstance(email, str):
            raise jwt.InvalidTokenError("Invalid email claim")
        return User(id=user_id, email=email)

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Your session has expired. Please sign in again.",
                            headers={"WWW-Authenticate": "Bearer"}) from None
    except jwt.PyJWKClientConnectionError:
        raise HTTPException(503, "Unable to verify your session. Please try again.") from None
    except (jwt.InvalidTokenError, jwt.PyJWKClientError, ValueError, TypeError, AttributeError):
        raise HTTPException(401, "Invalid authentication token",
                            headers={"WWW-Authenticate": "Bearer"}) from None
