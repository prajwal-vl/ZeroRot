"""
Comprehensive Verification Tests for ZERO ROOT Additional Mandatory Requirements:
1. Database Starts With Zero Preloaded Users & User Registration / Account Management.
2. Batch Management (View Details, Simulation History, Resume, Soft & Permanent Deletion, QR Revocation).
3. Live Mandi Market Price Integration (Data.gov.in, Attribution, Stale Handling, Forecasting, Selling Decision).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.models.models import User, ProduceBatch, Commodity, StorageFacility
from backend.app.services.data_gov_service import DataGovService
from backend.app.services.qr_service import QRService

# In-memory SQLite for clean test isolation
TEST_DATABASE_URL = "sqlite:///./test_additional.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True, scope="module")
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    # Seed only commodities and generic facilities
    db = TestingSessionLocal()
    c1 = Commodity(name="tomato", category="Vegetable", optimal_temp_c=12.0, optimal_rh_min=85.0, optimal_rh_max=90.0, max_shelf_life_days=16.0, chilling_injury_threshold_c=9.0)
    c2 = Commodity(name="mango", category="Fruit", optimal_temp_c=13.0, optimal_rh_min=85.0, optimal_rh_max=92.0, max_shelf_life_days=21.0, chilling_injury_threshold_c=10.0)
    fac = StorageFacility(code="TRAD_01", name="Rural Store", facility_type="TRADITIONAL", location="Mandya", total_capacity_kg=5000.0)
    db.add_all([c1, c2, fac])
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()

# ==================== 1. USER CREATION & REGISTRATION ====================

def test_database_initially_contains_zero_users():
    """Verify database starts without any preloaded demo users or fake accounts."""
    db = TestingSessionLocal()
    count = db.query(User).count()
    db.close()
    assert count == 0

    res = client.get("/api/v1/auth/status")
    assert res.status_code == 200
    assert res.json()["has_users"] is False
    assert res.json()["total_users"] == 0

def test_user_registration_creates_first_admin_then_farmers():
    """Verify registration creates user only after explicit submission."""
    # First user becomes ADMIN
    res1 = client.post("/api/v1/auth/register", json={
        "full_name": "Prajwal Administrator",
        "email": "prajwal@zeroroot.org",
        "password": "SecurePassword2026!",
        "phone": "+91 98450 11111"
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert "token" in data1
    assert data1["user"]["role"] == "ADMIN"
    assert data1["user"]["is_admin"] is True
    admin_token = data1["token"]

    # Second user becomes FARMER
    res2 = client.post("/api/v1/auth/register", json={
        "full_name": "Ramesh Gowda Farmer",
        "email": "ramesh@farm.in",
        "password": "FarmerPassword2026!",
        "phone": "+91 98450 22222"
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["user"]["role"] == "FARMER"
    assert data2["user"]["is_admin"] is False
    farmer_token = data2["token"]

    # Duplicate email rejected
    res_dup = client.post("/api/v1/auth/register", json={
        "full_name": "Ramesh Duplicate",
        "email": "ramesh@farm.in",
        "password": "FarmerPassword2026!"
    })
    assert res_dup.status_code == 400

    # Login verification
    login_fail = client.post("/api/v1/auth/login", json={"email": "ramesh@farm.in", "password": "WrongPassword"})
    assert login_fail.status_code == 401

    login_ok = client.post("/api/v1/auth/login", json={"email": "ramesh@farm.in", "password": "FarmerPassword2026!"})
    assert login_ok.status_code == 200
    assert "token" in login_ok.json()

# ==================== 2. BATCH MANAGEMENT, HISTORY & DELETION ====================

def test_batch_lifecycle_details_history_resume_and_deletion():
    """Verify user can create, view, view history, resume, and delete batches."""
    # Register a farmer
    reg = client.post("/api/v1/auth/register", json={
        "full_name": "Suresh Kumar",
        "email": "suresh@kolar.agri",
        "password": "KolarFarmer2026!"
    })
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create produce batch
    create_res = client.post("/api/v1/batches", json={
        "farmer_name": "Suresh Kumar",
        "commodity_name": "tomato",
        "quantity_kg": 1500.0,
        "harvest_date": "2026-11-05",
        "location": "Kolar Mandi Zone",
        "initial_quality_score": 94.0,
        "storage_type": "TRADITIONAL"
    }, headers=headers)
    assert create_res.status_code == 200
    batch_info = create_res.json()
    batch_id = batch_info["id"]
    batch_code = batch_info["batch_code"]
    assert batch_code.startswith("ZR-TOM-")

    # 2. View details
    detail_res = client.get(f"/api/v1/batches/{batch_id}", headers=headers)
    assert detail_res.status_code == 200
    det = detail_res.json()
    assert det["batch_code"] == batch_code
    assert det["simulation_status"] == "ACTIVE"
    assert det["remaining_shelf_life_days"] > 0

    # 3. View simulation history
    hist_res = client.get(f"/api/v1/batches/{batch_id}/history", headers=headers)
    assert hist_res.status_code == 200
    hist = hist_res.json()
    assert "history" in hist
    assert len(hist["history"]) > 0

    # 4. Resume monitoring
    resume_res = client.post(f"/api/v1/batches/{batch_id}/resume", headers=headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["simulation_status"] == "ACTIVE"

    # 5. Generate a QR session bound to this batch
    qr_res = client.post("/api/v1/qr/generate", json={
        "asset_type": "BATCH",
        "asset_id": batch_code,
        "asset_title": f"Batch {batch_code} (Tomato)",
        "custom_public_url": "https://zeroroot.test.agritech.com"
    })
    assert qr_res.status_code == 200
    qr_token = qr_res.json()["token"]

    # Verify QR access works before deletion
    qr_access = client.get(f"/api/v1/qr/access/{qr_token}")
    assert qr_access.status_code == 200

    # 6. Soft Delete batch
    del_res = client.delete(f"/api/v1/batches/{batch_id}", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "SOFT_DELETED"

    # 7. Deleted batch must NOT appear in active listing
    list_res = client.get("/api/v1/batches", headers=headers)
    active_codes = [b["batch_code"] for b in list_res.json()]
    assert batch_code not in active_codes

    # 8. Deleted batch must NOT be accessible via previously generated QR links
    qr_access_after_delete = client.get(f"/api/v1/qr/access/{qr_token}")
    assert qr_access_after_delete.status_code in [401, 404]

    # 9. Detail query on deleted batch returns 404
    detail_after = client.get(f"/api/v1/batches/{batch_id}", headers=headers)
    assert detail_after.status_code == 404

# ==================== 3. DATA.GOV.IN MANDI INTEGRATION ====================

def test_data_gov_in_mandi_integration_and_forecasting():
    """Verify data.gov.in integration, transparent attribution, and numerical forecasting."""
    # 1. Filters endpoint
    filters_res = client.get("/api/v1/market/filters")
    assert filters_res.status_code == 200
    filters = filters_res.json()
    assert "commodities" in filters
    assert "states" in filters
    assert "markets" in filters

    # 2. Live Mandi query (handles unconfigured key cleanly with attribution & timestamps)
    mandi_res = client.get("/api/v1/market/live?commodity=Tomato&state=Karnataka")
    assert mandi_res.status_code == 200
    data = mandi_res.json()
    assert "data_source" in data
    assert "data.gov.in" in data["data_source"]
    assert "api_queried_at" in data

    # 3. Numerical Forecasting (does NOT fabricate fake randoms, provides uncertainty bounds)
    fc_res = client.post("/api/v1/market/forecast", json={
        "commodity": "tomato",
        "market_name": "Kolar",
        "forecast_days": 14
    })
    assert fc_res.status_code == 200
    fc = fc_res.json()
    assert fc["forecast_horizon_days"] == 14
    assert len(fc["forecast_series"]) == 14
    for pt in fc["forecast_series"]:
        assert pt["lower_bound_kg"] <= pt["predicted_price_kg"] <= pt["upper_bound_kg"]
    assert "ai_market_explanation" in fc

    # 4. Sell Now vs Store Later optimizer
    opt_res = client.post("/api/v1/market/optimize", json={
        "commodity_name": "tomato",
        "quantity_kg": 2000.0,
        "current_modal_price_kg": 28.0,
        "projected_modal_price_kg": 35.0,
        "storage_days": 7,
        "storage_type": "COLD_STORAGE"
    })
    assert opt_res.status_code == 200
    opt = opt_res.json()
    assert "option_a_sell_now" in opt
    assert "option_b_store_later" in opt
    assert opt["recommendation"] in ["STORE AND SELL LATER", "SELL IMMEDIATELY"]
    assert "assumptions_explanation" in opt
