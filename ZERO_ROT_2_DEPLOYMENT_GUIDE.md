# ZERO ROT 2.0 — Production Deployment & Operations Guide
**Project Code:** AGR007  
**Platform Version:** 2.0-ENTERPRISE  
**Date:** November 2026  

---

## 1. System Requirements

### Hardware Requirements
- **CPU:** 4 physical cores (x86_64 or ARM64)
- **RAM:** Minimum 8 GB (16 GB recommended for concurrent 3D WebGL client sessions)
- **Disk:** 20 GB SSD storage
- **Network:** Outbound HTTPS access (port 443) for Open-Meteo weather and `data.gov.in` Agmarknet APIs

### Software Dependencies
- Python 3.11, 3.12, or 3.13
- Node.js 18+ and npm 9+
- Docker Engine 24+ and Docker Compose v2 (optional for containerized deployment)

---

## 2. Environment Configuration

Create a `.env` file in the project root directory:

```ini
# Application Configuration
APP_ENV=production
APP_PORT=8000
SECRET_KEY=generate_a_random_64_character_hex_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Database Configuration (SQLite default; PostgreSQL supported)
DATABASE_URL=sqlite:///./zeroroot.db
# For PostgreSQL:
# DATABASE_URL=postgresql://zeroroot_user:db_password@localhost:5432/zeroroot_db

# External Government Market Intelligence (Data.gov.in)
DATA_GOV_IN_API_KEY=your_registered_data_gov_in_api_key_here

# Groq AI Decision Intelligence
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Telegram Real-Time Critical Alerts
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_from_botfather
TELEGRAM_DEFAULT_CHAT_ID=your_telegram_target_channel_or_chat_id
TELEGRAM_ALERT_THROTTLE_SECONDS=180

# Simulation Configuration
SIMULATION_SPEED_FACTOR=1.0
PHYSICS_TIME_STEP_SECONDS=60.0
```

---

## 3. Local Development & Staging Setup

### Backend Setup
```bash
# 1. Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Initialize database tables and start backend service
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup
```bash
# 1. Navigate to frontend directory and install dependencies
cd frontend
npm install

# 2. Start Vite development server
npm run dev
# The application will be available at http://localhost:5173
```

---

## 4. Production Containerized Deployment (Docker Compose)

Create `docker-compose.yml` in the root repository:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - APP_ENV=production
      - DATABASE_URL=sqlite:///./data/zeroroot.db
      - SECRET_KEY=${SECRET_KEY}
      - DATA_GOV_IN_API_KEY=${DATA_GOV_IN_API_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_DEFAULT_CHAT_ID=${TELEGRAM_DEFAULT_CHAT_ID}
    volumes:
      - backend_data:/app/data

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  backend_data:
```

### Build and Launch:
```bash
docker compose up -d --build
```

---

## 5. Automated Verification & Health Checks

Run the verification suite before opening access:

```bash
# Execute 43 automated backend verification tests
python -m pytest backend/tests/ -v

# Verify frontend TypeScript build
npm --prefix frontend run build
```

Verify service liveness via HTTP:
```bash
curl -X GET http://localhost:8000/api/v1/health
```

Expected output:
```json
{
  "status": "HEALTHY",
  "platform": "ZERO ROOT AgriTech Digital Twin",
  "version": "1.0.0",
  "groq_ai_connected": true,
  "live_weather_service": "Open-Meteo",
  "data_gov_in_configured": true,
  "simulation_running": true
}
```
