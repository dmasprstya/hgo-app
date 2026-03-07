"""
HGO Discovery Model — Core Algorithm
Pure Python, zero framework dependencies.
3 Stages: Hierarchy (H) → Governance (G) → Outlook (O)
"""
from typing import Dict, List, Tuple

# ── Stage H: Crisp Value Mapping ──────────────────────────────────────────────
CRISP_MAP: Dict[str, Dict[str, int]] = {
    "Cr1": {  # Insurance Provider (Positive)
        "governance insurance": 50,
        "bpjs": 50,
        "independent": 100,
        "mandiri": 100,
    },
    "Cr2": {  # Surgery (Negative)
        "no": 100,
        "tidak": 100,
        "yes": 50,
        "ya": 50,
    },
    "Cr3": {  # Room Class (Positive)
        "class3": 20,
        "kelas3": 20,
        "kelas 3": 20,
        "class 3": 20,
        "class2": 40,
        "kelas2": 40,
        "kelas 2": 40,
        "class 2": 40,
        "class1": 60,
        "kelas1": 60,
        "kelas 1": 60,
        "class 1": 60,
        "vip": 80,
        "vvip": 100,
    },
    "Cr4": {  # Admission Type (Positive)
        "urgent": 50,
        "emergency": 100,
        "darurat": 100,
        "mendesak": 50,
    },
    "Cr5": {  # Severity Score (Positive)
        "mild": 25,
        "ringan": 25,
        "moderate": 50,
        "sedang": 50,
        "severe": 75,
        "berat": 75,
        "critical": 100,
        "kritis": 100,
    },
    "Cr6": {  # Test Result (Positive)
        "normal": 50,
        "abnormal": 100,
    },
}

CRITERIA_WEIGHTS: Dict[str, float] = {
    "Cr1": 0.10,
    "Cr2": 0.20,
    "Cr3": 0.075,
    "Cr4": 0.125,
    "Cr5": 0.20,
    "Cr6": 0.15,
}

CRITERIA_TYPES: Dict[str, str] = {
    "Cr1": "positive",
    "Cr2": "negative",
    "Cr3": "positive",
    "Cr4": "positive",
    "Cr5": "positive",
    "Cr6": "positive",
}

CRITERIA_ORDER = ["Cr1", "Cr2", "Cr3", "Cr4", "Cr5", "Cr6"]


def convert_to_crisp(criterion_code: str, raw_value: str) -> int:
    """Stage H — Convert raw string value to crisp integer."""
    code = criterion_code.strip()
    if code not in CRISP_MAP:
        raise ValueError(f"Unknown criterion: {criterion_code}")
    mapping = CRISP_MAP[code]
    key = raw_value.strip().lower()
    if key not in mapping:
        raise ValueError(f"Unknown value '{raw_value}' for {criterion_code}")
    return mapping[key]


def normalize_matrix(
    matrix: List[Dict[str, float]],
    types: Dict[str, str] = None,
) -> List[Dict[str, float]]:
    """
    Stage G — Governance: Normalize decision matrix.
    Positive: r = x / max(col)
    Negative: r = min(col) / x
    matrix: list of dicts {criterion_code: crisp_value}
    """
    if types is None:
        types = CRITERIA_TYPES

    if not matrix:
        return []

    codes = list(matrix[0].keys())

    # Compute column max/min
    col_max: Dict[str, float] = {}
    col_min: Dict[str, float] = {}
    for code in codes:
        values = [row[code] for row in matrix]
        col_max[code] = max(values)
        col_min[code] = min(values)

    normalized = []
    for row in matrix:
        norm_row: Dict[str, float] = {}
        for code in codes:
            x = row[code]
            t = types.get(code, "positive")
            if t == "positive":
                norm_row[code] = x / col_max[code] if col_max[code] != 0 else 0.0
            else:  # negative
                norm_row[code] = col_min[code] / x if x != 0 else 0.0
        normalized.append(norm_row)

    return normalized


def calculate_output(normalized_row: Dict[str, float], weights: Dict[str, float] = None) -> float:
    """Stage O — Outlook: Weighted sum (SAW method)."""
    if weights is None:
        weights = CRITERIA_WEIGHTS
    total = sum(weights.get(code, 0.0) * val for code, val in normalized_row.items())
    return round(total, 6)


def calculate_hgod_index(weighted_crisp_row: Dict[str, float], weights: Dict[str, float] = None) -> float:
    """
    Stage O — HGOd Index = 1 / Σ(Wj × Xj)
    Lower index = Higher priority.
    Uses original (non-normalized) crisp values × weights.
    """
    if weights is None:
        weights = CRITERIA_WEIGHTS
    weighted_sum = sum(weights.get(code, 0.0) * val for code, val in weighted_crisp_row.items())
    return round(1.0 / weighted_sum if weighted_sum != 0 else float("inf"), 6)


def rank_patients(results: List[Dict]) -> List[Dict]:
    """
    Rank by HGOd Index ascending (lower = higher priority).
    Adds 'rank' and 'priority_level' keys to each dict.
    """
    sorted_results = sorted(results, key=lambda r: r["hgod_index"])
    total = len(sorted_results)
    for i, r in enumerate(sorted_results):
        r["rank"] = i + 1
        # Priority level based on quartile
        pct = (i + 1) / total if total > 0 else 0
        if pct <= 0.25:
            r["priority_level"] = "Critical"
        elif pct <= 0.50:
            r["priority_level"] = "High"
        elif pct <= 0.75:
            r["priority_level"] = "Medium"
        else:
            r["priority_level"] = "Low"
    return sorted_results


def run_full_hgo(patients: List[Dict]) -> List[Dict]:
    """
    Full HGO pipeline:
    Input:  [{"id": ..., "patient_code": ..., "name": ...,
               "Cr1": raw, "Cr2": raw, ..., "Cr6": raw}]
    Output: ranked list with output_score, hgod_index, rank, priority_level
    """
    if not patients:
        return []

    # Stage H — Convert to crisp
    crisp_rows = []
    for patient in patients:
        row: Dict[str, float] = {}
        for code in CRITERIA_ORDER:
            raw = patient.get(code, "")
            row[code] = float(convert_to_crisp(code, str(raw)))
        crisp_rows.append(row)

    # Stage G — Normalize
    normalized_rows = normalize_matrix(crisp_rows, CRITERIA_TYPES)

    # Stage O — Output + HGOd
    results = []
    for i, patient in enumerate(patients):
        output_score = calculate_output(normalized_rows[i], CRITERIA_WEIGHTS)
        hgod_index = calculate_hgod_index(crisp_rows[i], CRITERIA_WEIGHTS)
        results.append(
            {
                "patient_id": patient.get("id"),
                "patient_code": patient.get("patient_code"),
                "patient_name": patient.get("name"),
                "output_score": output_score,
                "hgod_index": hgod_index,
                # crisp snapshot for transparency
                "_crisp": crisp_rows[i],
                "_normalized": normalized_rows[i],
            }
        )

    return rank_patients(results)
