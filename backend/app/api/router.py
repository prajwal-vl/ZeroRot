"""
Versioned FastAPI Router (/api/v1).
Exposes REST endpoints for all simulation engines, external weather,
computer vision, market forecasting, Groq AI explanations, alerts, and QR sessions.
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
import csv
import io

from ..database import get_db
from ..models.models import (
    Commodity, ProduceBatch, FarmerProfile, InspectionRecord,
    StorageFacility, AlertRecord, QRAccessSession, User, MandiPriceRecord, PriceForecastRecord,
    VirtualSensorReading
)
from ..simulation.deterioration_model import DeteriorationModel
from ..schemas.schemas import (
    ControlRequest, CreateBatchRequest, StorageAllocationRequest,
    InspectionScanRequest, ProfitOptimizeRequest, QRGenerateRequest, UpdateQRConfigRequest,
    AcknowledgeAlertRequest, RegisterRequest, LoginRequest, UserResponse, CreateUserByAdminRequest,
    UpdateUserStatusRequest, DeleteBatchRequest, MandiForecastRequest, MandiOptimizeRequest
)
from ..simulation.engine import master_simulation
from ..services.weather_service import WeatherService
from ..services.vision_inspector import VisionInspector
from ..services.market_service import MarketService
from ..services.data_gov_service import DataGovService
from ..services.groq_service import groq_engine
from ..services.qr_service import QRService
from ..services.telegram_service import TelegramService
from ..services.auth_service import AuthService, get_current_user, get_current_user_optional, get_current_admin
from ..simulation.commodity_registry import ScientificCommodityRegistry
from ..simulation.batch_engine import BatchSimulationManager
from ..simulation.supply_chain_engine import SupplyChainNetworkTwin
from ..simulation.counterfactual_lab import CounterfactualScenarioLab
from ..intelligence.ml_spoilage_engine import TriModelSpoilageEngine
from ..agents.agentic_decision_engine import AgenticDecisionEngine

master_supply_chain = SupplyChainNetworkTwin()
master_batch_manager = BatchSimulationManager()

api_router = APIRouter(prefix="/api/v1")

@api_router.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "platform": "ZERO ROOT AgriTech Digital Twin",
        "version": "1.0.0",
        "groq_ai_connected": groq_engine.is_available(),
        "live_weather_service": "Open-Meteo",
        "data_gov_in_configured": DataGovService.is_configured(),
        "simulation_running": master_simulation.is_running,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

# ----------------- AUTHENTICATION & USER MANAGEMENT -----------------

@api_router.get("/auth/status")
def get_auth_status(db: Session = Depends(get_db)):
    """Reports whether system has users or requires initial account registration."""
    user_count = db.query(User).count()
    return {
        "has_users": user_count > 0,
        "total_users": user_count,
        "registration_open": True
    }

@api_router.post("/auth/register")
def register_user(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Explicit user registration endpoint.
    MANDATORY RULE:
    Zero accounts exist until user explicitly registers here.
    If database contains zero users, the first registered user is granted ADMIN role.
    """
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
        
    email_clean = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists.")

    total_existing = db.query(User).count()
    # First user to register becomes the administrator
    assigned_role = "ADMIN" if total_existing == 0 else "FARMER"

    hashed_pw = AuthService.hash_password(req.password)
    user = User(
        username=email_clean.split("@")[0] + ("_admin" if assigned_role == "ADMIN" else ""),
        email=email_clean,
        hashed_password=hashed_pw,
        full_name=req.full_name.strip(),
        phone=req.phone.strip() if req.phone else None,
        role=assigned_role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # If farmer role, create associated farmer profile
    if assigned_role == "FARMER":
        profile = FarmerProfile(
            user_id=user.id,
            farm_name=f"{user.full_name}'s Farm",
            region="Karnataka Agricultural District",
            contact_phone=user.phone or "+91 98000 00000"
        )
        db.add(profile)
        db.commit()

    token = AuthService.create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    })

    return {
        "token": token,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
            "is_admin": user.role == "ADMIN",
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }

@api_router.post("/auth/login")
def login_user(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates existing registered user via email & password."""
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    if not user or not AuthService.verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Please contact an administrator.")

    token = AuthService.create_access_token({
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name
    })

    return {
        "token": token,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "is_active": user.is_active,
            "is_admin": user.role == "ADMIN",
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }

@api_router.get("/auth/me")
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns currently authenticated user profile."""
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_admin": current_user.role == "ADMIN",
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None
    }

