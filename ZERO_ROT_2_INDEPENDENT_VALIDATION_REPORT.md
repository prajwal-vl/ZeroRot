# ZERO ROT 2.0 — Final Independent Validation and Demonstration Audit
**Project Name:** ZERO ROT — Intelligent Post-Harvest Digital Twin, Simulation & Agentic Decision Platform  
**Project Code:** AGR007  
**Repository:** `https://github.com/prajwal-vl/ZeroRot`  
**Audited Commit:** `d695e12` (Branch: `main`)  
**Audit Date:** November 2026  
**Auditor Roles:** Senior QA Engineer, Scientific Simulation Reviewer, ML Auditor, Digital-Twin Specialist, Security Engineer  

---

## Executive Summary & Status Scorecard

An exhaustive, adversarial audit of the ZERO ROT 2.0 codebase was conducted. The evaluation encompassed repository state, multi-batch state isolation, scientific bio-physical modeling, machine learning pipelines, computer vision heuristics, agentic closed loops, 3D WebGL scenes, external API integrations, security vectors, and automated test suites.

### Audit Status Scorecard

| Subsystem / Capability | Audit Status | Primary Finding |
|---|:---:|---|
| **Repository & Branch Integrity** | **PASS** | Exact commit `d695e12` verified on branch `main`. All 21 declared files exist. |
| **Independent Multi-Batch Isolation** | **PASS** | Concurrent 3-batch trial (Mango, Banana, Tomato) verified independent temperatures, quality decay deltas, pause/resume/delete states, and zero cross-contamination. |
| **Scientific Produce Deterioration Engine** | **PASS** | Arrhenius kinetics, $Q_{10}$, chilling injury, Tetens transpiration, Dalton hypoxia, and shelf-life inversion verified against literature. |
| **Machine Learning Spoilage Engine** | **PARTIAL** | Algebraic surrogate and hybrid formulas are implemented, but claimed benchmark metrics (MAE 1.68%, $R^2$ 0.974, F1 0.970) are **hardcoded dictionary constants** rather than trained model weights. |
| **Computer Vision Produce Inspection** | **PARTIAL** | Heuristic OpenCV color/contour segmentation operates on dark backgrounds, but fails on white/light backgrounds. No deep-learning neural network inference exists. |
| **Agentic AI Decision Engine** | **PARTIAL** | 9-step analytical decision loop (Observe to Recommend) is fully functional and mathematically sound, but the mutation dispatch route `/agents/interventions/apply` is not wired. |
| **Supply Chain Digital Twin & Three.js** | **PASS** | 7-stage directed graph traversal, cascading transit delays (NH48 heatwave), economic collapse modeling (-INR 21k margin), and 3D WebGL scene verified. |
| **Market Intelligence (data.gov.in)** | **PASS** | Official Agmarknet live feed parsed with 50 real records; fabricated random price fallbacks verified as completely eliminated. |
| **Telegram Alerts & QR Access Security** | **PASS** | Anti-spam throttling verified; localhost and private IP addresses strictly rejected for QR code generation. |
| **Automated Testing & Security** | **PASS** | 43/43 Pytest tests passed in 16.28s; Frontend built in 4.38s with zero errors; SQL injection and RBAC auth verified. |

---

## 1. Repository Verification & Architecture Coherence

### 1.1. Git State
- **Branch:** `main`
- **Commit:** `d695e1266762d1f6ef807ccb6e64944899d3a924` (`d695e12`)
- **Working Tree:** Clean; zero uncommitted modifications.

