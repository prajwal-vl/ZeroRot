"""
Psychrometric and Moisture Balance Simulation Engine.
Calculates water vapor pressure, relative humidity, produce transpiration rates,
and condensation phenomena.
"""
import math
from typing import Dict, Any

class HumidityModel:
    """
    Computes moisture balance and relative humidity dynamics.
    """

    @staticmethod
    def calculate_saturation_vapor_pressure(temp_c: float) -> float:
        """Magnus-Tetens formula returning kPa."""
        return 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))

    @staticmethod
    def step_humidity(
        current_rh_pct: float,
        internal_temp_c: float,
        ambient_temp_c: float,
        ambient_rh_pct: float,
        ventilation_rate_m3_s: float,
        room_volume_m3: float,
        commodity_name: str,
        quantity_kg: float,
        door_open: bool = False,
        dt_seconds: float = 60.0
    ) -> Dict[str, float]:
        """
        Steps humidity state forward using mass balance of water vapor.
        """
        # Internal saturation pressure
        p_sat_int = HumidityModel.calculate_saturation_vapor_pressure(internal_temp_c)
        # Current internal water vapor pressure
        p_vap_int = (current_rh_pct / 100.0) * p_sat_int
        
        # Ambient water vapor pressure
        p_sat_amb = HumidityModel.calculate_saturation_vapor_pressure(ambient_temp_c)
        p_vap_amb = (ambient_rh_pct / 100.0) * p_sat_amb
        
        # Produce transpiration coefficient (kg water / (kg produce * s * kPa vapor pressure deficit))
        # Commodities transpire when the air vapor pressure is lower than the produce tissue vapor pressure
        transpiration_rates = {
            "mango": 1.2e-7,
            "banana": 1.5e-7,
            "tomato": 1.8e-7,
            "potato": 0.5e-7,
            "onion": 0.3e-7
        }
        k_trans = transpiration_rates.get(commodity_name.lower(), 1.0e-7)
        
        # Vapor pressure deficit at produce surface (assume surface ~ internal temp)
        vpd = max(0.0, p_sat_int - p_vap_int)
        water_transpired_kg_s = k_trans * quantity_kg * vpd
        
        # Moisture exchange from ventilation (air exchange)
        # Convert vapor pressure to absolute humidity (kg water / m³ air):
        # rho_v = (p_vap * 1000) / (461.5 * (T + 273.15))
        r_water_gas_constant = 461.5 # J/(kg·K)
        rho_v_int = (p_vap_int * 1000.0) / (r_water_gas_constant * (internal_temp_c + 273.15))
        rho_v_amb = (p_vap_amb * 1000.0) / (r_water_gas_constant * (ambient_temp_c + 273.15))
        
        effective_vent = ventilation_rate_m3_s + (0.9 if door_open else 0.0)
        ventilation_water_delta_kg_s = effective_vent * (rho_v_amb - rho_v_int)
        
        # Net change in moisture mass inside the room volume
        net_moisture_rate_kg_s = water_transpired_kg_s + ventilation_water_delta_kg_s
        total_moisture_delta_kg = net_moisture_rate_kg_s * dt_seconds
        
        new_rho_v_int = max(0.001, rho_v_int + (total_moisture_delta_kg / max(1.0, room_volume_m3)))
        
        # Convert back to vapor pressure: p_vap = rho_v * R_v * T / 1000 kPa
        new_p_vap_int = (new_rho_v_int * r_water_gas_constant * (internal_temp_c + 273.15)) / 1000.0
        
        # Calculate resulting RH
        new_rh = (new_p_vap_int / max(0.01, p_sat_int)) * 100.0
        
        # Condensation occurs if RH > 100%
        condensation_risk = max(0.0, new_rh - 100.0)
        new_rh = min(98.5, max(15.0, new_rh))
        
        return {
            "internal_rh_pct": round(new_rh, 1),
            "vapor_pressure_deficit_kpa": round(vpd, 3),
            "internal_vapor_pressure_kpa": round(new_p_vap_int, 4),
            "transpiration_rate_g_per_h": round(water_transpired_kg_s * 3600.0 * 1000.0, 2),
            "condensation_risk_pct": round(condensation_risk, 1)
        }

