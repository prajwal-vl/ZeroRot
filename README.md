# ZERO ROT — AI-Powered AgriTech Digital Twin Platform
### *Predict. Preserve. Prevent.*
**Project Code:** `AGR007`

An industrial-grade agricultural digital twin platform transforming post-harvest loss prevention, cold-chain logistics, produce deterioration prediction, and agricultural market intelligence.

---

## 1. Executive Summary & Product Architecture

**ZERO ROT** is a digital twin and simulation system engineered to eliminate post-harvest agricultural losses across the critical farm-to-fork continuum. In traditional agricultural supply chains, farmers and logistics operators suffer between **25% to 40% harvest loss** due to unmonitored storage respiration, lack of optical grading, transit temperature spikes, and premature distress sales during mandi glut periods.

ZERO ROT provides an integrated platform:

1. **Three.js 3D Digital Twin Simulation**:
   - **Cold Storage Warehouse**: Procedural produce 3D models (Tomatoes, Bananas, Mangoes, Potatoes, Apples, Grapes), dynamic shader degradation linked to numerical simulation state (`quality_score`), animated cooling circulation airflow particles, 3D thermal heatmap overlay, and interactive camera perspective presets with crate rack inspection.
   - **3D Refrigerated Transit Semi-Trailer**: Tractor cab, transparent cutaway trailer, spinning condenser fan, interior produce crates, animated highway asphalt with dashed center lines, and real-time failure injection buttons.
2. **Scientific Produce Deterioration Engine**:
   - Arrhenius and $Q_{10}$-based biochemical degradation kinetics model accounting for temperature deviation, vapor pressure deficit, and atmospheric gas composition ($\text{O}_2, \text{CO}_2$).
3. **Machine Learning Spoilage Prediction & Dynamic Shelf Life**:
   - 30-Day degradation curves, marketable cutoff thresholds, and Explainable AI (XAI) feature importance decomposition.
4. **AI Decision Support Agent (SELL / STORE / SHIP)**:
   - Evaluates real-time mandi prices, storage fees, and decay kinetics to calculate optimal commercial actions, backed by Groq LLM synthesis (`Llama-3.3-70b-Versatile`).
5. **Advanced Preservation Counterfactual Analysis**:
   - Quantifies the ROI and shelf-life extension of Controlled Atmosphere (CA), 1-MCP ethylene receptor blocking, and Modified Atmosphere Packaging (MAP).
6. **Live Agricultural Mandi Price Integration**:
   - Direct integration with DATA.GOV.IN and official Agmarknet XML feeds (`Date-Wise-Prices-all-Commodity.xml`) parsing 6,434+ APMC records.
   - 14-Day econometric price trajectory with shaded $\pm 95\%$ and $\pm 70\%$ confidence interval ribbons.
7. **Dedicated Batch Management**:
   - Complete produce lifecycle ledger with batch details dossier, simulation run history, resume monitoring, and soft/permanent deletion with explicit confirmation.
8. **Live Telegram Bot Notification System**:
   - Automated 10-minute periodic simulation telemetry digests and throttled critical alerts.
9. **Secure QR Mobile Monitoring**:
   - Cryptographically tokenized pairing strictly enforced with public URLs (localhost URLs strictly forbidden).
10. **Zero Preloaded Users**:
    - Clean database state. The first registered user automatically becomes the system `ADMIN`.

---

## 2. Technology Stack

- **Frontend**:
  - React 19, TypeScript, Vite, Tailwind CSS
  - **Three.js**, **React Three Fiber** (`@react-three/fiber`), **Drei** (`@react-three/drei`) for 3D Digital Twins
  - Vector Icons: **Lucide React** (`lucide-react`) — *strictly zero emojis*
  - Color Theme: Professional SaaS Blue-and-White (`#2563EB`, `#1E40AF`, `#F8FAFC`, `#FFFFFF`, `#1E293B`, `#64748B`, `#E2E8F0`)
