"""
Intelligent Cold Storage Multi-Zone Warehouse Digital Twin.
Simulates a multi-chamber cold storage facility with automated cooling setpoints,
rack capacity allocation, thermostatic refrigeration cycles, and 2D spatial temperature grids.
"""
import math
from typing import Dict, Any, List
from .thermal_model import ThermalModel, COMMODITY_THERMAL_PROPS
from .humidity_model import HumidityModel
from .gas_model import GasModel
from .deterioration_model import DeteriorationModel

class ColdChamber:
    """Represents an individual refrigerated chamber inside the warehouse."""
    def __init__(
        self,
        chamber_id: str,
        name: str,
        target_temp_c: float,
        target_rh_pct: float,
        capacity_crates: int = 120,
        volume_m3: float = 240.0,
        cooling_capacity_watts: float = 14000.0,
        wall_u_value: float = 0.22 # PIR insulated panel
    ):
        self.chamber_id = chamber_id
        self.name = name
        self.target_temp_c = target_temp_c
        self.target_rh_pct = target_rh_pct
        self.capacity_crates = capacity_crates
        self.allocated_crates = 0
        self.commodity_name = "tomato"
        self.quantity_kg = 0.0
        self.quality_score = 98.0
        
        self.volume_m3 = volume_m3
        self.cooling_capacity_watts = cooling_capacity_watts
        self.wall_u_value = wall_u_value
        self.surface_area_m2 = 220.0
        
        # Operational states
        self.internal_temp_c = target_temp_c
        self.internal_rh_pct = target_rh_pct
        self.internal_o2_pct = 20.8
        self.internal_co2_ppm = 480.0
        self.compressor_running = False
        self.compressor_fault = False
        self.door_open = False
        self.air_circulation_fan = True
        
        # Thermostat hysteresis deadband (°C)
        self.deadband_c = 1.0

    def step(
        self,
        ambient_temp_c: float,
        ambient_rh_pct: float,
        ambient_pressure_kpa: float = 101.3,
        dt_seconds: float = 60.0
    ) -> Dict[str, Any]:
        # Thermostat control logic
        if self.compressor_fault:
            self.compressor_running = False
        else:
            if self.internal_temp_c > (self.target_temp_c + (self.deadband_c / 2.0)):
                self.compressor_running = True
            elif self.internal_temp_c < (self.target_temp_c - (self.deadband_c / 2.0)):
                self.compressor_running = False
                
        cooling_power = self.cooling_capacity_watts if self.compressor_running else 0.0
        
        # Infiltration rate: very low when door closed, spikes when door open
        vent_m3_s = 0.02 if not self.door_open else 0.85
        
        thermal_res = ThermalModel.step_temperature(
            current_temp_c=self.internal_temp_c,
            ambient_temp_c=ambient_temp_c,
            u_value=self.wall_u_value,
            surface_area_m2=self.surface_area_m2,
            ventilation_rate_m3_s=vent_m3_s,
            cooling_power_watts=cooling_power,
            cooling_enabled=self.compressor_running,
            commodity_name=self.commodity_name,
            quantity_kg=self.quantity_kg,
            air_volume_m3=self.volume_m3,
            door_open=self.door_open,
            dt_seconds=dt_seconds
        )
        self.internal_temp_c = thermal_res["internal_temp_c"]
        
        # Humidity dynamics: cooling coil condenses water; humidifiers maintain target RH
        humidity_res = HumidityModel.step_humidity(
            current_rh_pct=self.internal_rh_pct,
            internal_temp_c=self.internal_temp_c,
            ambient_temp_c=ambient_temp_c,
            ambient_rh_pct=ambient_rh_pct,
            ventilation_rate_m3_s=vent_m3_s,
            room_volume_m3=self.volume_m3,
            commodity_name=self.commodity_name,
            quantity_kg=self.quantity_kg,
            door_open=self.door_open,
            dt_seconds=dt_seconds
        )
        # Active ultrasonic humidification if available and low RH
        if self.internal_rh_pct < self.target_rh_pct - 3.0:
            self.internal_rh_pct = min(self.target_rh_pct, self.internal_rh_pct + 0.3)
        else:
            self.internal_rh_pct = humidity_res["internal_rh_pct"]
            
        # Gas dynamics
        gas_res = GasModel.step_gas_exchange(
            current_o2_pct=self.internal_o2_pct,
            current_co2_ppm=self.internal_co2_ppm,
            temp_c=self.internal_temp_c,
            atmospheric_pressure_kpa=ambient_pressure_kpa,
            relative_humidity_pct=self.internal_rh_pct,
            commodity_name=self.commodity_name,
            quantity_kg=self.quantity_kg,
            room_volume_m3=self.volume_m3,
            air_changes_per_hour=0.3 if not self.door_open else 4.0,
            dt_seconds=dt_seconds
        )
        self.internal_o2_pct = gas_res["o2_concentration_pct"]
        self.internal_co2_ppm = gas_res["co2_concentration_ppm"]
        
        # Produce deterioration
        if self.quantity_kg > 0:
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
        else:
            deterioration_res = {
                "quality_score": 100.0,
                "remaining_shelf_life_days": 30.0,
                "remaining_shelf_life_hours": 720.0,
                "spoilage_risk_pct": 0.0,
                "spoilage_category": "LOW",
                "recommendations": ["Chamber empty and ready for allocation."]
            }
            
        # 6x6 spatial temperature heatmap calculation for this chamber
        # Evaporator is placed at (x=0.5, y=0.1). Door is at (x=0.5, y=0.9).
        spatial_grid = []
        for r in range(6):
            for c in range(6):
                dist_evap = math.sqrt((c - 2.5)**2 + (r - 0)**2) / 6.0
                dist_door = math.sqrt((c - 2.5)**2 + (r - 5)**2) / 6.0
                
                # Near evaporator is cooler when compressor is running
                cooling_delta = -1.2 * (1.0 - dist_evap) if self.compressor_running else 0.4 * (1.0 - dist_evap)
                door_delta = (ambient_temp_c - self.internal_temp_c) * 0.4 * (1.0 - dist_door) if self.door_open else 0.0
                
                cell_temp = self.internal_temp_c + cooling_delta + door_delta
                spatial_grid.append({
                    "col": c,
                    "row": r,
                    "temp_c": round(cell_temp, 2),
                    "rh_pct": round(max(35.0, min(99.0, self.internal_rh_pct + (dist_evap * 1.5))), 1)
                })

        return {
            "chamber_id": self.chamber_id,
            "name": self.name,
            "commodity": self.commodity_name,
            "quantity_kg": self.quantity_kg,
            "allocated_crates": self.allocated_crates,
            "capacity_crates": self.capacity_crates,
            "utilization_pct": round((self.allocated_crates / self.capacity_crates) * 100.0, 1),
            "target_temp_c": self.target_temp_c,
            "target_rh_pct": self.target_rh_pct,
            "internal_temp_c": round(self.internal_temp_c, 2),
            "internal_rh_pct": round(self.internal_rh_pct, 1),
            "internal_o2_pct": round(self.internal_o2_pct, 2),
            "internal_co2_ppm": round(self.internal_co2_ppm, 1),
            "compressor_running": self.compressor_running,
            "compressor_fault": self.compressor_fault,
            "door_open": self.door_open,
            "quality_score": deterioration_res["quality_score"],
            "remaining_shelf_life_days": deterioration_res["remaining_shelf_life_days"],
            "spoilage_risk_pct": deterioration_res["spoilage_risk_pct"],
            "spoilage_category": deterioration_res["spoilage_category"],
            "spatial_grid": spatial_grid,
            "recommendations": deterioration_res["recommendations"],
            "data_label": "SIMULATED"
        }

