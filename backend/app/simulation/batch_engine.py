"""
ZERO ROT 2.0 — Independent Batch Digital Twin Engine (OFacT Architecture).
Project Code: AGR007

Implements independent digital twin entities for each agricultural produce batch:
- Encapsulated microclimate state (ambient, chamber, produce core temperature)
- Arrhenius kinetics and multi-stressor deterioration (Arrhenius, Q10, Transpiration, Gas, Ethylene)
- Virtual IoT Sensor Cluster per batch with stochastic noise, drift, and fault injection
- Economic loss accounting and critical spoilage horizon tracking
- Event-driven state logging and parallel stepping
"""

import math
import random
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

from .commodity_registry import ScientificCommodityRegistry, ScientificCommodityProfile
from .sensor_network import VirtualSensorCluster, VirtualSensorNode

@dataclass
class BatchMicroclimate:
    chamber_temp_c: float = 4.0
    produce_core_temp_c: float = 4.0
    chamber_rh_pct: float = 90.0
    chamber_co2_ppm: float = 600.0
    chamber_o2_pct: float = 20.8
    chamber_ethylene_ppm: float = 0.05
    air_velocity_m_s: float = 0.35

class BatchSimulationInstance:
    """
    Independent Digital Twin Entity representing a single post-harvest produce batch.
    Conforms to Open Factory Twin (OFacT) encapsulation principles.
    """
    def __init__(
        self,
        batch_id: int,
        batch_code: str,
        commodity_name: str,
        quantity_kg: float,
        storage_type: str = "COLD_STORAGE", # "COLD_STORAGE", "TRADITIONAL", "IN_TRANSIT"
        initial_quality_score: float = 100.0,
        initial_price_per_kg: float = 45.0,
        location: str = "Central Cold Store Hub - Chamber A"
    ):
        self.batch_id = batch_id
        self.batch_code = batch_code
        self.commodity_name = commodity_name.lower()
        self.quantity_kg = quantity_kg
        self.storage_type = storage_type.upper()
        self.location = location

        # Load scientific commodity profile
        self.profile: ScientificCommodityProfile = ScientificCommodityRegistry.get_profile(self.commodity_name)

        # Quality & Freshness State
        self.initial_quality_score = float(initial_quality_score)
        self.current_quality_score = float(initial_quality_score)
        self.critical_quality_threshold = self.profile.critical_quality_threshold
        self.is_spoiled = False
        self.remaining_shelf_life_days = self.profile.max_shelf_life_days_optimal
        self.effective_k_day = self.profile.base_decay_rate_day

        # Water loss & Shrinkage State
        self.initial_moisture_pct = 85.0
        self.current_moisture_pct = 85.0
        self.cumulative_water_loss_pct = 0.0
        self.current_weight_kg = quantity_kg

        # Economic Metrics
        self.initial_price_per_kg = initial_price_per_kg
        self.initial_economic_value_inr = quantity_kg * initial_price_per_kg
        self.current_economic_value_inr = self.initial_economic_value_inr
        self.economic_loss_inr = 0.0

        # Physical Microclimate
        self.microclimate = BatchMicroclimate()
        self._initialize_microclimate()

        # Virtual Sensor Cluster
        self.sensor_cluster = VirtualSensorCluster(
            asset_id=self.batch_code,
            asset_name=f"Batch {self.batch_code} ({self.profile.name})"
        )

        # Simulation Timeline & Telemetry History
        self.elapsed_simulated_seconds = 0.0
        self.created_at = datetime.now(timezone.utc).isoformat()
        self.last_stepped_at = self.created_at
        self.telemetry_history: List[Dict[str, Any]] = []
        self.events_log: List[Dict[str, Any]] = []

        # Chilling Injury Stress Accumulator (degree-hours below threshold)
        self.chilling_stress_degree_hours = 0.0

    def _initialize_microclimate(self):
        """Initializes microclimate setpoints matching storage facility type and commodity optimum."""
        if self.storage_type == "COLD_STORAGE":
            self.microclimate.chamber_temp_c = self.profile.optimal_temp_c
            self.microclimate.produce_core_temp_c = self.profile.optimal_temp_c
            self.microclimate.chamber_rh_pct = self.profile.optimal_rh_pct
            self.microclimate.chamber_o2_pct = 20.5
            self.microclimate.chamber_co2_ppm = 500.0
            self.microclimate.chamber_ethylene_ppm = 0.04
        elif self.storage_type == "TRADITIONAL":
            self.microclimate.chamber_temp_c = 26.5
            self.microclimate.produce_core_temp_c = 26.5
            self.microclimate.chamber_rh_pct = 65.0
            self.microclimate.chamber_o2_pct = 20.8
            self.microclimate.chamber_co2_ppm = 450.0
            self.microclimate.chamber_ethylene_ppm = 0.12
        else: # IN_TRANSIT (Reefer truck)
            self.microclimate.chamber_temp_c = self.profile.optimal_temp_c + 1.5
            self.microclimate.produce_core_temp_c = self.microclimate.chamber_temp_c
            self.microclimate.chamber_rh_pct = 85.0
            self.microclimate.chamber_o2_pct = 20.6
            self.microclimate.chamber_co2_ppm = 700.0
            self.microclimate.chamber_ethylene_ppm = 0.08

    def step(
        self,
        dt_seconds: float,
        ambient_temp_c: float = 28.0,
        ambient_rh_pct: float = 65.0,
        active_disruption: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Advances the batch digital twin through one physical time interval dt_seconds.
        Calculates thermal inertia, respiration heat, transpiration, kinetics, and sensor readings.
        """
        self.elapsed_simulated_seconds += dt_seconds
        dt_hours = dt_seconds / 3600.0
        dt_days = dt_seconds / 86400.0

        # 1. Apply microclimate disruption if active
        if active_disruption:
            if "temp_surge_c" in active_disruption:
                self.microclimate.chamber_temp_c += active_disruption["temp_surge_c"] * (dt_hours / 2.0)
            if "rh_drop_pct" in active_disruption:
                self.microclimate.chamber_rh_pct = max(30.0, self.microclimate.chamber_rh_pct - active_disruption["rh_drop_pct"] * (dt_hours / 2.0))
            if "ethylene_spike_ppm" in active_disruption:
                self.microclimate.chamber_ethylene_ppm += active_disruption["ethylene_spike_ppm"]

        # 2. Produce core temperature thermal inertia (Biot number conduction/convection)
        # Produce has thermal mass: dT_core/dt = (T_chamber - T_core) / tau
        # Typical thermal time constant tau is 4-8 hours for produce crates
        tau_hours = 6.0
        temp_diff = self.microclimate.chamber_temp_c - self.microclimate.produce_core_temp_c
        self.microclimate.produce_core_temp_c += temp_diff * (1.0 - math.exp(-dt_hours / tau_hours))

        # 3. Respiration Heat Generation & Gas Balance
        # q_resp = q_base * Q10^((T - 20)/10) [W/kg]
        q_resp_w_kg = self.profile.respiration_base_20c_w_kg * math.pow(
            self.profile.q10_respiration, (self.microclimate.produce_core_temp_c - 20.0) / 10.0
        )
        # Respiration consumes O2 and emits CO2 & Ethylene
        co2_emission_rate_ppm_per_h = q_resp_w_kg * 45.0
        self.microclimate.chamber_co2_ppm = min(40000.0, self.microclimate.chamber_co2_ppm + (co2_emission_rate_ppm_per_h * dt_hours))
        self.microclimate.chamber_o2_pct = max(0.5, self.microclimate.chamber_o2_pct - (0.015 * q_resp_w_kg * dt_hours))

        if self.profile.climacteric:
            c2h4_rate = self.profile.ethylene_production_rate_ul_kg_h * 0.001
            self.microclimate.chamber_ethylene_ppm = min(50.0, self.microclimate.chamber_ethylene_ppm + (c2h4_rate * dt_hours))

        # 4. Transpiration Water Loss
        trans_res = ScientificCommodityRegistry.calculate_transpiration_rate(
            commodity_name=self.commodity_name,
            temp_c=self.microclimate.produce_core_temp_c,
            rh_pct=self.microclimate.chamber_rh_pct
        )
        water_loss_fraction = (trans_res["daily_moisture_loss_pct"] / 100.0) * dt_days
        self.cumulative_water_loss_pct += water_loss_fraction * 100.0
        self.current_weight_kg = max(0.0, self.quantity_kg * (1.0 - (self.cumulative_water_loss_pct / 100.0)))

        # 5. Biological Deterioration Kinetics (Arrhenius + Multi-stressor)
        decay_res = ScientificCommodityRegistry.calculate_effective_decay(
            commodity_name=self.commodity_name,
            temp_c=self.microclimate.produce_core_temp_c,
            rh_pct=self.microclimate.chamber_rh_pct,
            o2_pct=self.microclimate.chamber_o2_pct,
            co2_ppm=self.microclimate.chamber_co2_ppm,
            ambient_ethylene_ppm=self.microclimate.chamber_ethylene_ppm
        )
        self.effective_k_day = decay_res["effective_k_day"]

        # Track Chilling Injury if temperature is below physiological threshold
        if self.microclimate.produce_core_temp_c < self.profile.chilling_injury_threshold_c:
            under_chill = self.profile.chilling_injury_threshold_c - self.microclimate.produce_core_temp_c
            self.chilling_stress_degree_hours += under_chill * dt_hours

        # Decay differential: dQ = -k * Q * dt_days
        delta_q = self.current_quality_score * (1.0 - math.exp(-self.effective_k_day * dt_days))
        self.current_quality_score = max(0.0, self.current_quality_score - delta_q)

        # Invert remaining shelf life: RSL = ln(Q / Q_crit) / k
        if self.current_quality_score <= self.critical_quality_threshold:
            self.remaining_shelf_life_days = 0.0
            self.is_spoiled = True
        elif self.effective_k_day > 0:
            ratio = self.current_quality_score / self.critical_quality_threshold
            self.remaining_shelf_life_days = max(0.0, math.log(ratio) / self.effective_k_day)

        # 6. Economic Valuation
        # Price degrades non-linearly with quality loss and weight shrink
        quality_factor = (self.current_quality_score / 100.0) ** 1.35
        current_effective_rate = self.initial_price_per_kg * quality_factor
        self.current_economic_value_inr = round(self.current_weight_kg * current_effective_rate, 2)
        self.economic_loss_inr = max(0.0, round(self.initial_economic_value_inr - self.current_economic_value_inr, 2))

        # 7. Sample Virtual Sensors
        now_utc = datetime.now(timezone.utc)
        self.last_stepped_at = now_utc.isoformat()

        sensor_readings = self.sensor_cluster.sample_all(
            ground_truth_temp_c=self.microclimate.chamber_temp_c,
            ground_truth_rh_pct=self.microclimate.chamber_rh_pct,
            ground_truth_co2_ppm=self.microclimate.chamber_co2_ppm,
            ground_truth_ethylene_ppm=self.microclimate.chamber_ethylene_ppm,
            ground_truth_o2_pct=self.microclimate.chamber_o2_pct,
            dt_seconds=dt_seconds
        )

        step_summary = {
            "batch_code": self.batch_code,
            "commodity": self.profile.name,
            "elapsed_hours": round(self.elapsed_simulated_seconds / 3600.0, 2),
            "chamber_temp_c": round(self.microclimate.chamber_temp_c, 2),
            "core_temp_c": round(self.microclimate.produce_core_temp_c, 2),
            "rh_pct": round(self.microclimate.chamber_rh_pct, 1),
            "co2_ppm": round(self.microclimate.chamber_co2_ppm, 0),
            "o2_pct": round(self.microclimate.chamber_o2_pct, 2),
            "ethylene_ppm": round(self.microclimate.chamber_ethylene_ppm, 3),
            "quality_score": round(self.current_quality_score, 2),
            "effective_k_day": round(self.effective_k_day, 5),
            "remaining_shelf_life_days": round(self.remaining_shelf_life_days, 1),
            "water_loss_pct": round(self.cumulative_water_loss_pct, 2),
            "current_weight_kg": round(self.current_weight_kg, 1),
            "economic_loss_inr": self.economic_loss_inr,
            "current_value_inr": self.current_economic_value_inr,
            "is_spoiled": self.is_spoiled,
            "chilling_stress_degree_hours": round(self.chilling_stress_degree_hours, 1),
            "sensor_readings": sensor_readings,
            "timestamp": self.last_stepped_at
        }

        # Keep latest 300 telemetry points
        self.telemetry_history.append(step_summary)
        if len(self.telemetry_history) > 300:
            self.telemetry_history.pop(0)

        return step_summary

    def inject_fault_to_sensor(self, sensor_type: str, fault_type: str, offset: float = 0.0):
        """Injects hardware/transceiver fault into batch virtual sensor."""
        self.sensor_cluster.inject_fault(sensor_type, fault_type, offset)
        self.events_log.append({
            "event": "SENSOR_FAULT_INJECTED",
            "sensor_type": sensor_type,
            "fault_type": fault_type,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

    def get_snapshot(self) -> Dict[str, Any]:
        """Returns complete serializable snapshot of the batch twin."""
        return {
            "batch_id": self.batch_id,
            "batch_code": self.batch_code,
            "commodity": self.profile.name,
            "botanical_name": self.profile.botanical_name,
            "storage_type": self.storage_type,
            "location": self.location,
            "initial_weight_kg": self.quantity_kg,
            "current_weight_kg": round(self.current_weight_kg, 2),
            "cumulative_water_loss_pct": round(self.cumulative_water_loss_pct, 2),
            "initial_quality_score": self.initial_quality_score,
            "current_quality_score": round(self.current_quality_score, 2),
            "effective_k_day": round(self.effective_k_day, 5),
            "remaining_shelf_life_days": round(self.remaining_shelf_life_days, 2),
            "critical_threshold": self.critical_quality_threshold,
            "is_spoiled": self.is_spoiled,
            "initial_value_inr": self.initial_economic_value_inr,
            "current_value_inr": self.current_economic_value_inr,
            "economic_loss_inr": self.economic_loss_inr,
            "chilling_stress_degree_hours": round(self.chilling_stress_degree_hours, 1),
            "microclimate": {
                "chamber_temp_c": round(self.microclimate.chamber_temp_c, 2),
                "core_temp_c": round(self.microclimate.produce_core_temp_c, 2),
                "rh_pct": round(self.microclimate.chamber_rh_pct, 1),
                "co2_ppm": round(self.microclimate.chamber_co2_ppm, 0),
                "o2_pct": round(self.microclimate.chamber_o2_pct, 2),
                "ethylene_ppm": round(self.microclimate.chamber_ethylene_ppm, 3)
            },
            "sensor_health": self.sensor_cluster.get_health_status(),
            "telemetry_count": len(self.telemetry_history),
            "events_count": len(self.events_log)
        }


class BatchSimulationManager:
    """
    Singleton Manager holding and stepping all active BatchSimulationInstances.
    Ensures zero cross-contamination between batch states while supporting fleet-wide stepping.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(BatchSimulationManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.instances: Dict[str, BatchSimulationInstance] = {}
        self.active_disruptions: Dict[str, Dict[str, Any]] = {}
        self._initialized = True

    def register_or_get_instance(
        self,
        batch_id: int,
        batch_code: str,
        commodity_name: str,
        quantity_kg: float,
        storage_type: str = "COLD_STORAGE",
        initial_quality_score: float = 100.0,
        current_quality_score: Optional[float] = None,
        remaining_shelf_life_days: Optional[float] = None,
        initial_price_per_kg: float = 45.0,
        location: str = "Central Cold Store Hub - Chamber A"
    ) -> BatchSimulationInstance:
        """Retrieves or registers an independent batch digital twin instance."""
        if batch_code in self.instances:
            return self.instances[batch_code]

        instance = BatchSimulationInstance(
            batch_id=batch_id,
            batch_code=batch_code,
            commodity_name=commodity_name,
            quantity_kg=quantity_kg,
            storage_type=storage_type,
            initial_quality_score=initial_quality_score,
            initial_price_per_kg=initial_price_per_kg,
            location=location
        )
        if current_quality_score is not None:
            instance.current_quality_score = float(current_quality_score)
        if remaining_shelf_life_days is not None:
            instance.remaining_shelf_life_days = float(remaining_shelf_life_days)

        self.instances[batch_code] = instance
        return instance

    def get_instance(self, batch_code: str) -> Optional[BatchSimulationInstance]:
        return self.instances.get(batch_code)

    def remove_instance(self, batch_code: str):
        if batch_code in self.instances:
            del self.instances[batch_code]
        if batch_code in self.active_disruptions:
            del self.active_disruptions[batch_code]

    def inject_batch_disruption(self, batch_code: str, disruption_payload: Dict[str, Any]):
        """Injects microclimate disruption (e.g. door opened, reefer failure, heatwave) to a specific batch."""
        self.active_disruptions[batch_code] = disruption_payload
        inst = self.get_instance(batch_code)
        if inst:
            inst.events_log.append({
                "event": "DISRUPTION_INJECTED",
                "details": disruption_payload,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })

    def clear_batch_disruption(self, batch_code: str):
        if batch_code in self.active_disruptions:
            del self.active_disruptions[batch_code]

    def step_all(
        self,
        dt_seconds: float,
        ambient_temp_c: float = 28.0,
        ambient_rh_pct: float = 65.0
    ) -> Dict[str, Dict[str, Any]]:
        """Advances all active batches independently."""
        results = {}
        for batch_code, inst in list(self.instances.items()):
            disruption = self.active_disruptions.get(batch_code)
            res = inst.step(
                dt_seconds=dt_seconds,
                ambient_temp_c=ambient_temp_c,
                ambient_rh_pct=ambient_rh_pct,
                active_disruption=disruption
            )
            results[batch_code] = res
        return results

    def get_all_snapshots(self) -> List[Dict[str, Any]]:
        return [inst.get_snapshot() for inst in self.instances.values()]