### 1.2. Architectural Disconnects & Engine Duplication
The audit identified duplicate and parallel simulation engines that exist concurrently in the backend:
1. **Engine A (Authoritative Background Engine):** Located in `backend/app/simulation/engine.py`. This orchestrator (`SimulationEngine`) is stepped every 2 seconds by `simulation_background_loop()` in `main.py` and streams state over WebSocket `/ws/simulation`. It advances batches in SQLite using the legacy `DeteriorationModel` (`deterioration_model.py`).
2. **Engine B (OFacT Batch Engine):** Located in `backend/app/simulation/batch_engine.py`. This implements the Open Factory Twin architecture (`BatchSimulationInstance`, `BatchSimulationManager`) and is instantiated as `master_batch_manager` in `router.py`. **However, `master_batch_manager` is not stepped by `simulation_background_loop()` in `main.py`.**
3. **Model Duplication:**
   - `backend/app/simulation/deterioration_model.py` (Used by `engine.py`)
   - `backend/app/simulation/commodity_registry.py` (Used by `batch_engine.py`, `supply_chain_engine.py`, `counterfactual_lab.py`, and `ml_spoilage_engine.py`)
   Both implement Arrhenius and chilling equations, but with slightly differing parameter structures.

---

## 2. Independent Batch Isolation Audit

### 2.1. Concurrent 3-Batch Trial
Three distinct produce batches were created in the database and stepped simultaneously for 24 hours:
- **Batch 1 (Mango, `ZR-ISO-MAN-b68730`):** Cold Storage Chamber A (13.0°C), Initial Quality: 98.0%, Initial Shelf Life: 25.0 days.
- **Batch 2 (Banana, `ZR-ISO-BAN-328af0`):** Cold Storage Chamber A (13.0°C), Initial Quality: 92.0%, Initial Shelf Life: 20.0 days.
- **Batch 3 (Tomato, `ZR-ISO-TOM-ba5a42`):** Traditional Ambient Store (22.5°C), Initial Quality: 95.0%, Initial Shelf Life: 18.0 days.

### 2.2. Empirical Stepping Results
```
=== 24H CONCURRENT STEPPING ===
Mango (Cold Storage):      Q = 93.50% (Decay delta: -4.50%) | RSL = 20.9 days
Banana (Cold Storage):     Q = 87.50% (Decay delta: -4.50%) | RSL = 15.6 days
Tomato (Traditional Store): Q = 79.45% (Decay delta: -15.55%) | RSL = 5.4 days
```
- **Temperature Independence:** Verified. Cold-stored batches registered 13.0°C; the traditional ambient batch registered 22.5°C.
- **Deterioration Independence:** Verified. Tomato decayed 3.45x faster due to higher ambient temperature.

### 2.3. Pause / Resume / Delete State Isolation
1. **Pause Test:** Banana was set to `PAUSED`. Mango and Tomato remained `ACTIVE`. After another 24 hours:
   - Mango decayed to `89.21%`.
   - Tomato decayed to `66.44%`.
   - Banana remained strictly frozen at `87.50%`. No telemetry was generated for Banana.
2. **Deletion Test:** Tomato was set to `ARCHIVED` (`is_deleted=True`). Banana was resumed to `ACTIVE`. After 24 hours:
   - Mango decayed to `85.11%`.
   - Banana resumed decay from `87.50%` to `83.22%`.
   - Tomato remained strictly frozen at `66.44%`.
3. **Telemetry Separation:**
   - Mango: 9 telemetry readings recorded.
   - Banana: 6 telemetry readings recorded (frozen during paused tick).
   - Tomato: 6 telemetry readings recorded (frozen during archived tick).
4. **Backend Restart Recovery:** Verified. Re-opening a new database session fully recovered exact batch states.

**Verdict:** **`PASS`**

---

## 3. Scientific Model Validation

### 3.1. Parameter Inspection across 8 Commodities
Parameters in `backend/app/simulation/commodity_registry.py` were audited against scientific literature:

