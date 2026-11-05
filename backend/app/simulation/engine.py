"""
Master 2D Simulation Engine.
Synchronizes and steps all digital twin modules (Traditional Store, Cold Warehouse, Refrigerated Truck),
processes active scenarios, generates authoritative virtual sensor telemetry and real-time alerts,
and broadcasts unified state to frontend dashboards and mobile PWAs.
"""
import asyncio
import time
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from .traditional_storage import TraditionalStorageTwin
from .cold_storage import ColdStorageWarehouseTwin
from .truck_model import RefrigeratedTruckTwin
from .scenario_manager import ScenarioManager

try:
    from ..services.telegram_service import TelegramService
except ImportError:
    try:
        from app.services.telegram_service import TelegramService
    except ImportError:
        TelegramService = None

try:
    from ..database import SessionLocal
    from ..models.models import SimulationRecord, SimulationStateRecord, ProduceBatch, VirtualSensorReading
    from .deterioration_model import DeteriorationModel
    from .batch_engine import BatchSimulationManager
    from .commodity_registry import ScientificCommodityRegistry
except ImportError:
    try:
        from app.database import SessionLocal
        from app.models.models import SimulationRecord, SimulationStateRecord, ProduceBatch, VirtualSensorReading
        from app.simulation.deterioration_model import DeteriorationModel
        from app.simulation.batch_engine import BatchSimulationManager
        from app.simulation.commodity_registry import ScientificCommodityRegistry
    except ImportError:
        SessionLocal = None
        SimulationRecord = None
        SimulationStateRecord = None
        ProduceBatch = None
        VirtualSensorReading = None
        DeteriorationModel = None
        BatchSimulationManager = None
        ScientificCommodityRegistry = None

