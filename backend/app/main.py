"""
FastAPI Application Entrypoint for ZERO ROOT.
Configures CORS, registers versioned API router, initializes background simulation loop,
and powers real-time WebSockets for 2D Digital Twin synchronization.
"""
import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Set
from dotenv import load_dotenv

# Ensure environment variables from .env are loaded into runtime environment
load_dotenv(override=True)

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api.router import api_router
from .database import engine, Base
from .seed import seed_database
from .simulation.engine import master_simulation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zeroroot.main")

# Active WebSocket clients set
websocket_clients: Set[WebSocket] = set()

async def simulation_background_loop():
    """Background async runner advancing the digital twin physics and broadcasting state."""
    logger.info("Starting ZERO ROOT background simulation tick loop...")
    while True:
        try:
            if master_simulation.is_running:
                # Step physics
                state = master_simulation.tick(custom_dt_seconds=60.0)
                
                # Broadcast state over WebSockets if clients are connected
                if websocket_clients:
                    payload = json.dumps(state)
                    disconnected = set()
                    for ws in list(websocket_clients):
                        try:
                            await ws.send_text(payload)
                        except Exception:
                            disconnected.add(ws)
                    websocket_clients.difference_update(disconnected)
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}")
            
        await asyncio.sleep(2.0) # Tick step interval

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables & initial data
    Base.metadata.create_all(bind=engine)
    seed_database()
    
    # Launch background simulation task
    task = asyncio.create_task(simulation_background_loop())
    yield
    # Shutdown
    task.cancel()

app = FastAPI(
    title="ZERO ROOT — AgriTech Digital Twin Platform",
    description="AI-powered 2D digital twin platform for agricultural post-harvest preservation and cold chain logistics.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend and mobile access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router)

# Mount frontend/dist for complete single-port full-stack execution if built
import os
from fastapi.responses import FileResponse

frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept api or ws routes
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            return None
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))

# WebSocket endpoint for real-time digital twin state streaming
@app.websocket("/ws/simulation")
async def websocket_simulation_feed(websocket: WebSocket):
    await websocket.accept()
    websocket_clients.add(websocket)
    # Immediately send current state snapshot
    await websocket.send_text(json.dumps(master_simulation.get_state()))
    try:
        while True:
            # Listen for client control commands over WebSocket
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                if "is_running" in cmd or "sim_speed" in cmd or "scenario_key" in cmd:
                    updated = master_simulation.set_controls(
                        is_running=cmd.get("is_running"),
                        sim_speed=cmd.get("sim_speed"),
                        scenario_key=cmd.get("scenario_key"),
                        ambient_temp_override=cmd.get("ambient_temp_override"),
                        truck_door_open=cmd.get("truck_door_open"),
                        truck_reefer_on=cmd.get("truck_reefer_on")
                    )
                    await websocket.send_text(json.dumps(updated))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        websocket_clients.discard(websocket)
    except Exception:
        websocket_clients.discard(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
