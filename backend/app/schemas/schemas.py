"""
Pydantic Schemas for API Requests & Responses.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class ControlRequest(BaseModel):
    is_running: Optional[bool] = None
    sim_speed: Optional[float] = Field(None, ge=0.5, le=50.0)
    scenario_key: Optional[str] = None
    ambient_temp_override: Optional[float] = None
    ambient_rh_override: Optional[float] = None
    truck_door_open: Optional[bool] = None
    truck_reefer_on: Optional[bool] = None
    truck_speed_kmh: Optional[float] = None
    traditional_damper_open_pct: Optional[float] = None
    traditional_door_open: Optional[bool] = None
    chamber_target_temp: Optional[Dict[str, float]] = None

class CreateBatchRequest(BaseModel):
    farmer_name: Optional[str] = "Prajwal V L"
    commodity_name: str # mango, banana, tomato, potato, onion
    quantity_kg: float
    harvest_date: Optional[str] = None
    location: Optional[str] = "Kolar Agricultural District"
    initial_quality_score: float = 95.0
    storage_type: str = "TRADITIONAL" # "TRADITIONAL" or "ADVANCED_COLD"

class StorageAllocationRequest(BaseModel):
    chamber_id: str
    commodity_name: str
    quantity_kg: float
    crates: int

class InspectionScanRequest(BaseModel):
    commodity_name: str = "tomato"
    defect_profile: str = "random" # "random", "GOOD", "MODERATE", "SPOILED"

class ProfitOptimizeRequest(BaseModel):
    commodity_name: str = "tomato"
    quantity_kg: float = 1500.0
    storage_type: str = "INTELLIGENT_COLD"
    planned_storage_days: int = 7
    market_key: str = "bengaluru"

class QRGenerateRequest(BaseModel):
    asset_type: str = "BATCH" # "BATCH", "TRADITIONAL_STORE", "COLD_STORAGE", "TRUCK"
    asset_id: str
    asset_title: str
    expires_in_hours: int = 24
    custom_public_url: Optional[str] = None

class UpdateQRConfigRequest(BaseModel):
    public_app_url: str

class AcknowledgeAlertRequest(BaseModel):
    alert_id: str

# ----------------- AUTH & USER MANAGEMENT SCHEMAS -----------------

class RegisterRequest(BaseModel):
    full_name: str
    email: str
    password: str
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[str] = None

class CreateUserByAdminRequest(BaseModel):
    full_name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: str = "FARMER"

class UpdateUserStatusRequest(BaseModel):
    is_active: bool

# ----------------- BATCH MANAGEMENT SCHEMAS -----------------

class DeleteBatchRequest(BaseModel):
    permanent: bool = False
    confirm_code: str # Must match batch code to confirm explicit deletion

# ----------------- DATA.GOV.IN MANDI SCHEMAS -----------------

class MandiForecastRequest(BaseModel):
    commodity: str = "tomato"
    market_name: str = "Kolar"
    forecast_days: int = 14

class MandiOptimizeRequest(BaseModel):
    commodity_name: str = "tomato"
    quantity_kg: float = 1000.0
    current_modal_price_kg: float = 28.5
    projected_modal_price_kg: float = 34.0
    storage_days: int = 7
    storage_type: str = "COLD_STORAGE"
    transport_cost_per_kg: float = 1.20
