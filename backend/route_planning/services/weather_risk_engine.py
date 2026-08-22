"""
Deterministic Weather Risk Engine.

Evaluates weather conditions at each route checkpoint and produces:
  - Per-checkpoint risk level: LOW / MEDIUM / HIGH / CRITICAL
  - Aggregate route risk level

Thresholds can be tuned per commodity using the SOP handling profile.
"""
import logging

logger = logging.getLogger(__name__)

# ─── Default Weather Thresholds ──────────────────────────────────────────────
# These defaults apply when commodity-specific SOP data is unavailable.

DEFAULT_THRESHOLDS = {
    "precipitation_mm": {"MEDIUM": 5.0, "HIGH": 15.0, "CRITICAL": 30.0},
    "precipitation_probability": {"MEDIUM": 40, "HIGH": 70, "CRITICAL": 90},
    "wind_speed_kmh": {"MEDIUM": 40.0, "HIGH": 60.0, "CRITICAL": 80.0},
    "wind_gusts_kmh": {"MEDIUM": 60.0, "HIGH": 80.0, "CRITICAL": 100.0},
    "visibility_m": {"MEDIUM": 5000, "HIGH": 2000, "CRITICAL": 500},   # lower = worse
    "temperature_c_high": {"MEDIUM": 35.0, "HIGH": 40.0, "CRITICAL": 45.0},
    "temperature_c_low": {"MEDIUM": 5.0, "HIGH": 2.0, "CRITICAL": 0.0},  # cold threshold
}

# ─── Commodity Sensitivity Multipliers ────────────────────────────────────────
# Based on SOP commodity_handling_profile moisture/temperature/physical sensitivity.
# Higher multiplier → threshold tightens by that factor (i.e. risk triggers sooner).

SENSITIVITY_MULTIPLIERS = {
    "high": 0.6,    # High sensitivity → thresholds 40% tighter
    "medium": 1.0,  # Default
    "low": 1.5,     # Low sensitivity → thresholds 50% looser
    "unknown": 1.0,
}

RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RISK_SCORE = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def _apply_sensitivity(thresholds: dict, sensitivity: str) -> dict:
    """Apply commodity sensitivity multiplier to thresholds."""
    mult = SENSITIVITY_MULTIPLIERS.get(sensitivity, 1.0)
    adjusted = {}
    for key, levels in thresholds.items():
        if key == "visibility_m":
            # For visibility, higher threshold = more conservative (lower = worse)
            adjusted[key] = {k: v / mult for k, v in levels.items()}
        else:
            adjusted[key] = {k: v * mult for k, v in levels.items()}
    return adjusted


def _evaluate_single(weather: dict, thresholds: dict) -> str:
    """Evaluate a single weather point and return its risk level."""
    if weather is None:
        return "UNKNOWN"

    max_risk = "LOW"

    def check(value, key, lower_is_worse=False):
        nonlocal max_risk
        if value is None:
            return
        lvls = thresholds.get(key, {})
        if lower_is_worse:
            if value <= lvls.get("CRITICAL", float("-inf")):
                candidate = "CRITICAL"
            elif value <= lvls.get("HIGH", float("-inf")):
                candidate = "HIGH"
            elif value <= lvls.get("MEDIUM", float("-inf")):
                candidate = "MEDIUM"
            else:
                candidate = "LOW"
        else:
            if value >= lvls.get("CRITICAL", float("inf")):
                candidate = "CRITICAL"
            elif value >= lvls.get("HIGH", float("inf")):
                candidate = "HIGH"
            elif value >= lvls.get("MEDIUM", float("inf")):
                candidate = "MEDIUM"
            else:
                candidate = "LOW"

        if RISK_SCORE.get(candidate, 0) > RISK_SCORE.get(max_risk, 0):
            max_risk = candidate

    check(weather.get("precipitation_mm"), "precipitation_mm")
    check(weather.get("precipitation_probability"), "precipitation_probability")
    check(weather.get("wind_speed_kmh"), "wind_speed_kmh")
    check(weather.get("wind_gusts_kmh"), "wind_gusts_kmh")
    check(weather.get("visibility_m"), "visibility_m", lower_is_worse=True)
    check(weather.get("temperature_c"), "temperature_c_high")
    check(weather.get("temperature_c"), "temperature_c_low", lower_is_worse=True)

    return max_risk


def evaluate_route_weather_risk(
    weather_checkpoints: list[dict],
    commodity_sop: dict = None,
) -> tuple[list[dict], str]:
    """
    Evaluate weather risk for all checkpoints on a route.

    Returns:
      - List of checkpoints with `risk_level` added
      - Aggregate route risk level (worst of all checkpoints)

    commodity_sop should contain commodity_handling_profile with:
      - moisture_sensitivity: high/medium/low/unknown
      - temperature_sensitivity: high/medium/low/unknown
      - physical_damage_sensitivity: high/medium/low/unknown
    """
    # Extract sensitivities from SOP
    handling = {}
    if commodity_sop:
        handling = commodity_sop.get("commodity_handling_profile", {})

    moisture_sens = handling.get("moisture_sensitivity", "medium")
    temp_sens = handling.get("temperature_sensitivity", "medium")

    # Build commodity-adjusted thresholds
    precip_thresholds = _apply_sensitivity(
        {k: DEFAULT_THRESHOLDS[k] for k in ["precipitation_mm", "precipitation_probability", "wind_speed_kmh", "wind_gusts_kmh", "visibility_m"]},
        moisture_sens,
    )
    temp_thresholds = _apply_sensitivity(
        {k: DEFAULT_THRESHOLDS[k] for k in ["temperature_c_high", "temperature_c_low"]},
        temp_sens,
    )
    combined_thresholds = {**precip_thresholds, **temp_thresholds}

    enriched_checkpoints = []
    aggregate_score = 0

    for checkpoint in weather_checkpoints:
        weather = checkpoint.get("weather")
        risk = _evaluate_single(weather, combined_thresholds)
        score = RISK_SCORE.get(risk, 0)
        if score > aggregate_score:
            aggregate_score = score

        enriched_checkpoints.append({**checkpoint, "risk_level": risk})

    aggregate_risk = RISK_LEVELS[min(aggregate_score, 3)]
    logger.info(f"[WEATHER_RISK] Route aggregate risk: {aggregate_risk} across {len(weather_checkpoints)} checkpoints")
    return enriched_checkpoints, aggregate_risk


def evaluate_quality_risk(weather_risk: str, commodity_sop: dict = None) -> str:
    """
    Derive quality risk from weather risk + SOP perishability.

    High perishability + high weather risk = higher quality risk.
    """
    handling = commodity_sop.get("commodity_handling_profile", {}) if commodity_sop else {}
    perishability = handling.get("perishability", "medium")

    if perishability == "high":
        # Escalate one level
        escalation = {"LOW": "MEDIUM", "MEDIUM": "HIGH", "HIGH": "CRITICAL", "CRITICAL": "CRITICAL", "UNKNOWN": "UNKNOWN"}
        return escalation.get(weather_risk, weather_risk)
    elif perishability == "low":
        # De-escalate one level
        de_escalation = {"LOW": "LOW", "MEDIUM": "LOW", "HIGH": "MEDIUM", "CRITICAL": "HIGH", "UNKNOWN": "UNKNOWN"}
        return de_escalation.get(weather_risk, weather_risk)
    else:
        return weather_risk
