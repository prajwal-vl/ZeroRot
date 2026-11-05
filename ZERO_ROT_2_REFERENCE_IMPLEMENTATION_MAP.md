# ZERO ROT 2.0 — Reference Implementation & Architecture Map

**Project Code:** `AGR007`  
**Platform:** Intelligent Post-Harvest Digital Twin and Agentic Decision Platform  
**Date:** November 2026

This document records the exact architectural patterns, mathematical concepts, data structures, and algorithmic principles adapted from the six mandatory technical reference projects into ZERO ROT 2.0.

---

## Technical Reference Adaptation Matrix

| Reference Project | Upstream Repository / Site | Core Concepts Studied | ZERO ROT 2.0 Adaptation & Location |
| :--- | :--- | :--- | :--- |
| **1. IoT Smart Fridge** | `akyurekkadir/iot-smart-fridge` | - Virtual food storage simulation<br>- Environmental parameter controls<br>- Fruit freshness degradation models<br>- Ethylene-mediated cross-contamination<br>- Computer vision inspection pipeline | - `backend/app/simulation/commodity_registry.py`: Ethylene production & sensitivity matrix.<br>- `frontend/src/components/three/ProduceModel.tsx`: Physical fruit 3D procedural geometries & texture degradation.<br>- `backend/app/intelligence/computer_vision.py`: Image-based fruit freshness scoring. |
| **2. ISOMORPH** | `tuhinsahai/ISOMORPH` | - Supply-chain digital twin architecture<br>- Multi-stage network graph modeling<br>- Disruption scenario generation<br>- Cascading logistics failure dynamics<br>- Operational optimization & transit routing | - `backend/app/simulation/supply_chain_engine.py`: 7-stage directed acyclic network graph (`SupplyChainGraph`).<br>- `backend/app/simulation/cascading_disruptions.py`: Heatwave -> Overload -> Compressor Trip -> Thermal Excursion cascade.<br>- `frontend/src/components/three/SupplyChainNetworkCanvas.tsx`: 3D animated supply-chain network. |
| **3. AIoT Food Storage** | `shivamsingha/aiot-food-storage` | - Virtual multi-gas telemetry (CO2, Temp, RH)<br>- SVM-based spoilage prediction classification<br>- Environmental threshold monitoring<br>- Time-series telemetry charting | - `backend/app/simulation/sensor_network.py`: Simulated sensor nodes with Gaussian noise & calibration drift.<br>- `backend/app/intelligence/ml_spoilage_engine.py`: ML classification & regression benchmark (SVM/Random Forest vs. Physics).<br>- `frontend/src/components/SensorHealthView.tsx`: Sensor health & calibration dashboard. |
| **4. RipeNet** | `alexcj10/ripenet` | - Multi-task produce identification<br>- Ripeness stage classification (Unripe/Ripe/Overripe)<br>- Shelf-life regression estimation<br>- FastAPI + React image inference API | - `backend/app/intelligence/produce_vision.py`: Multi-task vision pipeline returning classification, ripeness tier, defect surface ratio, and shelf-life prediction.<br>- `frontend/src/components/ConveyorInspectionView.tsx`: Interactive image upload and defect segmentation inspection. |
| **5. Open Factory Twin (OFacT)** | `openfactorytwin.github.io/ofact` | - Digital twin entities & state encapsulation<br>- Event-driven simulation orchestration<br>- Agent-based asset representation<br>- Independent per-entity state tracking | - `backend/app/simulation/batch_engine.py`: `BatchSimulationInstance` encapsulating independent thermodynamic, sensor, and kinetic state per batch.<br>- `backend/app/agents/agentic_decision_engine.py`: Closed-loop Observe -> Detect -> Diagnose -> Predict -> Recommend -> Intervene agent. |
| **6. IoT Cold Chain Monitoring** | `polesskiy-dev/iot-cold-chain-monitoring-system` | - Real-time cold-chain asset tracking<br>- Multi-compartment reefer monitoring<br>- Mobile alerting & Telegram notification push<br>- Transport route waypoints & GPS logging | - `backend/app/simulation/truck_model.py`: 3-compartment spatial reefer model (Front, Middle, Rear Door).<br>- `backend/app/services/telegram_service.py`: Automated periodic digests & immediate critical excursion alerts.<br>- `frontend/src/components/three/ReeferTruckCanvas.tsx`: 3D cutaway truck digital twin. |

