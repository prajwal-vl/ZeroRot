"""
Atmospheric and Gas Exchange Simulation Engine.
Implements Dalton's Law for partial pressures and a dynamic gas balance model
accounting for produce respiration (O2 consumption & CO2 evolution) and atmospheric ventilation.
"""
import math
from typing import Dict, Any

# Standard atmospheric constant (kPa at sea level)
P_ATM_STANDARD_KPA = 101.325
O2_MOLAR_FRACTION_CLEAN_AIR = 0.2095
CO2_AMBIENT_PPM = 420.0 # ~0.042%

# Commodity gas respiration constants:
# v_max_o2_ml_kg_h: Maximum O2 consumption rate at 20°C in mL / (kg * hour)
# respiratory_quotient (RQ): moles of CO2 evolved per mole of O2 consumed
COMMODITY_GAS_PROPS = {
    "mango": {
        "v_max_o2_ml_kg_h": 28.0,
        "respiratory_quotient": 1.05,
        "km_o2_pct": 1.8, # Michaelis-Menten affinity constant for O2
        "ki_co2_pct": 12.0 # Inhibition constant for CO2
    },
    "banana": {
        "v_max_o2_ml_kg_h": 22.0,
        "respiratory_quotient": 1.02,
        "km_o2_pct": 1.5,
        "ki_co2_pct": 10.0
    },
    "tomato": {
        "v_max_o2_ml_kg_h": 16.0,
        "respiratory_quotient": 0.98,
        "km_o2_pct": 1.2,
        "ki_co2_pct": 15.0
    },
    "potato": {
        "v_max_o2_ml_kg_h": 6.5,
        "respiratory_quotient": 0.95,
        "km_o2_pct": 1.0,
        "ki_co2_pct": 18.0
    },
    "onion": {
        "v_max_o2_ml_kg_h": 4.5,
        "respiratory_quotient": 0.92,
        "km_o2_pct": 1.0,
        "ki_co2_pct": 20.0
    },
    "apple": {
        "v_max_o2_ml_kg_h": 7.0,
        "respiratory_quotient": 1.0,
        "km_o2_pct": 1.2,
        "ki_co2_pct": 14.0
    },
    "grape": {
        "v_max_o2_ml_kg_h": 8.5,
        "respiratory_quotient": 1.0,
        "km_o2_pct": 1.1,
        "ki_co2_pct": 12.0
    }
}

