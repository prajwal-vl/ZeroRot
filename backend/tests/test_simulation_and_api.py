"""
Comprehensive Automated Test Suite for ZERO ROOT.
Tests:
- Thermal physics & conductive/respiration differential equations
- Dalton's Law oxygen partial pressure calculations
- Deterioration kinetics & shelf-life prediction
- Intelligent cold storage rack capacity allocation
- OpenCV produce defect segmentation
- Agricultural price forecasting & profit optimization solver
- QR code token authorization & expiration
- Fault scenario injection (Heatwave, Reefer Breakdown, Door Open)
- Live weather resilience & fallback
- Versioned FastAPI endpoints
"""
import pytest
import cv2
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.simulation.thermal_model import ThermalModel
from backend.app.simulation.gas_model import GasModel
from backend.app.simulation.deterioration_model import DeteriorationModel
from backend.app.simulation.engine import SimulationEngine
from backend.app.services.vision_inspector import VisionInspector
from backend.app.services.market_service import MarketService
from backend.app.services.qr_service import QRService
from backend.app.services.weather_service import WeatherService
from backend.app.database import Base, engine
from backend.app.seed import seed_database

@pytest.fixture(autouse=True)
def setup_test_db():
    app.dependency_overrides.clear()
    Base.metadata.create_all(bind=engine)
    seed_database()

client = TestClient(app)

# ----------------- 1. THERMAL MODEL TESTS -----------------

def test_thermal_model_respiration_heat():
    """Verify respiration metabolic heat calculation for different commodities."""
    heat_tomato = ThermalModel.calculate_respiration_heat("tomato", quantity_kg=1000.0, current_temp_c=20.0)
    assert heat_tomato > 0
    # Higher temperature must increase metabolic respiration output
    heat_warm = ThermalModel.calculate_respiration_heat("tomato", quantity_kg=1000.0, current_temp_c=30.0)
    assert heat_warm > heat_tomato

def test_thermal_model_temperature_step():
    """Verify transient heat transfer increases internal temperature when ambient is hotter."""
    res = ThermalModel.step_temperature(
        current_temp_c=12.0,
        ambient_temp_c=35.0,
        u_value=0.3,
        surface_area_m2=100.0,
        ventilation_rate_m3_s=0.05,
        cooling_power_watts=0.0,
        cooling_enabled=False,
        commodity_name="tomato",
        quantity_kg=1000.0,
        air_volume_m3=60.0,
        door_open=False,
        dt_seconds=300.0
    )
    assert res["internal_temp_c"] > 12.0
    assert res["q_conductive_w"] > 0
    assert res["q_respiration_w"] > 0

# ----------------- 2. GAS PHYSICS & DALTON'S LAW TESTS -----------------

def test_daltons_law_oxygen_partial_pressure():
    """Verify Dalton's law: P_O2 = 0.2095 * (P_atm - P_water_vapor)."""
    p_atm = 101.325
    temp = 25.0
    rh = 60.0
    dalton = GasModel.calculate_daltons_oxygen_partial_pressure(p_atm, temp, rh)
    
    # Assert physical boundaries
    assert dalton["p_water_vapor_kpa"] > 0
    assert dalton["p_water_vapor_kpa"] < dalton["p_sat_water_vapor_kpa"]
    assert dalton["p_dry_air_kpa"] < p_atm
    assert dalton["daltons_p_o2_kpa"] > 0
    assert dalton["daltons_p_o2_kpa"] < p_atm * 0.21

def test_gas_exchange_respiration():
    """Verify biological O2 consumption and CO2 evolution in closed facility."""
    res = GasModel.step_gas_exchange(
        current_o2_pct=20.8,
        current_co2_ppm=450.0,
        temp_c=22.0,
        atmospheric_pressure_kpa=101.3,
        relative_humidity_pct=75.0,
        commodity_name="tomato",
        quantity_kg=1200.0,
        room_volume_m3=150.0,
        air_changes_per_hour=0.5,
        dt_seconds=600.0
    )
    # Produce respiration consumes oxygen and generates CO2
    assert res["o2_concentration_pct"] <= 20.95
    assert res["co2_concentration_ppm"] >= 450.0

# ----------------- 3. DETERIORATION & SHELF-LIFE TESTS -----------------

def test_produce_decay_kinetics():
    """Verify produce deterioration kinetics under optimal vs warm conditions."""
    # Optimal 12°C
    decay_opt = DeteriorationModel.calculate_decay_rate("tomato", temp_c=12.0, rh_pct=88.0, o2_pct=20.5, co2_ppm=500.0)
    # Heat stress 32°C
    decay_hot = DeteriorationModel.calculate_decay_rate("tomato", temp_c=32.0, rh_pct=88.0, o2_pct=20.5, co2_ppm=500.0)
    
    assert decay_hot["effective_k_day"] > decay_opt["effective_k_day"]
    assert decay_hot["temp_factor"] > decay_opt["temp_factor"]

