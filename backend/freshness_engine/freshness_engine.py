"""
freshness_engine.py
===================
Standalone, plug-and-play Freshness Score Engine for agricultural supply chains.

This module is COMPLETELY ISOLATED from any existing system. It has zero imports
from the host application and can be dropped into any Python project or called
via the companion REST API (api.py).

Usage (as a library):
    from freshness_engine import calculate_freshness, FreshnessResult
    result = calculate_freshness(
        crop_name="Tomato",
        harvest_time_utc=datetime(2026, 8, 20, 6, 0, 0, tzinfo=timezone.utc),
        transit_mode="normal"
    )
    print(result.score, result.grade)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


# ---------------------------------------------------------------------------
# CROP MASTER DATA
# Baseline shelf-life in hours under normal (non-cold-chain) conditions.
# Sourced from FSSAI / APEDA post-harvest guidelines.
# ---------------------------------------------------------------------------
CROP_SHELF_LIFE_HOURS: dict[str, float] = {
    # ── Leafy Vegetables ──────────────────────────────────────────────────
    "spinach":        36.0,
    "lettuce":        48.0,
    "fenugreek":      30.0,
    "coriander":      36.0,
    "mint":           24.0,
    "amaranth":       30.0,

    # ── Fruiting Vegetables ───────────────────────────────────────────────
    "tomato":        120.0,
    "capsicum":      168.0,
    "cucumber":      120.0,
    "brinjal":        96.0,
    "okra":           48.0,
    "peas":           48.0,
    "bitter gourd":   72.0,
    "bottle gourd":   96.0,
    "ridge gourd":    72.0,

    # ── Root & Bulb Vegetables ────────────────────────────────────────────
    "potato":        720.0,
    "onion":        1440.0,
    "garlic":       4320.0,
    "ginger":        720.0,
    "carrot":        480.0,
    "radish":        168.0,
    "beetroot":      336.0,
    "sweet potato":  504.0,
    "yam":           720.0,

    # ── Brassicas ─────────────────────────────────────────────────────────
    "cabbage":       336.0,
    "cauliflower":    72.0,
    "broccoli":       72.0,
    "knol khol":     168.0,

    # ── Fruits ────────────────────────────────────────────────────────────
    "mango":         168.0,
    "banana":        120.0,
    "papaya":        120.0,
    "guava":          96.0,
    "strawberry":     48.0,
    "apple":        1440.0,
    "pomegranate":   720.0,
    "grapes":        168.0,
    "watermelon":    240.0,
    "orange":        480.0,
    "lemon":         480.0,
    "pineapple":     168.0,

    # ── Grains & Pulses (processed/dried) ─────────────────────────────────
    "wheat":        8760.0,
    "rice":         8760.0,
    "maize":        8760.0,
    "corn":           72.0,    # fresh sweet corn on cob
    "sorghum":      8760.0,
    "chickpea":     8760.0,
    "lentil":       8760.0,
    "soybean":      8760.0,

    # ── Herbs & Spices ────────────────────────────────────────────────────
    "turmeric":     4320.0,
    "chilli":        240.0,
    "pepper":       4320.0,
}

# Fallback shelf life when crop is not found in the master dictionary
DEFAULT_SHELF_LIFE_HOURS: float = 120.0

# Decay factor multipliers per transit/storage mode
DECAY_FACTORS: dict[str, float] = {
    "normal":     1.0,   # ambient temperature
    "cold_chain": 0.6,   # refrigerated / controlled atmosphere
}

# Grade thresholds
GRADE_THRESHOLDS: list[tuple[float, str, str]] = [
    (85.0, "Ultra Fresh",       "Premium — commands top market price."),
    (60.0, "Fresh",             "Standard quality — suitable for retail."),
    (40.0, "Needs Fast Sale",   "Discounted sale recommended within 24 hrs."),
    (0.0,  "Processing Grade",  "Direct to industry, juicing, or animal feed."),
]


# ---------------------------------------------------------------------------
# RESULT DATA CLASS
# ---------------------------------------------------------------------------
@dataclass
class FreshnessResult:
    """
    Immutable result object returned by calculate_freshness().

    Attributes
    ----------
    score           : Freshness score 0–100 (float, two decimal precision)
    grade           : Human-readable quality grade label
    grade_advice    : Recommended action for this grade
    crop_name       : Normalised crop name used for lookup
    shelf_life_hours: Baseline shelf-life used in calculation (hrs)
    elapsed_hours   : Time elapsed since harvest (hrs)
    transit_mode    : "normal" or "cold_chain"
    decay_factor    : Multiplier applied (0.6 cold-chain / 1.0 normal)
    harvest_time_utc: Harvest datetime (UTC-aware)
    evaluated_at_utc: Timestamp when this score was computed (UTC)
    warnings        : List of advisory strings (e.g. "crop not in master list")
    """
    score:             float
    grade:             str
    grade_advice:      str
    crop_name:         str
    shelf_life_hours:  float
    elapsed_hours:     float
    transit_mode:      str
    decay_factor:      float
    harvest_time_utc:  datetime
    evaluated_at_utc:  datetime
    warnings:          list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# INTERNAL HELPERS
# ---------------------------------------------------------------------------
def _normalise_crop(name: str) -> str:
    """Lowercase + strip whitespace for consistent dictionary lookup."""
    return name.strip().lower()


def _resolve_shelf_life(crop_key: str) -> tuple[float, list[str]]:
    """
    Look up the crop baseline shelf life.

    Returns
    -------
    (shelf_life_hours, warnings)
        warnings is non-empty when the crop falls back to the default.
    """
    warnings: list[str] = []
    shelf_life = CROP_SHELF_LIFE_HOURS.get(crop_key)
    if shelf_life is None:
        warnings.append(
            f"Crop '{crop_key}' not found in master list. "
            f"Using default shelf life of {DEFAULT_SHELF_LIFE_HOURS} hrs."
        )
        shelf_life = DEFAULT_SHELF_LIFE_HOURS
    return shelf_life, warnings


def _resolve_decay_factor(transit_mode: str) -> tuple[float, list[str]]:
    """
    Resolve the decay factor for the given transit mode.

    Returns
    -------
    (decay_factor, warnings)
        warnings is non-empty when the mode is unrecognised (falls back to normal).
    """
    warnings: list[str] = []
    mode_key = transit_mode.strip().lower().replace("-", "_").replace(" ", "_")
    factor = DECAY_FACTORS.get(mode_key)
    if factor is None:
        warnings.append(
            f"Transit mode '{transit_mode}' unrecognised. "
            f"Defaulting to 'normal' (decay factor 1.0)."
        )
        factor = DECAY_FACTORS["normal"]
        mode_key = "normal"
    return factor, warnings, mode_key  # type: ignore[return-value]


def _classify_grade(score: float) -> tuple[str, str]:
    """Map a numerical score to its grade label and advice string."""
    for threshold, label, advice in GRADE_THRESHOLDS:
        if score >= threshold:
            return label, advice
    # Unreachable, but safety net
    return GRADE_THRESHOLDS[-1][1], GRADE_THRESHOLDS[-1][2]


def _ensure_utc(dt: datetime) -> datetime:
    """Attach UTC timezone info if the datetime is naive."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------------------------