class GasModel:
    """
    Gas physics and chemical respiration model.
    """

    @staticmethod
    def calculate_saturation_vapor_pressure_kpa(temp_c: float) -> float:
        """
        Magnus-Tetens formula for saturation water vapor pressure:
        P_sat(T) = 0.61078 * exp((17.27 * T) / (T + 237.3)) in kPa.
        """
        p_sat = 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
        return p_sat

    @staticmethod
    def calculate_daltons_oxygen_partial_pressure(
        atmospheric_pressure_kpa: float,
        temp_c: float,
        relative_humidity_pct: float
    ) -> Dict[str, float]:
        """
        Applies Dalton's Law:
        P_atmospheric = P_dry_air + P_water_vapor
        P_water_vapor = (RH / 100) * P_sat(T)
        P_O2 = 0.2095 * (P_atmospheric - P_water_vapor)
        
        Assumptions:
        - Dry air contains 20.95% oxygen by mole/volume fraction under standard mixture.
        - Water vapor behaves as an ideal gas in Dalton's partial pressure summation.
        - Consistent pressure unit: kPa.
        """
        p_sat = GasModel.calculate_saturation_vapor_pressure_kpa(temp_c)
        p_water_vapor = (max(0.0, min(100.0, relative_humidity_pct)) / 100.0) * p_sat
        p_dry_air = max(0.0, atmospheric_pressure_kpa - p_water_vapor)
        p_o2 = O2_MOLAR_FRACTION_CLEAN_AIR * p_dry_air
        
        return {
            "p_atmospheric_kpa": round(atmospheric_pressure_kpa, 3),
            "p_sat_water_vapor_kpa": round(p_sat, 4),
            "p_water_vapor_kpa": round(p_water_vapor, 4),
            "p_dry_air_kpa": round(p_dry_air, 4),
            "daltons_p_o2_kpa": round(p_o2, 4)
        }

    @staticmethod
    def step_gas_exchange(
        current_o2_pct: float,
        current_co2_ppm: float,
        temp_c: float,
        atmospheric_pressure_kpa: float,
        relative_humidity_pct: float,
        commodity_name: str,
        quantity_kg: float,
        room_volume_m3: float,
        air_changes_per_hour: float,
        dt_seconds: float = 60.0
    ) -> Dict[str, Any]:
        """
        Calculates dynamic O2 and CO2 levels inside the facility.
        
        Assumptions & Mechanism:
        - Produce consumes O2 according to enzyme kinetics (Michaelis-Menten with competitive CO2 inhibition).
        - Respiratory quotient (RQ) dictates CO2 production.
        - Natural/mechanical ventilation introduces ambient air (20.95% O2, 420 ppm CO2).
        - Dalton's law determines the theoretical ceiling for oxygen partial pressure given humidity and atmospheric pressure.
        """
        dalton = GasModel.calculate_daltons_oxygen_partial_pressure(
            atmospheric_pressure_kpa, temp_c, relative_humidity_pct
        )
        
        # Max theoretical O2 percentage given water vapor displacement in ambient air
        theoretical_max_o2_pct = (dalton["daltons_p_o2_kpa"] / atmospheric_pressure_kpa) * 100.0
        
        props = COMMODITY_GAS_PROPS.get(commodity_name.lower(), COMMODITY_GAS_PROPS["tomato"])
        v_max = props["v_max_o2_ml_kg_h"]
        km = props["km_o2_pct"]
        ki = props["ki_co2_pct"]
        rq = props["respiratory_quotient"]
        
        # Temperature effect on respiration rate: Q10 ~ 2.0
        temp_factor = math.pow(2.0, (temp_c - 20.0) / 10.0)
        
        # Current CO2 in percent for kinetic equation
        co2_pct = current_co2_ppm / 10000.0
        
        # Oxygen consumption rate (mL O2 / (kg * h))
        # Rate = V_max * [O2] / (Km + [O2]) / (1 + [CO2] / Ki) * TempFactor
        o2_safe = max(0.2, current_o2_pct)
        r_o2_ml_kg_h = (v_max * (o2_safe / (km + o2_safe)) / (1.0 + (co2_pct / ki))) * temp_factor
        
        # Convert mL O2 / h to total m³ O2 consumed over dt_seconds
        # 1 m³ = 1,000,000 mL. Time step in hours: dt / 3600
        dt_hours = dt_seconds / 3600.0
        total_o2_consumed_m3 = (r_o2_ml_kg_h * quantity_kg * 1e-6) * dt_hours
        total_co2_produced_m3 = total_o2_consumed_m3 * rq
        
        # Effective air exchange rate per step
        ach_step = air_changes_per_hour * dt_hours
        
        # Fresh air replacement
        # d[O2]/dt = ACH * (O2_ambient - O2_internal) - Respiration_Loss / Room_Volume
        ambient_o2_pct = min(20.95, theoretical_max_o2_pct)
        o2_ventilation_delta = ach_step * (ambient_o2_pct - current_o2_pct)
        o2_consumption_delta = (total_o2_consumed_m3 / max(1.0, room_volume_m3)) * 100.0
        
        new_o2_pct = current_o2_pct + o2_ventilation_delta - o2_consumption_delta
        # Bound between 1.0% (severe hypoxia) and theoretical ambient max
        new_o2_pct = max(1.0, min(ambient_o2_pct, new_o2_pct))
        
        # CO2 dynamics
        ambient_co2_ppm = CO2_AMBIENT_PPM
        co2_ventilation_delta = ach_step * (ambient_co2_ppm - current_co2_ppm)
        co2_production_delta = ((total_co2_produced_m3 / max(1.0, room_volume_m3)) * 100.0) * 10000.0 # into ppm
        
        new_co2_ppm = current_co2_ppm + co2_ventilation_delta + co2_production_delta
        new_co2_ppm = max(ambient_co2_ppm, min(50000.0, new_co2_ppm)) # Bound to realistic limits
        
        # Actual internal O2 partial pressure based on resulting fraction
        actual_internal_p_o2_kpa = (new_o2_pct / 100.0) * atmospheric_pressure_kpa
        
        return {
            "o2_concentration_pct": round(new_o2_pct, 2),
            "co2_concentration_ppm": round(new_co2_ppm, 1),
            "o2_partial_pressure_kpa": round(actual_internal_p_o2_kpa, 3),
            "daltons_theoretical_ceiling_kpa": dalton["daltons_p_o2_kpa"],
            "p_water_vapor_kpa": dalton["p_water_vapor_kpa"],
            "o2_respiration_rate_ml_kg_h": round(r_o2_ml_kg_h, 2),
            "co2_evolution_rate_ml_kg_h": round(r_o2_ml_kg_h * rq, 2)
        }