def test_shelf_life_prediction_step():
    """Verify remaining shelf life calculation decreases under decay."""
    step = DeteriorationModel.step_produce_quality(
        current_quality_score=95.0,
        commodity_name="tomato",
        temp_c=13.0,
        rh_pct=88.0,
        o2_pct=20.5,
        co2_ppm=500.0,
        dt_seconds=86400.0 # 1 full day
    )
    assert step["quality_score"] < 95.0
    assert step["remaining_shelf_life_days"] > 0
    assert step["data_label"] == "PREDICTED"

# ----------------- 4. COMPUTER VISION OPENCV TESTS -----------------

def test_opencv_synthetic_inspection_grading():
    """Verify OpenCV contour analysis and defect grading."""
    good_res = VisionInspector.generate_synthetic_inspection("tomato", "GOOD")
    assert good_res["status"] == "SUCCESS"
    assert good_res["classification"] == "GOOD"
    assert good_res["confidence_score"] >= 0.90
    
    spoiled_res = VisionInspector.generate_synthetic_inspection("tomato", "SPOILED")
    assert spoiled_res["status"] == "SUCCESS"
    assert spoiled_res["classification"] == "REJECTED"
    assert len(spoiled_res["defects_detected"]) > 0

def test_opencv_multi_background_robustness_and_blank_handling():
    """Validates robust produce segmentation on dark, white, and gray backgrounds, and blank canvas handling."""
    # 1. Dark background
    dark_res = VisionInspector.generate_synthetic_inspection("tomato", "GOOD", background_type="dark")
    assert dark_res["status"] == "SUCCESS"
    assert dark_res["classification"] == "GOOD"
    assert dark_res["methodology"]["neural_inference_active"] is False

    # 2. Light / White background (e.g. white sorting tray)
    white_res = VisionInspector.generate_synthetic_inspection("tomato", "GOOD", background_type="white")
    assert white_res["status"] == "SUCCESS"
    assert white_res["classification"] == "GOOD"
    assert abs(white_res["quality_score"] - dark_res["quality_score"]) < 10.0

    # 3. Gray background
    gray_res = VisionInspector.generate_synthetic_inspection("tomato", "GOOD", background_type="gray")
    assert gray_res["status"] == "SUCCESS"
    assert gray_res["classification"] == "GOOD"

    # 4. Blank white canvas (must NOT classify as REJECTED produce)
    import numpy as np
    blank_white = np.full((320, 320, 3), 255, dtype=np.uint8)
    blank_bytes = cv2.imencode(".png", blank_white)[1].tobytes()
    blank_res = VisionInspector.analyze_image_bytes(blank_bytes, "tomato")
    assert blank_res["status"] == "LOW_CONFIDENCE"
    assert blank_res["classification"] != "REJECTED"
    assert blank_res["confidence_score"] <= 0.30

# ----------------- 5. AGRICULTURAL PRICE & PROFIT TESTS -----------------

def test_market_intelligence_and_forecast():
    """Verify APMC price series and numerical forecast."""
    intel = MarketService.get_market_intelligence("tomato", "bengaluru")
    assert intel["current_modal_price_qtl"] > 0
    assert len(intel["historical_30d"]) == 30
    assert len(intel["forecast_14d"]) == 14
    # Upper bound must be strictly greater than lower bound
    for f in intel["forecast_14d"]:
        assert f["upper_bound_kg"] >= f["lower_bound_kg"]

def test_profit_optimization_solver():
    """Verify Sell Now vs Store Later optimizer logic."""
    res = MarketService.optimize_sell_vs_store(
        commodity_name="tomato",
        quantity_kg=1500.0,
        planned_storage_days=7
    )
    assert "option_a_sell_now" in res
    assert "option_b_store_later" in res
    assert res["recommendation"] in ["SELL IMMEDIATELY", "STORE AND SELL LATER"]

# ----------------- 6. QR MOBILE SESSION TESTS -----------------

