"""
ZERO ROT 2.1 — Machine Learning Spoilage Engine Offline Training Pipeline.
Project Code: AGR007

PROVENANCE AND METHODOLOGY NOTICE:
----------------------------------
This script generates a reproducible post-harvest experimental dataset based on published
USDA Agricultural Handbook 66, FAO Agricultural Services Bulletins, and Kader et al.
post-harvest physiology kinetics. The dataset is explicitly designated as SYNTHETIC EXPERIMENTAL
KINETICS DATA for supervised regression and classification benchmarking.

Models trained:
1. Physics-Only Model (Baseline Arrhenius & Dalton partial pressure kinetics)
2. ML Surrogate Model (Gradient Boosted Decision Tree Regressor)
3. Hybrid Physics-Informed ML Ensemble (Pi-ML: Physics baseline + ML residual error compensator)

Dynamic Evaluation Metrics:
- Holdout Test MAE, RMSE, R-squared
- Spoilage Classification Precision, Recall, F1-Score
Artifact output:
- backend/app/intelligence/spoilage_model.joblib
"""

import os
import sys
import math
import random
import numpy as np
import joblib
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, precision_recall_fscore_support

# Ensure parent path is in sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from app.simulation.commodity_registry import ScientificCommodityRegistry, COMMODITY_REGISTRY

COMMODITY_LIST = ["mango", "banana", "tomato", "apple", "potato", "onion", "grapes", "guava"]
COMMODITY_MAP = {name: idx for idx, name in enumerate(COMMODITY_LIST)}

def generate_synthetic_experimental_dataset(num_samples: int = 4000, random_seed: int = 42):
    """
    Generates synthetic post-harvest experimental data based on USDA/FAO Arrhenius decay kinetics
    with biological variance and multi-sensor stress factors.
    """
    random.seed(random_seed)
    np.random.seed(random_seed)

    X = []
    y_quality_24h = []
    y_shelf_life_days = []
    y_physics_quality_24h = []

    for _ in range(num_samples):
        comm_name = random.choice(COMMODITY_LIST)
        prof = ScientificCommodityRegistry.get_profile(comm_name)
        comm_idx = COMMODITY_MAP[comm_name]

        # Initial produce quality at day 0 (spanning sound produce down to critical margin)
        init_q = random.uniform(20.0, 100.0)

        # Environmental conditions around commodity optimum with stress excursions
        stress_mode = random.random()
        if stress_mode < 0.35:
            # Optimal preservation corridor
            temp_c = random.uniform(prof.optimal_temp_range_c[0] - 0.5, prof.optimal_temp_range_c[1] + 1.0)
            rh_pct = random.uniform(prof.optimal_rh_range_pct[0], prof.optimal_rh_range_pct[1])
            co2_ppm = random.uniform(400.0, 800.0)
            ethylene_ppm = random.uniform(0.01, 0.08)
            o2_pct = random.uniform(18.0, 20.8)
        elif stress_mode < 0.60:
            # Thermal heat stress (warm transit / lack of pre-cooling)
            temp_c = random.uniform(prof.optimal_temp_c + 3.0, prof.optimal_temp_c + 22.0)
            rh_pct = random.uniform(40.0, 80.0)
            co2_ppm = random.uniform(600.0, 3500.0)
            ethylene_ppm = random.uniform(0.1, 5.0)
            o2_pct = random.uniform(15.0, 20.8)
        elif stress_mode < 0.80:
            # Chilling injury stress (below physiological chilling threshold)
            chill_min = max(-1.0, prof.chilling_injury_threshold_c - 5.0)
            temp_c = random.uniform(chill_min, prof.chilling_injury_threshold_c - 0.2)
            rh_pct = random.uniform(75.0, 95.0)
            co2_ppm = random.uniform(500.0, 1200.0)
            ethylene_ppm = random.uniform(0.02, 0.2)
            o2_pct = random.uniform(18.0, 20.8)
        else:
            # Hypoxia / CA gas imbalance stress
            temp_c = random.uniform(prof.optimal_temp_c, prof.optimal_temp_c + 8.0)
            rh_pct = random.uniform(85.0, 98.0)
            co2_ppm = random.uniform(5000.0, 35000.0)
            ethylene_ppm = random.uniform(0.5, 12.0)
            o2_pct = random.uniform(0.8, 4.0)

        # Calculate authoritative baseline kinetics from ScientificCommodityRegistry
        decay_res = ScientificCommodityRegistry.calculate_effective_decay(
            commodity_name=comm_name,
            temp_c=temp_c,
            rh_pct=rh_pct,
            o2_pct=o2_pct,
            co2_ppm=co2_ppm,
            ambient_ethylene_ppm=ethylene_ppm
        )
        k_phys = decay_res["effective_k_day"]

        # Physics prediction after 24 hours (1 day)
        q_phys = max(0.0, init_q * math.exp(-k_phys * 1.0))

        # Ground truth with non-linear biological heterogeneity (microbial sporulation noise)
        biological_noise = np.random.normal(0.0, 0.85)
        # Non-linear fungal moisture effect above 94% RH
        fungal_penalty = 1.8 if rh_pct > 94.0 else 0.0
        # Synergistic ethylene-heat damage
        synergy_penalty = (temp_c - prof.optimal_temp_c) * 0.15 * math.log10(1.0 + ethylene_ppm * 5.0) if temp_c > prof.optimal_temp_c else 0.0

        q_actual = max(0.0, min(100.0, q_phys - fungal_penalty - synergy_penalty + biological_noise))

        # Remaining shelf life
        if q_actual <= prof.critical_quality_threshold or k_phys <= 0:
            rsl_days = 0.0
        else:
            rsl_days = max(0.0, math.log(q_actual / prof.critical_quality_threshold) / k_phys)

        # Feature vector: [comm_idx, init_q, temp_c, rh_pct, co2_ppm, ethylene_ppm, o2_pct, optimal_t, opt_rh, crit_q]
        features = [
            comm_idx,
            init_q,
            temp_c,
            rh_pct,
            co2_ppm,
            ethylene_ppm,
            o2_pct,
            prof.optimal_temp_c,
            prof.optimal_rh_pct,
            prof.critical_quality_threshold
        ]

        X.append(features)
        y_quality_24h.append(q_actual)
        y_shelf_life_days.append(rsl_days)
        y_physics_quality_24h.append(q_phys)

    return (
        np.array(X, dtype=np.float32),
        np.array(y_quality_24h, dtype=np.float32),
        np.array(y_shelf_life_days, dtype=np.float32),
        np.array(y_physics_quality_24h, dtype=np.float32)
    )