def calculate_freshness(
    crop_name: str,
    harvest_time_utc: datetime,
    transit_mode: str = "normal",
    current_time_utc: Optional[datetime] = None,
    custom_shelf_life_hours: Optional[float] = None,
) -> FreshnessResult:
    """
    Calculate the Freshness Score for an agricultural commodity.

    Parameters
    ----------
    crop_name             : Name of the crop (e.g. "Tomato", "Spinach").
                            Case-insensitive. Falls back to default if not found.
    harvest_time_utc      : The datetime the crop was harvested (UTC).
                            Naive datetimes are assumed UTC.
    transit_mode          : "normal" (ambient) or "cold_chain" (refrigerated).
                            Default is "normal".
    current_time_utc      : Override the current time (useful for testing).
                            Defaults to datetime.now(timezone.utc).
    custom_shelf_life_hours: Override the master-list shelf life (e.g. for
                             unusual varieties or custom SLAs).

    Returns
    -------
    FreshnessResult
        Dataclass containing score, grade, metadata, and any warnings.

    Examples
    --------
    >>> from datetime import datetime, timezone
    >>> harvest = datetime(2026, 8, 20, 0, 0, 0, tzinfo=timezone.utc)
    >>> result = calculate_freshness("Tomato", harvest, "cold_chain")
    >>> 0 <= result.score <= 100
    True
    """
    warnings: list[str] = []

    # ── 1. Normalise inputs ────────────────────────────────────────────────
    crop_key = _normalise_crop(crop_name)
    harvest_dt = _ensure_utc(harvest_time_utc)
    now_dt = _ensure_utc(current_time_utc) if current_time_utc else datetime.now(timezone.utc)

    # ── 2. Resolve shelf life ──────────────────────────────────────────────
    if custom_shelf_life_hours is not None:
        if custom_shelf_life_hours <= 0:
            raise ValueError("custom_shelf_life_hours must be a positive number.")
        shelf_life = float(custom_shelf_life_hours)
        warnings.append(f"Using custom shelf life of {shelf_life} hrs.")
    else:
        shelf_life, sl_warns = _resolve_shelf_life(crop_key)
        warnings.extend(sl_warns)

    # ── 3. Resolve decay factor ───────────────────────────────────────────
    decay_factor, df_warns, resolved_mode = _resolve_decay_factor(transit_mode)
    warnings.extend(df_warns)

    # ── 4. Guard: future harvest time ─────────────────────────────────────
    if harvest_dt > now_dt:
        warnings.append(
            "Harvest time is in the future relative to evaluation time. "
            "Elapsed hours clamped to 0; score will be 100."
        )
        elapsed_hours = 0.0
    else:
        elapsed_hours = (now_dt - harvest_dt).total_seconds() / 3600.0

    # ── 5. Core freshness formula ─────────────────────────────────────────
    #  Penalty = (elapsed_hours / shelf_life) * 100 * decay_factor
    #  Score   = clamp(100 - penalty, 0, 100)
    penalty = (elapsed_hours / shelf_life) * 100.0 * decay_factor
    raw_score = 100.0 - penalty
    score = round(max(0.0, min(100.0, raw_score)), 2)

    # ── 6. Classify grade ─────────────────────────────────────────────────
    grade, advice = _classify_grade(score)

    return FreshnessResult(
        score=score,
        grade=grade,
        grade_advice=advice,
        crop_name=crop_key,
        shelf_life_hours=shelf_life,
        elapsed_hours=round(elapsed_hours, 4),
        transit_mode=resolved_mode,
        decay_factor=decay_factor,
        harvest_time_utc=harvest_dt,
        evaluated_at_utc=now_dt,
        warnings=warnings,
    )


def get_crop_catalogue() -> dict[str, float]:
    """
    Return a copy of the full crop master data dictionary.

    Returns
    -------
    dict[str, float]
        Mapping of crop name → baseline shelf life in hours.
    """
    return dict(CROP_SHELF_LIFE_HOURS)


def list_transit_modes() -> list[str]:
    """Return all supported transit/storage mode identifiers."""
    return list(DECAY_FACTORS.keys())
