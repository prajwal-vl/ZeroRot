"""
Rigorous Validation Test Suite for Zero Rot Post-Harvest Digital Twin Physics & Kinetics.
Covers:
- Arrhenius Q10 temperature-dependent deterioration kinetics
- Chilling injury non-linear physiological degradation
- Labuza relative humidity / water activity moisture penalty
- Dalton's Law oxygen partial pressure & anaerobic hypoxia penalty
- First-order quality decay kinetics & analytic remaining shelf-life inversion
- Transient thermal energy balance differential equations
- Independent multi-batch kinetic deterioration stepping
- Persistent simulation run storage and state snapshot recording
- Real virtual sensor telemetry history and elimination of synthetic generation loops
- Authentic Mandi price integration and econometric uncertainty bounds
- Physical scenario injection across cold storage, traditional store, and truck twins
"""
import math
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import Base, engine, SessionLocal
from backend.app.seed import seed_database
from backend.app.models.models import (
    SimulationRecord, SimulationStateRecord, ProduceBatch,
    VirtualSensorReading, MandiPriceRecord
)
from backend.app.simulation.thermal_model import ThermalModel
from backend.app.simulation.gas_model import GasModel
from backend.app.simulation.deterioration_model import DeteriorationModel, COMMODITY_SHELF_LIFE_PARAMS
from backend.app.simulation.engine import SimulationEngine
from backend.app.services.market_service import MarketService
from backend.app.services.data_gov_service import DataGovService

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield

# ==================== 1. SPOILAGE & KINETICS EQUATIONS ====================

def test_arrhenius_q10_temperature_dependence():
    """
    Validates Arrhenius / Q10 rate scaling:
    f(T) = Q10 ^ ((T - T_opt) / 10)
    For Tomato: T_opt = 12.0°C, Q10 = 2.2
    """
    params = COMMODITY_SHELF_LIFE_PARAMS["tomato"]
    t_opt = params["optimal_temp_c"]
    q10 = params["q10_decay"]

    # Exactly at optimal temperature, temperature factor must be 1.0
    res_opt = DeteriorationModel.calculate_decay_rate("tomato", temp_c=t_opt, rh_pct=88.0, o2_pct=20.8, co2_ppm=450.0)
    assert math.isclose(res_opt["temp_factor"], 1.0, rel_tol=1e-3)

    # At T_opt + 10°C (22.0°C), temperature factor must equal Q10 (2.2)
    res_10c_above = DeteriorationModel.calculate_decay_rate("tomato", temp_c=t_opt + 10.0, rh_pct=88.0, o2_pct=20.8, co2_ppm=450.0)
    expected_factor = math.pow(q10, 1.0)
    assert math.isclose(res_10c_above["temp_factor"], expected_factor, rel_tol=1e-3)

    # At T_opt + 20°C (32.0°C), factor must equal Q10^2 = 4.84
    res_20c_above = DeteriorationModel.calculate_decay_rate("tomato", temp_c=t_opt + 20.0, rh_pct=88.0, o2_pct=20.8, co2_ppm=450.0)
    expected_factor_20 = math.pow(q10, 2.0)
    assert math.isclose(res_20c_above["temp_factor"], expected_factor_20, rel_tol=1e-2)

def test_chilling_injury_acceleration():
    """
    Validates that produce stored below its physiological chilling threshold
    experiences accelerated degradation (injury factor > 1.0).
    For Tomato: T_chill = 9.0°C
    """
    params = COMMODITY_SHELF_LIFE_PARAMS["tomato"]
    t_chill = params["chilling_injury_threshold_c"]

    # Cold storage above chilling injury threshold slows decay (factor < 1.0)
    res_safe_chill = DeteriorationModel.calculate_decay_rate("tomato", temp_c=10.0, rh_pct=88.0, o2_pct=20.8, co2_ppm=450.0)
    assert res_safe_chill["temp_factor"] < 1.0

    # Cold storage below chilling injury threshold (e.g. 4.0°C) triggers physiological chilling injury
    res_chilling_injury = DeteriorationModel.calculate_decay_rate("tomato", temp_c=4.0, rh_pct=88.0, o2_pct=20.8, co2_ppm=450.0)
    assert res_chilling_injury["temp_factor"] > 1.0
    assert res_chilling_injury["effective_k_day"] > res_safe_chill["effective_k_day"]