def train_and_evaluate_spoilage_models(output_path: str = None):
    """
    Trains ML Surrogate and Hybrid Residual models, calculates dynamic holdout metrics,
    and serializes model artifact to joblib.
    """
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "spoilage_model.joblib")

    print(f"Generating synthetic experimental dataset based on USDA/FAO post-harvest kinetics...")
    X, y_actual, y_rsl, y_phys = generate_synthetic_experimental_dataset(num_samples=4000, random_seed=42)

    # Calculate residuals for Hybrid modeling: Residual = Actual - Physics
    residuals = y_actual - y_phys

    # 80/20 Train/Test split
    X_train, X_test, y_train, y_test, y_phys_train, y_phys_test, res_train, res_test = train_test_split(
        X, y_actual, y_phys, residuals, test_size=0.20, random_state=42
    )

    print(f"Dataset split: {len(X_train)} training samples, {len(X_test)} holdout test samples.")

    # 1. Train ML Surrogate Regressor (Gradient Boosting)
    print("Training ML Surrogate Regressor (Gradient Boosting)...")
    ml_regressor = GradientBoostingRegressor(
        n_estimators=120,
        learning_rate=0.08,
        max_depth=5,
        random_state=42
    )
    ml_regressor.fit(X_train, y_train)

    # 2. Train Hybrid Residual Compensator (Pi-ML)
    print("Training Hybrid Residual Compensator...")
    hybrid_residual_model = GradientBoostingRegressor(
        n_estimators=80,
        learning_rate=0.06,
        max_depth=4,
        random_state=42
    )
    hybrid_residual_model.fit(X_train, res_train)

    # -------------------------------------------------------------
    # Dynamic Holdout Evaluation
    # -------------------------------------------------------------
    # Model 1: Physics Only
    phys_pred = y_phys_test
    phys_mae = float(mean_absolute_error(y_test, phys_pred))
    phys_rmse = float(np.sqrt(mean_squared_error(y_test, phys_pred)))
    phys_r2 = float(r2_score(y_test, phys_pred))

    # Model 2: ML Surrogate
    ml_pred = ml_regressor.predict(X_test)
    ml_mae = float(mean_absolute_error(y_test, ml_pred))
    ml_rmse = float(np.sqrt(mean_squared_error(y_test, ml_pred)))
    ml_r2 = float(r2_score(y_test, ml_pred))

    # Model 3: Hybrid Ensemble = Physics Prior + Predicted Residual
    hybrid_pred = y_phys_test + hybrid_residual_model.predict(X_test)
    hybrid_pred = np.clip(hybrid_pred, 0.0, 100.0)
    hybrid_mae = float(mean_absolute_error(y_test, hybrid_pred))
    hybrid_rmse = float(np.sqrt(mean_squared_error(y_test, hybrid_pred)))
    hybrid_r2 = float(r2_score(y_test, hybrid_pred))

    # Binary Spoilage Classification Metrics (evaluated against each commodity's physiological critical threshold)
    crit_thresholds = X_test[:, 9] # critical_threshold feature
    y_test_spoiled = (y_test <= crit_thresholds).astype(int)
    phys_spoiled = (phys_pred <= crit_thresholds).astype(int)
    ml_spoiled = (ml_pred <= crit_thresholds).astype(int)
    hybrid_spoiled = (hybrid_pred <= crit_thresholds).astype(int)

    p_p, r_p, f1_p, _ = precision_recall_fscore_support(y_test_spoiled, phys_spoiled, average="binary", zero_division=0)
    p_m, r_m, f1_m, _ = precision_recall_fscore_support(y_test_spoiled, ml_spoiled, average="binary", zero_division=0)
    p_h, r_h, f1_h, _ = precision_recall_fscore_support(y_test_spoiled, hybrid_spoiled, average="binary", zero_division=0)

    dynamic_metrics = {
        "physics_only": {
            "model_name": "Arrhenius Analytical Kinetics (USDA Handbook 66)",
            "mae_quality_pct": round(phys_mae, 3),
            "rmse_quality_pct": round(phys_rmse, 3),
            "r2_score": round(phys_r2, 3),
            "classification": {
                "precision": round(float(p_p), 3),
                "recall": round(float(r_p), 3),
                "f1_score": round(float(f1_p), 3)
            },
            "advantages": "First-principles conservation bounds; zero training data required",
            "limitations": "Underestimates high-humidity fungal proliferation and synergisms"
        },
        "ml_surrogate": {
            "model_name": "Gradient Boosted Multi-Sensor Regressor",
            "mae_quality_pct": round(ml_mae, 3),
            "rmse_quality_pct": round(ml_rmse, 3),
            "r2_score": round(ml_r2, 3),
            "classification": {
                "precision": round(float(p_m), 3),
                "recall": round(float(r_m), 3),
                "f1_score": round(float(f1_m), 3)
            },
            "advantages": "Captures multi-factor non-linear stress couplings",
            "limitations": "Requires empirical telemetry dataset; potential extrapolation risk"
        },
        "hybrid_ensemble": {
            "model_name": "Physics-Informed Hybrid Ensemble (Pi-ML)",
            "mae_quality_pct": round(hybrid_mae, 3),
            "rmse_quality_pct": round(hybrid_rmse, 3),
            "r2_score": round(hybrid_r2, 3),
            "classification": {
                "precision": round(float(p_h), 3),
                "recall": round(float(r_h), 3),
                "f1_score": round(float(f1_h), 3)
            },
            "advantages": "Combines physical conservation bounds with ML residual error compensation",
            "limitations": "Requires both kinetic calibration parameters and sensor inputs"
        }
    }

    print("\n--- Genuine Holdout Test Metrics ---")
    print(f"Physics Model: MAE={phys_mae:.2f}%, R2={phys_r2:.3f}, F1={f1_p:.3f}")
    print(f"ML Surrogate:  MAE={ml_mae:.2f}%, R2={ml_r2:.3f}, F1={f1_m:.3f}")
    print(f"Pi-ML Hybrid:  MAE={hybrid_mae:.2f}%, R2={hybrid_r2:.3f}, F1={f1_h:.3f}")

    artifact = {
        "version": "2.1.0-TRAINED",
        "provenance": "USDA Agricultural Handbook 66 Synthetic Kinetics Simulation",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "feature_names": [
            "commodity_index",
            "initial_quality",
            "temperature_c",
            "rh_pct",
            "co2_ppm",
            "ethylene_ppm",
            "o2_pct",
            "optimal_temp_c",
            "optimal_rh_pct",
            "critical_threshold"
        ],
        "ml_surrogate_model": ml_regressor,
        "hybrid_residual_model": hybrid_residual_model,
        "metrics": dynamic_metrics
    }

    joblib.dump(artifact, output_path, compress=3)
    print(f"\nTrained artifact successfully saved to: {output_path}")
    return artifact

if __name__ == "__main__":
    train_and_evaluate_spoilage_models()

