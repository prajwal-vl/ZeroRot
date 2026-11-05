"""
ZERO ROT 2.0 — Virtual Sensor Network (VSN) & Hardware Emulation Engine.
Project Code: AGR007

Simulates realistic IoT agricultural sensor nodes with:
- Configurable sampling intervals and communication delays
- Stochastic Gaussian noise: y(t) = x(t) + N(0, sigma^2)
- Calibration offset & linear sensor drift over operating hours
- Wireless packet dropouts and missing telemetry simulation
- Battery discharge kinetics for autonomous wireless nodes
- Fault injection: DRIFT, FROZEN, DROPOUT, OUT_OF_BOUNDS, BATTERY_DEAD
- Strict provenance data labeling: "SIMULATED", "REAL", "ESTIMATED", "MISSING"
"""

import random
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

@dataclass
class VirtualSensorNode:
    sensor_id: str
    sensor_type: str        # "TEMPERATURE", "HUMIDITY", "CO2", "ETHYLENE", "OXYGEN", "DOOR", "POWER", "COOLING_HEALTH", "GPS"
    asset_id: str           # Chamber ID, Batch Code, or Truck Plate
    asset_name: str
    unit: str
    nominal_accuracy: float # ± value in native unit
    noise_sigma: float      # Standard deviation of measurement Gaussian noise
    sampling_interval_s: float = 60.0

    # Sensor health & physics properties
    offset: float = 0.0
    drift_rate_per_day: float = 0.0
    operating_hours: float = 0.0
    battery_level_pct: float = 100.0
    is_faulty: bool = False
    fault_type: Optional[str] = None # "DRIFT", "FROZEN", "DROPOUT", "BATTERY_DEAD"
    frozen_value: Optional[float] = None
    dropout_probability: float = 0.01

    last_raw_value: float = 0.0
    last_reported_value: Optional[float] = None
    last_reported_at: Optional[str] = None
    provenance_label: str = "SIMULATED" # "SIMULATED", "REAL", "ESTIMATED", "MISSING"

    def read(self, ground_truth_value: float, dt_seconds: float = 60.0) -> Dict[str, Any]:
        """
        Samples the simulated sensor node with physical noise, drift, and fault characteristics.
        """
        self.operating_hours += dt_seconds / 3600.0
        # Battery drain (~1% per 100 hours of continuous sampling)
        self.battery_level_pct = max(0.0, self.battery_level_pct - (dt_seconds / 360000.0))

        now_iso = datetime.now(timezone.utc).isoformat()
        self.last_raw_value = ground_truth_value

        # 1. Handle Battery Dead
        if self.battery_level_pct <= 0.0 or self.fault_type == "BATTERY_DEAD":
            self.last_reported_value = None
            self.provenance_label = "MISSING"
            return {
                "sensor_id": self.sensor_id,
                "sensor_type": self.sensor_type,
                "asset_id": self.asset_id,
                "value": None,
                "unit": self.unit,
                "status": "BATTERY_DEAD",
                "data_label": "MISSING",
                "timestamp": now_iso
            }

        # 2. Handle Packet Dropout (Stochastic wireless loss)
        if random.random() < self.dropout_probability or self.fault_type == "DROPOUT":
            self.last_reported_value = None
            self.provenance_label = "MISSING"
            return {
                "sensor_id": self.sensor_id,
                "sensor_type": self.sensor_type,
                "asset_id": self.asset_id,
                "value": None,
                "unit": self.unit,
                "status": "PACKET_DROPOUT",
                "data_label": "MISSING",
                "timestamp": now_iso
            }

        # 3. Handle Frozen Sensor Fault
        if self.fault_type == "FROZEN":
            reported = self.frozen_value if self.frozen_value is not None else ground_truth_value
            self.last_reported_value = round(reported, 2)
            self.provenance_label = "SIMULATED"
            return {
                "sensor_id": self.sensor_id,
                "sensor_type": self.sensor_type,
                "asset_id": self.asset_id,
                "value": self.last_reported_value,
                "unit": self.unit,
                "status": "FAULT_FROZEN",
                "data_label": "SIMULATED",
                "timestamp": now_iso
            }

        # 4. Normal Sampling with Noise & Calibration Drift
        accumulated_drift = (self.operating_hours / 24.0) * self.drift_rate_per_day
        gaussian_noise = random.gauss(0.0, self.noise_sigma)
        sensed_value = ground_truth_value + self.offset + accumulated_drift + gaussian_noise

        self.last_reported_value = round(sensed_value, 2)
        self.last_reported_at = now_iso
        self.provenance_label = "SIMULATED"

        return {
            "sensor_id": self.sensor_id,
            "sensor_type": self.sensor_type,
            "asset_id": self.asset_id,
            "asset_name": self.asset_name,
            "value": self.last_reported_value,
            "ground_truth_reference": round(ground_truth_value, 2),
            "unit": self.unit,
            "battery_level_pct": round(self.battery_level_pct, 1),
            "drift_accumulated": round(accumulated_drift, 3),
            "status": "HEALTHY" if not self.fault_type else f"FAULT_{self.fault_type}",
            "data_label": self.provenance_label,
            "timestamp": now_iso
        }

    def inject_fault(self, fault_type: str, custom_offset: Optional[float] = None):
        """Injects hardware faults: 'DRIFT', 'FROZEN', 'DROPOUT', 'BATTERY_DEAD', 'RESET'"""
        f = fault_type.upper()
        if f == "RESET":
            self.is_faulty = False
            self.fault_type = None
            self.frozen_value = None
            self.offset = 0.0
            self.drift_rate_per_day = 0.0
            self.dropout_probability = 0.01
            self.battery_level_pct = 100.0
        elif f == "FROZEN":
            self.is_faulty = True
            self.fault_type = "FROZEN"
            self.frozen_value = self.last_reported_value or 24.0
        elif f == "DRIFT":
            self.is_faulty = True
            self.fault_type = "DRIFT"
            self.offset = custom_offset if custom_offset is not None else 3.5
            self.drift_rate_per_day = 1.25 # Drifts 1.25 units per simulated day
        elif f == "DROPOUT":
            self.is_faulty = True
            self.fault_type = "DROPOUT"
            self.dropout_probability = 0.85
        elif f == "BATTERY_DEAD":
            self.is_faulty = True
            self.fault_type = "BATTERY_DEAD"
            self.battery_level_pct = 0.0

