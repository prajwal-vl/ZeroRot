"""
Telegram Bot Notification Service for ZERO ROT.
Connects directly to the Telegram Bot API (https://api.telegram.org/bot<token>/sendMessage).
Sends:
1. Periodic 10-minute simulation telemetry digests while a simulation is actively running.
2. Immediate critical alerts for refrigeration failure, heatwave spikes, rapid spoilage decay.
3. Alert throttling to prevent duplicate notification spam.
"""
import os
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class TelegramService:
    """Manages Telegram Bot push notifications for ZERO ROT Digital Twin."""

    _last_periodic_time: float = 0.0
    _last_alert_timestamps: Dict[str, float] = {}
    _alert_throttle_seconds: int = 180  # 3 minutes throttle for identical alert keys

    @classmethod
    def get_bot_token(cls) -> Optional[str]:
        return os.environ.get("TELEGRAM_BOT_TOKEN", "").strip() or None

    @classmethod
    def get_chat_id(cls) -> Optional[str]:
        return os.environ.get("TELEGRAM_CHAT_ID", "").strip() or None

    @classmethod
    def is_configured(cls) -> bool:
        return bool(cls.get_bot_token() and cls.get_chat_id())

    @classmethod
    def send_message(cls, text: str) -> Dict[str, Any]:
        """Sends an HTML or Markdown message to the configured Telegram chat."""
        token = cls.get_bot_token()
        chat_id = cls.get_chat_id()

        if not token or not chat_id:
            return {
                "status": "UNCONFIGURED",
                "message": "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing in .env."
            }

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }

        try:
            data_bytes = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data_bytes,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=6.0) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                return {"status": "SUCCESS", "response": res_json}
        except Exception as e:
            return {"status": "ERROR", "message": str(e)}

    @classmethod
    def send_critical_alert(
        cls,
        alert_type: str,
        commodity: str,
        severity: str,
        current_temp_c: float,
        quality_score: float,
        shelf_life_days: float,
        details: str
    ) -> Dict[str, Any]:
        """
        Dispatches an immediate high-priority warning to Telegram with anti-spam throttling.
        """
        now = time.time()
        throttle_key = f"{alert_type}_{commodity}"
        last_sent = cls._last_alert_timestamps.get(throttle_key, 0.0)

        if now - last_sent < cls._alert_throttle_seconds:
            return {
                "status": "THROTTLED",
                "message": f"Alert {throttle_key} throttled. Next send in {int(cls._alert_throttle_seconds - (now - last_sent))}s"
            }

        cls._last_alert_timestamps[throttle_key] = now

        msg = (
            f"<b>CRITICAL ALERT: ZERO ROT Digital Twin</b>\n"
            f"<b>Severity:</b> {severity.upper()}\n"
            f"<b>Condition:</b> {alert_type.replace('_', ' ').title()}\n"
            f"<b>Commodity:</b> {commodity.capitalize()}\n"
            f"<b>Internal Temp:</b> {current_temp_c:.1f} °C\n"
            f"<b>Current Freshness:</b> {quality_score:.1f}%\n"
            f"<b>Remaining Shelf Life:</b> {shelf_life_days:.1f} Days\n\n"
            f"<b>Diagnosis:</b> {details}\n"
            f"<b>Action Required:</b> Inspect refrigeration cooling power or initiate immediate liquidation."
        )

        return cls.send_message(msg)

    @classmethod
    def check_and_send_periodic_update(cls, state: Dict[str, Any], force: bool = False) -> Dict[str, Any]:
        """
        Sends an automated status digest every 10 minutes (600s) during an active simulation.
        """
        now = time.time()
        # 10 minutes = 600 seconds
        if not force and (now - cls._last_periodic_time) < 600.0:
            return {"status": "SKIPPED", "message": "10-minute periodic interval not reached"}

        if not state.get("is_running") and not force:
            return {"status": "IDLE", "message": "Simulation is paused; periodic updates suspended."}

        cls._last_periodic_time = now

        trad = state.get("traditional_storage", {})
        cold = state.get("cold_storage", {})
        truck = state.get("refrigerated_truck", {})
        alert_count = state.get("unacknowledged_alerts_count", 0)

        timestamp_str = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

        msg = (
            f"<b>ZERO ROT — 10-Minute Telemetry Digest</b>\n"
            f"<i>Timestamp: {timestamp_str}</i>\n\n"
            f"<b>Digital Twin State:</b> {'RUNNING' if state.get('is_running') else 'PAUSED'}\n"
            f"<b>Simulated Time:</b> Day {state.get('sim_time_days', 1.0):.1f} ({state.get('sim_speed', 1)}x speed)\n\n"
            f"<b>1. Cold Warehouse Hub:</b>\n"
            f"  • Avg Chamber Temp: {cold.get('ambient_temp_c', 11.2):.1f} °C\n"
            f"  • Ch. A Quality: {cold.get('chambers', {}).get('chamber_a', {}).get('quality_score', 92.0):.1f}%\n"
            f"  • Ch. B Quality: {cold.get('chambers', {}).get('chamber_b', {}).get('quality_score', 88.5):.1f}%\n"
            f"  • Ch. C Quality: {cold.get('chambers', {}).get('chamber_c', {}).get('quality_score', 95.0):.1f}%\n\n"
            f"<b>2. Refrigerated Transit:</b>\n"
            f"  • Reefer Cargo Temp: {truck.get('temp_c', 4.5):.1f} °C\n"
            f"  • En-Route Quality: {truck.get('quality_score', 91.0):.1f}%\n"
            f"  • Transit Speed: {truck.get('speed_kmh', 65.0):.0f} km/h\n\n"
            f"<b>3. Traditional Farm Bay:</b>\n"
            f"  • Ambient Temp: {trad.get('ambient_temp_c', 26.5):.1f} °C\n"
            f"  • Quality: {trad.get('quality_score', 68.0):.1f}%\n\n"
            f"<b>Active Alert Count:</b> {alert_count}\n"
            f"<i>Predict. Preserve. Prevent. (AGR007)</i>"
        )

        return cls.send_message(msg)

