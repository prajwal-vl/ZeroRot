"""
Traditional Agricultural Storage Room Digital Twin Model.
Simulates a naturally or passively ventilated storage facility (brick/mud store)
exposed to external ambient weather, wall heat conduction, produce respiration,
and passive airflow.
"""
import math
from typing import Dict, Any, List
from .thermal_model import ThermalModel
from .humidity_model import HumidityModel
from .gas_model import GasModel
from .deterioration_model import DeteriorationModel

class TraditionalStorageTwin:
    """
    State and physics container for traditional farm-level storage.
    """
    def __init__(
        self,
        facility_id: str = "trad_store_01",
        name: str = "Rural Farm Post-Harvest Store #1",
        commodity_name: str = "tomato",
        quantity_kg: float = 1200.0,
        initial_quality: float = 95.0,
        room_length_m: float = 8.0,
        room_width_m: float = 6.0,
        room_height_m: float = 3.5,
        wall_u_value: float = 1.8 # Brick/adobe wall U-value (W/m²·K)
    ):
        self.facility_id = facility_id
        self.name = name
        self.commodity_name = commodity_name
        self.quantity_kg = quantity_kg
        self.room_volume_m3 = room_length_m * room_width_m * room_height_m # 168 m³
        self.wall_area_m2 = 2 * (room_length_m * room_height_m + room_width_m * room_height_m) + (room_length_m * room_width_m)
        self.wall_u_value = wall_u_value
        
        # State variables
        self.internal_temp_c = 22.5
        self.internal_rh_pct = 72.0
        self.internal_o2_pct = 20.8
        self.internal_co2_ppm = 520.0
        self.quality_score = initial_quality
        
        # Physical parameters & controls
        self.ventilation_damper_open_pct = 50.0 # 0 to 100%
        self.door_open = False
        self.exhaust_fan_on = False
        
        # Virtual sensors positioned in the 2D room (normalized coordinates 0.0 to 1.0)
        self.sensors = [
            {"id": "sens_trad_t1", "type": "TEMPERATURE", "x": 0.25, "y": 0.35, "zone": "North-West Crate Stack"},
            {"id": "sens_trad_t2", "type": "TEMPERATURE", "x": 0.75, "y": 0.65, "zone": "South-East Air Vent"},
            {"id": "sens_trad_rh1", "type": "HUMIDITY", "x": 0.50, "y": 0.50, "zone": "Central Core"},
            {"id": "sens_trad_o2", "type": "OXYGEN", "x": 0.20, "y": 0.80, "zone": "Door Threshold"},
            {"id": "sens_trad_co2", "type": "CO2", "x": 0.50, "y": 0.20, "zone": "Ceiling Vent Outlet"}
        ]

    def step(
        self,
        ambient_temp_c: float,
        ambient_rh_pct: float,
        ambient_pressure_kpa: float = 101.3,
        dt_seconds: float = 60.0
    ) -> Dict[str, Any]:
        """
        Advances the traditional storage digital twin by dt_seconds.
        """
        # Calculate airflow rate through passive vents & door:
        # Base natural infiltration + damper openings
        base_ach = 0.8 # air changes per hour
        damper_ach = (self.ventilation_damper_open_pct / 100.0) * 2.5
        fan_ach = 4.0 if self.exhaust_fan_on else 0.0
        door_ach = 8.0 if self.door_open else 0.0
        total_ach = base_ach + damper_ach + fan_ach + door_ach
        
        # Volumetric airflow in m³/s
        ventilation_rate_m3_s = (total_ach * self.room_volume_m3) / 3600.0
        
        # 1. Thermal step (No active cooling in traditional store)
        thermal_res = ThermalModel.step_temperature(
            current_temp_c=self.internal_temp_c,
            ambient_temp_c=ambient_temp_c,
            u_value=self.wall_u_value,
            surface_area_m2=self.wall_area_m2,
            ventilation_rate_m3_s=ventilation_rate_m3_s,
            cooling_power_watts=0.0,
            cooling_enabled=False,
            commodity_name=self.commodity_name,
            quantity_kg=self.quantity_kg,
            air_volume_m3=self.room_volume_m3,
            door_open=self.door_open,
            dt_seconds=dt_seconds
        )
        self.internal_temp_c = thermal_res["internal_temp_c"]
        
        # 2. Humidity step
        humidity_res = HumidityModel.step_humidity(
            current_rh_pct=self.internal_rh_pct,
            internal_temp_c=self.internal_temp_c,
            ambient_temp_c=ambient_temp_c,
            ambient_rh_pct=ambient_rh_pct,
            ventilation_rate_m3_s=ventilation_rate_m3_s,
            room_volume_m3=self.room_volume_m3,
            commodity_name=self.commodity_name,
            quantity_kg=self.quantity_kg,
            door_open=self.door_open,
            dt_seconds=dt_seconds
        )
        self.internal_rh_pct = humidity_res["internal_rh_pct"]
        
        # 3. Gas step (Dalton's law partial pressure + biological respiration)
        gas_res = GasModel.step_gas_exchange(
            current_o2_pct=self.internal_o2_pct,
            current_co2_ppm=self.internal_co2_ppm,
            temp_c=self.internal_temp_c,
            atmospheric_pressure_kpa=ambient_pressure_kpa,
            relative_humidity_pct=self.internal_rh_pct,
            commodity_name=self.commodity_name,
            quantity_kg=self.quantity_kg,
            room_volume_m3=self.room_volume_m3,
            air_changes_per_hour=total_ach,
            dt_seconds=dt_seconds
        )
        self.internal_o2_pct = gas_res["o2_concentration_pct"]
        self.internal_co2_ppm = gas_res["co2_concentration_ppm"]
        
        # 4. Deterioration and shelf-life prediction
        deterioration_res = DeteriorationModel.step_produce_quality(
            current_quality_score=self.quality_score,
            commodity_name=self.commodity_name,
            temp_c=self.internal_temp_c,
            rh_pct=self.internal_rh_pct,
            o2_pct=self.internal_o2_pct,
            co2_ppm=self.internal_co2_ppm,
            dt_seconds=dt_seconds
        )
        self.quality_score = deterioration_res["quality_score"]
        
        # 2D Airflow and spatial temperature grid for canvas visualization (5x5 grid)
        spatial_grid = []
        for row in range(5):
            for col in range(5):
                # Distance from ventilation openings (top-right col=4, row=0) and door (bottom-left col=0, row=4)
                vent_dist = math.sqrt((col - 4)**2 + (row - 0)**2) / 5.65
                center_dist = math.sqrt((col - 2)**2 + (row - 2)**2) / 2.82
                
                # Temperature spatial gradient: core is warmer due to respiration, vents track closer to ambient
                local_temp = self.internal_temp_c + ((1.0 - center_dist) * 1.2) - (vent_dist * 0.4)
                spatial_grid.append({
                    "col": col,
                    "row": row,
                    "temp_c": round(local_temp, 2),
                    "rh_pct": round(max(30.0, min(98.0, self.internal_rh_pct + (center_dist * 3.0))), 1)
                })
                
        # Generate virtual sensor readings
        sensor_readings = [
            {"id": "sens_trad_t1", "type": "TEMPERATURE", "value": round(self.internal_temp_c + 0.4, 1), "unit": "°C", "label": "SIMULATED"},
            {"id": "sens_trad_t2", "type": "TEMPERATURE", "value": round(self.internal_temp_c - 0.3, 1), "unit": "°C", "label": "SIMULATED"},
            {"id": "sens_trad_rh1", "type": "HUMIDITY", "value": round(self.internal_rh_pct, 1), "unit": "%", "label": "SIMULATED"},
            {"id": "sens_trad_o2", "type": "OXYGEN", "value": round(self.internal_o2_pct, 2), "unit": "%", "label": "SIMULATED"},
            {"id": "sens_trad_co2", "type": "CO2", "value": round(self.internal_co2_ppm, 0), "unit": "ppm", "label": "SIMULATED"},
        ]
        
        return {
            "facility_id": self.facility_id,
            "name": self.name,
            "commodity": self.commodity_name,
            "quantity_kg": self.quantity_kg,
            "internal_temp_c": round(self.internal_temp_c, 2),
            "internal_rh_pct": round(self.internal_rh_pct, 1),
            "internal_o2_pct": round(self.internal_o2_pct, 2),
            "internal_co2_ppm": round(self.internal_co2_ppm, 1),
            "o2_partial_pressure_kpa": gas_res["o2_partial_pressure_kpa"],
            "daltons_theoretical_ceiling_kpa": gas_res["daltons_theoretical_ceiling_kpa"],
            "quality_score": deterioration_res["quality_score"],
            "remaining_shelf_life_days": deterioration_res["remaining_shelf_life_days"],
            "remaining_shelf_life_hours": deterioration_res["remaining_shelf_life_hours"],
            "spoilage_risk_pct": deterioration_res["spoilage_risk_pct"],
            "spoilage_category": deterioration_res["spoilage_category"],
            "air_changes_per_hour": round(total_ach, 2),
            "ventilation_rate_m3_s": round(ventilation_rate_m3_s, 3),
            "door_open": self.door_open,
            "damper_open_pct": self.ventilation_damper_open_pct,
            "sensors": sensor_readings,
            "spatial_grid": spatial_grid,
            "thermal_details": thermal_res,
            "recommendations": deterioration_res["recommendations"],
            "data_label": "SIMULATED"
        }
