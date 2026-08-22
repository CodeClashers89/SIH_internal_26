"""
LLM Route Comparison Service.

Uses Google Gemini (or OpenAI as fallback) to compare valid candidate routes
and produce a recommendation with explanation.

The LLM may ONLY:
  - Compare routes
  - Explain trade-offs
  - Recommend a route_id from the provided list

The LLM may NOT:
  - Create routes
  - Override hard constraints
  - Invent coordinates, weather, or ETA

Falls back to deterministic selection (lowest-risk valid route meeting deadline).
"""
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

GEMINI_API_KEY = getattr(settings, "GEMINI_API_KEY", "")
LLM_ENABLED = bool(GEMINI_API_KEY)


def _deterministic_select(valid_routes: list[dict]) -> dict:
    """
    Deterministic fallback: select the lowest-risk valid route.
    Tie-break: shortest duration among lowest-risk routes.
    """
    RISK_SCORE = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3, "UNKNOWN": 4}

    sorted_routes = sorted(
        valid_routes,
        key=lambda r: (
            RISK_SCORE.get(r.get("weather_risk", "UNKNOWN"), 4),
            r.get("duration_hours", 999),
        ),
    )
    best = sorted_routes[0]
    return {
        "recommended_route_id": best["route_id"],
        "reason": (
            f"Deterministic selection: Route {best['route_id']} selected as the lowest-risk "
            f"valid option ({best.get('weather_risk', 'UNKNOWN')} weather risk, "
            f"{best.get('distance_km', 0)} km, "
            f"{round(best.get('duration_hours', 0), 1)}h duration)."
        ),
        "tradeoffs": [],
        "confidence": "deterministic",
        "selection_method": "deterministic_fallback",
    }


def _call_gemini(prompt: str) -> dict | None:
    """Call Google Gemini API and return parsed JSON result."""
    try:
        import google.generativeai as genai  # type: ignore
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code fences if present
        if text.startswith("```"):
            text = "\n".join(text.split("\n")[1:])
            text = text.rsplit("```", 1)[0].strip()
        return json.loads(text)
    except ImportError:
        logger.warning("[LLM] google-generativeai not installed — using deterministic fallback")
    except json.JSONDecodeError as e:
        logger.warning(f"[LLM] Could not parse Gemini JSON response: {e}")
    except Exception as e:
        logger.warning(f"[LLM] Gemini call failed: {e}")
    return None


def compare_routes(
    valid_routes: list[dict],
    commodity: str,
    quantity_kg: float,
    departure_time: str = None,
) -> dict:
    """
    Compare valid candidate routes and return a recommendation dict.

    valid_routes: list of dicts with keys:
      route_id, distance_km, duration_hours, weather_risk, quality_risk, deadline_feasible

    Returns:
      {
        "recommended_route_id": "R2",
        "reason": "...",
        "tradeoffs": [...],
        "confidence": "high|medium|low|deterministic",
        "selection_method": "llm_recommendation|deterministic_fallback"
      }
    """
    if not valid_routes:
        logger.error("[LLM] No valid routes to compare — cannot select")
        raise ValueError("No valid routes available for selection")

    if len(valid_routes) == 1:
        r = valid_routes[0]
        return {
            "recommended_route_id": r["route_id"],
            "reason": "Only one valid route available after constraint filtering.",
            "tradeoffs": [],
            "confidence": "high",
            "selection_method": "deterministic_fallback",
        }

    if not LLM_ENABLED:
        logger.info("[LLM] LLM disabled — using deterministic selection")
        return _deterministic_select(valid_routes)

    # Build LLM prompt
    routes_summary = json.dumps([
        {
            "route_id": r["route_id"],
            "distance_km": r.get("distance_km"),
            "duration_hours": round(r.get("duration_hours", 0), 1),
            "weather_risk": r.get("weather_risk"),
            "quality_risk": r.get("quality_risk"),
            "deadline_feasible": r.get("deadline_feasible", True),
        }
        for r in valid_routes
    ], indent=2)

    prompt = f"""You are an agricultural logistics route recommendation system for KhetBazaar.

You MUST respond with ONLY valid JSON — no explanation text before or after the JSON.

You are comparing route options for a shipment of {quantity_kg} kg of {commodity}.
Departure time: {departure_time or "today"}.

Available valid routes (already filtered for hard constraints):
{routes_summary}

Your task:
1. Compare the routes based on weather risk, distance, duration, and quality risk.
2. Recommend the BEST route for this commodity considering:
   - Weather risk (most important for perishable goods)
   - Quality risk
   - Travel time (shorter is better, but not at the cost of high weather risk)
   - Distance
3. Briefly explain your recommendation.

IMPORTANT RULES:
- You MUST only return a route_id that exists in the list above.
- You CANNOT create new routes or modify route data.
- Respond with ONLY this JSON structure:

{{
  "recommended_route_id": "<one of the route_ids above>",
  "reason": "<2-3 sentence explanation>",
  "tradeoffs": ["<tradeoff 1>", "<tradeoff 2>"],
  "confidence": "high|medium|low"
}}"""

    logger.info(f"[LLM] Calling Gemini to compare {len(valid_routes)} routes for {commodity}")
    result = _call_gemini(prompt)

    if result is None:
        logger.warning("[LLM] Gemini failed — using deterministic fallback")
        fallback = _deterministic_select(valid_routes)
        fallback["llm_attempted"] = True
        return fallback

    # Validate: recommended_route_id must exist
    recommended_id = result.get("recommended_route_id")
    valid_ids = {r["route_id"] for r in valid_routes}

    if recommended_id not in valid_ids:
        logger.warning(f"[LLM] LLM returned invalid route_id '{recommended_id}' — using deterministic fallback")
        fallback = _deterministic_select(valid_routes)
        fallback["llm_attempted"] = True
        return fallback

    result["selection_method"] = "llm_recommendation"
    logger.info(f"[LLM] Gemini recommended route {recommended_id} with confidence {result.get('confidence')}")
    return result