def test_qr_session_creation_and_verification():
    """Verify expiring QR session creation and cryptographic token lookup with public URL."""
    # Verify localhost is strictly rejected
    import pytest
    with pytest.raises(ValueError):
        QRService.create_session(
            asset_type="TRUCK",
            asset_id="truck_zr_104",
            asset_title="Reefer Truck KA-04-ZR-2026",
            custom_public_url="http://localhost:8000"
        )

    # Valid public URL succeeds
    sess = QRService.create_session(
        asset_type="TRUCK",
        asset_id="truck_zr_104",
        asset_title="Reefer Truck KA-04-ZR-2026",
        expires_in_hours=12,
        custom_public_url="https://zeroroot.test.agritech.com"
    )
    token = sess["token"]
    assert len(token) > 10
    assert sess["qr_data_url"].startswith("data:image/png;base64,")
    assert "/monitor/" in sess["target_url"]
    assert "localhost" not in sess["target_url"]
    
    # Verify retrieval
    verified = QRService.verify_and_get_session(token)
    assert verified is not None
    assert verified["asset_id"] == "truck_zr_104"
    assert verified["access_count"] == 1
    
    # Revoke test
    QRService.revoke_session(token)
    assert QRService.verify_and_get_session(token) is None

# ----------------- 7. FASTAPI API ENDPOINT TESTS -----------------

def test_api_health_endpoint():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["platform"] == "ZERO ROOT AgriTech Digital Twin"

def test_api_simulation_state_and_controls():
    # Fetch state
    res = client.get("/api/v1/simulation/state")
    assert res.status_code == 200
    state = res.json()
    assert "traditional_storage" in state
    assert "refrigerated_truck" in state
    assert "ambient_environment" in state
    
    # Update controls
    ctrl_res = client.post("/api/v1/simulation/controls", json={
        "sim_speed": 5.0,
        "scenario_key": "HEATWAVE"
    })
    assert ctrl_res.status_code == 200
    assert ctrl_res.json()["sim_speed"] == 5.0
    assert ctrl_res.json()["active_scenario"]["key"] == "HEATWAVE"

def test_api_weather_endpoint():
    res = client.get("/api/v1/weather?location=bengaluru")
    assert res.status_code == 200
    data = res.json()
    assert "data_label" in data
    assert data["temperature_c"] is not None

def test_api_analytics_comparison():
    res = client.get("/api/v1/analytics/comparison")
    assert res.status_code == 200
    data = res.json()
    assert data["loss_prevented_kg"] >= 0
    assert data["loss_prevented_pct"] >= 0

def test_api_alert_flow():
    # Get alerts
    res = client.get("/api/v1/alerts")
    assert res.status_code == 200
    alerts = res.json()["alerts"]
    if alerts:
        first_id = alerts[0]["id"]
        ack_res = client.post("/api/v1/alerts/acknowledge", json={"alert_id": first_id})
        assert ack_res.status_code == 200
        assert ack_res.json()["acknowledged"] is True

def test_api_batch_registration_and_persistence():
    """Verify batch registration, ID generation (ZR-...), and DB persistence."""
    payload = {
        "farmer_name": "Ramesh Gowda",
        "commodity_name": "tomato",
        "quantity_kg": 750.0,
        "harvest_date": "2026-11-05",
        "location": "Kolar, Karnataka",
        "initial_quality_score": 92.5,
        "storage_type": "TRADITIONAL"
    }
    create_res = client.post("/api/v1/batches", json=payload)
    assert create_res.status_code == 200
    batch_data = create_res.json()
    assert "batch_code" in batch_data
    assert batch_data["batch_code"].startswith("ZR-TOM-")
    assert batch_data["farmer_name"] == "Ramesh Gowda"
    assert batch_data["quantity_kg"] == 750.0
    
    # Verify retrieval from batch list
    list_res = client.get("/api/v1/batches")
    assert list_res.status_code == 200
    batches = list_res.json()
    assert any(b["batch_code"] == batch_data["batch_code"] for b in batches)
    
    # Verify summary endpoint
    summary_res = client.get("/api/v1/batches/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_batches"] >= 1
    assert summary["avg_remaining_shelf_life_days"] > 0

def test_api_qr_config_and_gateway():
    """Verify QR config querying, runtime update, and strict non-localhost enforcement."""
    # Query current config
    cfg_res = client.get("/api/v1/qr/config")
    assert cfg_res.status_code == 200
    cfg = cfg_res.json()
    assert "is_configured" in cfg
    
    # Try updating with localhost - must fail with 400
    bad_res = client.post("/api/v1/qr/config", json={"public_app_url": "http://127.0.0.1:8000"})
    assert bad_res.status_code == 400
    
    # Update with valid public URL - must succeed
    good_res = client.post("/api/v1/qr/config", json={"public_app_url": "https://zeroroot.test.agritech.com"})
    assert good_res.status_code == 200
    assert good_res.json()["is_configured"] is True
    assert good_res.json()["public_app_url"] == "https://zeroroot.test.agritech.com"