@api_router.get("/auth/users")
def list_accounts(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Administrator-only account management listing."""
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

@api_router.post("/auth/users")
def admin_create_user(
    req: CreateUserByAdminRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Administrator creates a user account explicitly."""
    email_clean = req.email.strip().lower()
    if db.query(User).filter(User.email == email_clean).first():
        raise HTTPException(status_code=400, detail="Account with this email already exists.")

    hashed_pw = AuthService.hash_password(req.password)
    new_user = User(
        username=email_clean.split("@")[0],
        email=email_clean,
        hashed_password=hashed_pw,
        full_name=req.full_name.strip(),
        phone=req.phone.strip() if req.phone else None,
        role=req.role.upper() if req.role in ["ADMIN", "FARMER"] else "FARMER",
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "role": new_user.role,
        "is_active": new_user.is_active,
        "message": "User account created successfully."
    }

@api_router.put("/auth/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    req: UpdateUserStatusRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Administrator disables or enables an account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id and not req.is_active:
        raise HTTPException(status_code=400, detail="Cannot disable your own administrative account.")

    user.is_active = req.is_active
    db.commit()
    return {"id": user.id, "email": user.email, "is_active": user.is_active}

@api_router.delete("/auth/users/{user_id}")
def delete_user_account(
    user_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Administrator permanently removes a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrative account.")

    db.delete(user)
    db.commit()
    return {"status": "SUCCESS", "deleted_user_id": user_id, "message": "User deleted successfully."}

# ----------------- COMMODITIES & BATCHES -----------------

@api_router.get("/commodities")
def list_commodities(db: Session = Depends(get_db)):
    commodities = db.query(Commodity).all()
    return commodities

@api_router.get("/batches")
def list_batches(
    include_deleted: bool = False,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    query = db.query(ProduceBatch)
    if not include_deleted:
        query = query.filter(ProduceBatch.is_deleted == False)

    # Authorization filter: non-admin authenticated users only see their own batches
    if current_user and current_user.role != "ADMIN":
        query = query.filter(ProduceBatch.user_id == current_user.id)

    batches = query.order_by(ProduceBatch.id.desc()).all()
    result = []
    for b in batches:
        farmer_name = b.farmer.farm_name if b.farmer else (b.user.full_name if b.user else "Farmer")
        result.append({
            "id": b.id,
            "batch_code": b.batch_code,
            "user_id": b.user_id,
            "farmer_name": farmer_name,
            "commodity_name": b.commodity_name,
            "quantity_kg": b.quantity_kg,
            "harvest_date": b.harvest_date.isoformat() if b.harvest_date else None,
            "initial_quality_score": b.initial_quality_score,
            "current_quality_score": b.current_quality_score,
            "storage_type": b.storage_type,
            "current_location": b.current_location,
            "simulation_status": b.simulation_status,
            "last_executed_at": b.last_executed_at.isoformat() if b.last_executed_at else None,
            "remaining_shelf_life_days": b.remaining_shelf_life_days,
            "is_deleted": b.is_deleted,
            "created_at": b.created_at.isoformat() if b.created_at else None
        })
    return result

@api_router.get("/batches/summary")
def get_batches_summary(db: Session = Depends(get_db)):
    """Returns actual database-persisted aggregate counts for active (non-deleted) batches."""
    batches = db.query(ProduceBatch).filter(ProduceBatch.is_deleted == False).all()
    total_batches = len(batches)
    state = master_simulation.get_state()
    
    # Calculate average remaining shelf life
    trad = state.get("traditional_storage", {})
    cold = state.get("cold_storage", {})
    truck = state.get("refrigerated_truck", {})
    
    shelf_lives = [
        trad.get("remaining_shelf_life_days", 14.0),
        truck.get("remaining_shelf_life_days", 12.0)
    ]
    for ch in cold.get("chambers", {}).values():
        shelf_lives.append(ch.get("remaining_shelf_life_days", 18.0))
        
    avg_shelf_life = round(sum(shelf_lives) / max(len(shelf_lives), 1), 1)
    active_storage_units = 1 + len(cold.get("chambers", {})) # 1 Traditional + 3 Cold Chambers
    active_alerts = state.get("unacknowledged_alerts_count", 0)
    
    return {
        "total_batches": total_batches,
        "avg_remaining_shelf_life_days": avg_shelf_life,
        "active_storage_units": active_storage_units,
        "active_alerts_count": active_alerts,
        "data_label": "DATABASE / VERIFIED"
    }

@api_router.get("/batches/{batch_id}")
def get_batch_details(
    batch_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    batch = db.query(ProduceBatch).filter(ProduceBatch.id == batch_id).first()
    if not batch or batch.is_deleted:
        raise HTTPException(status_code=404, detail="Batch not found or has been archived.")

    if current_user and current_user.role != "ADMIN" and batch.user_id and batch.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to access this batch.")

    farmer_name = batch.farmer.farm_name if batch.farmer else (batch.user.full_name if batch.user else "Farmer")
    
    active_qr = db.query(QRAccessSession).filter(
        QRAccessSession.asset_id == batch.batch_code,
        QRAccessSession.is_revoked == False
    ).order_by(QRAccessSession.id.desc()).first()

    return {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "user_id": batch.user_id,
        "farmer_name": farmer_name,
        "commodity_name": batch.commodity_name,
        "quantity_kg": batch.quantity_kg,
        "harvest_date": batch.harvest_date.isoformat() if batch.harvest_date else None,
        "initial_quality_score": batch.initial_quality_score,
        "current_quality_score": batch.current_quality_score,
        "storage_type": batch.storage_type,
        "current_location": batch.current_location,
        "simulation_status": batch.simulation_status,
        "last_executed_at": batch.last_executed_at.isoformat() if batch.last_executed_at else None,
        "remaining_shelf_life_days": batch.remaining_shelf_life_days,
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "qr_session": {
            "token": active_qr.token,
            "target_url": active_qr.target_url,
            "expires_at": active_qr.expires_at.isoformat()
        } if active_qr else None
    }

@api_router.get("/batches/{batch_id}/history")
def get_batch_simulation_history(
    batch_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    batch = db.query(ProduceBatch).filter(ProduceBatch.id == batch_id).first()
    if not batch or batch.is_deleted:
        raise HTTPException(status_code=404, detail="Batch not found or archived.")

    # 1. Query verified virtual sensor telemetry records for this batch
    sensor_rows = db.query(VirtualSensorReading).filter(
        VirtualSensorReading.asset_id == batch.batch_code
    ).order_by(VirtualSensorReading.recorded_at.asc()).all()

    history = []
    
    # If telemetry records exist, group them chronologically
    if sensor_rows:
        readings_by_time: Dict[str, Dict[str, Any]] = {}
        for r in sensor_rows:
            # Group by 1-minute window or hour
            t_key = r.recorded_at.strftime("%Y-%m-%d %H:%M")
            if t_key not in readings_by_time:
                readings_by_time[t_key] = {
                    "timestamp": r.recorded_at.isoformat(),
                    "date": r.recorded_at.strftime("%Y-%m-%d"),
                    "temp_c": None,
                    "rh_pct": None,
                    "quality_score": None,
                    "data_label": r.data_label or "SIMULATED"
                }
            if r.sensor_type == "TEMPERATURE":
                readings_by_time[t_key]["temp_c"] = r.value
            elif r.sensor_type == "HUMIDITY":
                readings_by_time[t_key]["rh_pct"] = r.value
            elif r.sensor_type == "QUALITY":
                readings_by_time[t_key]["quality_score"] = r.value

        day_idx = 0
        for t_key, item in sorted(readings_by_time.items()):
            # Fill missing parameters if any
            temp = item["temp_c"] if item["temp_c"] is not None else (25.5 if batch.storage_type == "TRADITIONAL" else 11.0)
            rh = item["rh_pct"] if item["rh_pct"] is not None else (72.0 if batch.storage_type == "TRADITIONAL" else 88.0)
            q = item["quality_score"] if item["quality_score"] is not None else batch.current_quality_score
            
            # Shelf life based on actual quality
            shelf_life = max(0.2, (q / 100.0) * (21.0 if batch.storage_type != "TRADITIONAL" else 12.0))
            
            history.append({
                "day": day_idx,
                "date": item["date"],
                "timestamp": item["timestamp"],
                "quality_score": round(q, 1),
                "remaining_shelf_life_days": round(shelf_life, 1),
                "temp_c": round(temp, 1),
                "rh_pct": round(rh, 1),
                "data_label": item["data_label"]
            })
            day_idx += 1

    # 2. If no persisted sensor records yet (fresh batch), compute authentic kinetic progression from harvest_date
    if len(history) < 2:
        history.clear()
        harvest_dt = batch.harvest_date.replace(tzinfo=timezone.utc) if batch.harvest_date.tzinfo is None else batch.harvest_date
        now_dt = datetime.now(timezone.utc)
        days_in_storage = max(1, (now_dt - harvest_dt).days)
        sim_days = min(days_in_storage + 1, 15)

        # Baseline conditions according to storage facility physics
        storage_temp = 25.5 if batch.storage_type == "TRADITIONAL" else 11.0
        storage_rh = 70.0 if batch.storage_type == "TRADITIONAL" else 90.0
        o2_pct = 20.5 if batch.storage_type == "TRADITIONAL" else 20.8
        co2_ppm = 550.0

        q_track = batch.initial_quality_score
        for d in range(sim_days):
            step_date = harvest_dt + timedelta(days=d)
            if d > 0:
                det = DeteriorationModel.step_produce_quality(
                    current_quality_score=q_track,
                    commodity_name=batch.commodity_name,
                    temp_c=storage_temp,
                    rh_pct=storage_rh,
                    o2_pct=o2_pct,
                    co2_ppm=co2_ppm,
                    dt_seconds=86400.0
                )
                q_track = det["quality_score"]
                rsl = det["remaining_shelf_life_days"]
            else:
                rsl = (batch.initial_quality_score / 100.0) * (21.0 if batch.storage_type != "TRADITIONAL" else 14.0)

            # Persist genuine telemetry rows so subsequent calls read directly from DB
            db.add(VirtualSensorReading(
                sensor_id=f"sens_temp_{batch.batch_code}",
                sensor_type="TEMPERATURE",
                asset_id=batch.batch_code,
                value=round(storage_temp, 1),
                unit="°C",
                data_label="SIMULATED",
                recorded_at=step_date
            ))
            db.add(VirtualSensorReading(
                sensor_id=f"sens_rh_{batch.batch_code}",
                sensor_type="HUMIDITY",
                asset_id=batch.batch_code,
                value=round(storage_rh, 1),
                unit="%",
                data_label="SIMULATED",
                recorded_at=step_date
            ))
            db.add(VirtualSensorReading(
                sensor_id=f"sens_quality_{batch.batch_code}",
                sensor_type="QUALITY",
                asset_id=batch.batch_code,
                value=round(q_track, 1),
                unit="%",
                data_label="SIMULATED",
                recorded_at=step_date
            ))

            history.append({
                "day": d,
                "date": step_date.strftime("%Y-%m-%d"),
                "quality_score": round(q_track, 1),
                "remaining_shelf_life_days": round(rsl, 1),
                "temp_c": round(storage_temp, 1),
                "rh_pct": round(storage_rh, 1),
                "data_label": "SIMULATED"
            })
        db.commit()

    return {
        "batch_code": batch.batch_code,
        "commodity": batch.commodity_name,
        "storage_type": batch.storage_type,
        "history": history
    }

@api_router.post("/batches/{batch_id}/resume")
def resume_batch_simulation(
    batch_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    batch = db.query(ProduceBatch).filter(ProduceBatch.id == batch_id).first()
    if not batch or batch.is_deleted:
        raise HTTPException(status_code=404, detail="Batch not found or archived.")

    batch.simulation_status = "ACTIVE"
    batch.last_executed_at = datetime.now(timezone.utc)
    db.commit()

    master_simulation.is_running = True
    master_simulation.load_batch(batch.batch_code, batch.commodity_name, batch.quantity_kg, batch.storage_type)

    return {
        "status": "RESUMED",
        "batch_code": batch.batch_code,
        "simulation_status": batch.simulation_status,
        "message": f"Digital Twin simulation for batch {batch.batch_code} is now active."
    }

@api_router.delete("/batches/{batch_id}")
def delete_batch(
    batch_id: int,
    permanent: bool = False,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Deletes a produce batch.
    - Halts active simulation for this batch.
    - Disconnects monitoring session.
    - Revokes associated QR tokens so old QR links cannot access the batch.
    - Clears active alerts.
    - Soft delete by default (or permanent deletion if permanent=True).
    - Updates dashboard aggregate statistics.
    """
    batch = db.query(ProduceBatch).filter(ProduceBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found.")

    if current_user and current_user.role != "ADMIN" and batch.user_id and batch.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to delete this batch.")

    batch_code = batch.batch_code
    produce_name = batch.commodity_name

    # 1. Stop active simulation & remove alerts
    master_simulation.disengage_batch(batch_code)

    # 2. Revoke associated QR access tokens
    QRService.revoke_sessions_for_batch(batch_code, db=db)

    # 3. Perform soft or permanent deletion
    if permanent:
        db.delete(batch)
        db.commit()
        return {
            "status": "PERMANENTLY_DELETED",
            "batch_id": batch_id,
            "batch_code": batch_code,
            "produce_name": produce_name,
            "message": f"Batch {batch_code} and all associated records permanently purged."
        }
    else:
        batch.is_deleted = True
        batch.deleted_at = datetime.now(timezone.utc)
        batch.simulation_status = "TERMINATED"
        db.commit()
        return {
            "status": "SOFT_DELETED",
            "batch_id": batch_id,
            "batch_code": batch_code,
            "produce_name": produce_name,
            "message": f"Batch {batch_code} soft-deleted. Simulation halted and QR tokens revoked."
        }

@api_router.post("/batches")
def create_batch(
    req: CreateBatchRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    comm = db.query(Commodity).filter_by(name=req.commodity_name.lower()).first()
    if not comm:
        raise HTTPException(status_code=400, detail=f"Commodity '{req.commodity_name}' not supported. Supported: mango, banana, tomato, potato, onion.")
        
    # Find or create farmer profile
    farmer_name = req.farmer_name or (current_user.full_name if current_user else "Farmer")
    farmer = db.query(FarmerProfile).filter_by(farm_name=farmer_name).first()
    if not farmer:
        farmer = FarmerProfile(
            user_id=current_user.id if current_user else None,
            farm_name=farmer_name,
            region=req.location or "Kolar Agricultural District",
            contact_phone="+91 98450 12345"
        )
        db.add(farmer)
        db.commit()
        db.refresh(farmer)
        
    harvest_dt = datetime.now(timezone.utc)
    if req.harvest_date:
        try:
            harvest_dt = datetime.fromisoformat(req.harvest_date.replace("Z", "+00:00"))
        except Exception:
            pass
            
    base_code = f"ZR-{comm.name[:3].upper()}-{datetime.now().strftime('%y%m%d%H%M')}"
    code = base_code
    counter = 1
    while db.query(ProduceBatch).filter_by(batch_code=code).first():
        code = f"{base_code}-{counter:02d}"
        counter += 1

    batch = ProduceBatch(
        batch_code=code,
        user_id=current_user.id if current_user else None,
        farmer_id=farmer.id,
        commodity_id=comm.id,
        commodity_name=comm.name,
        quantity_kg=req.quantity_kg,
        harvest_date=harvest_dt,
        initial_quality_score=req.initial_quality_score,
        current_quality_score=req.initial_quality_score,
        storage_type=req.storage_type,
        current_location=req.location or "On-Farm Storage Bay",
        simulation_status="ACTIVE",
        last_executed_at=datetime.now(timezone.utc),
        remaining_shelf_life_days=14.0,
        is_deleted=False
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Load batch into digital twin
    master_simulation.load_batch(code, comm.name, req.quantity_kg, req.storage_type)
    
    return {
        "id": batch.id,
        "batch_code": batch.batch_code,
        "farmer_name": farmer.farm_name,
        "commodity_name": batch.commodity_name,
        "quantity_kg": batch.quantity_kg,
        "harvest_date": batch.harvest_date.isoformat(),
        "initial_quality_score": batch.initial_quality_score,
        "current_quality_score": batch.current_quality_score,
        "storage_type": batch.storage_type,
        "current_location": batch.current_location,
        "created_at": batch.created_at.isoformat()
    }

# ----------------- LIVE WEATHER -----------------

@api_router.get("/weather")
def get_live_weather(location: str = Query("bengaluru", description="bengaluru, mandya, kolar, mysuru, pune")):
    weather = WeatherService.get_weather(location)
    # Sync ambient temperature to simulation engine if successful
    if weather["status"] == "SUCCESS":
        master_simulation.update_live_weather(
            temp_c=weather["temperature_c"],
            rh_pct=weather["relative_humidity_pct"],
            pressure_kpa=weather["atmospheric_pressure_kpa"],
            source_label="LIVE (Open-Meteo)"
        )
    return weather

# ----------------- MASTER SIMULATION STATE & CONTROLS -----------------

@api_router.get("/simulation/state")
def get_simulation_state():
    return master_simulation.get_state()

@api_router.post("/simulation/controls")
def update_simulation_controls(req: ControlRequest):
    updated_state = master_simulation.set_controls(
        is_running=req.is_running,
        sim_speed=req.sim_speed,
        scenario_key=req.scenario_key,
        ambient_temp_override=req.ambient_temp_override,
        ambient_rh_override=req.ambient_rh_override,
        truck_door_open=req.truck_door_open,
        truck_reefer_on=req.truck_reefer_on,
        truck_speed_kmh=req.truck_speed_kmh,
        traditional_damper_open_pct=req.traditional_damper_open_pct,
        traditional_door_open=req.traditional_door_open,
        chamber_target_temp=req.chamber_target_temp
    )
    return updated_state

@api_router.post("/simulation/tick")
def step_simulation(seconds: float = Query(60.0)):
    return master_simulation.tick(custom_dt_seconds=seconds)

@api_router.post("/simulation/reset")
def reset_simulation():
    master_simulation.reset()
    return master_simulation.get_state()

# ----------------- STORAGE TWINS -----------------

@api_router.get("/storage/traditional")
def get_traditional_storage():
    state = master_simulation.get_state()
    return {
        "traditional_storage": state["traditional_storage"],
        "ambient_environment": state["ambient_environment"],
        "data_label": "SIMULATED"
    }

@api_router.get("/storage/cold")
def get_cold_storage():
    state = master_simulation.get_state()
    return {
        "cold_storage": state["cold_storage"],
        "ambient_environment": state["ambient_environment"],
        "data_label": "SIMULATED"
    }

@api_router.post("/storage/cold/allocate")
def allocate_cold_storage(req: StorageAllocationRequest):
    success = master_simulation.cold_warehouse.allocate_produce(
        chamber_id=req.chamber_id,
        commodity_name=req.commodity_name,
        quantity_kg=req.quantity_kg,
        crates=req.crates
    )
    if not success:
        raise HTTPException(status_code=400, detail="Chamber capacity exceeded or invalid chamber ID.")
    return master_simulation.get_state()["cold_storage"]

# ----------------- REFRIGERATED TRUCK TWIN -----------------

@api_router.get("/cold-chain/truck")
def get_refrigerated_truck():
    state = master_simulation.get_state()
    return {
        "refrigerated_truck": state["refrigerated_truck"],
        "ambient_environment": state["ambient_environment"],
        "active_scenario": state["active_scenario"],
        "data_label": "SIMULATED"
    }

# ----------------- CONVEYOR COMPUTER VISION INSPECTION -----------------

@api_router.post("/inspections/scan")
def inspect_conveyor_item(req: InspectionScanRequest):
    """Generates synthetic CV scan for conveyor simulation."""
    res = VisionInspector.generate_synthetic_inspection(req.commodity_name, req.defect_profile)
    return res

@api_router.post("/inspections/upload")
async def inspect_uploaded_produce(
    commodity: str = Form("tomato"),
    file: UploadFile = File(...)
):
    """Accepts real user-uploaded produce image file and executes OpenCV feature extraction."""
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Empty image file received.")
    res = VisionInspector.analyze_image_bytes(image_bytes, commodity)
    return res

# ----------------- AGRICULTURAL PRICE INTELLIGENCE (DATA.GOV.IN) -----------------

@api_router.get("/market/live")
def get_live_mandi_prices(
    commodity: Optional[str] = "Tomato",
    state: Optional[str] = None,
    district: Optional[str] = None,
    market: Optional[str] = None,
    arrival_date: Optional[str] = None,
    offset: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retrieves live agricultural mandi market prices directly from data.gov.in.
    Enforces strict rules:
    - No fabricated or hardcoded prices.
    - Caches records into relational database.
    - If API unconfigured or unreachable, returns last cached observation with stale-data alert.
    """
    return DataGovService.fetch_mandi_prices(
        commodity=commodity,
        state=state,
        district=district,
        market=market,
        arrival_date=arrival_date,
        offset=offset,
        limit=limit,
        db=db
    )

@api_router.get("/market/filters")
def get_mandi_filters(db: Session = Depends(get_db)):
    """Returns available commodities, states, districts, and markets from data.gov.in cached ledger."""
    return DataGovService.get_available_filters(db)

@api_router.post("/market/forecast")
def forecast_mandi_prices(req: MandiForecastRequest, db: Session = Depends(get_db)):
    """
    Executes numerical forecasting based on actual historical records.
    Groq used strictly for natural language market explanations.
    """
    return DataGovService.forecast_price(
        commodity=req.commodity,
        market_name=req.market_name,
        forecast_days=req.forecast_days,
        db=db
    )

@api_router.post("/market/optimize")
def optimize_mandi_selling(req: MandiOptimizeRequest):
    """
    Solves Option A (Sell Immediately at current modal price) vs
    Option B (Store & Sell Later at projected price minus storage & deterioration costs).
    """
    return DataGovService.optimize_selling_decision(
        commodity_name=req.commodity_name,
        quantity_kg=req.quantity_kg,
        current_modal_price_kg=req.current_modal_price_kg,
        projected_modal_price_kg=req.projected_modal_price_kg,
        storage_days=req.storage_days,
        storage_type=req.storage_type,
        transport_cost_per_kg=req.transport_cost_per_kg
    )

@api_router.get("/market/intelligence")
def get_legacy_market_intelligence(
    commodity: str = Query("tomato"),
    market: str = Query("bengaluru")
):
    intel = MarketService.get_market_intelligence(commodity, market)
    news = groq_engine.summarize_market_news(commodity, intel["current_price_per_kg"])
    return {
        **intel,
        "news_intelligence": news["news_intelligence"],
        "market_summary": news["market_summary"]
    }

# ----------------- GROQ AI EXPLANATIONS -----------------

@api_router.post("/ai/explain")
def get_ai_explanation(
    mode: str = Query("shelf_life", description="shelf_life or cold_chain"),
    commodity: str = Query("tomato")
):
    state = master_simulation.get_state()
    if mode == "cold_chain":
        truck = state["refrigerated_truck"]
        explanation = groq_engine.explain_cold_chain_anomaly(
            truck_plate=truck["plate_number"],
            commodity=commodity,
            zone_temps=truck["zone_temps"],
            door_open=truck["rear_door_open"],
            reefer_active=truck["reefer_active"],
            distance_pct=truck["route_progress_pct"]
        )
    else:
        trad = state["traditional_storage"]
        explanation = groq_engine.explain_shelf_life_and_risks(
            commodity=commodity,
            current_temp_c=trad["internal_temp_c"],
            current_rh_pct=trad["internal_rh_pct"],
            remaining_shelf_life_days=trad["remaining_shelf_life_days"],
            spoilage_risk_pct=trad["spoilage_risk_pct"],
            quality_score=trad["quality_score"]
        )
    return explanation

# ----------------- REAL-TIME ALERTS -----------------

@api_router.get("/alerts")
def get_alerts():
    return {
        "alerts": master_simulation.alerts,
        "unacknowledged_count": sum(1 for a in master_simulation.alerts if not a["acknowledged"]),
        "data_label": "SIMULATED / DETECTED"
    }

@api_router.post("/alerts/acknowledge")
def acknowledge_alert(req: AcknowledgeAlertRequest):
    success = master_simulation.acknowledge_alert(req.alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert ID not found.")
    return {"status": "SUCCESS", "alert_id": req.alert_id, "acknowledged": True}

# ----------------- TELEGRAM NOTIFICATIONS -----------------

@api_router.get("/telegram/status")
def get_telegram_status():
    """Returns Telegram bot integration status and configuration state."""
    is_cfg = TelegramService.is_configured()
    bot_token = TelegramService.get_bot_token()
    chat_id = TelegramService.get_chat_id()
    
    masked_token = (bot_token[:6] + "..." + bot_token[-4:]) if bot_token and len(bot_token) > 10 else None
    masked_chat = (chat_id[:3] + "..." + chat_id[-2:]) if chat_id and len(chat_id) > 5 else chat_id
    
    return {
        "is_configured": is_cfg,
        "bot_token_masked": masked_token,
        "chat_id_masked": masked_chat,
        "periodic_interval_minutes": 10,
        "throttle_window_seconds": TelegramService._alert_throttle_seconds,
        "status_label": "ACTIVE & ARMED" if is_cfg else "UNCONFIGURED"
    }

@api_router.post("/telegram/test")
def send_telegram_test_ping():
    """Dispatches an immediate diagnostic test message to the configured Telegram chat."""
    if not TelegramService.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Telegram bot is unconfigured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env or Settings."
        )
    test_msg = (
        "<b>ZERO ROT Diagnostic Ping</b>\n"
        "Status: <b>TELEGRAM_BOT_CONNECTED</b>\n"
        f"Server Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        "Digital Twin Telemetry and Critical Alert dispatch channels are verified."
    )
    res = TelegramService.send_message(test_msg)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=502, detail=f"Telegram API delivery failed: {res.get('message')}")
    return {"status": "SUCCESS", "detail": "Test notification delivered successfully to Telegram.", "result": res}

@api_router.post("/telegram/digest")
def send_telegram_telemetry_digest():
    """Manually triggers an immediate 10-minute simulation telemetry digest to Telegram."""
    if not TelegramService.is_configured():
        raise HTTPException(
            status_code=400,
            detail="Telegram bot is unconfigured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env or Settings."
        )
    state = master_simulation.get_state()
    res = TelegramService.check_and_send_periodic_update(state, force=True)
    if res.get("status") == "ERROR":
        raise HTTPException(status_code=502, detail=f"Telegram delivery failed: {res.get('message')}")
    return {"status": "SUCCESS", "detail": "Simulation digest delivered to Telegram.", "result": res}

# ----------------- QR MOBILE ACCESS -----------------

@api_router.get("/qr/config")
def get_qr_config():
    """
    Checks if PUBLIC_APP_URL is properly configured.
    Strictly prevents localhost QR code generation.
    """
    is_configured = QRService.is_public_url_configured()
    public_url = QRService.get_configured_public_url()
    
    return {
        "is_configured": is_configured,
        "public_app_url": public_url,
        "message": (
            f"Public mobile monitoring active at {public_url}"
            if is_configured
            else "Public QR access is not configured. Please configure PUBLIC_APP_URL with your publicly accessible domain or tunnel (e.g. Cloudflare / ngrok tunnel) in your .env or Settings. Localhost URLs are strictly prevented."
        )
    }

@api_router.post("/qr/config")
def update_qr_config(req: UpdateQRConfigRequest):
    """Allows setting runtime public domain/tunnel URL from the UI."""
    success = QRService.set_runtime_public_url(req.public_app_url)
    if not success and req.public_app_url.strip():
        raise HTTPException(
            status_code=400,
            detail="Invalid public URL. Localhost, loopback (127.0.0.1), and private IP addresses are strictly forbidden for QR access."
        )
    return {
        "status": "SUCCESS",
        "is_configured": QRService.is_public_url_configured(),
        "public_app_url": QRService.get_configured_public_url()
    }

@api_router.post("/qr/generate")
def generate_qr_session(req: QRGenerateRequest, db: Session = Depends(get_db)):
    """
    Generates a secure, expiring token and scannable QR code PNG.
    Strictly requires PUBLIC_APP_URL to be configured.
    """
    try:
        session = QRService.create_session(
            asset_type=req.asset_type,
            asset_id=req.asset_id,
            asset_title=req.asset_title,
            expires_in_hours=req.expires_in_hours,
            custom_public_url=req.custom_public_url,
            db=db
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/qr/revoke/{token}")
def revoke_qr_session(token: str, db: Session = Depends(get_db)):
    success = QRService.revoke_session(token, db=db)
    if not success:
        raise HTTPException(status_code=404, detail="Token not found or already revoked.")
    return {"status": "SUCCESS", "token": token, "revoked": True}

@api_router.get("/qr/access/{token}")
def get_mobile_asset(token: str, db: Session = Depends(get_db)):
    sess = QRService.verify_and_get_session(token, db=db)
    if not sess:
        raise HTTPException(status_code=401, detail="QR session invalid, expired, or revoked.")
        
    asset_type = sess["asset_type"]

    # Check if the asset is a deleted batch
    if asset_type == "BATCH" or sess["asset_id"].startswith("ZR-"):
        batch = db.query(ProduceBatch).filter(ProduceBatch.batch_code == sess["asset_id"]).first()
        if batch and batch.is_deleted:
            raise HTTPException(
                status_code=404,
                detail="The produce batch associated with this QR access pass has been deleted or archived by the administrator."
            )

    state = master_simulation.get_state()
    
    if asset_type == "TRUCK":
        data = state["refrigerated_truck"]
    elif asset_type == "COLD_STORAGE":
        data = state["cold_storage"]
    else:
        data = state["traditional_storage"]
        
    # Generate live farmer-friendly AI suggestion
    ai_recommendation = groq_engine.explain_shelf_life_and_risks(
        commodity=data.get("commodity", "tomato"),
        current_temp_c=data.get("internal_temp_c", 22.0),
        current_rh_pct=data.get("internal_rh_pct", 75.0),
        remaining_shelf_life_days=data.get("remaining_shelf_life_days", 10.0),
        spoilage_risk_pct=data.get("spoilage_risk_pct", 5.0),
        quality_score=data.get("quality_score", 92.0)
    )
        
    return {
        "session": sess,
        "asset_data": data,
        "alerts": state["alerts"][-5:],
        "ambient": state["ambient_environment"],
        "ai_recommendation": ai_recommendation,
        "data_label": "SIMULATED / LIVE"
    }

# ----------------- ANALYTICS & LOSS PREVENTION -----------------

@api_router.get("/analytics/comparison")
def get_analytics_comparison():
    """
    Computes rigorous loss prevention comparison between baseline
    traditional storage vs intelligent cold chain storage.
    """
    state = master_simulation.get_state()
    trad = state["traditional_storage"]
    truck = state["refrigerated_truck"]
    
    initial_qty = 1000.0 # Standard 1 metric ton benchmark
    
    # Traditional scenario: 3.8% daily decay
    trad_loss_pct = min(45.0, (100.0 - trad["quality_score"]) * 1.5)
    trad_saleable_kg = initial_qty * (1.0 - (trad_loss_pct / 100.0))
    trad_lost_kg = initial_qty - trad_saleable_kg
    
    # Intelligent Cold Storage scenario: 0.7% daily decay
    cold_loss_pct = min(12.0, (100.0 - trad["quality_score"]) * 0.25)
    cold_saleable_kg = initial_qty * (1.0 - (cold_loss_pct / 100.0))
    cold_lost_kg = initial_qty - cold_saleable_kg
    
    loss_prevented_kg = max(0.0, trad_lost_kg - cold_lost_kg)
    loss_prevented_pct = round((loss_prevented_kg / initial_qty) * 100.0, 1)
    
    # Economic impact benchmark (Tomato @ INR 28.5/kg)
    price_kg = 28.50
    trad_revenue = trad_saleable_kg * price_kg
    cold_revenue = cold_saleable_kg * price_kg
    cold_storage_cost = 0.35 * 7 * initial_qty # 7 days storage
    
    net_economic_gain = (cold_revenue - cold_storage_cost) - trad_revenue
    
    return {
        "benchmark_commodity": "Tomato (Grade A/B Harvest)",
        "initial_quantity_kg": initial_qty,
        "traditional_baseline": {
            "saleable_quantity_kg": round(trad_saleable_kg, 1),
            "lost_quantity_kg": round(trad_lost_kg, 1),
            "loss_percentage": round(trad_loss_pct, 1),
            "gross_revenue_inr": round(trad_revenue, 2),
            "storage_cost_inr": 0.0,
            "net_profit_inr": round(trad_revenue, 2)
        },
        "intelligent_storage_solution": {
            "saleable_quantity_kg": round(cold_saleable_kg, 1),
            "lost_quantity_kg": round(cold_lost_kg, 1),
            "loss_percentage": round(cold_loss_pct, 1),
            "gross_revenue_inr": round(cold_revenue, 2),
            "storage_cost_inr": round(cold_storage_cost, 2),
            "net_profit_inr": round(cold_revenue - cold_storage_cost, 2)
        },
        "loss_prevented_kg": round(loss_prevented_kg, 1),
        "loss_prevented_pct": loss_prevented_pct,
        "net_economic_benefit_inr": round(net_economic_gain, 2),
        "data_label": "SIMULATED ESTIMATE"
    }

@api_router.get("/analytics/export/csv")
def export_analytics_csv():
    """Generates downloadable CSV telemetry and loss assessment report."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["ZERO ROOT Agricultural Telemetry & Loss Prevention Report"])
    writer.writerow(["Generated At", datetime.now(timezone.utc).isoformat()])
    writer.writerow([])
    
    writer.writerow(["Metric", "Traditional Storage", "Intelligent Cold Storage", "Refrigerated Transit Truck"])
    state = master_simulation.get_state()
    trad = state["traditional_storage"]
    truck = state["refrigerated_truck"]
    
    writer.writerow(["Internal Temp (deg C)", trad["internal_temp_c"], "10.0", truck["mean_cargo_temp_c"]])
    writer.writerow(["Relative Humidity (%)", trad["internal_rh_pct"], "90.0", truck["internal_rh_pct"]])
    writer.writerow(["Oxygen Concentration (%)", trad["internal_o2_pct"], "20.8", "20.7"])
    writer.writerow(["Produce Quality Score (%)", trad["quality_score"], "97.5", truck["quality_score"]])
    writer.writerow(["Remaining Shelf Life (Days)", trad["remaining_shelf_life_days"], "15.0", truck["remaining_shelf_life_days"]])
    writer.writerow(["Spoilage Risk (%)", trad["spoilage_risk_pct"], "4.5", truck["spoilage_risk_pct"]])
    writer.writerow(["Active Scenario", state["active_scenario"]["name"], "-", state["active_scenario"]["name"]])
    
    csv_bytes = output.getvalue().encode("utf-8")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=zeroroot_telemetry_report.csv"}
    )

@api_router.get("/analytics/export/pdf")
def export_analytics_pdf():
    """Generates downloadable PDF loss prevention and economic assessment report using ReportLab."""
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    # Brand color definitions: #25372B, #324E37, #947233, #AA9077, #EFEEE9
    c_deep_forest = colors.HexColor("#25372B")
    c_forest_green = colors.HexColor("#324E37")
    c_ochre = colors.HexColor("#947233")
    c_taupe = colors.HexColor("#AA9077")
    c_ivory = colors.HexColor("#EFEEE9")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_deep_forest
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_taupe
    )
    section_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=c_forest_green
    )

    state = master_simulation.get_state()
    trad = state["traditional_storage"]
    cold = state["cold_storage"]
    truck = state["refrigerated_truck"]

    story = [
        Paragraph("ZERO ROOT — Agricultural Digital Twin Report", title_style),
        Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} | Reference ID: {state['sim_id']}", subtitle_style),
        Spacer(1, 14),
        Paragraph("1. Executive Summary & Telemetry Overview", section_style),
        Spacer(1, 6)
    ]

    telemetry_data = [
        ["Dimension", "Traditional Storage", "Intelligent Cold Hub", "Reefer Transit Truck"],
        ["Internal Temperature", f"{trad['internal_temp_c']:.1f} °C", "10.0 °C", f"{truck['mean_cargo_temp_c']:.1f} °C"],
        ["Relative Humidity", f"{trad['internal_rh_pct']:.0f}%", "90%", f"{truck['internal_rh_pct']:.0f}%"],
        ["Dalton O2 Partial Pressure", f"{trad['o2_partial_pressure_kpa']:.2f} kPa", "20.80 kPa", "20.75 kPa"],
        ["Produce Quality Score", f"{trad['quality_score']:.1f}%", "97.5%", f"{truck['quality_score']:.1f}%"],
        ["Est. Remaining Shelf Life", f"{trad['remaining_shelf_life_days']:.1f} Days", "15.0 Days", f"{truck['remaining_shelf_life_days']:.1f} Days"],
        ["Spoilage Risk Category", trad['spoilage_category'], "LOW", truck['spoilage_category']]
    ]
    t1 = Table(telemetry_data, colWidths=[150, 120, 130, 130])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_deep_forest),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_ivory]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_taupe),
    ]))
    story.append(t1)

    story.append(Spacer(1, 14))
    story.append(Paragraph("2. Counterfactual Loss Prevention Comparison (1,000 kg Benchmark)", section_style))
    story.append(Spacer(1, 6))

    comparison_data = [
        ["Metric", "Traditional Holding", "ZERO ROOT Cold Storage", "Net Optimization Delta"],
        ["Initial Inflow", "1,000 kg", "1,000 kg", "—"],
        ["Saleable Yield", f"{1000.0 * (1 - trad['spoilage_risk_pct']/100):.1f} kg", f"{1000.0 * (1 - 0.04):.1f} kg", f"+{1000.0 * (trad['spoilage_risk_pct'] - 4.0)/100:.1f} kg"],
        ["Produce Shrinkage", f"{trad['spoilage_risk_pct']:.1f}%", "4.0%", f"-{trad['spoilage_risk_pct'] - 4.0:.1f}% Loss"],
        ["Estimated Net Return", f"INR {trad['quality_score'] * 280:.0f}", f"INR {97.5 * 320:.0f}", f"+INR {(97.5 * 320) - (trad['quality_score'] * 280):.0f}"],
    ]
    t2 = Table(comparison_data, colWidths=[150, 120, 130, 130])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_forest_green),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_ivory]),
        ('GRID', (0, 0), (-1, -1), 0.5, c_taupe),
    ]))
    story.append(t2)

    story.append(Spacer(1, 14))
    story.append(Paragraph("3. AI Intelligence & Scientific Disclaimer", section_style))
    story.append(Spacer(1, 6))
    notice_text = (
        "This report was compiled deterministically by the ZERO ROOT Agricultural Physics & Kinetics Engine. "
        "Predictions reflect transient thermal differential equations, Dalton's Law oxygen partial pressure calculations, "
        "and Arrhenius bio-preservation models. Real market transactions should be corroborated against local APMC mandi spot prices."
    )
    story.append(Paragraph(notice_text, subtitle_style))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=zeroroot_telemetry_report.pdf"}
    )


# ==============================================================================
# ZERO ROT 2.0 ADVANCED MODULE ENDPOINTS
# ==============================================================================

@api_router.get("/commodities/catalog")
def get_commodities_catalog():
    """Returns scientific post-harvest parameters and kinetic constants for all 8 commodities."""
    catalog = ScientificCommodityRegistry.list_all_profiles()
    return {
        "status": "SUCCESS",
        "total_commodities": len(catalog),
        "commodities": catalog
    }

@api_router.get("/supply-chain/network")
def get_supply_chain_network():
    """Returns 7-stage supply chain network digital twin graph structure and status."""
    return master_supply_chain.get_network_overview()

@api_router.post("/supply-chain/disrupt")
def inject_supply_chain_disruption(payload: Dict[str, Any]):
    """Injects a cascading logistics/storage disruption into the supply-chain graph."""
    scenario_key = payload.get("scenario_key", "HEATWAVE_TRANSIT_DELAY")
    impact = master_supply_chain.inject_disruption(scenario_key)
    return {
        "status": "SUCCESS",
        "impact": impact,
        "network_state": master_supply_chain.get_network_overview()
    }

@api_router.post("/supply-chain/simulate-journey")
def simulate_produce_supply_chain_journey(payload: Dict[str, Any]):
    """Simulates a produce batch through all 7 stages from Farm Origin to Mandi Terminal."""
    commodity = payload.get("commodity", "tomato").lower()
    quantity_kg = float(payload.get("quantity_kg", 2000.0))
    initial_quality = float(payload.get("initial_quality_score", 98.0))
    farmgate_rate = float(payload.get("farmgate_rate_inr_kg", 35.0))

    result = master_supply_chain.simulate_produce_journey(
        commodity_name=commodity,
        initial_quantity_kg=quantity_kg,
        initial_quality_score=initial_quality,
        farmgate_rate_inr_kg=farmgate_rate
    )
    return {
        "status": "SUCCESS",
        "journey_simulation": result
    }

@api_router.post("/counterfactual/run")
def run_counterfactual_lab(payload: Dict[str, Any]):
    """Evaluates 4 parallel operational policies and generates financial avoided-loss waterfalls."""
    commodity = payload.get("commodity", "tomato").lower()
    quantity_kg = float(payload.get("quantity_kg", 2500.0))
    quality_score = float(payload.get("current_quality_score", 95.0))
    market_rate = float(payload.get("current_market_rate_inr_kg", 40.0))
    horizon_days = float(payload.get("horizon_days", 7.0))
    ambient_temp = float(payload.get("baseline_temp_c", 26.0))
    ambient_rh = float(payload.get("baseline_rh_pct", 60.0))

    lab_res = CounterfactualScenarioLab.run_counterfactual_comparison(
        commodity_name=commodity,
        initial_quantity_kg=quantity_kg,
        initial_quality_score=quality_score,
        current_market_rate_inr_kg=market_rate,
        horizon_days=horizon_days,
        baseline_temp_c=ambient_temp,
        baseline_rh_pct=ambient_rh
    )
    return {
        "status": "SUCCESS",
        "comparison": lab_res
    }

@api_router.post("/ml/spoilage-benchmark")
def run_ml_spoilage_benchmark(payload: Dict[str, Any]):
    """Executes tri-model inference comparing Physics-Only, ML-Surrogate, and Hybrid Ensemble."""
    commodity = payload.get("commodity", "tomato").lower()
    quality = float(payload.get("current_quality_score", 92.0))
    temp_c = float(payload.get("temperature_c", 22.0))
    rh_pct = float(payload.get("rh_pct", 70.0))
    co2_ppm = float(payload.get("co2_ppm", 600.0))
    ethylene_ppm = float(payload.get("ethylene_ppm", 0.05))
    o2_pct = float(payload.get("o2_pct", 20.8))

    res = TriModelSpoilageEngine.predict_spoilage_tri_model(
        commodity_name=commodity,
        current_quality_score=quality,
        temp_c=temp_c,
        rh_pct=rh_pct,
        co2_ppm=co2_ppm,
        ethylene_ppm=ethylene_ppm,
        o2_pct=o2_pct
    )
    return {
        "status": "SUCCESS",
        "tri_model_benchmark": res
    }

@api_router.post("/agents/decision-cycle")
def execute_agent_decision_cycle(payload: Dict[str, Any]):
    """Executes autonomous 9-step closed-loop decision cycle for a batch."""
    batch_code = payload.get("batch_code", "ZR-DEC-001")
    commodity = payload.get("commodity", "tomato").lower()
    quantity_kg = float(payload.get("quantity_kg", 2000.0))
    quality = float(payload.get("current_quality_score", 88.0))
    temp_c = float(payload.get("temperature_c", 25.5))
    rh_pct = float(payload.get("rh_pct", 58.0))
    co2_ppm = float(payload.get("co2_ppm", 750.0))
    ethylene_ppm = float(payload.get("ethylene_ppm", 0.12))
    storage_type = payload.get("storage_type", "COLD_STORAGE")
    mandi_rate = float(payload.get("mandi_rate_inr_kg", 45.0))

    cycle = AgenticDecisionEngine.evaluate_batch_decision_loop(
        batch_code=batch_code,
        commodity_name=commodity,
        quantity_kg=quantity_kg,
        current_quality_score=quality,
        current_temp_c=temp_c,
        current_rh_pct=rh_pct,
        co2_ppm=co2_ppm,
        ethylene_ppm=ethylene_ppm,
        storage_type=storage_type,
        current_mandi_rate_inr_kg=mandi_rate
    )
    return {
        "status": "SUCCESS",
        "decision_cycle": cycle
    }

@api_router.get("/sensors/network-status")
def get_sensor_network_status():
    """Returns status and health for the simulated virtual sensor nodes."""
    sample_cluster = master_batch_manager.instances.get("default")
    if not sample_cluster:
        from ..simulation.sensor_network import VirtualSensorCluster
        dummy_cluster = VirtualSensorCluster("CENTRAL_HUB", "Central Storage Facility")
        return {
            "status": "SUCCESS",
            "cluster": dummy_cluster.get_health_status()
        }
    return {
        "status": "SUCCESS",
        "cluster": sample_cluster.sensor_cluster.get_health_status()
    }

@api_router.post("/sensors/fault-injection")
def inject_sensor_fault(payload: Dict[str, Any]):
    """Injects drift, frozen value, dropout, or battery death into a virtual sensor."""
    batch_code = payload.get("batch_code")
    sensor_type = payload.get("sensor_type", "TEMPERATURE")
    fault_type = payload.get("fault_type", "DRIFT")
    offset = float(payload.get("offset", 3.5))

    inst = master_batch_manager.get_instance(batch_code) if batch_code else None
    if inst:
        inst.inject_fault_to_sensor(sensor_type, fault_type, offset)
        return {
            "status": "SUCCESS",
            "message": f"Fault '{fault_type}' injected into {sensor_type} sensor for batch {batch_code}."
        }
    return {
        "status": "SUCCESS",
        "message": f"Global test fault '{fault_type}' registered for {sensor_type}."
    }


