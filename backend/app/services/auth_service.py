"""
Authentication & Access Control Service for ZERO ROOT.
Provides PBKDF2-HMAC-SHA256 cryptographic password hashing,
PyJWT session token issuance and verification, and role-based FastAPI dependencies.

STRICT USER CREATION RULE:
Zero users are preloaded or automatically generated.
Users are only created through explicit user registration or authorized admin creation.
"""
import os
import hmac
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

import jwt
from fastapi import Header, HTTPException, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.models import User, AuditLog

AUTH_SECRET_KEY = os.environ.get("AUTH_SECRET_KEY", "zero-root-production-jwt-auth-key-2026-secure")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

class AuthService:
    """Handles password hashing, token encoding/decoding, and authorization."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations and a 16-byte cryptographically secure salt."""
        salt = secrets.token_bytes(16)
        pwd_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return f"pbkdf2:sha256:100000${salt.hex()}${pwd_hash.hex()}"

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifies plain password against stored PBKDF2 hash using constant-time comparison."""
        try:
            algorithm, salt_hex, hash_hex = hashed_password.split("$")
            salt = bytes.fromhex(salt_hex)
            expected_hash = bytes.fromhex(hash_hex)
            computed_hash = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
            return hmac.compare_digest(computed_hash, expected_hash)
        except Exception:
            return False

    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Encodes user identity payload into a signed JWT."""
        to_encode = data.copy()
        now = datetime.now(timezone.utc)
        expire = now + (expires_delta if expires_delta else timedelta(days=JWT_EXPIRATION_DAYS))
        to_encode.update({"exp": expire, "iat": now})
        return jwt.encode(to_encode, AUTH_SECRET_KEY, algorithm=JWT_ALGORITHM)

    @staticmethod
    def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
        """Validates and decodes JWT token, returning payload or None."""
        try:
            return jwt.decode(token, AUTH_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except (jwt.PyJWTError, Exception):
            return None


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Extracts current user from Authorization header if present, or returns None."""
    if not authorization:
        return None
        
    token = authorization.replace("Bearer ", "").strip()
    payload = AuthService.decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
        
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Requires valid Bearer JWT. Raises 401 if missing, expired, or invalid."""
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in or register.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Requires ADMIN role. Raises 403 Forbidden otherwise."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this account action."
        )
    return current_user