def test_labuza_water_activity_humidity_penalty():
    """
    Validates that Relative Humidity outside optimal bounds (85-90% for Tomato)
    penalizes quality through moisture loss (low RH) or mold condensation (high RH).
    """
    # Optimal RH range
    res_optimal = DeteriorationModel.calculate_decay_rate("tomato", temp_c=12.0, rh_pct=88.0, o2_pct=20.8, co2_ppm=450.0)
    assert math.isclose(res_optimal["humidity_factor"], 1.0, rel_tol=1e-3)

    # Dry deficit (60% RH -> 25% deficit): f_rh = 1.0 + 0.02 * 25 = 1.50
    res_dry = DeteriorationModel.calculate_decay_rate("tomato", temp_c=12.0, rh_pct=60.0, o2_pct=20.8, co2_ppm=450.0)
    assert res_dry["humidity_factor"] > 1.4

    # High moisture excess (96% RH -> 6% excess): f_rh = 1.0 + 0.035 * 6 = 1.21
    res_humid = DeteriorationModel.calculate_decay_rate("tomato", temp_c=12.0, rh_pct=96.0, o2_pct=20.8, co2_ppm=450.0)
    assert res_humid["humidity_factor"] > 1.15

def test_daltons_law_and_hypoxia_respiration_breakdown():
    """
    Validates Dalton's Law of Partial Pressures: P_O2 = y_O2 * P_total
    and anaerobic fermentation breakdown when O2 < 2.0%.
    """
    # Standard atmosphere: 101.325 kPa, 20°C, 60% RH
    res_daltons = GasModel.calculate_daltons_oxygen_partial_pressure(
        atmospheric_pressure_kpa=101.325,
        temp_c=20.0,
        relative_humidity_pct=60.0
    )
    p_o2 = res_daltons["daltons_p_o2_kpa"]
    assert 20.0 <= p_o2 <= 21.5

    # Hypoxia < 2.0% triggers gas factor penalty in DeteriorationModel
    res_hypoxia = DeteriorationModel.calculate_decay_rate("tomato", temp_c=12.0, rh_pct=88.0, o2_pct=1.0, co2_ppm=450.0)
    assert res_hypoxia["gas_factor"] > 1.0

def test_first_order_exponential_quality_decay_and_shelf_life_inversion():
    """
    Validates Q(t) = Q_0 * exp(-k * dt)
    and analytic Remaining Shelf Life: RSL = ln(Q_current / Q_crit) / k
    """
    step_res = DeteriorationModel.step_produce_quality(
        current_quality_score=95.0,
        commodity_name="tomato",
        temp_c=12.0,
        rh_pct=88.0,
        o2_pct=20.8,
        co2_ppm=450.0,
        dt_seconds=86400.0 # 1 full simulated day
    )

    k_day = step_res.get("k_decay_rate_day") or step_res.get("effective_k_day")
    assert k_day > 0
    expected_quality = 95.0 * math.exp(-k_day * 1.0)
    assert math.isclose(step_res["quality_score"], expected_quality, rel_tol=1e-2)

    crit_q = COMMODITY_SHELF_LIFE_PARAMS["tomato"]["critical_quality_threshold"]
    expected_rsl = math.log(step_res["quality_score"] / crit_q) / k_day
    assert math.isclose(step_res["remaining_shelf_life_days"], expected_rsl, rel_tol=1e-2)

def test_thermal_energy_balance_differential():
    """
    Validates Sensible Heat Differential Balance:
    m * c_p * (dT/dt) = Q_conductive + Q_ventilation + Q_respiration - Q_cooling
    """
    res_warming = ThermalModel.step_temperature(
        current_temp_c=10.0,
        ambient_temp_c=35.0, # Hot outdoor heat flux
        u_value=0.5,
        surface_area_m2=100.0,
        ventilation_rate_m3_s=0.01,
        cooling_power_watts=0.0, # Cooling off
        cooling_enabled=False,
        commodity_name="tomato",
        quantity_kg=1000.0,
        air_volume_m3=200.0,
        door_open=False,
        dt_seconds=3600.0 # 1 hour
    )
    # Temperature must rise due to conductive influx and respiration
    assert res_warming["internal_temp_c"] > 10.0
    assert res_warming["q_conductive_w"] > 0
    assert res_warming["q_respiration_w"] > 0

