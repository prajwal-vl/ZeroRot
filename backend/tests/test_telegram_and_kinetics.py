"""
Tests for Telegram Notification Dispatch, Alert Throttling, and Extended Commodity Kinetics.
"""
import pytest
import time
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.telegram_service import TelegramService
from backend.app.simulation.deterioration_model import DeteriorationModel, COMMODITY_SHELF_LIFE_PARAMS
from backend.app.simulation.thermal_model import COMMODITY_THERMAL_PROPS
from backend.app.simulation.gas_model import COMMODITY_GAS_PROPS

client = TestClient(app)

def test_telegram_service_throttling_and_formatting():
    """Verifies critical alert formatting and 3-minute anti-spam throttling."""
    # Reset internal throttle map
    TelegramService._last_alert_timestamps.clear()

    # Even if unconfigured in test environment, formatting and throttling logic must execute cleanly
    res1 = TelegramService.send_critical_alert(
        alert_type="REEFER_FAILURE",
        commodity="tomato",
        severity="CRITICAL",
        current_temp_c=19.5,
        quality_score=78.0,
        shelf_life_days=4.2,
        details="Reefer compressor offline on highway NH-48."
    )
    assert res1["status"] in ["UNCONFIGURED", "SUCCESS", "ERROR"]

    # Immediate second call with identical key must trigger anti-spam throttle
    res2 = TelegramService.send_critical_alert(
        alert_type="REEFER_FAILURE",
        commodity="tomato",
        severity="CRITICAL",
        current_temp_c=20.0,
        quality_score=76.0,
        shelf_life_days=3.9,
        details="Reefer compressor still offline."
    )
    assert res2["status"] == "THROTTLED"
    assert "throttled" in res2["message"].lower()

def test_telegram_status_endpoint():
    """Verifies /api/v1/telegram/status returns masked config metadata."""
    res = client.get("/api/v1/telegram/status")
    assert res.status_code == 200
    data = res.json()
    assert "is_configured" in data
    assert "periodic_interval_minutes" in data
    assert data["periodic_interval_minutes"] == 10
    assert "throttle_window_seconds" in data
    assert data["throttle_window_seconds"] == 180

def test_apple_and_grape_kinetics_parameters():
    """Verifies that apple and grape commodities are fully integrated across deterioration, thermal, and gas models."""
    assert "apple" in COMMODITY_SHELF_LIFE_PARAMS
    assert "grape" in COMMODITY_SHELF_LIFE_PARAMS
    assert "apple" in COMMODITY_THERMAL_PROPS
    assert "grape" in COMMODITY_THERMAL_PROPS
    assert "apple" in COMMODITY_GAS_PROPS
    assert "grape" in COMMODITY_GAS_PROPS

    # Apple decay kinetics calculation
    apple_decay = DeteriorationModel.calculate_decay_rate(
        commodity_name="apple",
        temp_c=1.0, # optimal
        rh_pct=92.0,
        o2_pct=20.8,
        co2_ppm=420.0
    )
    assert apple_decay["effective_k_day"] > 0.0
    assert apple_decay["temp_factor"] >= 0.25

    # Grape decay kinetics calculation
    grape_decay = DeteriorationModel.calculate_decay_rate(
        commodity_name="grape",
        temp_c=0.0, # optimal
        rh_pct=92.0,
        o2_pct=20.8,
        co2_ppm=420.0
    )
    assert grape_decay["effective_k_day"] > 0.0