class VirtualSensorNetworkManager:
    """Orchestrates all simulated sensor nodes across Cold Warehouse, Traditional Store, and Transport Truck."""

    def __init__(self):
        self.sensors: Dict[str, VirtualSensorNode] = {}
        self._initialize_default_nodes()

    def _initialize_default_nodes(self):
        # Cold Storage Facility Nodes
        self.register_node(VirtualSensorNode("sens_wh_temp_ch_a", "TEMPERATURE", "chamber_tropical", "Chamber A (Tropical)", "°C", 0.2, 0.08))
        self.register_node(VirtualSensorNode("sens_wh_rh_ch_a", "HUMIDITY", "chamber_tropical", "Chamber A (Tropical)", "%", 1.5, 0.45))
        self.register_node(VirtualSensorNode("sens_wh_c2h4_ch_a", "ETHYLENE", "chamber_tropical", "Chamber A (Tropical)", "ppm", 0.05, 0.015))
        self.register_node(VirtualSensorNode("sens_wh_o2_ch_a", "OXYGEN", "chamber_tropical", "Chamber A (Tropical)", "%", 0.2, 0.05))

        self.register_node(VirtualSensorNode("sens_wh_temp_ch_b", "TEMPERATURE", "chamber_veggie", "Chamber B (Vegetable)", "°C", 0.2, 0.08))
        self.register_node(VirtualSensorNode("sens_wh_rh_ch_b", "HUMIDITY", "chamber_veggie", "Chamber B (Vegetable)", "%", 1.5, 0.45))
        self.register_node(VirtualSensorNode("sens_wh_co2_ch_b", "CO2", "chamber_veggie", "Chamber B (Vegetable)", "ppm", 25.0, 8.0))

        self.register_node(VirtualSensorNode("sens_wh_temp_ch_c", "TEMPERATURE", "chamber_cold_dry", "Chamber C (Bulb Store)", "°C", 0.2, 0.06))
        self.register_node(VirtualSensorNode("sens_wh_rh_ch_c", "HUMIDITY", "chamber_cold_dry", "Chamber C (Bulb Store)", "%", 1.5, 0.35))

        # Facility Subsystem Health
        self.register_node(VirtualSensorNode("sens_wh_cooling_power", "POWER", "wh_main_compressor", "Primary HVAC Compressor", "kW", 0.5, 0.12))
        self.register_node(VirtualSensorNode("sens_wh_door_dock", "DOOR", "wh_dock_shutter", "Main Industrial Bay Shutter", "STATE", 0.0, 0.0))

        # Truck Logistics Nodes
        self.register_node(VirtualSensorNode("sens_trk_temp_front", "TEMPERATURE", "truck_cargo_front", "Reefer Zone 1 (Evaporator)", "°C", 0.25, 0.1))
        self.register_node(VirtualSensorNode("sens_trk_temp_mid", "TEMPERATURE", "truck_cargo_mid", "Reefer Zone 2 (Center Pallet)", "°C", 0.25, 0.1))
        self.register_node(VirtualSensorNode("sens_trk_temp_rear", "TEMPERATURE", "truck_cargo_rear", "Reefer Zone 3 (Rear Door)", "°C", 0.25, 0.12))
        self.register_node(VirtualSensorNode("sens_trk_rh", "HUMIDITY", "truck_cargo_main", "Reefer Cargo Bay", "%", 2.0, 0.6))
        self.register_node(VirtualSensorNode("sens_trk_door", "DOOR", "truck_rear_latch", "Cargo Rear Latch", "STATE", 0.0, 0.0))
        self.register_node(VirtualSensorNode("sens_trk_gps", "GPS", "truck_chassis", "Transport Telematics Unit", "LAT/LNG", 0.0001, 0.00005))

    def register_node(self, node: VirtualSensorNode):
        self.sensors[node.sensor_id] = node

    def get_node(self, sensor_id: str) -> Optional[VirtualSensorNode]:
        return self.sensors.get(sensor_id)

    def get_all_health_status(self) -> List[Dict[str, Any]]:
        status_list = []
        for s in self.sensors.values():
            status_list.append({
                "sensor_id": s.sensor_id,
                "sensor_type": s.sensor_type,
                "asset_id": s.asset_id,
                "asset_name": s.asset_name,
                "unit": s.unit,
                "last_value": s.last_reported_value,
                "battery_level_pct": round(s.battery_level_pct, 1),
                "is_faulty": s.is_faulty,
                "fault_type": s.fault_type or "NONE",
                "operating_hours": round(s.operating_hours, 1),
                "data_label": s.provenance_label,
                "last_reported_at": s.last_reported_at
            })
        return status_list

    def inject_fault_to_sensor(self, sensor_id: str, fault_type: str) -> bool:
        node = self.get_node(sensor_id)
        if node:
            node.inject_fault(fault_type)
            return True
        return False

