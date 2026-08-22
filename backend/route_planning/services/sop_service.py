"""
Commodity SOP Service.

Calls the SOP Engine FastAPI service to get commodity-specific handling
constraints and weather/quality risk profiles.

Falls back to generic defaults if the SOP engine is unavailable.
"""
import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

SOP_ENGINE_URL = getattr(settings, "SOP_ENGINE_URL", "http://localhost:8004")


# ─── Generic defaults per category ───────────────────────────────────────────

CATEGORY_DEFAULTS = {
    "vegetables": {
        "perishability": "high",
        "moisture_sensitivity": "high",
        "temperature_sensitivity": "medium",
        "physical_damage_sensitivity": "high",
        "ventilation_requirement": "high",
        "requires_cold_chain": False,
        "max_transit_hours": 48,
    },
    "fruits": {
        "perishability": "high",
        "moisture_sensitivity": "medium",
        "temperature_sensitivity": "high",
        "physical_damage_sensitivity": "high",
        "ventilation_requirement": "medium",
        "requires_cold_chain": True,
        "max_transit_hours": 36,
    },
    "grains": {
        "perishability": "low",
        "moisture_sensitivity": "high",
        "temperature_sensitivity": "low",
        "physical_damage_sensitivity": "low",
        "ventilation_requirement": "medium",
        "requires_cold_chain": False,
        "max_transit_hours": 168,
    },
    "pulses": {
        "perishability": "low",
        "moisture_sensitivity": "high",
        "temperature_sensitivity": "low",
        "physical_damage_sensitivity": "low",
        "ventilation_requirement": "medium",
        "requires_cold_chain": False,
        "max_transit_hours": 168,
    },
    "spices": {
        "perishability": "low",
        "moisture_sensitivity": "medium",
        "temperature_sensitivity": "low",
        "physical_damage_sensitivity": "low",
        "ventilation_requirement": "low",
        "requires_cold_chain": False,
        "max_transit_hours": 240,
    },
    "others": {
        "perishability": "medium",
        "moisture_sensitivity": "medium",
        "temperature_sensitivity": "medium",
        "physical_damage_sensitivity": "medium",
        "ventilation_requirement": "medium",
        "requires_cold_chain": False,
        "max_transit_hours": 72,
    },
}


def _get_default_sop(commodity_name: str, commodity_category: str) -> dict:
    """Return generic SOP data based on category."""
    cat = (commodity_category or "others").lower()
    defaults = CATEGORY_DEFAULTS.get(cat, CATEGORY_DEFAULTS["others"])
    return {
        "commodity": {"name": commodity_name, "category": cat},
        "commodity_handling_profile": {
            "perishability": defaults["perishability"],
            "moisture_sensitivity": defaults["moisture_sensitivity"],
            "temperature_sensitivity": defaults["temperature_sensitivity"],
            "physical_damage_sensitivity": defaults["physical_damage_sensitivity"],
            "ventilation_requirement": defaults["ventilation_requirement"],
        },
        "transportation_protocol": {
            "temperature_requirements": {"required": defaults["requires_cold_chain"]},
            "maximum_transit_time_hours": {"value": defaults["max_transit_hours"]},
            "vehicle_requirements": [
                "Refrigerated truck" if defaults["requires_cold_chain"] else "Clean covered truck"
            ],
        },
        "source": "defaults",
    }


def fetch_commodity_sop(commodity_name: str, commodity_category: str = "vegetables") -> dict:
    """
    Fetch commodity SOP from the SOP Engine.

    Returns the SOP profile dict. Falls back to category defaults if the
    SOP Engine is unreachable or returns an error.
    """
    try:
        payload = {
            "action": "generate_sop",
            "commodity": {
                "name": commodity_name,
                "category": commodity_category,
                "perishability": None,
            }
        }
        resp = requests.post(
            f"{SOP_ENGINE_URL}/api/v1/generate-sop",
            json=payload,
            timeout=5,
        )
        resp.raise_for_status()
        sop_data = resp.json()

        # Normalize into our expected format
        handling = sop_data.get("commodity_handling_profile", {})
        transport = sop_data.get("transportation_protocol", {})
        return {
            "commodity": sop_data.get("commodity", {"name": commodity_name}),
            "commodity_handling_profile": {
                "perishability": handling.get("perishability", "medium"),
                "moisture_sensitivity": handling.get("moisture_sensitivity", "medium"),
                "temperature_sensitivity": handling.get("temperature_sensitivity", "medium"),
                "physical_damage_sensitivity": handling.get("physical_damage_sensitivity", "medium"),
                "ventilation_requirement": handling.get("ventilation_requirement", "medium"),
            },
            "transportation_protocol": {
                "temperature_requirements": transport.get("temperature_requirements", {"required": False}),
                "maximum_transit_time_hours": transport.get("maximum_transit_time_hours", {"value": 72}),
                "vehicle_requirements": transport.get("vehicle_requirements", ["Clean covered truck"]),
            },
            "source": "sop_engine",
        }

    except requests.exceptions.ConnectionError:
        logger.warning(f"[SOP] Engine unreachable at {SOP_ENGINE_URL} — using defaults for '{commodity_name}'")
    except requests.exceptions.Timeout:
        logger.warning(f"[SOP] Engine timeout — using defaults for '{commodity_name}'")
    except Exception as e:
        logger.warning(f"[SOP] Error fetching SOP for '{commodity_name}': {e}")

    return _get_default_sop(commodity_name, commodity_category)
