"""
Thermal physics model for agricultural storage and transport environments.
Models conductive, convective, and produce respiration thermal loads.
"""
import math
from typing import Dict, Any

# Produce thermal properties:
# specific_heat: J/(kg * K)
# respiration_base_rate_20c: W/kg at 20°C
# q10_respiration: temperature sensitivity coefficient
COMMODITY_THERMAL_PROPS = {
    "mango": {
        "specific_heat": 3800,
        "respiration_base_20c": 0.085, # W/kg
        "q10_respiration": 2.3,
        "optimal_temp_c": 13.0,
        "temp_min_c": 10.0,
        "temp_max_c": 15.0,
    },
    "banana": {
        "specific_heat": 3350,
        "respiration_base_20c": 0.075,
        "q10_respiration": 2.2,
        "optimal_temp_c": 14.0,
        "temp_min_c": 13.0,
        "temp_max_c": 16.0,
    },
    "tomato": {
        "specific_heat": 3980,
        "respiration_base_20c": 0.055,
        "q10_respiration": 2.1,
        "optimal_temp_c": 12.0,
        "temp_min_c": 10.0,
        "temp_max_c": 15.0,
    },
    "potato": {
        "specific_heat": 3430,
        "respiration_base_20c": 0.020,
        "q10_respiration": 1.9,
        "optimal_temp_c": 8.0,
        "temp_min_c": 4.0,
        "temp_max_c": 10.0,
    },
    "onion": {
        "specific_heat": 3770,
        "respiration_base_20c": 0.015,
        "q10_respiration": 1.8,
        "optimal_temp_c": 2.0,
        "temp_min_c": 0.0,
        "temp_max_c": 4.0,
    },
    "apple": {
        "specific_heat": 3640,
        "respiration_base_20c": 0.035,
        "q10_respiration": 2.2,
        "optimal_temp_c": 1.0,
        "temp_min_c": 0.0,
        "temp_max_c": 4.0,
    },
    "grape": {
        "specific_heat": 3600,
        "respiration_base_20c": 0.030,
        "q10_respiration": 2.0,
        "optimal_temp_c": 0.0,
        "temp_min_c": -1.0,
        "temp_max_c": 2.0,
    },
    "orange": {
        "specific_heat": 3810,
        "respiration_base_20c": 0.025,
        "q10_respiration": 1.9,
        "optimal_temp_c": 5.0,
        "temp_min_c": 3.0,
        "temp_max_c": 8.0,
    },
    "guava": {
        "specific_heat": 3780,
        "respiration_base_20c": 0.070,
        "q10_respiration": 2.2,
        "optimal_temp_c": 9.0,
        "temp_min_c": 6.0,
        "temp_max_c": 12.0,
    }
}
COMMODITY_THERMAL_PROPS["grapes"] = COMMODITY_THERMAL_PROPS["grape"]

class ThermalModel:
    """
    Computes time-dependent internal temperature changes:
    dT/dt = (Q_conductive + Q_ventilation + Q_respiration - Q_cooling) / (Total_Thermal_Capacity)
    """

    @staticmethod
    def calculate_respiration_heat(commodity_name: str, quantity_kg: float, current_temp_c: float) -> float:
        """
        Calculates metabolic respiration heat output in Watts (W).
        q(T) = q_20 * Q10^((T - 20) / 10)
        """
        props = COMMODITY_THERMAL_PROPS.get(commodity_name.lower(), COMMODITY_THERMAL_PROPS["tomato"])
        base_rate = props["respiration_base_20c"]
        q10 = props["q10_respiration"]
        
        # Respiration slows near freezing and accelerates at higher temps
        temp_delta = (current_temp_c - 20.0) / 10.0
        unit_heat = base_rate * math.pow(max(0.5, q10), temp_delta)
        total_heat_watts = max(0.0, unit_heat * quantity_kg)
        return total_heat_watts

    @staticmethod
    def step_temperature(
        current_temp_c: float,
        ambient_temp_c: float,
        u_value: float, # Overall heat transfer coefficient (W/m²·K)
        surface_area_m2: float,
        ventilation_rate_m3_s: float, # Airflow exchange rate
        cooling_power_watts: float,
        cooling_enabled: bool,
        commodity_name: str,
        quantity_kg: float,
        air_volume_m3: float,
        door_open: bool = False,
        dt_seconds: float = 60.0
    ) -> Dict[str, float]:
        """
        Advances thermal state by dt_seconds using forward Euler integration.
        """
        # Physical constants
        RHO_AIR = 1.204 # kg/m³
        CP_AIR = 1005 # J/(kg·K)
        
        # Structure conductive heat transfer: Q_cond = U * A * (T_ambient - T_internal)
        effective_u = u_value * (6.5 if door_open else 1.0)
        q_conductive = effective_u * surface_area_m2 * (ambient_temp_c - current_temp_c)
        
        # Infiltration & ventilation sensible heat: Q_vent = m_dot * Cp * (T_ambient - T_internal)
        effective_vent = ventilation_rate_m3_s + (0.85 if door_open else 0.0)
        m_dot_air = effective_vent * RHO_AIR
        q_ventilation = m_dot_air * CP_AIR * (ambient_temp_c - current_temp_c)
        
        # Produce biological respiration heat
        q_respiration = ThermalModel.calculate_respiration_heat(commodity_name, quantity_kg, current_temp_c)
        
        # Active refrigeration cooling
        actual_cooling = cooling_power_watts if cooling_enabled else 0.0
        
        # Net thermal flux (Watts = Joules / sec)
        net_heat_flux = q_conductive + q_ventilation + q_respiration - actual_cooling
        
        # Total effective heat capacity (Air + Produce + Structure)
        commodity_props = COMMODITY_THERMAL_PROPS.get(commodity_name.lower(), COMMODITY_THERMAL_PROPS["tomato"])
        cp_produce = commodity_props["specific_heat"]
        
        thermal_capacity_air = air_volume_m3 * RHO_AIR * CP_AIR
        thermal_capacity_produce = quantity_kg * cp_produce
        # Structure thermal inertia buffer (crates, floor, walls)
        thermal_capacity_structure = 45000.0
        
        total_capacity = thermal_capacity_air + (0.35 * thermal_capacity_produce) + thermal_capacity_structure
        
        # Temperature delta over time step dt
        delta_temp = (net_heat_flux / total_capacity) * dt_seconds
        new_temp = current_temp_c + delta_temp
        
        return {
            "internal_temp_c": round(new_temp, 2),
            "delta_temp": round(delta_temp, 4),
            "q_conductive_w": round(q_conductive, 1),
            "q_ventilation_w": round(q_ventilation, 1),
            "q_respiration_w": round(q_respiration, 1),
            "q_cooling_w": round(actual_cooling, 1),
            "net_heat_flux_w": round(net_heat_flux, 1)
        }

