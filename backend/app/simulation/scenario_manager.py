"""
Scenario & Fault Injection Manager.
Allows users, judges, and operators to inject real environmental stresses
and equipment malfunctions into the digital twin simulations.
"""
from typing import Dict, Any

SCENARIO_PRESETS = {
    "NORMAL": {
        "name": "Normal Operation",
        "description": "Standard controlled environment with functioning refrigeration and closed access doors.",
        "ambient_temp_delta": 0.0,
        "reefer_fault": False,
        "door_open": False,
        "truck_speed_kmh": 55.0,
        "cooling_power_factor": 1.0
    },
    "HEATWAVE": {
        "name": "Extreme External Heatwave",
        "description": "Outside ambient temperature surges to 42°C, increasing conductive thermal flux across insulation.",
        "ambient_temp_delta": 10.0,
        "reefer_fault": False,
        "door_open": False,
        "truck_speed_kmh": 50.0,
        "cooling_power_factor": 1.0
    },
    "REEFER_FAILURE": {
        "name": "Refrigeration Compressor Breakdown",
        "description": "Active cooling cuts out completely. Internal temperature begins rising due to respiration and conduction.",
        "ambient_temp_delta": 0.0,
        "reefer_fault": True,
        "door_open": False,
        "truck_speed_kmh": 45.0,
        "cooling_power_factor": 0.0
    },
    "DOOR_AJAR": {
        "name": "Loading Door Inadvertently Left Open",
        "description": "Massive convective air exchange enters rear cargo or storage chamber, flooding hot humid ambient air.",
        "ambient_temp_delta": 2.0,
        "reefer_fault": False,
        "door_open": True,
        "truck_speed_kmh": 0.0, # Vehicle stopped during loading
        "cooling_power_factor": 1.0
    },
    "EFFICIENCY_DEGRADED": {
        "name": "Refrigerant Leak / Condenser Soiling",
        "description": "Refrigeration unit operating at only 40% thermal capacity due to gas pressure loss.",
        "ambient_temp_delta": 3.0,
        "reefer_fault": False,
        "door_open": False,
        "truck_speed_kmh": 55.0,
        "cooling_power_factor": 0.4
    },
    "HIGH_HUMIDITY": {
        "name": "Tropical Monsoon Moisture Surge",
        "description": "Ambient relative humidity spikes to 95%, triggering severe condensation and fungal rot hazard.",
        "ambient_temp_delta": -2.0,
        "ambient_rh_override": 95.0,
        "reefer_fault": False,
        "door_open": False,
        "truck_speed_kmh": 40.0,
        "cooling_power_factor": 1.0
    },
    "HIGHWAY_DELAY": {
        "name": "Highway Breakdown / Traffic Blockade",
        "description": "Vehicle speed drops to 5 km/h, extending transit exposure duration by 4 hours under direct sun.",
        "ambient_temp_delta": 4.0,
        "reefer_fault": False,
        "door_open": False,
        "truck_speed_kmh": 5.0,
        "cooling_power_factor": 0.8
    }
}

class ScenarioManager:
    """Manages active scenarios and applies overrides to simulation digital twins."""
    def __init__(self):
        self.active_scenario_key = "NORMAL"

    def apply_scenario(self, scenario_key: str) -> Dict[str, Any]:
        key = scenario_key.upper()
        if key in SCENARIO_PRESETS:
            self.active_scenario_key = key
        return self.get_active_scenario()

    def get_active_scenario(self) -> Dict[str, Any]:
        preset = SCENARIO_PRESETS.get(self.active_scenario_key, SCENARIO_PRESETS["NORMAL"])
        return {
            "key": self.active_scenario_key,
            **preset
        }