- **Backend**:
  - FastAPI (Python 3.11+ / 3.13)
  - SQLAlchemy & SQLite (Production extensible to PostgreSQL)
  - Mathematical simulation engines (Arrhenius, Dalton's Law, Navier-Stokes simplified thermal flows)
  - External APIs: Open-Meteo, DATA.GOV.IN, Agmarknet XML, Groq Cloud API, Telegram Bot API
- **Testing**:
  - `pytest` test suite: 45 comprehensive automated tests covering authentication, kinetics, mandi feeds, vision segmentation, incident cycles, and agentic decision workflows.

---

## 3. ZERO ROT 2.1 Machine Learning & Agentic Decision Features

### Reproducible Spoilage Model Training
To train the supervised Gradient Boosted Spoilage Regressor and Hybrid Residual Compensator from synthetic USDA/FAO post-harvest kinetics data:
```bash
python backend/app/intelligence/train_spoilage_model.py
```
This generates the serialized model artifact `backend/app/intelligence/spoilage_model.joblib` and computes genuine holdout test set metrics ($R^2 > 0.99$, MAE $< 0.70\%$, F1 $> 0.98$). If the artifact is not present, `TriModelSpoilageEngine` falls back gracefully to a physics-informed surrogate model.

### Agentic Intervention Execution
The agentic decision loop evaluates 9 operational stages and allows operator approval to execute real state mutations:
```http
POST /api/v1/agents/interventions/apply
Content-Type: application/json

{
  "batch_code": "ZR-BAN-001",
  "option_id": "OPT_EXPEDITE_MANDI",
  "notes": "Reroute to regional auction before quality degradation"
}
```
Supported interventions:
- `OPT_CLIMATE_OPTIMIZE`: Restores chamber temperature and RH to commodity optimum, resets HVAC compressor capacity, and records intervention in the event log.
- `OPT_EXPEDITE_MANDI`: Re-routes batch to in-transit refrigerated dispatch, assigns destination to nearest APMC mandi, and recalculates arrival timeline.
- `OPT_AGRO_PROCESSING`: Diverts batch to regional food processing, halts biological decay, and secures salvage valuation buyback.

### Computer Vision Multi-Surface Robustness
The optical inspection engine (`VisionInspector`) employs adaptive chromatic background subtraction in Euclidean BGR and HSV color spaces:
- Reliably segments produce against dark conveyors, white/light sorting trays, and neutral gray tables.
- Blank, overexposed, or occluded canvases return explicit `LOW_CONFIDENCE` status with `UNCERTAIN` grading, rather than false rejection.
- Clearly separates classical OpenCV heuristics from neural defect classification in response payloads.

---

## 4. Getting Started

### Prerequisites
- Python 3.11+ (Python 3.13 supported)
- Node.js 18+ and `npm`

### Environment Setup
1. Copy the example environment template:
   ```bash
   cp .env.example .env
   ```
2. Configure your keys in `.env`:
   - `DATA_GOV_IN_API_KEY`: Your Open Government Data platform API key.
   - `GROQ_API_KEY`: (Optional) Groq API key for natural language explanations.
   - `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID`: (Optional) Telegram bot credentials for live alert push notifications.
   - `PUBLIC_APP_URL`: Your publicly accessible domain or tunnel (e.g. ngrok / cloudflare tunnel) for QR mobile passes.

### Backend Installation & Startup
```bash
# Navigate to repository root
cd ZeroRot

# Install Python dependencies
pip install -r backend/requirements.txt

# Run database setup & start FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API docs are accessible at: `http://localhost:8000/docs`

### Frontend Installation & Startup
```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Run Vite development server
npm run dev
```
The web dashboard is accessible at: `http://localhost:5173`

---

## 5. Running Tests

### Backend Test Suite (45 Tests)
```bash
python -m pytest backend/tests/ -v
```

### Frontend Type Check & Production Build
```bash
npm --prefix frontend run build
```

---

## 6. Security & Licensing

- Database starts with **0 preloaded users**; administrative accounts are initialized explicitly via the registration interface.
- Localhost URLs are strictly forbidden from mobile QR generation.
- Proprietary software under Project Code `AGR007`. All rights reserved.