| Commodity | Botanical Classification | Literature Source | Activation Energy $E_a$ (J/mol) | $Q_{10}$ | Optimal Temp (°C) | Chilling Threshold (°C) |
|---|---|---|:---:|:---:|:---:|:---:|
| **Mango** | *Mangifera indica* | USDA Handbook 66; Kader et al. | 52,500 | 2.40 | 13.0 | 10.0 |
| **Banana** | *Musa acuminata* | USDA Handbook 66; Stover & Simmonds | 54,200 | 2.50 | 14.0 | 12.5 |
| **Tomato** | *Solanum lycopersicum* | Hobson & Grierson; USDA 66 | 51,000 | 2.20 | 12.0 | 10.0 |
| **Apple** | *Malus domestica* | Kupferman; ASHRAE Handbook | 46,000 | 2.00 | 1.0 | 0.0 |
| **Potato** | *Solanum tuberosum* | Sowokinos, Cold Sweetening Studies | 48,500 | 1.90 | 8.0 | 3.5 |
| **Onion** | *Allium cepa* | Currah & Proctor; USDA 66 | 44,000 | 1.85 | 1.5 | 0.0 |
| **Grapes** | *Vitis vinifera* | Nelson; ASHRAE Handbook | 49,500 | 2.10 | 0.5 | -0.5 |
| **Guava** | *Psidium guajava* | Mitra, Postharvest Physiology | 53,000 | 2.30 | 7.5 | 5.0 |

### 3.2. Equations Check
- **Arrhenius Formulation:** $k(T) = A \exp(-E_a / RT)$ correctly uses absolute temperature in Kelvin ($T + 273.15$) with universal gas constant $R = 8.31446\text{ J}/(\text{mol}\cdot\text{K})$.
- **Chilling Injury:** Correctly triggers non-linear quadratic acceleration below physiological threshold $T_{\text{chill}}$.
- **VPD & Transpiration:** Uses Tetens equation for saturation pressure $P_{\text{sat}}(T)$ and calculates vapor pressure deficit:
  $$\text{VPD} = P_{\text{sat}}(T_{\text{fruit}}) - \left(\frac{\text{RH}}{100}\right) P_{\text{sat}}(T_{\text{air}})$$
- **Hypoxia Boundary:** Correctly triggers anaerobic fermentation multiplier when $P_{O_2} < 2.0\text{ kPa}$.

### 3.3. Scientific Assumptions & Limitations
1. **Lumped Thermal Capacitance:** The model assumes uniform internal fruit temperature. Internal radial temperature gradients ($Bi > 0.1$) inside larger fruits (e.g. whole mangoes) are not modeled.
2. **First-Order Decay Uniformity:** All crops follow $Q(t) = Q_0 e^{-kt}$. Certain post-harvest phenomena (e.g. potato tuber dormancy break and sprouting) follow sigmoidal rather than exponential kinetics.
3. **Literature Calibration vs Empirical Fitting:** Parameters are cited from USDA/ASHRAE handbooks. No localized laboratory sensor calibration on physical farm batches was performed. Calling parameters `CALIBRATED_EMPIRICAL` reflects literature constants, not empirical model fitting.

**Verdict:** **`PASS`**

---

## 4. Machine Learning & Benchmark Metrics Audit

### 4.1. Audit of Stated Metrics
The previous documentation and summary stated:
- Physics-Only: MAE 3.82%, RMSE 4.95%, F1 0.893
- ML Surrogate: MAE 2.94%, RMSE 3.78%, F1 0.927
- Hybrid Ensemble: MAE 1.68%, RMSE 2.21%, $R^2$ 0.974, F1 0.970

### 4.2. Forensic Code Inspection
Inspection of `backend/app/intelligence/ml_spoilage_engine.py` (lines 26–69) revealed:
```python
    BENCHMARK_METRICS = {
        "physics_only": {
            "mae_quality_pct": 3.82,
            "rmse_quality_pct": 4.95,
            ...
        },
        "ml_surrogate": {
            "mae_quality_pct": 2.94,
            ...
        },
        "hybrid_ensemble": {
            "mae_quality_pct": 1.68,
            "r2_score": 0.974,
            "classification": { "f1_score": 0.970 }
        }
    }
```
Further inspection of the inference logic revealed:
```python
    # ML Surrogate implementation
    ml_decay_multiplier = 1.0 + (0.42 * norm_t) + (0.18 * (norm_t ** 2)) + (0.28 * norm_rh) + (0.35 * norm_gas)
    k_ml = prof.base_decay_rate_day * max(0.1, ml_decay_multiplier)

    # Hybrid Ensemble implementation
    k_hybrid = max(1e-5, (0.65 * k_phys) + (0.35 * k_ml) + residual_correction)
```

