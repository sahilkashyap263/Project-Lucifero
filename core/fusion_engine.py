"""
fusion_engine.py — WLDS-9 Multi-Modal Fusion Engine.
Combines audio_engine, image_engine, and distance_engine outputs.
Called by inference.py as: result = fusion_engine.run(audio_result, image_result, dist_result)
"""

import numpy as np

_WEIGHT_AUDIO        = 0.42
_WEIGHT_IMAGE        = 0.58
_DISAGREEMENT_PENALTY = 0.72


def _weighted_confidence(audio_conf: float, image_conf: float) -> float:
    fused = _WEIGHT_AUDIO * audio_conf + _WEIGHT_IMAGE * image_conf
    return round(float(np.clip(fused, 0.0, 1.0)), 4)


def _pick_winner(audio_result: dict, image_result: dict,
                 fused_conf: float) -> tuple[str, str, bool]:
    audio_species = (audio_result.get("species") or "").strip()
    image_species = (image_result.get("species") or "").strip()

    agree = audio_species.lower() == image_species.lower()

    if agree:
        return image_species, image_result.get("type", "Unknown"), True

    audio_conf = float(audio_result.get("confidence", 0))
    image_conf = float(image_result.get("confidence", 0))

    if image_conf >= audio_conf:
        return image_species, image_result.get("type", "Unknown"), False
    else:
        return audio_species, audio_result.get("type", "Unknown"), False


def run(audio_result: dict, image_result: dict, dist_result: dict) -> dict:
    """
    Called by inference.py as: fusion_engine.run(audio_result, image_result, dist_result)
    Returns fused species prediction with confidence, distance, and visual metadata.
    """
    audio_conf = float(audio_result.get("confidence", 0))
    image_conf = float(image_result.get("confidence", 0))

    fused_conf = _weighted_confidence(audio_conf, image_conf)

    species, animal_type, agreement = _pick_winner(
        audio_result, image_result, fused_conf
    )

    if not agreement:
        fused_conf = round(float(np.clip(fused_conf * _DISAGREEMENT_PENALTY, 0.0, 1.0)), 4)
        print(
            f"[fusion_engine] ⚠ Conflict — "
            f"audio={audio_result.get('species')} ({audio_conf:.3f}) vs "
            f"image={image_result.get('species')} ({image_conf:.3f}) — "
            f"winner={species}, penalised conf={fused_conf}"
        )
    else:
        print(f"[fusion_engine] ✔ Agreement — {species} | fused_conf={fused_conf}")

    return {
        "species":          species,
        "type":             animal_type,
        "confidence":       fused_conf,
        "audio_confidence": round(audio_conf, 4),
        "image_confidence": round(image_conf, 4),
        "distance":         dist_result.get("distance",       "—"),
        "distance_label":   dist_result.get("distance_label", "—"),
        "distance_method":  dist_result.get("method",         "gbr_audio"),
        "audio_species":    audio_result.get("species",       "—"),
        "image_species":    image_result.get("species",       "—"),
        "agreement":        agreement,
        "habitat_zone":     image_result.get("habitat_zone",  "—"),
        "activity_level":   image_result.get("activity_level","—"),
        "size_class":       image_result.get("size_class",    "—"),
        "body_coverage":    image_result.get("body_coverage",  0),
        "time_of_day":      image_result.get("time_of_day",   "N/A"),
    }