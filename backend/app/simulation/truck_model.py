"""
Refrigerated Truck Digital Twin Model.
Simulates a multi-compartment refrigerated cargo trailer during transit
(e.g., Bengaluru -> Mandya corridor), thermal gradients between front/middle/rear,
reefer refrigeration dynamics, door ingress, and real-time route progression.
"""
import math
from typing import Dict, Any, List
from .thermal_model import ThermalModel
from .humidity_model import HumidityModel
from .gas_model import GasModel
from .deterioration_model import DeteriorationModel

class RefrigeratedTruckTwin:
    """
    Simulates refrigerated truck transit with front, middle, and rear cargo zones.
    """
    def __init__(
        self,
        truck_id: str = "truck_zr_104",
        plate_number: str = "KA-04-ZR-2026",
        origin: str = "Bengaluru Rural Agri Hub",
        origin_coords: tuple = (12.9716, 77.5946),
        destination: str = "Mandya APMC Cold Terminal",
        destination_coords: tuple = (12.5218, 76.8951),
        route_distance_km: float = 102.5,
        commodity_name: str = "tomato",
        quantity_kg: float = 2400.0,
        initial_quality: float = 96.0,
        target_temp_c: float = 11.0,
        target_rh_pct: float = 88.0,
        reefer_power_watts: float = 18000.0
    ):
        self.truck_id = truck_id
        self.plate_number = plate_number
        self.origin = origin
        self.origin_coords = origin_coords
        self.destination = destination
        self.destination_coords = destination_coords
        self.route_distance_km = route_distance_km
        self.commodity_name = commodity_name
        self.quantity_kg = quantity_kg
        self.target_temp_c = target_temp_c
        self.target_rh_pct = target_rh_pct
        self.reefer_power_watts = reefer_power_watts
        
        # Operational controls
        self.reefer_on = True
        self.reefer_fault = False
        self.rear_door_open = False
        self.truck_speed_kmh = 55.0 # Average highway transit speed
        
        # Route progress
        self.distance_traveled_km = 0.0
        self.route_progress_pct = 0.0
        self.current_lat = origin_coords[0]
        self.current_lng = origin_coords[1]
        self.eta_minutes = (route_distance_km / self.truck_speed_kmh) * 60.0
        
        # Three spatial cargo compartments along trailer length:
        # Zone 1: Front (nearest reefer evaporator, coldest, receives direct chilled blast)
        # Zone 2: Middle (insulated between produce stacks)
        # Zone 3: Rear (nearest loading doors, most vulnerable to solar heat & door leaks)
        self.zone_temps = {
            "front": target_temp_c - 0.5,
            "mid": target_temp_c,
            "rear": target_temp_c + 0.8
        }
        self.internal_rh_pct = target_rh_pct
        self.internal_o2_pct = 20.7
        self.internal_co2_ppm = 550.0
        self.quality_score = initial_quality
        
        # Cargo physical specs: 40ft container approx 75 m³
        self.volume_m3 = 75.0
        self.wall_area_m2 = 120.0
        self.wall_u_value = 0.28 # Insulated sandwich panel

    @property
    def mean_cargo_temp_c(self) -> float:
        return sum(self.zone_temps.values()) / max(len(self.zone_temps), 1)

    @property
    def cargo_rh_pct(self) -> float:
        return self.internal_rh_pct

    @property
    def o2_pct(self) -> float:
        return self.internal_o2_pct

    @property
    def co2_ppm(self) -> float:
        return self.internal_co2_ppm

    def step(
        self,
        ambient_temp_c: float = 32.0,
        ambient_rh_pct: float = 55.0,
        ambient_pressure_kpa: float = 101.3,
        dt_seconds: float = 60.0
    ) -> Dict[str, Any]:
        """Advances truck route position and cargo thermal physics."""
        
        # 1. Update transit route progression
        if self.distance_traveled_km < self.route_distance_km and self.truck_speed_kmh > 0:
            dist_step = (self.truck_speed_kmh / 3600.0) * dt_seconds
            self.distance_traveled_km = min(self.route_distance_km, self.distance_traveled_km + dist_step)
            self.route_progress_pct = round((self.distance_traveled_km / self.route_distance_km) * 100.0, 1)
            
            # Linear GPS interpolation between Bengaluru & Mandya
            fraction = self.distance_traveled_km / self.route_distance_km
            self.current_lat = round(self.origin_coords[0] + (self.destination_coords[0] - self.origin_coords[0]) * fraction, 5)
            self.current_lng = round(self.origin_coords[1] + (self.destination_coords[1] - self.origin_coords[1]) * fraction, 5)
            
            remaining_dist = self.route_distance_km - self.distance_traveled_km
            self.eta_minutes = round((remaining_dist / max(1.0, self.truck_speed_kmh)) * 60.0, 1)
        elif self.distance_traveled_km >= self.route_distance_km:
            self.route_progress_pct = 100.0
            self.eta_minutes = 0.0

        # 2. Reefer compressor modulation
        avg_temp = (self.zone_temps["front"] + self.zone_temps["mid"] + self.zone_temps["rear"]) / 3.0
        compressor_active = self.reefer_on and not self.reefer_fault and (avg_temp > self.target_temp_c)
        cooling_power = self.reefer_power_watts if compressor_active else 0.0
        
        # 3. Step individual zones with thermal coupling
        # Front zone gets 50% of cooling direct blast; mid gets 35%; rear gets 15%
        cooling_distribution = {"front": 0.50, "mid": 0.35, "rear": 0.15}
        door_exposure = {"front": 0.05, "mid": 0.20, "rear": 0.75} # Door influx primarily hits rear
        
        # Infiltration rate in m³/s
        base_leakage = 0.008
        door_leakage = 0.65 if self.rear_door_open else 0.0
        
        for zone in ["front", "mid", "rear"]:
            zone_cool = cooling_power * cooling_distribution[zone]
            zone_u = self.wall_u_value * (3.5 if (self.rear_door_open and zone == "rear") else 1.0)
            zone_vent = base_leakage + (door_leakage * door_exposure[zone])
            
            res = ThermalModel.step_temperature(
                current_temp_c=self.zone_temps[zone],
                ambient_temp_c=ambient_temp_c,
                u_value=zone_u,
                surface_area_m2=self.wall_area_m2 / 3.0,
                ventilation_rate_m3_s=zone_vent,
                cooling_power_watts=zone_cool,
                cooling_enabled=compressor_active,
                commodity_name=self.commodity_name,
                quantity_kg=self.quantity_kg / 3.0,
                air_volume_m3=self.volume_m3 / 3.0,
                door_open=(self.rear_door_open and zone == "rear"),
                dt_seconds=dt_seconds
            )
            self.zone_temps[zone] = res["internal_temp_c"]

        # Inter-zone conductive/convective air mixing along trailer floor/ceiling
        mix_rate = 0.04
        t_f, t_m, t_r = self.zone_temps["front"], self.zone_temps["mid"], self.zone_temps["rear"]
        self.zone_temps["front"] += mix_rate * (t_m - t_f)
        self.zone_temps["mid"] += mix_rate * (t_f + t_r - 2 * t_m)
        self.zone_temps["rear"] += mix_rate * (t_m - t_r)
        
        mean_cargo_temp = (self.zone_temps["front"] + self.zone_temps["mid"] + self.zone_temps["rear"]) / 3.0

        # 4. Humidity step
        humidity_res = HumidityModel.step_humidity(
            current_rh_pct=self.internal_rh_pct,
            internal_temp_c=mean_cargo_temp,
            ambient_temp_c=ambient_temp_c,
            ambient_rh_pct=ambient_rh_pct,
            ventilation_rate_m3_s=base_leakage + (door_leakage * 0.5),
            room_volume_m3=self.volume_m3,
            commodity_name=self.commodity_name,
            quantity_kg=self.quantity_kg,
            door_open=self.rear_door_open,
            dt_seconds=dt_seconds
        )
        self.internal_rh_pct = humidity_res["internal_rh_pct"]

        # 5. Deterioration kinetics under transit stress
        deterioration_res = DeteriorationModel.step_produce_quality(
            current_quality_score=self.quality_score,
            commodity_name=self.commodity_name,
            temp_c=mean_cargo_temp,
            rh_pct=self.internal_rh_pct,
            o2_pct=self.internal_o2_pct,
            co2_ppm=self.internal_co2_ppm,
            dt_seconds=dt_seconds
        )
        self.quality_score = deterioration_res["quality_score"]

        # Calculate cargo financial loss at risk:
        # Standard wholesale benchmark: INR 28/kg for tomato
        estimated_market_price_per_kg = 28.0
        total_cargo_value_inr = self.quantity_kg * estimated_market_price_per_kg
        value_at_risk_inr = total_cargo_value_inr * (deterioration_res["spoilage_risk_pct"] / 100.0)

        # High resolution 8x4 cargo cross-section heatmap for Canvas rendering
        # x: 0 (front reefer) to 7 (rear door); y: 0 (ceiling) to 3 (floor)
        spatial_heatmap = []
        for y in range(4):
            for x in range(8):
                # Map x to zone: 0-2 front, 3-5 mid, 6-7 rear
                if x <= 2:
                    base_zone_t = self.zone_temps["front"]
                elif x <= 5:
                    base_zone_t = self.zone_temps["mid"]
                else:
                    base_zone_t = self.zone_temps["rear"]
                    
                # Ceiling is slightly warmer; floor return air is cooler
                gradient_y = -0.4 if y >= 2 else 0.3
                # Rear door leak effect
                door_prox = (x / 7.0) * (3.0 if self.rear_door_open else 0.4)
                
                point_t = base_zone_t + gradient_y + (door_prox if (ambient_temp_c > base_zone_t) else -door_prox)
                spatial_heatmap.append({
                    "x": x,
                    "y": y,
                    "temp_c": round(point_t, 2)
                })

        # Sensors
        virtual_sensors = [
            {"id": "sens_trk_front", "type": "TEMPERATURE", "zone": "Zone 1 (Front)", "value": round(self.zone_temps["front"], 1), "unit": "°C", "label": "SIMULATED"},
            {"id": "sens_trk_mid", "type": "TEMPERATURE", "zone": "Zone 2 (Middle)", "value": round(self.zone_temps["mid"], 1), "unit": "°C", "label": "SIMULATED"},
            {"id": "sens_trk_rear", "type": "TEMPERATURE", "zone": "Zone 3 (Rear Door)", "value": round(self.zone_temps["rear"], 1), "unit": "°C", "label": "SIMULATED"},
            {"id": "sens_trk_rh", "type": "HUMIDITY", "zone": "Trailer Interior", "value": round(self.internal_rh_pct, 1), "unit": "%", "label": "SIMULATED"},
            {"id": "sens_trk_gps", "type": "GPS", "zone": "Vehicle Telematics", "value": f"{self.current_lat}, {self.current_lng}", "unit": "coords", "label": "SIMULATED"},
            {"id": "sens_trk_reefer", "type": "STATUS", "zone": "Reefer Compressor", "value": "RUNNING" if compressor_active else ("FAULT" if self.reefer_fault else "IDLE"), "unit": "state", "label": "SIMULATED"}
        ]

        return {
            "truck_id": self.truck_id,
            "plate_number": self.plate_number,
            "origin": self.origin,
            "destination": self.destination,
            "route_distance_km": self.route_distance_km,
            "distance_traveled_km": round(self.distance_traveled_km, 1),
            "route_progress_pct": self.route_progress_pct,
            "current_lat": self.current_lat,
            "current_lng": self.current_lng,
            "eta_minutes": self.eta_minutes,
            "truck_speed_kmh": self.truck_speed_kmh,
            "commodity": self.commodity_name,
            "quantity_kg": self.quantity_kg,
            "target_temp_c": self.target_temp_c,
            "mean_cargo_temp_c": round(mean_cargo_temp, 2),
            "zone_temps": {k: round(v, 2) for k, v in self.zone_temps.items()},
            "internal_rh_pct": round(self.internal_rh_pct, 1),
            "reefer_on": self.reefer_on,
            "reefer_active": compressor_active,
            "reefer_fault": self.reefer_fault,
            "rear_door_open": self.rear_door_open,
            "quality_score": deterioration_res["quality_score"],
            "remaining_shelf_life_days": deterioration_res["remaining_shelf_life_days"],
            "remaining_shelf_life_hours": deterioration_res["remaining_shelf_life_hours"],
            "spoilage_risk_pct": deterioration_res["spoilage_risk_pct"],
            "spoilage_category": deterioration_res["spoilage_category"],
            "total_cargo_value_inr": total_cargo_value_inr,
            "value_at_risk_inr": round(value_at_risk_inr, 2),
            "spatial_heatmap": spatial_heatmap,
            "sensors": virtual_sensors,
            "recommendations": deterioration_res["recommendations"],
            "data_label": "SIMULATED"
        }

