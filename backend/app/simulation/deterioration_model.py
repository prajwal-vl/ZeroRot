"""
Biological Produce Deterioration & Shelf-Life Kinetics Model.
Implements Arrhenius / Q10-based biochemical degradation kinetics,
calculates spoilage risk index, and estimates remaining shelf life.
All calculations are centrally unified via ScientificCommodityRegistry.
"""
import math
from typing import Dict, Any, List

try:
    from .commodity_registry import ScientificCommodityRegistry, COMMODITY_REGISTRY
except ImportError:
    from app.simulation.commodity_registry import ScientificCommodityRegistry, COMMODITY_REGISTRY

# Dynamically construct COMMODITY_SHELF_LIFE_PARAMS from authoritative ScientificCommodityRegistry
COMMODITY_SHELF_LIFE_PARAMS = {
    key: {
        "optimal_temp_c": prof.optimal_temp_c,
        "chilling_injury_threshold_c": prof.chilling_injury_threshold_c,
        "max_shelf_life_days": prof.max_shelf_life_days_optimal,
        "base_decay_rate_day": prof.base_decay_rate_day,
        "q10_decay": prof.q10_decay,
        "optimal_rh_min": prof.optimal_rh_range_pct[0],
        "optimal_rh_max": prof.optimal_rh_range_pct[1],
        "critical_quality_threshold": prof.critical_quality_threshold
    }
    for key, prof in COMMODITY_REGISTRY.items()
}
COMMODITY_SHELF_LIFE_PARAMS["grapes"] = COMMODITY_SHELF_LIFE_PARAMS["grape"]

class DeteriorationModel:
    """
    Kinetics-based deterioration and shelf-life prediction engine.
    Unified with ScientificCommodityRegistry as single authoritative source.
    """

    @staticmethod
    def calculate_decay_rate(
        commodity_name: str,
        temp_c: float,
        rh_pct: float,
        o2_pct: float = 20.8,
        co2_ppm: float = 450.0,
        ambient_ethylene_ppm: float = 0.05
    ) -> Dict[str, float]:
        """
        Calculates the instantaneous deterioration rate k (per day).
        Delegates directly to ScientificCommodityRegistry.
        k = k_base * f(T) * f(RH) * f(Gas) * f(Ethylene)
        """
        decay_res = ScientificCommodityRegistry.calculate_effective_decay(
            commodity_name=commodity_name,
            temp_c=temp_c,
            rh_pct=rh_pct,
            o2_pct=o2_pct,
            co2_ppm=co2_ppm,
            ambient_ethylene_ppm=ambient_ethylene_ppm
        )
        return {
            "effective_k_day": decay_res["effective_k_day"],
            "temp_factor": decay_res["temp_factor"],
            "humidity_factor": decay_res["humidity_factor"],
            "gas_factor": decay_res["gas_factor"],
            "ethylene_factor": decay_res.get("ethylene_factor", 1.0)
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

