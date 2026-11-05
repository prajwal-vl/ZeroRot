"""
Biological Produce Deterioration & Shelf-Life Kinetics Model.
Implements Arrhenius / Q10-based biochemical degradation kinetics,
calculates spoilage risk index, and estimates remaining shelf life.
"""
import math
from typing import Dict, Any, List

COMMODITY_SHELF_LIFE_PARAMS = {
    "mango": {
        "optimal_temp_c": 13.0,
        "chilling_injury_threshold_c": 10.0,
        "max_shelf_life_days": 21.0, # at optimal condition
        "base_decay_rate_day": 0.047, # 1 / 21
        "q10_decay": 2.4,
        "optimal_rh_min": 85.0,
        "optimal_rh_max": 92.0,
        "critical_quality_threshold": 35.0 # percentage below which produce is unmarketable
    },
    "banana": {
        "optimal_temp_c": 14.0,
        "chilling_injury_threshold_c": 12.5,
        "max_shelf_life_days": 18.0,
        "base_decay_rate_day": 0.055,
        "q10_decay": 2.5,
        "optimal_rh_min": 88.0,
        "optimal_rh_max": 95.0,
        "critical_quality_threshold": 40.0
    },
    "tomato": {
        "optimal_temp_c": 12.0,
        "chilling_injury_threshold_c": 9.0,
        "max_shelf_life_days": 16.0,
        "base_decay_rate_day": 0.062,
        "q10_decay": 2.2,
        "optimal_rh_min": 85.0,
        "optimal_rh_max": 90.0,
        "critical_quality_threshold": 30.0
    },
    "potato": {
        "optimal_temp_c": 8.0,
        "chilling_injury_threshold_c": 3.5, # cold sweetening risk below 4°C
        "max_shelf_life_days": 120.0,
        "base_decay_rate_day": 0.0083,
        "q10_decay": 1.9,
        "optimal_rh_min": 90.0,
        "optimal_rh_max": 95.0,
        "critical_quality_threshold": 30.0
    },
    "onion": {
        "optimal_temp_c": 2.0,
        "chilling_injury_threshold_c": -1.0,
        "max_shelf_life_days": 180.0,
        "base_decay_rate_day": 0.0055,
        "q10_decay": 1.7,
        "optimal_rh_min": 65.0,
        "optimal_rh_max": 75.0, # Onions require lower RH to prevent neck rot / sprouting
        "critical_quality_threshold": 30.0
    },
    "apple": {
        "optimal_temp_c": 1.0,
        "chilling_injury_threshold_c": -1.0,
        "max_shelf_life_days": 150.0,
        "base_decay_rate_day": 0.0067,
        "q10_decay": 2.0,
        "optimal_rh_min": 90.0,
        "optimal_rh_max": 95.0,
        "critical_quality_threshold": 35.0
    },
    "grape": {
        "optimal_temp_c": 0.0,
        "chilling_injury_threshold_c": -1.5,
        "max_shelf_life_days": 60.0,
        "base_decay_rate_day": 0.016,
        "q10_decay": 2.1,
        "optimal_rh_min": 90.0,
        "optimal_rh_max": 95.0,
        "critical_quality_threshold": 40.0
    },
    "orange": {
        "optimal_temp_c": 5.0,
        "chilling_injury_threshold_c": 2.0,
        "max_shelf_life_days": 60.0,
        "base_decay_rate_day": 0.0167,
        "q10_decay": 1.8,
        "optimal_rh_min": 85.0,
        "optimal_rh_max": 90.0,
        "critical_quality_threshold": 35.0
    },
    "guava": {
        "optimal_temp_c": 9.0,
        "chilling_injury_threshold_c": 5.0,
        "max_shelf_life_days": 21.0,
        "base_decay_rate_day": 0.0476,
        "q10_decay": 2.3,
        "optimal_rh_min": 90.0,
        "optimal_rh_max": 95.0,
        "critical_quality_threshold": 35.0
    }
}
COMMODITY_SHELF_LIFE_PARAMS["grapes"] = COMMODITY_SHELF_LIFE_PARAMS["grape"]