# ==================== 2. PERSISTENCE & MULTI-BATCH SIMULATION ====================

def test_persistent_simulation_run_storage():
    """
    Verify that SimulationRecord and SimulationStateRecord are genuinely created
    and persisted in SQLite relational storage.
    """
    db = SessionLocal()
    sim_uid = f"test_sim_{uuid.uuid4().hex[:6]}"
    sim = SimulationEngine(sim_id=sim_uid)
    
    # Run tick
    sim.tick(custom_dt_seconds=60.0)
    
    # Verify SimulationRecord exists
    rec = db.query(SimulationRecord).filter(SimulationRecord.sim_uuid == sim_uid).first()
    assert rec is not None
    assert rec.scenario_key == "NORMAL"
    assert rec.is_running is True

    # Persist state snapshot explicitly
    sim.persist_state_snapshot(db, rec, sim.get_state())
    
    # Verify SimulationStateRecord exists
    state_rec = db.query(SimulationStateRecord).filter(
        SimulationStateRecord.simulation_id == rec.id
    ).first()
    assert state_rec is not None
    assert state_rec.sim_time_seconds > 0
    assert "sim_id" in state_rec.state_payload
    db.close()

def test_independent_multi_batch_deterioration():
    """
    Verify that multiple active batches of different commodities and storage types
    deteriorate independently according to their own kinetic equations.
    """
    db = SessionLocal()
    tag = uuid.uuid4().hex[:6]
    code_ban = f"ZR-TEST-BAN-{tag}"
    code_tom = f"ZR-TEST-TOM-{tag}"

    # Create Batch 1: Banana in Cold Storage
    b1 = ProduceBatch(
        batch_code=code_ban,
        commodity_id=2,
        commodity_name="banana",
        quantity_kg=1000.0,
        initial_quality_score=96.0,
        current_quality_score=96.0,
        storage_type="COLD_STORAGE",
        simulation_status="ACTIVE",
        remaining_shelf_life_days=18.0,
        harvest_date=datetime.now(timezone.utc) - timedelta(days=2)
    )
    # Create Batch 2: Tomato in Traditional Storage (ambient warmth, faster decay)
    b2 = ProduceBatch(
        batch_code=code_tom,
        commodity_id=1,
        commodity_name="tomato",
        quantity_kg=800.0,
        initial_quality_score=96.0,
        current_quality_score=96.0,
        storage_type="TRADITIONAL",
        simulation_status="ACTIVE",
        remaining_shelf_life_days=14.0,
        harvest_date=datetime.now(timezone.utc) - timedelta(days=2)
    )
    db.add(b1)
    db.add(b2)
    db.commit()

    sim = SimulationEngine(sim_id=f"sim_multi_{tag}")
    
    # Step batches by 1 simulated day (86400 seconds)
    sim.step_active_batches(db, dt_seconds=86400.0)

    db.refresh(b1)
    db.refresh(b2)

    # Both quality scores must have degraded from 96.0
    assert b1.current_quality_score < 96.0
    assert b2.current_quality_score < 96.0

    # Traditional storage tomato decays faster than cold storage banana
    b1_drop = 96.0 - b1.current_quality_score
    b2_drop = 96.0 - b2.current_quality_score
    assert b2_drop > b1_drop

    # Verify real VirtualSensorReading rows were saved for both batches
    telemetry_b1 = db.query(VirtualSensorReading).filter(
        VirtualSensorReading.asset_id == code_ban
    ).all()
    telemetry_b2 = db.query(VirtualSensorReading).filter(
        VirtualSensorReading.asset_id == code_tom
    ).all()
    assert len(telemetry_b1) >= 3 # Temp, RH, Quality
    assert len(telemetry_b2) >= 3

    # Clean up
    db.delete(b1)
    db.delete(b2)
    for r in telemetry_b1 + telemetry_b2:
        db.delete(r)
    db.commit()
    db.close()