class VirtualSensorCluster:
    """Represents a co-located cluster of IoT sensors deployed with a produce batch or storage chamber."""
    def __init__(self, asset_id: str, asset_name: str):
        self.asset_id = asset_id
        self.asset_name = asset_name
        self.nodes: Dict[str, VirtualSensorNode] = {
            "TEMPERATURE": VirtualSensorNode(f"sens_temp_{asset_id}", "TEMPERATURE", asset_id, asset_name, "°C", 0.2, 0.08),
            "HUMIDITY": VirtualSensorNode(f"sens_rh_{asset_id}", "HUMIDITY", asset_id, asset_name, "%", 1.5, 0.40),
            "CO2": VirtualSensorNode(f"sens_co2_{asset_id}", "CO2", asset_id, asset_name, "ppm", 20.0, 5.0),
            "ETHYLENE": VirtualSensorNode(f"sens_c2h4_{asset_id}", "ETHYLENE", asset_id, asset_name, "ppm", 0.02, 0.01),
            "OXYGEN": VirtualSensorNode(f"sens_o2_{asset_id}", "OXYGEN", asset_id, asset_name, "%", 0.2, 0.05),
        }

    def sample_all(
        self,
        ground_truth_temp_c: float,
        ground_truth_rh_pct: float,
        ground_truth_co2_ppm: float = 500.0,
        ground_truth_ethylene_ppm: float = 0.05,
        ground_truth_o2_pct: float = 20.8,
        dt_seconds: float = 60.0
    ) -> Dict[str, Any]:
        """Samples all sensors in this cluster given ground-truth physical microclimate."""
        return {
            "temperature": self.nodes["TEMPERATURE"].read(ground_truth_temp_c, dt_seconds),
            "humidity": self.nodes["HUMIDITY"].read(ground_truth_rh_pct, dt_seconds),
            "co2": self.nodes["CO2"].read(ground_truth_co2_ppm, dt_seconds),
            "ethylene": self.nodes["ETHYLENE"].read(ground_truth_ethylene_ppm, dt_seconds),
            "oxygen": self.nodes["OXYGEN"].read(ground_truth_o2_pct, dt_seconds),
        }

    def inject_fault(self, sensor_type: str, fault_type: str, offset: float = 0.0):
        sensor_type = sensor_type.upper()
        if sensor_type in self.nodes:
            self.nodes[sensor_type].inject_fault(fault_type, offset)

    def get_health_status(self) -> List[Dict[str, Any]]:
        return [
            {
                "sensor_id": s.sensor_id,
                "sensor_type": s.sensor_type,
                "asset_id": s.asset_id,
                "unit": s.unit,
                "last_value": s.last_reported_value,
                "battery_level_pct": round(s.battery_level_pct, 1),
                "is_faulty": s.is_faulty,
                "fault_type": s.fault_type or "NONE",
                "operating_hours": round(s.operating_hours, 1),
                "data_label": s.provenance_label
            }
            for s in self.nodes.values()
        ]

# Global sensor network instance
sensor_network = VirtualSensorNetworkManager()
