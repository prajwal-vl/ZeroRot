"""
ZERO ROT 2.1 — End-to-End Closed-Loop Incident Demonstration Test.
Validates the complete lifecycle:
1. Banana batch in Cold Storage
2. Compressor failure disruption injection
3. Chamber and produce core temperature thermal divergence
4. Agentic Decision Engine detection, root cause diagnosis, and 3-option generation
5. Operator approval and execution of intervention via POST /api/v1/agents/interventions/apply
6. Database entity state mutation and compliance audit record logging
7. Counterfactual waterfall validation (unmitigated vs mitigated)
8. Supply chain logistics network re-routing
9. Mandi intelligence and APMC demand verification
10. Quantitative economic delta and avoided loss validation
"""

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.models import ProduceBatch, AuditLog, User
from backend.app.simulation.engine import master_simulation
from backend.app.simulation.batch_engine import BatchSimulationManager
from backend.app.agents.agentic_decision_engine import AgenticDecisionEngine
from backend.app.simulation.counterfactual_lab import CounterfactualScenarioLab
from backend.app.services.market_service import MarketService

client = TestClient(app)

def test_full_banana_compressor_incident_and_intervention_cycle():
    db = SessionLocal()
    batch_code = f"ZR-BAN-INCIDENT-{int(datetime.now(timezone.utc).timestamp())}"

    # 1. Start with batch of bananas in Cold Storage
    batch = ProduceBatch(
        batch_code=batch_code,
        commodity_id=2, # banana
        commodity_name="banana",
        quantity_kg=3000.0,
        initial_quality_score=96.0,
        current_quality_score=96.0,
        storage_type="COLD_STORAGE",
        simulation_status="ACTIVE",
        remaining_shelf_life_days=18.0,
        harvest_date=datetime.now(timezone.utc) - timedelta(days=1)
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # 2. Inject compressor failure disruption
    mgr = BatchSimulationManager()
    mgr.inject_batch_disruption(batch_code, {
        "event": "COMPRESSOR_FAILURE",
        "temp_surge_c": 12.0,
        "rh_drop_pct": 20.0,
        "ethylene_spike_ppm": 0.20
    })

    # 3. Step physics and observe chamber vs core temperature divergence
    inst = mgr.register_or_get_instance(
        batch_id=batch.id,
        batch_code=batch.batch_code,
        commodity_name="banana",
        quantity_kg=3000.0,
        storage_type="COLD_STORAGE",
        initial_quality_score=96.0
    )
    initial_core_temp = inst.microclimate.produce_core_temp_c

    # Advance by 3 hours of active disruption
    step_res = inst.step(dt_seconds=10800.0, ambient_temp_c=32.0, active_disruption=mgr.active_disruptions.get(batch_code))
    
    # Chamber temp surges immediately; core temp lags due to thermal mass (Biot inertia)
    assert inst.microclimate.chamber_temp_c > initial_core_temp + 3.0
    assert inst.microclimate.produce_core_temp_c > initial_core_temp
    assert inst.microclimate.chamber_temp_c > inst.microclimate.produce_core_temp_c

    # 4. Agentic Decision Engine evaluates the stressed batch
    decision = AgenticDecisionEngine.evaluate_batch_decision_loop(
        batch_code=batch_code,
        commodity_name="banana",
        quantity_kg=3000.0,
        current_quality_score=inst.current_quality_score,
        current_temp_c=inst.microclimate.produce_core_temp_c,
        current_rh_pct=inst.microclimate.chamber_rh_pct,
        co2_ppm=inst.microclimate.chamber_co2_ppm,
        ethylene_ppm=inst.microclimate.chamber_ethylene_ppm,
        storage_type="COLD_STORAGE",
        current_mandi_rate_inr_kg=38.0
    )

    assert decision["step_2_detect"]["is_stress_detected"] is True
    assert len(decision["step_2_detect"]["anomalies_detected"]) > 0
    assert len(decision["step_3_diagnose"]["root_causes"]) > 0
    assert len(decision["step_5_6_options"]) == 3
    assert decision["step_7_recommend"]["recommended_option_id"] is not None
    assert decision["step_7_recommend"]["net_benefit_inr"] > 0

    # 5. Approve and apply intervention: OPT_EXPEDITE_MANDI
    apply_resp = client.post("/api/v1/agents/interventions/apply", json={
        "batch_code": batch_code,
        "option_id": "OPT_EXPEDITE_MANDI",
        "notes": "Incident remediation: Expedite express auction reefer truck"
    })
    assert apply_resp.status_code == 200
    res_data = apply_resp.json()
    assert res_data["status"] == "SUCCESS"

    # 6. Verify state changes in database
    db.refresh(batch)
    assert batch.storage_type == "IN_TRANSIT"
    assert "Express Reefer" in batch.current_location

    # Verify compliance audit log was recorded
    audit_record = db.query(AuditLog).filter(
        AuditLog.action == "APPLY_INTERVENTION_OPT_EXPEDITE_MANDI"
    ).order_by(AuditLog.id.desc()).first()
    assert audit_record is not None
    assert batch_code in audit_record.details

    # 7. Validate Counterfactual Scenario Lab waterfall
    cf_res = CounterfactualScenarioLab.simulate_waterfall(
        commodity_name="banana",
        quantity_kg=3000.0,
        current_quality_score=batch.current_quality_score,
        current_temp_c=inst.microclimate.produce_core_temp_c,
        current_rh_pct=inst.microclimate.chamber_rh_pct,
        current_market_rate_inr_kg=38.0,
        horizon_days=5.0
    )
    assert cf_res["avoided_loss_inr"] > 0
    assert cf_res["scenarios"]["ai_optimal"]["final_quality"] > cf_res["scenarios"]["baseline"]["final_quality"]

    # 8. Validate Supply Chain Network view
    sc_resp = client.get("/api/v1/supply-chain/network")
    assert sc_resp.status_code == 200
    assert len(sc_resp.json()["nodes"]) >= 5

    # 9. Verify Mandi market intelligence trends
    mandi_intel = MarketService.get_market_intelligence("banana", "bengaluru")
    assert mandi_intel["current_modal_price_qtl"] > 0
    assert len(mandi_intel["forecast_14d"]) == 14

    # 10. Confirm net economic benefit and avoided loss are calculated honestly
    assert res_data["post_intervention_trajectory"]["avoided_loss_inr"] > 0
    assert res_data["post_intervention_trajectory"]["co2_emissions_avoided_kg"] > 0

    # Cleanup test batch
    db.delete(batch)
    db.commit()
    db.close()