class DeteriorationModel:
    """
    Kinetics-based deterioration and shelf-life prediction engine.
    """

    @staticmethod
    def calculate_decay_rate(
        commodity_name: str,
        temp_c: float,
        rh_pct: float,
        o2_pct: float,
        co2_ppm: float
    ) -> Dict[str, float]:
        """
        Calculates the instantaneous deterioration rate k (per day).
        k = k_base * f(T) * f(RH) * f(Gas)
        """
        params = COMMODITY_SHELF_LIFE_PARAMS.get(
            commodity_name.lower(),
            COMMODITY_SHELF_LIFE_PARAMS["tomato"]
        )
        
        opt_t = params["optimal_temp_c"]
        q10 = params["q10_decay"]
        k_base = params["base_decay_rate_day"]
        chill_threshold = params["chilling_injury_threshold_c"]
        
        # 1. Temperature factor f(T):
        if temp_c >= opt_t:
            # Warm acceleration
            f_temp = math.pow(q10, (temp_c - opt_t) / 10.0)
        else:
            if temp_c < chill_threshold:
                # Chilling injury accelerates physiological breakdown
                under_chill = chill_threshold - temp_c
                f_temp = 1.0 + (0.35 * under_chill * under_chill)
            else:
                # Normal cold slowdown
                f_temp = max(0.25, math.pow(q10, (temp_c - opt_t) / 10.0))
                
        # 2. Relative Humidity factor f(RH):
        rh_min = params["optimal_rh_min"]
        rh_max = params["optimal_rh_max"]
        f_rh = 1.0
        if rh_pct < rh_min:
            # Desiccation, weight loss & shriveling
            deficit = rh_min - rh_pct
            f_rh += 0.02 * deficit
        elif rh_pct > rh_max:
            # Free water condensation / mold & rot risk
            excess = rh_pct - rh_max
            f_rh += 0.035 * excess
            
        # 3. Gas factor f(Gas):
        # Elevated CO2 (>5%) and hypoxia (<2% O2) trigger anaerobic fermentation or injury
        f_gas = 1.0
        if o2_pct < 2.0:
            hypoxia_severity = (2.0 - o2_pct)
            f_gas += 0.4 * hypoxia_severity # Fermentation breakdown
        if co2_ppm > 25000: # >2.5% CO2
            co2_injury = (co2_ppm - 25000) / 10000.0
            f_gas += 0.25 * co2_injury
            
        effective_k_day = k_base * f_temp * f_rh * f_gas
        
        return {
            "effective_k_day": round(effective_k_day, 5),
            "temp_factor": round(f_temp, 3),
            "humidity_factor": round(f_rh, 3),
            "gas_factor": round(f_gas, 3)
        }

    @staticmethod
    def step_produce_quality(
        current_quality_score: float, # 0 to 100
        commodity_name: str,
        temp_c: float,
        rh_pct: float,
        o2_pct: float,
        co2_ppm: float,
        dt_seconds: float = 60.0
    ) -> Dict[str, Any]:
        """
        Advances the biological quality state of the batch.
        dQ/dt = -k * Q
        """
        decay_info = DeteriorationModel.calculate_decay_rate(
            commodity_name, temp_c, rh_pct, o2_pct, co2_ppm
        )
        k_day = decay_info["effective_k_day"]
        
        # Convert daily decay rate to step interval: dt_days = dt_seconds / 86400
        dt_days = dt_seconds / 86400.0
        
        # Exponential decay: Q_new = Q * exp(-k * dt)
        decay_step = math.exp(-k_day * dt_days)
        new_quality = max(0.0, current_quality_score * decay_step)
        
        params = COMMODITY_SHELF_LIFE_PARAMS.get(
            commodity_name.lower(),
            COMMODITY_SHELF_LIFE_PARAMS["tomato"]
        )
        crit_q = params["critical_quality_threshold"]
        
        # Remaining Shelf Life (RSL) in days:
        # Q(t) = Q_now * exp(-k * t) => crit_q = Q_now * exp(-k * RSL)
        # RSL = ln(Q_now / crit_q) / k
        if new_quality > crit_q and k_day > 0:
            rsl_days = math.log(new_quality / crit_q) / k_day
        else:
            rsl_days = 0.0
            
        # Spoilage risk (0 to 100%)
        # Function of remaining quality and ambient stress
        quality_deficit = max(0.0, 100.0 - new_quality)
        stress_multiplier = min(2.5, decay_info["temp_factor"] * decay_info["humidity_factor"])
        spoilage_risk_pct = min(100.0, (quality_deficit * 0.7) + (max(0.0, stress_multiplier - 1.0) * 20.0))
        
        if spoilage_risk_pct < 25.0:
            spoilage_category = "LOW"
        elif spoilage_risk_pct < 55.0:
            spoilage_category = "MODERATE"
        elif spoilage_risk_pct < 80.0:
            spoilage_category = "HIGH"
        else:
            spoilage_category = "CRITICAL"
            
        # Recommendations
        recommendations: List[str] = []
        if decay_info["temp_factor"] > 1.6:
            recommendations.append(f"Reduce storage temperature towards {params['optimal_temp_c']}°C immediately to slow respiration kinetics.")
        elif temp_c < params["chilling_injury_threshold_c"]:
            recommendations.append(f"Temperature is below {params['chilling_injury_threshold_c']}°C. Increase temperature to avoid chilling injury.")
            
        if rh_pct < params["optimal_rh_min"]:
            recommendations.append("Humidity is below optimal threshold. Moisten air or damp floors to prevent product shriveling.")
        elif rh_pct > params["optimal_rh_max"]:
            recommendations.append("Relative humidity exceeds limit. Increase ventilation to prevent condensation and mold growth.")
            
        if o2_pct < 3.0:
            recommendations.append("Oxygen levels dangerously low (<3%). Open ventilation dampers to prevent anaerobic spoilage.")

        if not recommendations:
            recommendations.append("Storage environmental conditions within optimal bio-preservation window.")

        return {
            "quality_score": round(new_quality, 2),
            "remaining_shelf_life_days": round(rsl_days, 1),
            "remaining_shelf_life_hours": round(rsl_days * 24.0, 1),
            "spoilage_risk_pct": round(spoilage_risk_pct, 1),
            "spoilage_category": spoilage_category,
            "k_decay_rate_day": k_day,
            "temp_stress_factor": decay_info["temp_factor"],
            "humidity_stress_factor": decay_info["humidity_factor"],
            "gas_stress_factor": decay_info["gas_factor"],
            "recommendations": recommendations,
            "data_label": "PREDICTED"
        }