# ==================== 3. TELEMETRY & MANDI DATA INTEGRITY ====================

def test_telemetry_history_contains_genuine_records_no_synthetic_loop():
    """
    Verify GET /batches/{batch_id}/history returns authentic database-backed telemetry
    with realistic kinetics, not fabricated linear loops.
    """
    db = SessionLocal()
    tag = uuid.uuid4().hex[:6]
    code_hist = f"ZR-TEST-HIST-{tag}"
    batch = ProduceBatch(
        batch_code=code_hist,
        commodity_id=1,
        commodity_name="tomato",
        quantity_kg=500.0,
        initial_quality_score=92.0,
        current_quality_score=92.0,
        storage_type="TRADITIONAL",
        simulation_status="ACTIVE",
        remaining_shelf_life_days=12.0,
        harvest_date=datetime.now(timezone.utc) - timedelta(days=3)
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    batch_id = batch.id
    db.close()

    res = client.get(f"/api/v1/batches/{batch_id}/history")
    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    history = data["history"]
    assert len(history) >= 2

    # Check each history point has genuine structure and labels
    for pt in history:
        assert "day" in pt
        assert "date" in pt
        assert "quality_score" in pt
        assert "remaining_shelf_life_days" in pt
        assert "temp_c" in pt
        assert "rh_pct" in pt
        assert pt["data_label"] == "SIMULATED"

    # Quality must be decreasing monotonically over days
    qualities = [pt["quality_score"] for pt in history]
    for i in range(len(qualities) - 1):
        assert qualities[i] >= qualities[i + 1]

    # Verify sensor records were saved in the DB
    db2 = SessionLocal()
    readings = db2.query(VirtualSensorReading).filter(
        VirtualSensorReading.asset_id == code_hist
    ).all()
    assert len(readings) > 0
    
    # Clean up
    b_del = db2.query(ProduceBatch).filter(ProduceBatch.id == batch_id).first()
    if b_del:
        db2.delete(b_del)
    for r in readings:
        db2.delete(r)
    db2.commit()
    db2.close()

def test_market_intelligence_no_fabricated_fallbacks():
    """
    Verify MarketService.get_market_intelligence uses authentic Agmarknet
    data sources with econometric uncertainty intervals.
    """
    db = SessionLocal()
    intel = MarketService.get_market_intelligence("tomato", "bengaluru", db=db)
    db.close()

    assert intel["commodity"] == "tomato"
    assert "forecast_14d" in intel
    assert len(intel["forecast_14d"]) == 14
    assert len(intel["historical_30d"]) == 30
    assert intel["data_label"] in ["LIVE (AGMARKNET)", "CACHED (AGMARKNET)", "BENCHMARK_INDEX"]

    for fc in intel["forecast_14d"]:
        assert fc["lower_bound_kg"] <= fc["predicted_price_kg"] <= fc["upper_bound_kg"]
        assert "date" in fc
        assert "day_ahead" in fc

def test_physical_scenario_injection_affects_all_twins():
    """
    Verify that injecting physical scenarios (DOOR_AJAR, REEFER_FAILURE, HEATWAVE)
    updates all digital twins and persists the scenario in SimulationRecord.
    """
    sim = SimulationEngine(sim_id="test_scenario_physics")
    
    # 1. Inject DOOR_AJAR
    sim.set_controls(scenario_key="DOOR_AJAR")
    assert sim.truck.rear_door_open is True
    assert sim.traditional_store.door_open is True
    for ch in sim.cold_warehouse.chambers.values():
        assert ch.door_open is True

    # 2. Inject REEFER_FAILURE
    sim.set_controls(scenario_key="REEFER_FAILURE")
    assert sim.truck.reefer_fault is True
    for ch in sim.cold_warehouse.chambers.values():
        assert ch.compressor_fault is True
        assert ch.cooling_capacity_watts == 0.0

    # 3. Inject HEATWAVE
    sim.set_controls(scenario_key="HEATWAVE")
    st = sim.get_state()
    assert st["active_scenario"]["ambient_temp_delta"] == 10.0
    assert st["ambient_environment"]["temperature_c"] == sim.ambient_temp_c + 10.0