### 4.3. Audit Findings
1. **Absence of Training Pipeline:** There is no model training script, no serialized model artifacts (`.pkl`, `.onnx`, `.pt`), and no dataset file (`.csv`, `.parquet`).
2. **Hardcoded Evaluation Metrics:** The reported metrics (MAE 1.68%, $R^2$ 0.974, F1 0.970) are **hardcoded dictionary literals** returned by the API, not dynamically evaluated on a holdout test split.
3. **Surrogate Nature:** The "ML surrogate" is an algebraic response surface polynomial; the "hybrid ensemble" is a linear convex blend ($0.65 k_{\text{phys}} + 0.35 k_{\text{ml}}$).
4. **Data Leakage:** Not applicable, as no model training occurred.

**Verdict:** **`PARTIAL` (Unverified Claim / Synthetic Benchmark)**

---

## 5. Computer Vision Produce Inspection Audit

### 5.1. Pipeline Architecture
`backend/app/services/vision_inspector.py` was inspected:
- **Trained Deep Learning Model:** NONE. No neural network weights (YOLO, ResNet, EfficientNet) exist.
- **OpenCV Heuristics:**
  - Foreground segmentation: `cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)`
  - Defect masks:
    - Necrosis: `cv2.inRange(v_channel, 0, 75)`
    - Fungal Mold: `cv2.inRange(s_channel, 0, 45)`
    - Bruising: `cv2.inRange(v_channel, 75, 115)`
  - Ripeness: Derived from mean Hue channel in HSV space.

### 5.2. Empirical Adversarial Background Test
The vision inspector was tested on two synthetic images:
1. **Test A (Dark Background, `#121316`):** Red tomato with centered contours.
   - *Result:* Correctly segmented. Graded **`GOOD`**, Quality Score: `100.0%`.
2. **Test B (White Background, `#FFFFFF`):** Healthy green banana centered on a standard white table.
   - *Result:* The thresholding rule `gray > 30` classified all 90,000 background pixels as produce body (`bounding_box: {x: 0, y: 0, width: 300, height: 300}`). The entire image was treated as an unidentifiable oversized object, resulting in **`REJECTED`** (Grade C).

### 5.3. Audit Findings
- Functional for high-contrast dark inspection conveyors.
- Fails catastrophically on white, light, or noisy backgrounds typical of farm and supermarket environments.
- Lacks semantic instance segmentation.

**Verdict:** **`PARTIAL`**

---

## 6. Agentic Intervention & Closed-Loop Audit

### 6.1. Compressor Failure Simulation Trial
A banana batch (`ZR-TEST-COMP-FAIL`) was subjected to a sudden compressor outage:
- Temperature surged from 14.0°C to 29.0°C.
- Relative humidity dropped to 55.0%.
- Ethylene spiked to 0.35 ppm.

### 6.2. Agent Execution Traces
1. **Detect:** Detected 15.0°C temperature excursion above optimal, desiccation stress (55% RH), and elevated ethylene.
2. **Diagnose:** Identified "Refrigeration system deficit: Evaporator coil icing or door ajar", "Dry air intake", and "Climacteric cross-exposure".
3. **Predict:** Forecasted unmitigated quality collapse from 90.0% to 22.3% within 72 hours, with shelf life reduced to 1.7 days and financial loss of ₹86,818.79.
4. **Generate Options & Evaluate:**
   - `OPT_EXPEDITE_MANDI`: Cost ₹7,000, Avoided Loss ₹78,136.91, Net Benefit **₹71,136.91**
   - `OPT_CLIMATE_OPTIMIZE`: Cost ₹4,000, Avoided Loss ₹67,718.66, Net Benefit **₹63,718.66**
   - `OPT_AGRO_PROCESSING`: Cost ₹3,000, Avoided Loss ₹56,818.79, Net Benefit **₹53,818.79**
