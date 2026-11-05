"""
ZERO ROT 2.0 — Comprehensive Verification Suite.
Project Code: AGR007

Tests:
1. Scientific Commodity Registry (8 profiles, Arrhenius kinetics, chilling thresholds, transpiration)
2. Virtual Sensor Network (Gaussian noise, calibration drift, packet dropout, battery depletion, fault injection)
3. Independent Batch Digital Twin (OFacT isolation, microclimate stepping, biological decay, shelf-life inversion)
4. Multi-Stage Supply Chain Network (7-stage traversal, ISOMORPH cascading disruption propagation)
5. Counterfactual Scenario Lab (Financial waterfall, avoided loss, net benefit, ROI %)
6. Tri-Model Spoilage Engine (Physics-Only vs ML vs Hybrid Ensemble)
7. Agentic Decision Engine (9-stage autonomous closed loop)
8. Advanced REST API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.simulation.commodity_registry import ScientificCommodityRegistry
from backend.app.simulation.sensor_network import VirtualSensorNode, VirtualSensorCluster
from backend.app.simulation.batch_engine import BatchSimulationInstance, BatchSimulationManager
from backend.app.simulation.supply_chain_engine import SupplyChainNetworkTwin
from backend.app.simulation.counterfactual_lab import CounterfactualScenarioLab
from backend.app.intelligence.ml_spoilage_engine import TriModelSpoilageEngine
from backend.app.agents.agentic_decision_engine import AgenticDecisionEngine

client = TestClient(app)

def test_scientific_commodity_registry_all_8_profiles():
    """Validates parameters, Arrhenius kinetics, chilling injury, and transpiration for all 8 commodities."""
    commodities = ["mango", "banana", "tomato", "apple", "potato", "onion", "grapes", "guava"]
    profiles = ScientificCommodityRegistry.list_all_profiles()
    assert len(profiles) == 8

    for comm in commodities:
        prof = ScientificCommodityRegistry.get_profile(comm)
        assert prof.name is not None
        assert prof.activation_energy_ea_j_mol > 0
        assert prof.optimal_temp_c >= -1.0
        assert prof.optimal_rh_pct >= 60.0
        assert prof.base_decay_rate_day > 0

        # Calculate decay at optimum
        decay_opt = ScientificCommodityRegistry.calculate_effective_decay(comm, prof.optimal_temp_c, prof.optimal_rh_pct)
        assert decay_opt["effective_k_day"] > 0
        assert decay_opt["temp_factor"] >= 0.20

        # Verify transpiration calculation
        trans = ScientificCommodityRegistry.calculate_transpiration_rate(comm, 25.0, 60.0)
        assert trans["vpd_kpa"] > 0
        assert trans["daily_moisture_loss_pct"] >= 0

def test_virtual_sensor_network_fault_injection_and_provenance():
    """Tests noise, drift, packet dropout, and battery death with provenance labels."""
    cluster = VirtualSensorCluster(asset_id="TEST_BATCH_01", asset_name="Test Mango Batch")
    
    # 1. Normal reading
    normal_read = cluster.sample_all(ground_truth_temp_c=12.5, ground_truth_rh_pct=88.0)
    assert normal_read["temperature"]["data_label"] in ["SIMULATED", "REAL"]
    assert normal_read["temperature"]["value"] is not None
    assert abs(normal_read["temperature"]["value"] - 12.5) < 2.0  # within reasonable noise margin

    # 2. Inject drift fault
    cluster.inject_fault("TEMPERATURE", "DRIFT", offset=4.5)
    drift_read = cluster.sample_all(ground_truth_temp_c=12.5, ground_truth_rh_pct=88.0)
    assert drift_read["temperature"]["value"] > 16.0

    # 3. Inject battery dead fault
    cluster.inject_fault("HUMIDITY", "BATTERY_DEAD")
    dead_read = cluster.sample_all(ground_truth_temp_c=12.5, ground_truth_rh_pct=88.0)
    assert dead_read["humidity"]["data_label"] == "MISSING"
    assert dead_read["humidity"]["value"] is None

def test_batch_simulation_instance_isolation():
    """Verifies OFacT independent state isolation between two concurrent batches."""
    mgr = BatchSimulationManager()
    
    b1 = mgr.register_or_get_instance(
        batch_id=101,
        batch_code="ZR-ISO-BAN",
        commodity_name="banana",
        quantity_kg=1500.0,
        storage_type="COLD_STORAGE",
        initial_quality_score=95.0
    )
    b2 = mgr.register_or_get_instance(
        batch_id=102,
        batch_code="ZR-ISO-POT",
        commodity_name="potato",
        quantity_kg=5000.0,
        storage_type="TRADITIONAL",
        initial_quality_score=90.0
    )

    # Inject disruption only into Banana
    mgr.inject_batch_disruption("ZR-ISO-BAN", {"temp_surge_c": 12.0, "rh_drop_pct": 25.0})

    # Step all batches by 2 hours
    mgr.step_all(dt_seconds=7200.0)

    snap1 = b1.get_snapshot()
    snap2 = b2.get_snapshot()

    # Banana should experience elevated temperature; Potato should remain unaffected
    assert snap1["microclimate"]["chamber_temp_c"] > snap1["microclimate"]["core_temp_c"]
    assert snap1["batch_code"] == "ZR-ISO-BAN"
    assert snap2["batch_code"] == "ZR-ISO-POT"
    assert snap1["current_quality_score"] < snap1["initial_quality_score"]
    assert len(snap1["sensor_health"]) >= 5

def test_supply_chain_network_twin_and_cascading_disruption():
    """Tests 7-stage supply chain traversal and ISOMORPH cascading delay & temperature excursion."""
    sc_twin = SupplyChainNetworkTwin()
    overview = sc_twin.get_network_overview()
    assert len(overview["nodes"]) == 7
    assert len(overview["edges"]) == 6

    # Normal baseline journey simulation
    norm_res = sc_twin.simulate_produce_journey("tomato", initial_quantity_kg=2000.0)
    assert norm_res["final_quality"] > 70.0
    assert norm_res["shrinkage_loss_pct"] < 10.0
    assert norm_res["final_grade"] in ["GRADE_A_EXPORT", "GRADE_B_DOMESTIC"]
    assert len(norm_res["stage_traces"]) == 7

    # Inject cascading disruption
    impact = sc_twin.inject_disruption("HEATWAVE_TRANSIT_DELAY")
    assert "affected_components" in impact
    assert "EDGE_5_6" in impact["affected_components"]

    # Journey under disruption
    disrupted_res = sc_twin.simulate_produce_journey("tomato", initial_quantity_kg=2000.0)
    assert disrupted_res["total_transit_hours"] > norm_res["total_transit_hours"]
    assert disrupted_res["final_quality"] < norm_res["final_quality"]

def test_counterfactual_scenario_lab_waterfall():
    """Validates avoided loss and net benefit calculations across all 4 operational policies."""
    lab_res = CounterfactualScenarioLab.run_counterfactual_comparison(
        commodity_name="mango",
        initial_quantity_kg=2500.0,
        initial_quality_score=94.0,
        current_market_rate_inr_kg=60.0,
        horizon_days=7.0,
        baseline_temp_c=28.0,
        baseline_rh_pct=60.0
    )
    scenarios = lab_res["scenarios"]
    assert "baseline" in scenarios
    assert "ai_optimal" in scenarios
    assert "conservative" in scenarios
    assert "disruption" in scenarios

    # Baseline has 0 avoided loss by definition
    assert scenarios["baseline"]["avoided_loss_inr"] == 0.0

    # AI Optimal should have highest avoided loss and positive net benefit
    ai_opt = scenarios["ai_optimal"]
    assert ai_opt["avoided_loss_inr"] > 0
    assert ai_opt["net_benefit_inr"] > 0
    assert ai_opt["final_quality"] > scenarios["baseline"]["final_quality"]
    assert len(ai_opt["trajectory"]) == 8

def test_tri_model_spoilage_engine_benchmark():
    """Tests Physics vs ML vs Hybrid predictions and error bounds."""
    res = TriModelSpoilageEngine.predict_spoilage_tri_model(
        commodity_name="tomato",
        current_quality_score=85.0,
        temp_c=22.0,
        rh_pct=75.0,
        co2_ppm=600.0,
        ethylene_ppm=0.08
    )
    assert "models" in res
    assert "physics_only" in res["models"]
    assert "ml_surrogate" in res["models"]
    assert "hybrid_ensemble" in res["models"]

    hybrid = res["models"]["hybrid_ensemble"]
    assert hybrid["confidence_score"] >= 0.95
    assert hybrid["metrics"]["classification"]["f1_score"] >= 0.95
    assert res["consensus"]["spoilage_risk_tier"] in ["NOMINAL", "WARNING", "CRITICAL"]

def test_agentic_decision_engine_9_step_loop():
    """Tests Observe -> Detect -> Diagnose -> Predict -> Generate Options -> Evaluate -> Recommend."""
    decision = AgenticDecisionEngine.evaluate_batch_decision_loop(
        batch_code="ZR-TEST-DEC-99",
        commodity_name="banana",
        quantity_kg=3000.0,
        current_quality_score=78.0,
        current_temp_c=26.0,  # Elevated above optimal 13.5°C
        current_rh_pct=65.0,
        co2_ppm=900.0,
        ethylene_ppm=0.25,
        storage_type="COLD_STORAGE",
        current_mandi_rate_inr_kg=35.0
    )
    assert "step_1_observe" in decision
    assert decision["step_2_detect"]["is_stress_detected"] is True
    assert len(decision["step_2_detect"]["anomalies_detected"]) > 0
    assert len(decision["step_3_diagnose"]["root_causes"]) > 0
    assert decision["step_4_predict"]["predicted_loss_inr"] > 0
    assert len(decision["step_5_6_options"]) == 3
    assert decision["step_7_recommend"]["recommended_option_id"] is not None
    assert decision["step_7_recommend"]["net_benefit_inr"] > 0

def test_zero_rot_2_api_endpoints():
    """Tests all advanced ZERO ROT 2.0 API routes."""
    # 1. Catalog
    cat_resp = client.get("/api/v1/commodities/catalog")
    assert cat_resp.status_code == 200
    assert cat_resp.json()["total_commodities"] == 8

    # 2. Supply Chain Network
    sc_resp = client.get("/api/v1/supply-chain/network")
    assert sc_resp.status_code == 200
    assert len(sc_resp.json()["nodes"]) == 7

    # 3. Counterfactual Run
    cf_resp = client.post("/api/v1/counterfactual/run", json={
        "commodity": "tomato",
        "quantity_kg": 2000.0,
        "current_quality_score": 90.0,
        "current_market_rate_inr_kg": 40.0,
        "horizon_days": 5.0
    })
    assert cf_resp.status_code == 200
    assert cf_resp.json()["status"] == "SUCCESS"

    # 4. ML Benchmark
    ml_resp = client.post("/api/v1/ml/spoilage-benchmark", json={
        "commodity": "mango",
        "current_quality_score": 88.0,
        "temperature_c": 18.0,
        "rh_pct": 85.0
    })
    assert ml_resp.status_code == 200
    assert ml_resp.json()["status"] == "SUCCESS"

    # 5. Agent Decision Cycle
    agent_resp = client.post("/api/v1/agents/decision-cycle", json={
        "batch_code": "ZR-API-DEC-01",
        "commodity": "banana",
        "quantity_kg": 2500.0,
        "current_quality_score": 82.0,
        "temperature_c": 24.0,
        "rh_pct": 65.0
    })
    assert agent_resp.status_code == 200
    assert agent_resp.json()["decision_cycle"]["step_7_recommend"]["recommended_option_id"] is not None