class ColdStorageWarehouseTwin:
    """Main intelligent warehouse containing multiple specialized cold chambers."""
    def __init__(self, facility_id: str = "wh_zero_01", name: str = "Zero Root Multi-Chamber Cold Hub"):
        self.facility_id = facility_id
        self.name = name
        
        # 3 Chambers optimized for different commodity physiological classes:
        # Chamber 1: Tropical fruits (Mango, Banana: 12-14°C, 90% RH)
        # Chamber 2: Vegetables (Tomato: 10-12°C, Potato: 8°C, 90% RH)
        # Chamber 3: Dry bulbs (Onion: 2°C, 70% RH)
        self.chambers: Dict[str, ColdChamber] = {
            "chamber_tropical": ColdChamber(
                chamber_id="chamber_tropical",
                name="Chamber A — Tropical Fruit (Mango/Banana)",
                target_temp_c=13.0,
                target_rh_pct=90.0,
                capacity_crates=150,
                volume_m3=300.0
            ),
            "chamber_veggie": ColdChamber(
                chamber_id="chamber_veggie",
                name="Chamber B — Solanaceous Veg (Tomato/Potato)",
                target_temp_c=10.0,
                target_rh_pct=90.0,
                capacity_crates=150,
                volume_m3=300.0
            ),
            "chamber_cold_dry": ColdChamber(
                chamber_id="chamber_cold_dry",
                name="Chamber C — Low-Temp Bulb Store (Onion)",
                target_temp_c=2.0,
                target_rh_pct=70.0,
                capacity_crates=180,
                volume_m3=320.0
            )
        }
        
        # Pre-seed realistic batch in Chamber B (Tomato)
        self.allocate_produce("chamber_veggie", "tomato", quantity_kg=1500.0, crates=75, quality=97.0)

    def allocate_produce(self, chamber_id: str, commodity_name: str, quantity_kg: float, crates: int, quality: float = 98.0) -> bool:
        if chamber_id in self.chambers:
            ch = self.chambers[chamber_id]
            if ch.allocated_crates + crates <= ch.capacity_crates:
                ch.commodity_name = commodity_name
                ch.quantity_kg += quantity_kg
                ch.allocated_crates += crates
                ch.quality_score = quality
                return True
        return False

    # Alias for API compatibility
    allocate_chamber = allocate_produce

    def recommend_chamber(self, commodity_name: str, crates_needed: int) -> Dict[str, Any]:
        """Intelligent allocation engine mapping produce requirements to optimal available chamber."""
        commodity = commodity_name.lower()
        if commodity in ["mango", "banana"]:
            preferred = "chamber_tropical"
        elif commodity in ["tomato", "potato"]:
            preferred = "chamber_veggie"
        else: # onion
            preferred = "chamber_cold_dry"
            
        target_ch = self.chambers[preferred]
        avail = target_ch.capacity_crates - target_ch.allocated_crates
        can_fit = avail >= crates_needed
        
        return {
            "recommended_chamber_id": preferred,
            "chamber_name": target_ch.name,
            "target_temp_c": target_ch.target_temp_c,
            "target_rh_pct": target_ch.target_rh_pct,
            "available_crates": avail,
            "can_accommodate": can_fit,
            "estimated_daily_cooling_kwh": round(target_ch.cooling_capacity_watts * 0.45 * 24 / 1000.0, 1),
            "estimated_daily_cost_inr": round((target_ch.cooling_capacity_watts * 0.45 * 24 / 1000.0) * 8.5, 2)
        }

    def step(self, ambient_temp_c: float, ambient_rh_pct: float, ambient_pressure_kpa: float = 101.3, dt_seconds: float = 60.0) -> Dict[str, Any]:
        chamber_results = {}
        total_crates = 0
        total_capacity = 0
        total_produce_kg = 0.0
        
        for cid, ch in self.chambers.items():
            res = ch.step(ambient_temp_c, ambient_rh_pct, ambient_pressure_kpa, dt_seconds)
            chamber_results[cid] = res
            total_crates += ch.allocated_crates
            total_capacity += ch.capacity_crates
            total_produce_kg += ch.quantity_kg
            
        overall_utilization = round((total_crates / total_capacity) * 100.0, 1) if total_capacity > 0 else 0.0
        
        return {
            "facility_id": self.facility_id,
            "name": self.name,
            "chambers": chamber_results,
            "total_allocated_crates": total_crates,
            "total_capacity_crates": total_capacity,
            "overall_utilization_pct": overall_utilization,
            "total_produce_kg": total_produce_kg,
            "data_label": "SIMULATED"
        }