5. **Recommend:** Recommends `OPT_EXPEDITE_MANDI` because unmitigated shelf life (<2 days) creates severe risk of total spoilage before climate correction can stabilize produce core temperature.

### 6.3. Execution Gap Identified
The endpoint `/api/v1/agents/decision-cycle` returns the decision payload with `approval_required: true`. However:
- There is **no `/api/v1/agents/interventions/apply` endpoint** in `backend/app/api/router.py`.
- Approving an action in the frontend does not mutate the batch record in SQLite. The closed loop is open at the execution stage.

**Verdict:** **`PARTIAL`**

---

## 7. Supply Chain & 3D WebGL Digital Twin Audit

### 7.1. Seven-Stage Network Traversal
The 7-stage directed graph was tested end-to-end:
```
Stage 1 (Farm) -> Stage 2 (Collection) -> Stage 3 (Pre-Cooling) -> Stage 4 (Cold Hub) -> 
Stage 5 (Reefer Highway) -> Stage 6 (RDC Urban) -> Stage 7 (APMC Mandi)
```

### 7.2. Disruption Shock Propagation Trial
A transit disruption (`HEATWAVE_TRANSIT_DELAY`) was injected into Stage 5 (NH48 corridor):
- **Normal Baseline:**
  - Total Duration: 53.5 hours
  - Stage 5 Cargo Temp: 12.0°C
  - Terminal Quality: 72.46% (Grade B Domestic)
  - Net Margin: **+₹16,475.33**
- **Under Disruption Shock:**
  - Total Duration: 59.5 hours (+6.0 hours highway congestion)
  - Stage 5 Cargo Temp: 34.0°C (Reefer fault in 42°C ambient)
  - Terminal Quality: 63.56% (Downgraded to Grade C Local)
  - Net Margin: **-₹21,366.85** (A net financial loss swing of **₹37,842.18**)

### 7.3. 3D WebGL Digital Twin Rendering
- `frontend/src/components/three/SupplyChainNetworkCanvas.tsx` renders 7 facility nodes, animated bezier transit pipelines with moving particle beads, pulsing health status beacons, and interactive camera controls.
- Zero Sketchfab or external iframe dependencies.

**Verdict:** **`PASS`**

---

## 8. Market Intelligence & Notification Security Audit

### 8.1. Data.gov.in Integration & Anti-Fabrication Policy
- `backend/app/services/data_gov_service.py` was queried live:
  ```
  Result status: LIVE_SUCCESS
  Records count: 50
  Source: Open Government Data (OGD) Platform India — Agmarknet XML Feed
  ```
- Genuine records retrieved across Andhra Pradesh, Chhattisgarh, Gujarat, and Himachal Pradesh.
- When unconfigured or offline, the service returns `status: "UNCONFIGURED"` and `records: []`. **No fabricated or randomized mock prices are generated.**

### 8.2. Telegram Notification Service
- Evaluated in `backend/tests/test_telegram_and_kinetics.py`:
  - 180-second anti-spam throttling window operates correctly.
  - HTML message formatting verified with zero emojis.

### 8.3. QR Code Access Security
- `backend/app/services/qr_service.py`:
  - Strictly rejects `localhost`, `127.0.0.1`, `0.0.0.0`, `192.168.*`, and `.local`.
  - Requires a verified public domain or tunnel (`PUBLIC_APP_URL`).
  - Session tokens are generated with cryptographically secure 32-byte URL-safe strings (`secrets.token_urlsafe(32)`).

**Verdict:** **`PASS`**

---

## 9. Automated Test Execution & Security Verification

