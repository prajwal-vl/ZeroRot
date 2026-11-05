"""
ZERO ROT 2.0 — Counterfactual Scenario Lab & Policy Evaluation Engine.
Project Code: AGR007

Provides deterministic, parallel counterfactual evaluation of operational choices:
1. Baseline (Status Quo / No Intervention)
2. Scenario A: AI Recommended Autonomous Action
3. Scenario B: Conservative / Rule-based Intervention
4. Scenario C: Unmitigated Disruption / Worst-Case Stressor

Computes exact financial waterfalls:
  Avoided Loss = Loss_Baseline - Loss_Intervention
  Net Benefit  = Avoided Loss - Intervention Cost
  Intervention ROI = (Net Benefit / Intervention Cost) * 100%
"""

import math
from typing import Dict, Any, List
from .commodity_registry import ScientificCommodityRegistry

class CounterfactualScenarioLab:
    """
    Evaluates alternative operational futures over a simulated time horizon (e.g. 7 days).
    """
    @classmethod
    def run_counterfactual_comparison(
        cls,
        commodity_name: str,
        initial_quantity_kg: float,
        initial_quality_score: float,
        current_market_rate_inr_kg: float = 40.0,
        horizon_days: float = 7.0,
        baseline_temp_c: float = 24.0,
        baseline_rh_pct: float = 65.0
    ) -> Dict[str, Any]:
        """
        Runs parallel projections under four distinct operational policies.
        """
        prof = ScientificCommodityRegistry.get_profile(commodity_name)
        initial_value_inr = initial_quantity_kg * current_market_rate_inr_kg

        # Define 4 Scenarios
        scenarios = {
            "baseline": {
                "name": "Status Quo (No Intervention)",
                "description": f"Standard ambient holding at {baseline_temp_c}°C, {baseline_rh_pct}% RH without active climate optimization.",
                "temp_c": baseline_temp_c,
                "rh_pct": baseline_rh_pct,
                "o2_pct": 20.8,
                "co2_ppm": 550.0,
                "ethylene_ppm": 0.15,
                "cost_inr": 0.0,
                "badge": "STATUS_QUO"
            },
            "ai_optimal": {
                "name": "AI Recommended Closed-Loop Control",
                "description": f"Precision cold-chain setpoint to {prof.optimal_temp_c}°C, {prof.optimal_rh_pct}% RH with active air circulation and ethylene scrub.",
                "temp_c": prof.optimal_temp_c,
                "rh_pct": prof.optimal_rh_pct,
                "o2_pct": 20.0,
                "co2_ppm": 450.0,
                "ethylene_ppm": 0.02,
                "cost_inr": round(initial_quantity_kg * 1.85, 2),  # Power & scrubber cost
                "badge": "RECOMMENDED"
            },
            "conservative": {
                "name": "Partial Ventilation & Shade Cooling",
                "description": f"Passive ventilation and evaporative pads lowering temperature to {baseline_temp_c - 5.0}°C at 75% RH.",
                "temp_c": max(15.0, baseline_temp_c - 5.0),
                "rh_pct": min(85.0, baseline_rh_pct + 12.0),
                "o2_pct": 20.8,
                "co2_ppm": 500.0,
                "ethylene_ppm": 0.08,
                "cost_inr": round(initial_quantity_kg * 0.65, 2),
                "badge": "CONSERVATIVE"
            },
            "disruption": {
                "name": "Severe Thermal Stress / Reefer Fault",
                "description": "Refrigeration breakdown with ambient heatwave surge to 36°C and 45% dry air.",
                "temp_c": 36.0,
                "rh_pct": 45.0,
                "o2_pct": 20.8,
                "co2_ppm": 1200.0,
                "ethylene_ppm": 0.45,
                "cost_inr": 0.0,
                "badge": "STRESS_TEST"
            }
        }

        results = {}
        for key, sc in scenarios.items():
            # 1. Decay kinetics
            decay = ScientificCommodityRegistry.calculate_effective_decay(
                commodity_name=commodity_name,
                temp_c=sc["temp_c"],
                rh_pct=sc["rh_pct"],
                o2_pct=sc["o2_pct"],
                co2_ppm=sc["co2_ppm"],
                ambient_ethylene_ppm=sc["ethylene_ppm"]
            )
            k_eff = decay["effective_k_day"]

            # Step quality over horizon_days
            final_quality = initial_quality_score * math.exp(-k_eff * horizon_days)
            final_quality = max(0.0, min(100.0, final_quality))

            # Transpiration shrinkage
            trans = ScientificCommodityRegistry.calculate_transpiration_rate(commodity_name, sc["temp_c"], sc["rh_pct"])
            total_water_loss_pct = min(25.0, trans["daily_moisture_loss_pct"] * horizon_days)
            final_weight_kg = initial_quantity_kg * (1.0 - (total_water_loss_pct / 100.0))

            # Remaining shelf life
            if final_quality <= prof.critical_quality_threshold:
                rsl_days = 0.0
            else:
                rsl_days = math.log(final_quality / prof.critical_quality_threshold) / k_eff

            # Market pricing discount based on terminal quality
            if final_quality >= 80.0:
                price_factor = 1.15
            elif final_quality >= 65.0:
                price_factor = 0.95
            elif final_quality >= 45.0:
                price_factor = 0.60
            else:
                price_factor = 0.15

            terminal_market_rate = current_market_rate_inr_kg * price_factor
            terminal_value_inr = round(final_weight_kg * terminal_market_rate, 2)
            total_loss_inr = max(0.0, round(initial_value_inr - terminal_value_inr, 2))

            # Quality trajectory over time (day 0 to day horizon)
            trajectory = []
            num_steps = 7
            step_days = horizon_days / num_steps
            for step_idx in range(num_steps + 1):
                t = step_idx * step_days
                q_t = initial_quality_score * math.exp(-k_eff * t)
                trajectory.append({
                    "day": round(t, 1),
                    "quality": round(max(0.0, min(100.0, q_t)), 1)
                })

            results[key] = {
                "name": sc["name"],
                "description": sc["description"],
                "badge": sc["badge"],
                "temperature_c": sc["temp_c"],
                "rh_pct": sc["rh_pct"],
                "k_decay_rate_day": round(k_eff, 4),
                "final_quality": round(final_quality, 1),
                "quality_loss_pct": round(initial_quality_score - final_quality, 1),
                "shrinkage_loss_pct": round(total_water_loss_pct, 1),
                "final_weight_kg": round(final_weight_kg, 1),
                "remaining_shelf_life_days": round(rsl_days, 1),
                "intervention_cost_inr": sc["cost_inr"],
                "terminal_value_inr": terminal_value_inr,
                "economic_loss_inr": total_loss_inr,
                "trajectory": trajectory
            }

        # Calculate Financial Waterfall against Baseline
        baseline_loss = results["baseline"]["economic_loss_inr"]

        for key in ["ai_optimal", "conservative", "disruption"]:
            avoided_loss = max(0.0, baseline_loss - results[key]["economic_loss_inr"])
            cost = results[key]["intervention_cost_inr"]
            net_benefit = avoided_loss - cost
            roi_pct = round((net_benefit / cost * 100.0), 1) if cost > 0 else 0.0

            results[key]["avoided_loss_inr"] = round(avoided_loss, 2)
            results[key]["net_benefit_inr"] = round(net_benefit, 2)
            results[key]["roi_pct"] = roi_pct

        results["baseline"]["avoided_loss_inr"] = 0.0
        results["baseline"]["net_benefit_inr"] = 0.0
        results["baseline"]["roi_pct"] = 0.0

        return {
            "commodity": prof.name,
            "horizon_days": horizon_days,
            "initial_quantity_kg": initial_quantity_kg,
            "initial_market_value_inr": initial_value_inr,
            "scenarios": results,
            "ai_verdict": {
                "recommended_scenario": "ai_optimal",
                "avoided_loss_inr": results["ai_optimal"]["avoided_loss_inr"],
                "net_benefit_inr": results["ai_optimal"]["net_benefit_inr"],
                "roi_pct": results["ai_optimal"]["roi_pct"],
                "justification": f"Precision cold storage setpoints save ₹{results['ai_optimal']['avoided_loss_inr']:,.2f} in spoilage with a net financial surplus of ₹{results['ai_optimal']['net_benefit_inr']:,.2f} after accounting for operational energy costs."
            }
        }

    @classmethod
    def simulate_waterfall(
        cls,
        commodity_name: str,
        quantity_kg: float,
        current_quality_score: float,
        current_temp_c: float = 24.0,
        current_rh_pct: float = 65.0,
        current_market_rate_inr_kg: float = 40.0,
        horizon_days: float = 7.0
    ) -> Dict[str, Any]:
        """Convenience method for multi-scenario waterfall analysis."""
        res = cls.run_counterfactual_comparison(
            commodity_name=commodity_name,
            initial_quantity_kg=quantity_kg,
            initial_quality_score=current_quality_score,
            current_market_rate_inr_kg=current_market_rate_inr_kg,
            horizon_days=horizon_days,
            baseline_temp_c=current_temp_c,
            baseline_rh_pct=current_rh_pct
        )
        res["avoided_loss_inr"] = res["ai_verdict"]["avoided_loss_inr"]
        return res
