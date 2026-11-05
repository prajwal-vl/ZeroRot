# ZERO ROT 2.0 — Comprehensive REST & WebSocket API Documentation
**Project Code:** AGR007  
**Base URL:** `http://localhost:8000/api/v1`  
**WebSocket URL:** `ws://localhost:8000/ws/simulation`  
**Date:** November 2026  

---

## 1. Authentication & User Management

### `POST /api/v1/auth/register`
Registers a new user. The first registered user is automatically granted `ADMIN` privileges.
- **Request Body:**
```json
{
  "email": "operator@zerorot.agri",
  "full_name": "Agri Operations Manager",
  "password": "SecurePassword123!",
  "role": "ADMIN",
  "phone_number": "+919876543210"
}
```
- **Response (200 OK):**
```json
{
  "id": 1,
  "email": "operator@zerorot.agri",
  "full_name": "Agri Operations Manager",
  "role": "ADMIN",
  "is_active": true,
  "created_at": "2026-11-05T12:00:00Z"
}
```

### `POST /api/v1/auth/login`
Authenticates user and returns JWT bearer token.
- **Request Body (application/x-www-form-urlencoded or JSON):**
```json
{
  "username": "operator@zerorot.agri",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "ADMIN"
}
```

---

## 2. Scientific Commodity Registry

### `GET /api/v1/commodities/catalog`
Returns scientific post-harvest parameters and kinetic constants for all 8 commodities.
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "total_commodities": 8,
  "commodities": [
    {
      "key": "mango",
      "name": "Mango",
      "botanical_name": "Mangifera indica (Alphonso / Kesar)",
      "category": "Tropical Fruit",
      "climacteric": true,
      "optimal_temp_c": 12.0,
      "optimal_temp_range_c": [11.0, 13.0],
      "optimal_rh_pct": 90.0,
      "optimal_rh_range_pct": [85.0, 95.0],
      "chilling_injury_threshold_c": 10.0,
      "freezing_point_c": -1.4,
      "activation_energy_ea_j_mol": 58000.0,
      "q10_decay": 2.2,
      "base_decay_rate_day": 0.04,
      "max_shelf_life_days_optimal": 25.0,
      "critical_quality_threshold": 40.0
    }
  ]
}
```

---

## 3. Multi-Stage Supply Chain Network (ISOMORPH Architecture)

### `GET /api/v1/supply-chain/network`
Returns the 7-stage supply chain network digital twin graph structure and status.
- **Response (200 OK):**
```json
{
  "nodes": [
    {
      "node_id": "NODE_FARM",
      "name": "Khed Farm Gate",
      "stage_number": 1,
      "stage_name": "Farm Origin",
      "city": "Khed, Pune",
      "latitude": 18.8415,
      "longitude": 73.8966,
      "facility_type": "FARM",
      "capacity_tonnes": 50.0,
      "current_inventory_tonnes": 15.0,
      "storage_temp_c": 28.0,
      "storage_rh_pct": 60.0,
      "health_status": "NORMAL"
    }
  ],
  "edges": [
    {
      "edge_id": "EDGE_5_6",
      "from_node_id": "NODE_TRANSIT",
      "to_node_id": "NODE_RDC",
      "name": "Expressway Reefer Haulage to Urban RDC",
      "distance_km": 110.0,
      "transit_hours": 3.5,
      "transport_mode": "REEFER_TRUCK",
      "status": "NORMAL"
    }
  ],
  "active_scenarios": []
}
```

### `POST /api/v1/supply-chain/disrupt`
Injects cascading logistics or storage disruptions into the network graph.
- **Request Body:**
```json
{
  "scenario_key": "HEATWAVE_TRANSIT_DELAY"
}
```
- **Supported Keys:** `HEATWAVE_TRANSIT_DELAY`, `COLD_HUB_POWER_OUTAGE`, `ETHYLENE_CROSS_CONTAMINATION`, `RESET_NORMAL`
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "impact": {
    "scenario": "HEATWAVE_TRANSIT_DELAY",
    "title": "Severe Transit Heatwave & Reefer Failure",
    "affected_components": ["EDGE_5_6", "NODE_TRANSIT", "NODE_RDC"],
    "transit_time_surge_hours": 6.0,
    "cargo_temp_rise_c": 29.8,
    "cascading_impact": "Downstream RDC docking bottleneck with 3.8x Arrhenius decay rate surge"
  }
}
```