### 9.1. Backend Test Suite Execution
Command: `python -m pytest backend/tests/ -v`
```
============================= test session starts =============================
platform win32 -- Python 3.13.3, pytest-9.1.1, pluggy-1.6.0
collected 43 items

backend/tests/test_additional_requirements.py (4 tests) .......... PASSED [  9%]
backend/tests/test_physics_and_kinetics.py (11 tests) ............. PASSED [ 34%]
backend/tests/test_simulation_and_api.py (17 tests) ............... PASSED [ 74%]
backend/tests/test_telegram_and_kinetics.py (3 tests) ............. PASSED [ 81%]
backend/tests/test_zero_rot_2.py (8 tests) ......................... PASSED [100%]

======================= 43 passed, 1 warning in 16.28s ========================
```

### 9.2. Frontend Production Build Execution
Command: `npm --prefix frontend run build`
```
> frontend@0.0.0 build
> tsc && vite build

vite v8.3.6 building client environment for production...
transforming...
✓ 2643 modules transformed.
rendering chunks...
dist/index.html                     1.06 kB │ gzip:   0.61 kB
dist/assets/index-LoxZOR6T.css     60.38 kB │ gzip:  11.13 kB
dist/assets/index-BKCDb201.js   1,600.60 kB │ gzip: 405.77 kB
✓ built in 4.38s
```

### 9.3. Security Vulnerability Testing
1. **SQL Injection:** Tested `/api/v1/batches/' OR '1'='1`. Caught and safely rejected with `422 Unprocessable Entity`.
2. **Access Control (RBAC):** Tested `/api/v1/auth/users` without bearer token. Correctly returned `401 Unauthorized`.
3. **Credential Leakage:** Tested `/api/v1/auth/status` and `/api/v1/health`. Zero credential or secret hash exposure.
4. **Path Traversal:** Tested `/../../../../etc/passwd`. Safely caught by SPA routing fallback; returns `index.html`.

**Verdict:** **`PASS`**

---

## 10. Comprehensive Severity-Ranked Issue Matrix

| Issue ID | Severity | Category | Description | Recommended Remediation |
|---|:---:|---|---|---|
| **ISSUE-01** | **HIGH** | Architecture | `BatchSimulationManager` in `batch_engine.py` is not wired into `simulation_background_loop()` in `main.py`. The background loop steps batches via legacy `engine.py` / `deterioration_model.py`. | Unify simulation loops: wire `BatchSimulationManager.step_all()` directly into `simulation_background_loop()`. |
| **ISSUE-02** | **HIGH** | ML Modeling | Tri-model benchmark metrics (MAE 1.68%, $R^2$ 0.974, F1 0.970) are hardcoded dictionary literals rather than evaluated on empirical test data. | Train an actual XGBoost/LightGBM regressor on a public post-harvest dataset and commit model weights and evaluation scripts. |
| **ISSUE-03** | **MEDIUM** | Computer Vision | OpenCV foreground segmentation uses fixed `gray > 30` threshold, failing on light/white backgrounds. | Replace binary threshold with Otsu's adaptive thresholding or integrate a lightweight ONNX MobileNet-V3 / YOLOv8-nano model. |
| **ISSUE-04** | **MEDIUM** | Agentic Loop | Missing `/api/v1/agents/interventions/apply` endpoint prevents automated or confirmed dispatch of recommended interventions to database batches. | Implement `/api/v1/agents/interventions/apply` endpoint to mutate `ProduceBatch.storage_type` and setpoints in SQLite. |
| **ISSUE-05** | **LOW** | Model Duplication | `commodity_registry.py` and `deterioration_model.py` duplicate Arrhenius equations with slight divergence. | Deprecate `deterioration_model.py` and make `commodity_registry.py` the sole authoritative kinetics module across all engines. |

---

## 11. Final Auditor Verdict

ZERO ROT 2.0 is **substantially functional, architecturally sophisticated, and scientifically grounded** in its thermal and kinetic formulations. The independent batch isolation, 7-stage supply chain traversal, counterfactual financial waterfalls, 3D WebGL scenes, and official Agmarknet data ingestion are verified and operational.

However, the platform is **not ready for external academic or production evaluation as a "trained machine learning platform"** until the hardcoded benchmark metrics are replaced with genuine trained model weights, and the agentic intervention loop is connected to an execution dispatch endpoint.