class SimulationEngine:
    """
    Authoritative simulation orchestrator.
    """
    def __init__(self, sim_id: str = "sim_master_zr"):
        self.sim_id = sim_id
        self.is_running = True
        self.sim_speed = 1.0 # 1x to 20x real-time speed
        self.time_step_seconds = 60.0 # Each tick advances physics by 1 minute
        self.total_simulated_seconds = 0.0
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.last_tick_timestamp = time.time()
        
        # Modules
        self.scenario_manager = ScenarioManager()
        self.traditional_store = TraditionalStorageTwin(commodity_name="tomato", quantity_kg=1200.0)
        self.cold_warehouse = ColdStorageWarehouseTwin()
        self.truck = RefrigeratedTruckTwin(commodity_name="tomato", quantity_kg=2400.0)
        
        # Environmental ambient baseline (will be augmented by live Open-Meteo data)
        self.ambient_temp_c = 28.5
        self.ambient_rh_pct = 62.0
        self.ambient_pressure_kpa = 101.3
        self.weather_source_label = "SIMULATED (FALLBACK)"
        
        # Active alerts list
        self.alerts: List[Dict[str, Any]] = []
        self.alert_counter = 1
        self.active_batch_code: Optional[str] = None
        self.tick_counter = 0
        self.batch_manager = BatchSimulationManager() if BatchSimulationManager else None

    def ensure_simulation_record(self, db) -> Optional[Any]:
        """Ensures a persistent simulation run record exists and matches engine parameters."""
        if not db or not SimulationRecord:
            return None
        try:
            rec = db.query(SimulationRecord).filter(SimulationRecord.sim_uuid == self.sim_id).first()
            if not rec:
                rec = SimulationRecord(
                    sim_uuid=self.sim_id,
                    scenario_key=self.scenario_manager.active_scenario_key,
                    is_running=self.is_running,
                    speed_factor=self.sim_speed,
                    started_at=datetime.now(timezone.utc)
                )
                db.add(rec)
                db.commit()
                db.refresh(rec)
            else:
                rec.scenario_key = self.scenario_manager.active_scenario_key
                rec.is_running = self.is_running
                rec.speed_factor = self.sim_speed
                if not self.is_running and not rec.ended_at:
                    rec.ended_at = datetime.now(timezone.utc)
                elif self.is_running:
                    rec.ended_at = None
                db.commit()
            return rec
        except Exception:
            db.rollback()
            return None

    def persist_state_snapshot(self, db, sim_rec, state_payload_dict: Dict[str, Any]):
        """Persists authoritative state snapshot to database for historical auditability."""
        if not db or not SimulationStateRecord or not sim_rec:
            return
        try:
            snapshot = SimulationStateRecord(
                simulation_id=sim_rec.id,
                sim_time_seconds=self.total_simulated_seconds,
                ambient_temp_c=self.ambient_temp_c,
                ambient_rh_pct=self.ambient_rh_pct,
                state_payload=json.dumps(state_payload_dict),
                recorded_at=datetime.now(timezone.utc)
            )
            db.add(snapshot)
            db.commit()

            # Keep database lean: retain latest 500 state records
            excess_records = db.query(SimulationStateRecord).filter(
                SimulationStateRecord.simulation_id == sim_rec.id
            ).order_by(SimulationStateRecord.id.desc()).offset(500).all()
            if excess_records:
                for old in excess_records:
                    db.delete(old)
                db.commit()
        except Exception as e:
            import traceback
            traceback.print_exc()
            db.rollback()

    def step_active_batches(self, db, dt_seconds: float):
        """Simulates deterioration kinetics independently for all active batches across facilities using BatchSimulationManager."""
        if not db or not ProduceBatch:
            return
        try:
            active_batches = db.query(ProduceBatch).filter(
                ProduceBatch.is_deleted == False,
                ProduceBatch.simulation_status == "ACTIVE"
            ).all()

            if not active_batches:
                if self.batch_manager:
                    self.batch_manager.instances.clear()
                return

            now_utc = datetime.now(timezone.utc)
            active_codes = set()

            for b in active_batches:
                active_codes.add(b.batch_code)
                st = (b.storage_type or "TRADITIONAL").upper()
                if st == "TRADITIONAL":
                    temp_c = self.traditional_store.internal_temp_c
                    rh_pct = self.traditional_store.internal_rh_pct
                    o2_pct = self.traditional_store.internal_o2_pct
                    co2_ppm = self.traditional_store.internal_co2_ppm
                elif st == "COLD_STORAGE":
                    comm = (b.commodity_name or "tomato").lower()
                    if comm in ["mango", "banana"]:
                        ch = self.cold_warehouse.chambers.get("chamber_tropical")
                    elif comm in ["onion"]:
                        ch = self.cold_warehouse.chambers.get("chamber_cold_dry")
                    else:
                        ch = self.cold_warehouse.chambers.get("chamber_veggie")
                    if not ch:
                        ch = list(self.cold_warehouse.chambers.values())[0]
                    temp_c = ch.internal_temp_c
                    rh_pct = ch.internal_rh_pct
                    o2_pct = ch.internal_o2_pct
                    co2_ppm = ch.internal_co2_ppm
                else: # IN_TRANSIT
                    temp_c = self.truck.mean_cargo_temp_c
                    rh_pct = self.truck.cargo_rh_pct
                    o2_pct = self.truck.o2_pct
                    co2_ppm = self.truck.co2_ppm

                if self.batch_manager:
                    inst = self.batch_manager.register_or_get_instance(
                        batch_id=b.id,
                        batch_code=b.batch_code,
                        commodity_name=b.commodity_name,
                        quantity_kg=b.quantity_kg,
                        storage_type=st,
                        initial_quality_score=getattr(b, "initial_quality_score", 100.0) or 100.0,
                        current_quality_score=b.current_quality_score,
                        remaining_shelf_life_days=b.remaining_shelf_life_days,
                        initial_price_per_kg=getattr(b, "purchase_price_per_kg", 45.0) or 45.0,
                        location=getattr(b, "storage_location", "Main Facility") or "Main Facility"
                    )

                    disruption = self.batch_manager.active_disruptions.get(b.batch_code)
                    if not disruption:
                        inst.microclimate.chamber_temp_c = temp_c
                        inst.microclimate.chamber_rh_pct = rh_pct
                        inst.microclimate.chamber_o2_pct = o2_pct
                        inst.microclimate.chamber_co2_ppm = co2_ppm

                    step_res = inst.step(
                        dt_seconds=dt_seconds,
                        ambient_temp_c=self.ambient_temp_c,
                        ambient_rh_pct=self.ambient_rh_pct,
                        active_disruption=disruption
                    )

                    b.current_quality_score = round(inst.current_quality_score, 2)
                    b.remaining_shelf_life_days = round(inst.remaining_shelf_life_days, 2)
                    b.last_executed_at = now_utc

                    # Record authoritative virtual sensor telemetry
                    if VirtualSensorReading:
                        db.add(VirtualSensorReading(
                            sensor_id=f"sens_temp_{b.batch_code}",
                            sensor_type="TEMPERATURE",
                            asset_id=b.batch_code,
                            value=round(inst.microclimate.chamber_temp_c, 2),
                            unit="°C",
                            data_label="SIMULATED",
                            recorded_at=now_utc
                        ))
                        db.add(VirtualSensorReading(
                            sensor_id=f"sens_rh_{b.batch_code}",
                            sensor_type="HUMIDITY",
                            asset_id=b.batch_code,
                            value=round(inst.microclimate.chamber_rh_pct, 1),
                            unit="%",
                            data_label="SIMULATED",
                            recorded_at=now_utc
                        ))
                        db.add(VirtualSensorReading(
                            sensor_id=f"sens_quality_{b.batch_code}",
                            sensor_type="QUALITY",
                            asset_id=b.batch_code,
                            value=round(inst.current_quality_score, 2),
                            unit="%",
                            data_label="SIMULATED",
                            recorded_at=now_utc
                        ))
                        db.add(VirtualSensorReading(
                            sensor_id=f"sens_core_temp_{b.batch_code}",
                            sensor_type="CORE_TEMPERATURE",
                            asset_id=b.batch_code,
                            value=round(inst.microclimate.produce_core_temp_c, 2),
                            unit="°C",
                            data_label="SIMULATED",
                            recorded_at=now_utc
                        ))

                    # Spoilage threshold alert
                    if b.current_quality_score <= inst.critical_quality_threshold or b.remaining_shelf_life_days <= 1.0:
                        self._trigger_alert(
                            module=f"BATCH_{b.batch_code}",
                            severity="CRITICAL",
                            title=f"Batch {b.batch_code} Spoilage Critical",
                            message=f"{b.commodity_name.capitalize()} quality decayed to {b.current_quality_score}% with {b.remaining_shelf_life_days} days shelf life remaining in {st}.",
                            recommended_action="Expedite immediate auction dispatch to APMC mandi.",
                            timestamp=now_utc.isoformat()
                        )
                elif DeteriorationModel:
                    det = DeteriorationModel.step_produce_quality(
                        current_quality_score=b.current_quality_score,
                        commodity_name=b.commodity_name,
                        temp_c=temp_c,
                        rh_pct=rh_pct,
                        o2_pct=o2_pct,
                        co2_ppm=co2_ppm,
                        dt_seconds=dt_seconds
                    )
                    b.current_quality_score = round(det["quality_score"], 2)
                    b.remaining_shelf_life_days = round(det["remaining_shelf_life_days"], 2)
                    b.last_executed_at = now_utc

            # Prune instances in manager that are no longer active
            if self.batch_manager:
                for existing_code in list(self.batch_manager.instances.keys()):
                    if existing_code not in active_codes:
                        self.batch_manager.remove_instance(existing_code)

            db.commit()
        except Exception as e:
            import traceback
            traceback.print_exc()
            db.rollback()

    def load_batch(self, batch_code: str, commodity_name: str, quantity_kg: float, storage_type: str = "TRADITIONAL"):
        """Loads a specific batch into the digital twin for active simulation."""
        self.active_batch_code = batch_code
        if storage_type == "TRADITIONAL":
            self.traditional_store = TraditionalStorageTwin(commodity_name=commodity_name, quantity_kg=quantity_kg)
        else:
            comm = commodity_name.lower()
            ch_id = "chamber_tropical" if comm in ["mango", "banana"] else ("chamber_cold_dry" if comm == "onion" else "chamber_veggie")
            alloc_fn = getattr(self.cold_warehouse, "allocate_produce", getattr(self.cold_warehouse, "allocate_chamber", None))
            if alloc_fn:
                alloc_fn(
                    chamber_id=ch_id,
                    commodity_name=commodity_name,
                    quantity_kg=quantity_kg,
                    crates=max(1, int(quantity_kg / 20.0))
                )

    def disengage_batch(self, batch_code: str):
        """Stops simulations and removes alerts for a deleted or archived batch."""
        if self.active_batch_code == batch_code:
            self.active_batch_code = None
        if self.batch_manager:
            self.batch_manager.remove_instance(batch_code)
        # Remove any alerts belonging or referring to this batch
        self.alerts = [a for a in self.alerts if batch_code not in a.get("message", "") and batch_code not in a.get("title", "")]

    def update_live_weather(self, temp_c: float, rh_pct: float, pressure_kpa: float = 101.3, source_label: str = "LIVE"):
        self.ambient_temp_c = temp_c
        self.ambient_rh_pct = rh_pct
        self.ambient_pressure_kpa = pressure_kpa
        self.weather_source_label = source_label

    def set_controls(
        self,
        is_running: Optional[bool] = None,
        sim_speed: Optional[float] = None,
        scenario_key: Optional[str] = None,
        ambient_temp_override: Optional[float] = None,
        ambient_rh_override: Optional[float] = None,
        truck_door_open: Optional[bool] = None,
        truck_reefer_on: Optional[bool] = None,
        truck_speed_kmh: Optional[float] = None,
        traditional_damper_open_pct: Optional[float] = None,
        traditional_door_open: Optional[bool] = None,
        chamber_target_temp: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """User interaction endpoint to manipulate running simulation parameters."""
        if is_running is not None:
            self.is_running = is_running
        if sim_speed is not None:
            self.sim_speed = max(0.5, min(50.0, sim_speed))
            
        if scenario_key is not None:
            sc = self.scenario_manager.apply_scenario(scenario_key)
            # 1. Apply scenario to truck
            self.truck.reefer_fault = sc.get("reefer_fault", False)
            self.truck.rear_door_open = sc.get("door_open", False)
            self.truck.truck_speed_kmh = sc.get("truck_speed_kmh", 55.0)
            
            # 2. Apply scenario to intelligent cold warehouse chambers
            cooling_factor = sc.get("cooling_power_factor", 1.0)
            door_open = sc.get("door_open", False)
            reefer_fault = sc.get("reefer_fault", False)
            for ch in self.cold_warehouse.chambers.values():
                ch.door_open = door_open
                ch.compressor_fault = reefer_fault or (cooling_factor == 0.0)
                ch.cooling_capacity_watts = 14000.0 * cooling_factor

            # 3. Apply scenario to traditional storage
            if door_open:
                self.traditional_store.door_open = True
            
        if ambient_temp_override is not None:
            self.ambient_temp_c = ambient_temp_override
        if ambient_rh_override is not None:
            self.ambient_rh_pct = ambient_rh_override
            
        if truck_door_open is not None:
            self.truck.rear_door_open = truck_door_open
        if truck_reefer_on is not None:
            self.truck.reefer_on = truck_reefer_on
        if truck_speed_kmh is not None:
            self.truck.truck_speed_kmh = truck_speed_kmh
            
        if traditional_damper_open_pct is not None:
            self.traditional_store.ventilation_damper_open_pct = traditional_damper_open_pct
        if traditional_door_open is not None:
            self.traditional_store.door_open = traditional_door_open
            
        if chamber_target_temp is not None:
            for cid, temp in chamber_target_temp.items():
                if cid in self.cold_warehouse.chambers:
                    self.cold_warehouse.chambers[cid].target_temp_c = temp

        # Persist updated simulation parameters into database
        if SessionLocal:
            try:
                db = SessionLocal()
                self.ensure_simulation_record(db)
                db.close()
            except Exception:
                pass

        return self.get_state()

    def reset(self):
        """Resets all simulation twins to initial clean state."""
        self.total_simulated_seconds = 0.0
        self.scenario_manager.apply_scenario("NORMAL")
        self.traditional_store = TraditionalStorageTwin(commodity_name="tomato", quantity_kg=1200.0)
        self.cold_warehouse = ColdStorageWarehouseTwin()
        self.truck = RefrigeratedTruckTwin(commodity_name="tomato", quantity_kg=2400.0)
        if self.batch_manager:
            self.batch_manager.instances.clear()
            self.batch_manager.active_disruptions.clear()
        self.alerts.clear()
        self.alert_counter = 1

    def tick(self, custom_dt_seconds: Optional[float] = None) -> Dict[str, Any]:
        """Executes one simulation step across all digital twins."""
        if not self.is_running:
            return self.get_state()
            
        dt = (custom_dt_seconds or self.time_step_seconds) * self.sim_speed
        self.total_simulated_seconds += dt
        
        # Apply scenario ambient delta
        sc = self.scenario_manager.get_active_scenario()
        effective_ambient_temp = self.ambient_temp_c + sc.get("ambient_temp_delta", 0.0)
        effective_ambient_rh = sc.get("ambient_rh_override", self.ambient_rh_pct)
        
        # 1. Step Traditional Storage
        trad_res = self.traditional_store.step(
            ambient_temp_c=effective_ambient_temp,
            ambient_rh_pct=effective_ambient_rh,
            ambient_pressure_kpa=self.ambient_pressure_kpa,
            dt_seconds=dt
        )
        
        # 2. Step Intelligent Cold Warehouse
        cold_res = self.cold_warehouse.step(
            ambient_temp_c=effective_ambient_temp,
            ambient_rh_pct=effective_ambient_rh,
            ambient_pressure_kpa=self.ambient_pressure_kpa,
            dt_seconds=dt
        )
        
        # 3. Step Refrigerated Truck
        truck_res = self.truck.step(
            ambient_temp_c=effective_ambient_temp,
            ambient_rh_pct=effective_ambient_rh,
            ambient_pressure_kpa=self.ambient_pressure_kpa,
            dt_seconds=dt
        )
        
        # 4. Evaluate Thresholds & Generate Real-Time Alerts
        self._evaluate_alerts(trad_res, cold_res, truck_res)
        
        # 5. Independent Multi-Batch Simulation & DB Persistence
        self.tick_counter = getattr(self, "tick_counter", 0) + 1
        if SessionLocal:
            db = None
            try:
                db = SessionLocal()
                # Ensure active simulation run record exists
                sim_rec = self.ensure_simulation_record(db)

                # Step all active batches independently
                self.step_active_batches(db, dt)

                # Persist state snapshot every 3 ticks
                if self.tick_counter % 3 == 0:
                    self.persist_state_snapshot(db, sim_rec, self.get_state())
            except Exception:
                pass
            finally:
                if db:
                    db.close()

        # 6. Telegram Periodic Telemetry Dispatch
        if TelegramService and TelegramService.is_configured():
            try:
                TelegramService.check_and_send_periodic_update(self.get_state())
            except Exception:
                pass
        
        self.last_tick_timestamp = time.time()
        return self.get_state()

    def _evaluate_alerts(self, trad_res: Dict[str, Any], cold_res: Dict[str, Any], truck_res: Dict[str, Any]):
        """Evaluates physics boundaries and triggers alerts without duplicate spam."""
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Check Truck Reefer Fault or High Temp Excursion
        mean_truck_temp = truck_res["mean_cargo_temp_c"]
        if mean_truck_temp > 18.0:
            self._trigger_alert(
                module="COLD_CHAIN",
                severity="CRITICAL",
                title="Truck Cargo Thermal Excursion",
                message=f"Mean cargo temperature reached {mean_truck_temp}°C (Target: {truck_res['target_temp_c']}°C). High risk of accelerated ripening and rotting.",
                recommended_action="Inspect reefer compressor immediately and verify rear cargo door seal.",
                timestamp=timestamp
            )
        elif mean_truck_temp > 14.0:
            self._trigger_alert(
                module="COLD_CHAIN",
                severity="WARNING",
                title="Cold Chain Temperature Drift",
                message=f"Cargo temperature is drifting higher ({mean_truck_temp}°C). Chilling deficit detected.",
                recommended_action="Adjust reefer thermostat setpoint down by 2°C.",
                timestamp=timestamp
            )
            
        if truck_res.get("rear_door_open"):
            self._trigger_alert(
                module="COLD_CHAIN",
                severity="WARNING",
                title="Truck Cargo Door Open in Transit",
                message="Vehicle rear door sensor indicates open state. Convective heat influx active.",
                recommended_action="Close and secure cargo latch immediately.",
                timestamp=timestamp
            )
            
        # Check Traditional Storage Elevated Respiration / Temperature
        trad_temp = trad_res["internal_temp_c"]
        if trad_temp > 28.0:
            self._trigger_alert(
                module="TRADITIONAL_STORAGE",
                severity="CRITICAL",
                title="Storage Room Respiration Heat Build-Up",
                message=f"Traditional storage room internal temperature has climbed to {trad_temp}°C. Produce spoilage risk is {trad_res['spoilage_risk_pct']}%.",
                recommended_action="Open night ventilation louvers to allow cool ambient air circulation.",
                timestamp=timestamp
            )
            
        if trad_res["internal_o2_pct"] < 3.0:
            self._trigger_alert(
                module="TRADITIONAL_STORAGE",
                severity="CRITICAL",
                title="Storage Room Hypoxia Danger (<3% O2)",
                message=f"Internal O2 concentration dropped to {trad_res['internal_o2_pct']}%. Produce entering anaerobic fermentation.",
                recommended_action="Activate forced air exhaust fan to purge CO2 and restore fresh oxygen.",
                timestamp=timestamp
            )

    def _trigger_alert(self, module: str, severity: str, title: str, message: str, recommended_action: str, timestamp: str):
        # Keep alerts list bounded and avoid spamming exact duplicate title within last 3 alerts
        recent_titles = [a["title"] for a in self.alerts[-3:]]
        if title in recent_titles:
            return
            
        alert_obj = {
            "id": f"alert_{self.alert_counter}",
            "module": module,
            "severity": severity, # CRITICAL, WARNING, INFO
            "title": title,
            "message": message,
            "recommended_action": recommended_action,
            "timestamp": timestamp,
            "acknowledged": False
        }
        self.alert_counter += 1
        self.alerts.append(alert_obj)
        if len(self.alerts) > 50:
            self.alerts.pop(0)

        # Telegram Critical Alert Push Notification
        if severity == "CRITICAL" and TelegramService and TelegramService.is_configured():
            try:
                TelegramService.send_critical_alert(
                    alert_type=title,
                    commodity=module,
                    severity=severity,
                    current_temp_c=self.ambient_temp_c,
                    quality_score=0.0,
                    shelf_life_days=0.0,
                    details=f"{message} (Recommendation: {recommended_action})"
                )
            except Exception:
                pass

    def acknowledge_alert(self, alert_id: str) -> bool:
        for a in self.alerts:
            if a["id"] == alert_id:
                a["acknowledged"] = True
                return True
        return False

    def get_state(self) -> Dict[str, Any]:
        """Returns the complete, authoritative, synchronized simulation state."""
        hours_simulated = round(self.total_simulated_seconds / 3600.0, 2)
        days_simulated = round(self.total_simulated_seconds / 86400.0, 2)
        
        sc = self.scenario_manager.get_active_scenario()
        effective_ambient_temp = self.ambient_temp_c + sc.get("ambient_temp_delta", 0.0)
        effective_ambient_rh = sc.get("ambient_rh_override", self.ambient_rh_pct)
        
        # Current snapshot of all three twins
        trad_state = self.traditional_store.step(
            ambient_temp_c=effective_ambient_temp,
            ambient_rh_pct=effective_ambient_rh,
            ambient_pressure_kpa=self.ambient_pressure_kpa,
            dt_seconds=0.0 # Snapshot without advancing time
        )
        
        cold_state = self.cold_warehouse.step(
            ambient_temp_c=effective_ambient_temp,
            ambient_rh_pct=effective_ambient_rh,
            ambient_pressure_kpa=self.ambient_pressure_kpa,
            dt_seconds=0.0
        )
        
        truck_state = self.truck.step(
            ambient_temp_c=effective_ambient_temp,
            ambient_rh_pct=effective_ambient_rh,
            ambient_pressure_kpa=self.ambient_pressure_kpa,
            dt_seconds=0.0
        )
        
        return {
            "sim_id": self.sim_id,
            "is_running": self.is_running,
            "sim_speed": self.sim_speed,
            "total_simulated_seconds": round(self.total_simulated_seconds, 1),
            "simulated_hours": hours_simulated,
            "simulated_days": days_simulated,
            "active_scenario": sc,
            "ambient_environment": {
                "temperature_c": round(effective_ambient_temp, 2),
                "relative_humidity_pct": round(effective_ambient_rh, 1),
                "atmospheric_pressure_kpa": round(self.ambient_pressure_kpa, 2),
                "source_label": self.weather_source_label,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            "traditional_storage": trad_state,
            "cold_storage": cold_state,
            "refrigerated_truck": truck_state,
            "alerts": self.alerts,
            "unacknowledged_alerts_count": sum(1 for a in self.alerts if not a["acknowledged"]),
            "batch_instances": self.batch_manager.get_all_snapshots() if self.batch_manager else [],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

# Global singleton simulation instance
master_simulation = SimulationEngine()

