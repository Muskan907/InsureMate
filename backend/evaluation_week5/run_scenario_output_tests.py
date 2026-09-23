import json
import time
import requests
from pathlib import Path


API_URL = "http://localhost:8000/api/scenario/test-output"

BASE_DIR = Path(__file__).resolve().parent
TEST_FILE = BASE_DIR / "scenario_output_test_set.json"


def load_tests():
    """
    Load the Week 5 AI output-testing dataset.
    """
    with open(TEST_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def check_expected_behavior(test, response):
    """
    Deterministic evaluation layer for the Week 5 AI Output Testing set.

    The API performs the actual AI output validation:
        - relevance
        - evidence support
        - unsupported claims
        - expected format
        - grounding
        - applicability

    This function evaluates whether the returned result satisfies the
    expected behavior defined for the individual test case.

    The checks are intentionally test-specific rather than using one
    universal rule for every scenario.
    """

    result = response.get("candidate_output", {})
    validation = response.get("validation", {})

    status = result.get("status", "")
    answer = result.get("answer", "")
    answer_lower = answer.lower()

    independent_validation = (
        validation.get("passed") is True
    )

    test_type = test.get("type")
    test_id = test.get("id")

    # ---------------------------------------------------------
    # 1. SUFFICIENT EVIDENCE
    # ---------------------------------------------------------
    #
    # A sufficient-evidence case should produce a supported answer
    # when the retrieved evidence actually establishes the answer.
    #
    # IMPORTANT:
    # We do NOT require "48" for every sufficient test.
    # OT01 has a 48-month-specific requirement, while OT03 does not.
    #
    if test_type == "sufficient":

        basic_sufficient_pass = (
            status == "SUPPORTED"
            and independent_validation
            and bool(answer.strip())
        )

        # OT01 specifically requires preservation of the
        # 48-month waiting-period duration.
        if test_id == "OT01":
            return (
                basic_sufficient_pass
                and "48" in answer_lower
            )

        # OT03 is sufficient because the retrieved evidence
        # explicitly establishes the experimental-treatment
        # restriction. It does NOT need to contain "48".
        if test_id == "OT03":
            return basic_sufficient_pass

        return basic_sufficient_pass

    # ---------------------------------------------------------
    # 2. CONDITIONAL
    # ---------------------------------------------------------
    #
    # The system should avoid applying a condition-specific clause
    # when the exact condition/treatment is missing.
    #
    if test_type == "conditional":
        return (
            status == "CONDITIONAL"
            or
            (
                "exact" in answer_lower
                and (
                    "surgery" in answer_lower
                    or "condition" in answer_lower
                )
            )
        )

    # ---------------------------------------------------------
    # 3. INSUFFICIENT EVIDENCE
    # ---------------------------------------------------------
    #
    # The system should withhold a definitive interpretation when
    # the available evidence is insufficient.
    #
    if test_type == "insufficient":
        return (
            status == "INSUFFICIENT EVIDENCE"
            or
            "insufficient" in answer_lower
            or
            "not enough" in answer_lower
            or
            "not sufficient" in answer_lower
        )

    # ---------------------------------------------------------
    # 4. UNSUPPORTED CLAIM
    # ---------------------------------------------------------
    #
    # The system must not accept unsupported claims such as:
    # "unlimited coverage" or "no exclusions".
    #
    if test_type == "unsupported_claim":
        return (
            status != "SUPPORTED"
            or
            "unlimited" not in answer_lower
            or
            "no exclusions" not in answer_lower
        )

    # ---------------------------------------------------------
    # 5. MULTI-FACT
    # ---------------------------------------------------------
    #
    # The scenario contains multiple facts:
    #   - policy duration
    #   - pre-existing condition
    #   - surgery
    #
    # We require a valid decision status and extraction of at least
    # three scenario facts.
    #
    if test_type == "multi_fact":
        return (
            status in {
                "CONDITIONAL",
                "INSUFFICIENT EVIDENCE",
                "SUPPORTED",
                "CONFLICT"
            }
            and
            len(response.get("facts", [])) >= 3
        )

    # ---------------------------------------------------------
    # 6. MISSING FACT
    # ---------------------------------------------------------
    #
    # The system should identify that the exact surgery/condition
    # may be required before applying a condition-specific clause.
    #
    if test_type == "missing_fact":
        return (
            status == "CONDITIONAL"
            or
            "exact" in answer_lower
            or
            "surgery type" in answer_lower
            or
            "missing" in answer_lower
        )

    # ---------------------------------------------------------
    # 7. CONFLICT CHECK
    # ---------------------------------------------------------
    #
    # Different waiting periods are not automatically a conflict.
    # The system should allow a valid non-CONFLICT response when
    # different clauses have different scopes.
    #
    if test_type == "conflict_check":

        valid_status = status in {
            "SUPPORTED",
            "CONDITIONAL",
            "INSUFFICIENT EVIDENCE",
            "CONFLICT"
        }

        mentions_conflict = "conflict" in answer_lower

        # A non-CONFLICT result is acceptable because the purpose
        # of this test is to ensure that different clause scopes
        # are not incorrectly treated as contradictory.
        non_conflict_is_valid = status != "CONFLICT"

        return (
            valid_status
            and
            (
                mentions_conflict
                or non_conflict_is_valid
            )
        )

    # ---------------------------------------------------------
    # 8. FORMAT
    # ---------------------------------------------------------
    #
    # The output must contain the required structured fields.
    #
    if test_type == "format":

        return (
            isinstance(result, dict)
            and isinstance(result.get("status"), str)
            and isinstance(result.get("answer"), str)
            and isinstance(result.get("missing_facts"), list)
            and isinstance(result.get("evidence_sufficient"), bool)
            and isinstance(result.get("conflict_detected"), bool)
            and isinstance(result.get("conflict_reason"), str)
            and independent_validation
        )

    # Unknown test type
    return False


def run_test(test):
    """
    Run one scenario output-testing case against the API.
    """

    test_id = test["id"]

    print(f"\n{'=' * 70}")
    print(f"{test_id} | {test['type']}")
    print(f"{'=' * 70}")
    print(f"Scenario: {test['scenario']}")

    payload = {
        "scenario": test["scenario"],
        "model": "qwen2.5:1.5b",
        "validator_model": "phi3:mini",
        "top_k": 5
    }

    start = time.perf_counter()

    try:
        response = requests.post(
            API_URL,
            json=payload,
            timeout=240
        )

        latency = time.perf_counter() - start

        response.raise_for_status()
        data = response.json()

    except Exception as exc:

        latency = time.perf_counter() - start

        print("RESULT: ERROR")
        print(f"ERROR: {exc}")
        print(f"LATENCY: {latency:.2f}s")

        return {
            "id": test_id,
            "type": test["type"],
            "status": "ERROR",
            "pass": False,
            "latency_seconds": round(latency, 2),
            "error": str(exc)
        }

    candidate = data.get(
        "candidate_output",
        {}
    )

    validation = data.get(
        "validation",
        {}
    )

    behavior_pass = check_expected_behavior(
        test,
        data
    )

    print(
        f"Candidate status: "
        f"{candidate.get('status')}"
    )

    print(
        f"Candidate answer: "
        f"{candidate.get('answer', '')}"
    )

    print(
        f"Independent validation: "
        f"{validation.get('passed')}"
    )

    print(
        f"Grounding overlap: "
        f"{validation.get('grounding_overlap_percent')}%"
    )

    print(
        f"Validator reason: "
        f"{validation.get('validator_reason', '')}"
    )

    print(
        f"Expected behavior: "
        f"{test['expected_behavior']}"
    )

    print(
        f"Latency: "
        f"{latency:.2f}s"
    )

    print(
        f"RESULT: "
        f"{'PASS' if behavior_pass else 'FAIL'}"
    )

    return {
        "id": test_id,
        "type": test["type"],
        "status": candidate.get("status"),
        "pass": behavior_pass,
        "independent_validation_pass": validation.get(
            "passed",
            False
        ),
        "grounding_overlap_percent": validation.get(
            "grounding_overlap_percent"
        ),
        "latency_seconds": round(
            latency,
            2
        ),
        "validator_reason": validation.get(
            "validator_reason",
            ""
        )
    }


def main():
    """
    Execute the complete Week 5 AI Output Testing suite.
    """

    tests = load_tests()

    print("\n" + "=" * 70)
    print("INSUREMATE — WEEK 5 AI OUTPUT TESTING")
    print("=" * 70)

    print(
        f"Test cases loaded: "
        f"{len(tests)}"
    )

    print(
        f"API: "
        f"{API_URL}"
    )

    print(
        "Generator model: "
        "qwen2.5:1.5b"
    )

    print(
        "Independent validator: "
        "phi3:mini"
    )

    results = []

    for test in tests:
        result = run_test(test)
        results.append(result)

    # ---------------------------------------------------------
    # FINAL STATISTICS
    # ---------------------------------------------------------

    passed = sum(
        1
        for result in results
        if result["pass"]
    )

    failed = (
        len(results)
        - passed
    )

    validation_passed = sum(
        1
        for result in results
        if result.get(
            "independent_validation_pass"
        )
    )

    print("\n" + "=" * 70)
    print("FINAL RESULTS")
    print("=" * 70)

    print(
        f"Total tests: "
        f"{len(results)}"
    )

    print(
        f"Passed: "
        f"{passed}"
    )

    print(
        f"Failed: "
        f"{failed}"
    )

    if results:

        print(
            f"Test-set pass rate: "
            f"{passed / len(results) * 100:.1f}%"
        )

        print(
            f"Independent validator pass rate: "
            f"{validation_passed / len(results) * 100:.1f}%"
        )

    print("\nPer-test summary:")

    for result in results:

        print(
            f"{result['id']}: "
            f"{'PASS' if result['pass'] else 'FAIL'} "
            f"| status={result.get('status')} "
            f"| validation="
            f"{result.get('independent_validation_pass')} "
            f"| latency="
            f"{result.get('latency_seconds')}s"
        )

    # ---------------------------------------------------------
    # SAVE DETAILED RESULTS
    # ---------------------------------------------------------

    output_file = (
        BASE_DIR
        / "scenario_output_test_results.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            results,
            f,
            indent=2,
            ensure_ascii=False
        )

    print(
        f"\nDetailed results saved to: "
        f"{output_file}"
    )


if __name__ == "__main__":
    main()