### `POST /api/v1/supply-chain/simulate-journey`
Simulates a produce batch through all 7 stages from Farm Origin to Mandi Terminal.
- **Request Body:**
```json
{
  "commodity": "tomato",
  "quantity_kg": 2000.0,
  "initial_quality_score": 98.0,
  "farmgate_rate_inr_kg": 35.0
}
```
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "journey_simulation": {
    "commodity": "Tomato",
    "initial_quantity_kg": 2000.0,
    "final_quantity_kg": 1968.4,
    "shrinkage_loss_pct": 1.58,
    "initial_quality": 98.0,
    "final_quality": 88.4,
    "final_grade": "GRADE_A_EXPORT",
    "total_transit_hours": 46.2,
    "logistics_cost_inr": 21850.0,
    "initial_farmgate_value_inr": 70000.0,
    "final_revenue_inr": 106785.7,
    "net_margin_inr": 14935.7,
    "stage_traces": [ ... ]
  }
}
```

---

## 4. Counterfactual Scenario Lab

### `POST /api/v1/counterfactual/run`
Evaluates 4 parallel operational policies and generates financial avoided-loss waterfalls.
- **Request Body:**
```json
{
  "commodity": "mango",
  "quantity_kg": 2500.0,
  "current_quality_score": 94.0,
  "current_market_rate_inr_kg": 60.0,
  "horizon_days": 7.0,
  "baseline_temp_c": 28.0,
  "baseline_rh_pct": 60.0
}
```
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "comparison": {
    "commodity": "Mango",
    "horizon_days": 7.0,
    "initial_market_value_inr": 150000.0,
    "scenarios": {
      "baseline": {
        "final_quality": 64.2,
        "remaining_shelf_life_days": 2.8,
        "economic_loss_inr": 38500.0,
        "avoided_loss_inr": 0.0,
        "net_benefit_inr": 0.0,
        "roi_pct": 0.0
      },
      "ai_optimal": {
        "final_quality": 89.1,
        "remaining_shelf_life_days": 18.5,
        "intervention_cost_inr": 4625.0,
        "economic_loss_inr": 8200.0,
        "avoided_loss_inr": 30300.0,
        "net_benefit_inr": 25675.0,
        "roi_pct": 555.1
      }
    },
    "ai_verdict": {
      "recommended_scenario": "ai_optimal",
      "avoided_loss_inr": 30300.0,
      "net_benefit_inr": 25675.0,
      "roi_pct": 555.1
    }
  }
}
```

---

## 5. Tri-Model Spoilage Engine

