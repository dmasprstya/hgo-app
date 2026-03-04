"""
Test suite for HGO core algorithm.
Fixtures mirror frontend hgo.test.js for cross-language equivalence.
"""
import pytest
from app.utils.hgo import (
    convert_to_crisp,
    normalize_matrix,
    calculate_output,
    calculate_hgod_index,
    rank_patients,
    run_full_hgo,
    CRITERIA_WEIGHTS,
    CRITERIA_TYPES,
)


# ── test_convert_to_crisp ──────────────────────────────────────────────────────
def test_convert_to_crisp_insurance():
    assert convert_to_crisp("Cr1", "independent") == 100
    assert convert_to_crisp("Cr1", "governance insurance") == 50


def test_convert_to_crisp_surgery():
    assert convert_to_crisp("Cr2", "no") == 100
    assert convert_to_crisp("Cr2", "yes") == 50


def test_convert_to_crisp_room():
    assert convert_to_crisp("Cr3", "vvip") == 100
    assert convert_to_crisp("Cr3", "class3") == 20


def test_convert_to_crisp_admission():
    assert convert_to_crisp("Cr4", "emergency") == 100
    assert convert_to_crisp("Cr4", "urgent") == 50


def test_convert_to_crisp_severity():
    assert convert_to_crisp("Cr5", "critical") == 100
    assert convert_to_crisp("Cr5", "mild") == 25


def test_convert_to_crisp_test_result():
    assert convert_to_crisp("Cr6", "abnormal") == 100
    assert convert_to_crisp("Cr6", "normal") == 50


def test_convert_to_crisp_invalid():
    with pytest.raises(ValueError):
        convert_to_crisp("Cr1", "unknown_value")

    with pytest.raises(ValueError):
        convert_to_crisp("Cr99", "any")


# ── test_normalize_matrix ──────────────────────────────────────────────────────
SAMPLE_MATRIX = [
    {"Cr1": 100.0, "Cr2": 100.0, "Cr3": 80.0, "Cr4": 100.0, "Cr5": 100.0, "Cr6": 100.0},
    {"Cr1": 50.0,  "Cr2": 50.0,  "Cr3": 20.0, "Cr4": 50.0,  "Cr5": 25.0,  "Cr6": 50.0},
]


def test_normalize_positive():
    normed = normalize_matrix(SAMPLE_MATRIX, CRITERIA_TYPES)
    # Cr1 positive: max=100 → row0=1.0, row1=0.5
    assert normed[0]["Cr1"] == pytest.approx(1.0)
    assert normed[1]["Cr1"] == pytest.approx(0.5)


def test_normalize_negative():
    normed = normalize_matrix(SAMPLE_MATRIX, CRITERIA_TYPES)
    # Cr2 negative: min=50 → row0=50/100=0.5, row1=50/50=1.0
    assert normed[0]["Cr2"] == pytest.approx(0.5)
    assert normed[1]["Cr2"] == pytest.approx(1.0)


def test_normalize_empty():
    assert normalize_matrix([], CRITERIA_TYPES) == []


# ── test_calculate_output ──────────────────────────────────────────────────────
def test_calculate_output_max():
    # All normalized = 1.0, weights sum ≈ 0.85 (not 1.0 — subset)
    full_row = {c: 1.0 for c in ["Cr1", "Cr2", "Cr3", "Cr4", "Cr5", "Cr6"]}
    result = calculate_output(full_row, CRITERIA_WEIGHTS)
    expected = sum(CRITERIA_WEIGHTS.values())
    assert result == pytest.approx(expected, rel=1e-4)


def test_calculate_output_zero():
    zero_row = {c: 0.0 for c in CRITERIA_WEIGHTS}
    assert calculate_output(zero_row, CRITERIA_WEIGHTS) == pytest.approx(0.0)


# ── test_calculate_hgod_index ──────────────────────────────────────────────────
def test_calculate_hgod_index_basic():
    crisp_row = {c: 100.0 for c in CRITERIA_WEIGHTS}
    ws = sum(CRITERIA_WEIGHTS.values())  # ≈ 0.85
    expected = 1.0 / (ws * 100)
    result = calculate_hgod_index(crisp_row, CRITERIA_WEIGHTS)
    assert result == pytest.approx(expected, rel=1e-4)


def test_hgod_lower_means_higher_priority():
    high_crisp = {c: 100.0 for c in CRITERIA_WEIGHTS}   # high severity → low index
    low_crisp  = {c: 25.0  for c in CRITERIA_WEIGHTS}
    assert calculate_hgod_index(high_crisp) < calculate_hgod_index(low_crisp)


# ── test_rank_patients ──────────────────────────────────────────────────────────
def test_rank_patients_ordering():
    unranked = [
        {"patient_id": "B", "hgod_index": 0.02, "output_score": 0.8},
        {"patient_id": "A", "hgod_index": 0.01, "output_score": 0.9},
    ]
    ranked = rank_patients(unranked)
    assert ranked[0]["patient_id"] == "A"
    assert ranked[0]["rank"] == 1
    assert ranked[1]["rank"] == 2


def test_rank_patients_priority_levels():
    items = [{"patient_id": str(i), "hgod_index": float(i), "output_score": 1.0} for i in range(8)]
    ranked = rank_patients(items)
    assert ranked[0]["priority_level"] == "Critical"
    assert ranked[-1]["priority_level"] == "Low"


# ── test_run_full_hgo ──────────────────────────────────────────────────────────
SAMPLE_PATIENTS = [
    {
        "id": "1", "patient_code": "P000001", "name": "Alice",
        "Cr1": "independent", "Cr2": "no", "Cr3": "vvip",
        "Cr4": "emergency", "Cr5": "critical", "Cr6": "abnormal",
    },
    {
        "id": "2", "patient_code": "P000002", "name": "Bob",
        "Cr1": "governance insurance", "Cr2": "yes", "Cr3": "class3",
        "Cr4": "urgent", "Cr5": "mild", "Cr6": "normal",
    },
]


def test_run_full_hgo_returns_ranked():
    results = run_full_hgo(SAMPLE_PATIENTS)
    assert len(results) == 2
    assert results[0]["rank"] == 1
    assert results[1]["rank"] == 2
    for r in results:
        assert "output_score" in r
        assert "hgod_index" in r
        assert "priority_level" in r


def test_run_full_hgo_empty():
    assert run_full_hgo([]) == []


def test_run_full_hgo_alice_higher_priority():
    """Alice (full scores) should rank #1 (lower hgod_index)."""
    results = run_full_hgo(SAMPLE_PATIENTS)
    alice = next(r for r in results if r["patient_id"] == "1")
    assert alice["rank"] == 1
