"""
QR Code Generation & Secure Mobile Session Service.
Strictly requires an externally accessible PUBLIC_APP_URL.
Never generates localhost / development URLs in QR codes.
Persists sessions and supports revocation and expiry checks.
"""
import os
import secrets
import io
import base64
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
import qrcode
from sqlalchemy.orm import Session

class QRService:
    """Manages secure QR mobile monitoring access sessions."""
    
    # In-memory session cache backed by database persistence
    _active_sessions: Dict[str, Dict[str, Any]] = {}
    _runtime_public_url_override: Optional[str] = None

    @classmethod
    def get_configured_public_url(cls) -> Optional[str]:
        """
        Retrieves and validates the configured public application domain.
        Returns None if not configured or if pointing to localhost/private IP.
        """
        raw_url = cls._runtime_public_url_override or os.getenv("PUBLIC_APP_URL", "").strip()
        if not raw_url:
            return None
            
        try:
            parsed = urllib.parse.urlparse(raw_url)
            if not parsed.scheme or parsed.scheme not in ("http", "https"):
                return None
            host = parsed.netloc.lower().split(":")[0]
            if not host:
                return None
            # Strictly reject localhost / private IPs
            blocked_hosts = ("localhost", "127.0.0.1", "0.0.0.0", "::1")
            if host in blocked_hosts or host.startswith("192.168.") or host.startswith("10.") or host.endswith(".local"):
                return None
            return f"{parsed.scheme}://{parsed.netloc}".rstrip('/')
        except Exception:
            return None

    @classmethod
    def is_public_url_configured(cls) -> bool:
        return cls.get_configured_public_url() is not None

    @classmethod
    def set_runtime_public_url(cls, url: str) -> bool:
        """Allows updating the public tunnel URL at runtime from Settings."""
        clean = url.strip()
        if not clean:
            cls._runtime_public_url_override = None
            return True
        try:
            parsed = urllib.parse.urlparse(clean)
            if not parsed.scheme:
                clean = "https://" + clean
                parsed = urllib.parse.urlparse(clean)
            host = parsed.netloc.lower().split(":")[0]
            blocked = ("localhost", "127.0.0.1", "0.0.0.0", "::1")
            if host in blocked or host.startswith("192.168."):
                return False
            cls._runtime_public_url_override = f"{parsed.scheme}://{parsed.netloc}".rstrip('/')
            return True
        except Exception:
            return False

    @classmethod
    def create_session(
        cls,
        asset_type: str, # "BATCH", "TRADITIONAL_STORE", "COLD_STORAGE", "TRUCK"
        asset_id: str,
        asset_title: str,
        expires_in_hours: int = 24,
        custom_public_url: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Creates a new expiring token and generates a QR code image as a base64 PNG data URL.
        Enforces external public domain rule.
        """
        if custom_public_url:
            if not cls.set_runtime_public_url(custom_public_url):
                raise ValueError(
                    f"Invalid custom public URL: {custom_public_url}. Localhost and private IP addresses are strictly rejected."
                )

        public_base = cls.get_configured_public_url()
        if not public_base:
            raise ValueError(
                "Public QR access is not configured. Please configure PUBLIC_APP_URL "
                "with an externally accessible domain or tunnel (e.g., https://your-domain.com or Cloudflare/ngrok tunnel). "
                "Localhost URLs are strictly forbidden."
            )

        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_in_hours)
        target_url = f"{public_base}/monitor/{token}"

        # Render high-contrast QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=3
        )
        qr.add_data(target_url)
        qr.make(fit=True)

        # Crisp Blue / Dark Navy on Pure White
        img = qr.make_image(fill_color="#1E293B", back_color="#FFFFFF")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        qr_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        qr_data_url = f"data:image/png;base64,{qr_base64}"

        session_data = {
            "token": token,
            "asset_type": asset_type,
            "asset_id": asset_id,
            "asset_title": asset_title,
            "target_url": target_url,
            "qr_data_url": qr_data_url,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": expires_at.isoformat(),
            "is_revoked": False,
            "access_count": 0
        }
        cls._active_sessions[token] = session_data

        # Persist to database if db session is provided
        if db is not None:
            try:
                from ..models.models import QRAccessSession
                db_session = QRAccessSession(
                    token=token,
                    asset_type=asset_type,
                    asset_id=asset_id,
                    asset_title=asset_title,
                    target_url=target_url,
                    qr_data_url=qr_data_url,
                    is_revoked=False,
                    expires_at=expires_at
                )
                db.add(db_session)
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Warning: Failed to persist QRAccessSession to DB: {e}")

        return session_data

    @classmethod
    def verify_and_get_session(cls, token: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """Validates token, checks expiry, and increments access counter."""
        sess = cls._active_sessions.get(token)
        
        # If not in memory, check DB
        if not sess and db is not None:
            try:
                from ..models.models import QRAccessSession
                db_rec = db.query(QRAccessSession).filter_by(token=token).first()
                if db_rec:
                    sess = {
                        "token": db_rec.token,
                        "asset_type": db_rec.asset_type,
                        "asset_id": db_rec.asset_id,
                        "asset_title": db_rec.asset_title,
                        "target_url": db_rec.target_url,
                        "qr_data_url": db_rec.qr_data_url,
                        "created_at": db_rec.created_at.isoformat(),
                        "expires_at": db_rec.expires_at.isoformat(),
                        "is_revoked": db_rec.is_revoked,
                        "access_count": 1
                    }
                    cls._active_sessions[token] = sess
            except Exception as e:
                print(f"Warning: Failed to load QR session from DB: {e}")

        if not sess:
            return None
            
        if sess.get("is_revoked"):
            return None
            
        expires_at = datetime.fromisoformat(sess["expires_at"])
        if datetime.now(timezone.utc) > expires_at:
            return None
            
        # Check if bound batch is deleted
        if db is not None:
            try:
                from ..models.models import ProduceBatch
                # Check by batch_code or asset_id
                batch = db.query(ProduceBatch).filter(ProduceBatch.batch_code == sess["asset_id"]).first()
                if batch and batch.is_deleted:
                    return None
            except Exception:
                pass

        sess["access_count"] = sess.get("access_count", 0) + 1
        return sess

    @classmethod
    def revoke_sessions_for_batch(cls, batch_code: str, db: Optional[Session] = None):
        """Revokes all QR sessions associated with a specific batch code."""
        # Revoke in-memory sessions
        for tok, s in list(cls._active_sessions.items()):
            if s.get("asset_id") == batch_code:
                s["is_revoked"] = True

        # Revoke in database
        if db is not None:
            try:
                from ..models.models import QRAccessSession
                sessions = db.query(QRAccessSession).filter(QRAccessSession.asset_id == batch_code).all()
                for s in sessions:
                    s.is_revoked = True
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Warning: Failed to revoke DB sessions for batch {batch_code}: {e}")

    @classmethod
    def revoke_session(cls, token: str, db: Optional[Session] = None) -> bool:
        """Revokes an active QR access token."""
        found = False
        if token in cls._active_sessions:
            cls._active_sessions[token]["is_revoked"] = True
            found = True
            
        if db is not None:
            try:
                from ..models.models import QRAccessSession
                db_rec = db.query(QRAccessSession).filter_by(token=token).first()
                if db_rec:
                    db_rec.is_revoked = True
                    db.commit()
                    found = True
            except Exception as e:
                db.rollback()
                print(f"Warning: Failed to revoke QRAccessSession in DB: {e}")
                
        return found