### `POST /api/v1/ml/spoilage-benchmark`
Executes tri-model inference comparing Physics-Only, ML-Surrogate, and Hybrid Ensemble.
- **Request Body:**
```json
{
  "commodity": "banana",
  "current_quality_score": 85.0,
  "temperature_c": 18.5,
  "rh_pct": 80.0,
  "co2_ppm": 850.0,
  "ethylene_ppm": 0.15
}
```
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "tri_model_benchmark": {
    "commodity": "Banana",
    "models": {
      "physics_only": {
        "projected_quality_24h": 81.3,
        "projected_shelf_life_days": 14.2,
        "metrics": { "mae_quality_pct": 3.82, "rmse_quality_pct": 4.95 }
      },
      "ml_surrogate": {
        "projected_quality_24h": 80.6,
        "projected_shelf_life_days": 13.8,
        "metrics": { "mae_quality_pct": 2.94, "rmse_quality_pct": 3.78 }
      },
      "hybrid_ensemble": {
        "projected_quality_24h": 81.0,
        "projected_shelf_life_days": 14.0,
        "confidence_score": 0.974,
        "uncertainty_margin_pct": 3.29,
        "metrics": { "mae_quality_pct": 1.68, "classification": { "f1_score": 0.97 } }
      }
    },
    "consensus": {
      "authoritative_quality_24h": 81.0,
      "authoritative_shelf_life_days": 14.0,
      "spoilage_risk_tier": "NOMINAL"
    }
  }
}
```

---

## 6. Agentic Decision Engine

### `POST /api/v1/agents/decision-cycle`
Executes autonomous 9-step closed-loop decision cycle for a batch.
- **Request Body:**
```json
{
  "batch_code": "ZR-BAN-449",
  "commodity": "banana",
  "quantity_kg": 3000.0,
  "current_quality_score": 78.0,
  "temperature_c": 24.5,
  "rh_pct": 65.0,
  "co2_ppm": 950.0,
  "ethylene_ppm": 0.22,
  "storage_type": "COLD_STORAGE",
  "mandi_rate_inr_kg": 38.0
}
```
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "decision_cycle": {
    "decision_cycle_id": "DEC_ZR-BAN-449_180500",
    "step_1_observe": { ... },
    "step_2_detect": {
      "anomalies_detected": [
        "Temperature excursion: 24.5°C exceeds optimal (13.5°C) by 11.0°C",
        "Elevated ethylene: 0.22 ppm triggers autocatalytic senescence"
      ],
      "is_stress_detected": true
    },
    "step_3_diagnose": {
      "root_causes": [
        "Refrigeration system deficit: Evaporator coil icing or door ajar causing heat infiltration"
      ]
    },
    "step_4_predict": {
      "projected_quality_72h": 58.2,
      "unmitigated_shelf_life_days": 3.2,
      "predicted_loss_inr": 31250.0
    },
    "step_5_6_options": [
      {
        "option_id": "OPT_CLIMATE_OPTIMIZE",
        "title": "Precision Thermal & Humidity Setpoint Correction",
        "operational_cost_inr": 4800.0,
        "avoided_loss_inr": 24375.0,
        "net_benefit_inr": 19575.0,
        "shelf_life_gain_days": 12.6,
        "automated_executable": true
      }
    ],
    "step_7_recommend": {
      "recommended_option_id": "OPT_CLIMATE_OPTIMIZE",
      "net_benefit_inr": 19575.0,
      "rationale": "Executing 'Precision Thermal & Humidity Setpoint Correction' delivers maximum net economic benefit of ₹19,575.00."
    }
  }
}
```

---

## 7. Virtual Sensor Network Telemetry

### `GET /api/v1/sensors/network-status`
Returns status and battery health for the simulated virtual sensor nodes.
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "cluster": [
    {
      "sensor_id": "sens_temp_CENTRAL_HUB",
      "sensor_type": "TEMPERATURE",
      "unit": "°C",
      "last_value": 4.12,
      "battery_level_pct": 99.8,
      "is_faulty": false,
      "fault_type": "NONE",
      "data_label": "SIMULATED"
    }
  ]
}
```

### `POST /api/v1/sensors/fault-injection`
Injects hardware faults: `DRIFT`, `FROZEN`, `DROPOUT`, or `BATTERY_DEAD`.
- **Request Body:**
```json
{
  "batch_code": "ZR-BAN-449",
  "sensor_type": "TEMPERATURE",
  "fault_type": "DRIFT",
  "offset": 4.5
}
```
- **Response (200 OK):**
```json
{
  "status": "SUCCESS",
  "message": "Fault 'DRIFT' injected into TEMPERATURE sensor for batch ZR-BAN-449."
}
```

---

## 8. WebSocket Telemetry Feed

### `ws://localhost:8000/ws/simulation`
Real-time full-duplex WebSocket streaming authoritative physics updates every second.
- **Message Format:**
```json
{
  "sim_id": "sim_master_zr",
  "timestamp": "2026-11-05T18:10:00Z",
  "is_running": true,
  "speed_factor": 1.0,
  "cold_warehouse": {
    "total_stored_tonnes": 310.0,
    "chambers": {
      "CH_A": { "temp_c": 12.0, "rh_pct": 90.0, "quality_score": 96.5 }
    }
  },
  "refrigerated_truck": {
    "mean_cargo_temp_c": 4.2,
    "reefer_active": true,
    "speed_kmh": 65.0
  },
  "alerts": []
}
```