---

## Detailed Conceptual Integrations

### 1. Adaptation of IoT Smart Fridge (Virtual Food Storage & Ethylene Interaction)
- **Principle Adapted:** In cold storage, climacteric fruits (e.g., Bananas, Mangoes) release ethylene ($C_2H_4$) as they mature. When stored in proximity with ethylene-sensitive commodities (e.g., Guavas, Tomatoes), the ripening and senescence of the sensitive produce accelerate exponentially.
- **ZERO ROT 2.0 Implementation:**
  - Implemented `CommodityStorageParameter` and `EthyleneDynamics` in `backend/app/simulation/commodity_registry.py`.
  - Added an interactive ethylene interaction matrix: storing high-ethylene producers in unventilated chambers increases the deterioration rate $k$ of adjacent sensitive batches.

### 2. Adaptation of ISOMORPH (Multi-Stage Supply Chain & Disruption Cascade)
- **Principle Adapted:** Supply chains are networks of nodes (storage, handling, transport) where localized disruptions cause downstream delays and product degradation.
- **ZERO ROT 2.0 Implementation:**
  - Created a mathematical graph model in `backend/app/simulation/supply_chain_engine.py`:
    $$\text{Nodes: } \{\text{Farm}, \text{Collection}, \text{Pre-Cooling}, \text{Warehouse}, \text{Transit Corridor}, \text{Distribution}, \text{APMC Mandi}\}$$
  - Cascading disruption engine simulates external stressors (e.g. 42°C highway heatwave) triggering elevated compressor thermal load, power brownouts, transit delays, and produce deterioration.

### 3. Adaptation of AIoT Food Storage (Sensors & Multi-Model ML Benchmarking)
- **Principle Adapted:** Empirical sensor telemetry feeds statistical ML models to classify food quality into freshness classes.
- **ZERO ROT 2.0 Implementation:**
  - Developed `backend/app/intelligence/ml_spoilage_engine.py` implementing a tri-model architecture:
    1. **Physics-Only Model:** Pure Arrhenius $Q_{10}$ biochemical decay kinetics.
    2. **ML-Only Model:** Supervised classification & regression trained on environmental histories.
    3. **Hybrid Model:** Physics-informed machine learning ensemble weighting kinetic constraints with empirical sensor patterns.
  - Calculates MAE, RMSE, Precision, Recall, and F1 metrics side-by-side.

### 4. Adaptation of RipeNet (Multi-Task Visual Produce Intelligence)
- **Principle Adapted:** Visual inspection should simultaneously perform fruit identification, ripeness categorization, and shelf-life estimation in a unified inference step.
- **ZERO ROT 2.0 Implementation:**
  - Implemented `backend/app/intelligence/produce_vision.py` using multi-task visual feature extraction:
    - Identifies commodity type (e.g., Mango, Tomato, Banana, Apple, etc.).
    - Categorizes ripeness: `UNRIPE`, `OPTIMAL_RIPE`, `OVERRIPE_SENESCENT`.
    - Detects surface defects: `NECROSIS`, `BRUISING`, `MOLD_ROT`, `EPIDERMAL_BLEMISH`.
    - Computes defect surface area ratio and estimates remaining shelf life.

### 5. Adaptation of Open Factory Twin (OFacT) (Independent Batch State Isolation)
- **Principle Adapted:** Digital twins must maintain strict state encapsulation per entity rather than sharing a monolithic global state.
- **ZERO ROT 2.0 Implementation:**
  - Implemented `BatchSimulationInstance` in `backend/app/simulation/batch_engine.py`.
  - Every batch registered in ZERO ROT 2.0 owns its private thermodynamic environment, virtual sensor readings, deterioration kinetics, scenario history, and financial loss ledger.
  - Stepping simulation for Batch A does not mutate Batch B.

### 6. Adaptation of IoT Cold Chain Monitoring (Active Mobile Alerts & Route Tracking)
- **Principle Adapted:** Logistics monitoring requires continuous spatial tracking, thermal multi-zone logging, and immediate incident notification.
- **ZERO ROT 2.0 Implementation:**
  - Implemented 3-zone spatial temperature distribution (`front`, `middle`, `rear_door`) in `backend/app/simulation/truck_model.py`.
  - Linked to Telegram Bot API service for immediate critical excursion dispatches and 10-minute periodic summaries.
  - Linked to dynamic QR code session generation providing authenticated mobile access.
