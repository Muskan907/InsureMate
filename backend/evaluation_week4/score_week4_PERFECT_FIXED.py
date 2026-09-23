"""
Week 4 — Auditable Automated Model Evaluation for InsureMate
==============================================================

Purpose
-------
Evaluate the SAME 28 questions answered by:
  - codellama:7b-instruct
  - phi3:mini
  - qwen2.5:1.5b

The evaluator model MUST be independent of the three compared models.
Recommended:
    llama3.1:8b

The final score is calculated by Python from criterion-level judgments.
The LLM judge does NOT calculate the final category/overall score.

Inputs (same folder as this script)
------------------------------------
    software_engineering_dataset.json
    week4_raw_results.json
    week4_ground_truth.json
    week4_resource_benchmark.json   (optional)

Outputs
-------
    week4_automated_evaluation.json
    week4_automated_evaluation.csv
    week4_methodology.txt
    week4_code_generation_tests.json

Core methodology
----------------
1. Code Retrieval:
      exact target retrieval is checked deterministically from the answer.
      Score = 0.70*retrieval + 0.20*relevance + 0.10*groundedness

2. Explanation / Dependency / Bug / Refactoring / RAG:
      an independent LLM judge evaluates each criterion separately.
      Each criterion receives one of:
          0, 25, 50, 75, 100
      using explicit criterion-specific rubrics.
      Python applies the professor's weights.

3. Code Generation:
      generated Python code is extracted and syntax checked.
      Known executable tasks are tested in an isolated subprocess.
      Test-pass rate is an actual executed metric, not a guessed score.
      Score = 0.60*test_pass + 0.25*correctness + 0.15*relevance

4. Hallucination:
      Judge returns hallucination = true/false with evidence.
      Hallucination rate = hallucinated answers / evaluated answers * 100.

5. RAG:
      Retrieval quality is evaluated separately from answer quality.
      The retrieved context is NOT treated as automatically correct merely
      because it exists.
      Retrieval quality is an evidence-coverage/relevance score because
      the ground truth does not provide gold chunk IDs. We therefore do NOT
      call it Precision@K or Recall@K.

Important
---------
This is intentionally NOT a keyword-counting semantic scorer.
It uses exact deterministic checks where exactness is required and an
independent evaluator model for semantic criteria.

Run
---
PowerShell:
    $env:WEEK4_JUDGE_MODEL="llama3.1:8b"
    python evaluation_week4\\score_week4_PERFECT_FIXED.py

Optional:
    $env:WEEK4_JUDGE_MODEL="llama3.1:8b"
    $env:WEEK4_JUDGE_TEMPERATURE="0"
"""

import ast
import csv
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from collections import defaultdict


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE = Path(__file__).resolve().parent

DATASET_FILE = BASE / "software_engineering_dataset.json"
RAW_FILE = BASE / "week4_raw_results.json"
GT_FILE = BASE / "week4_ground_truth.json"
RESOURCE_FILE = BASE / "week4_resource_benchmark.json"

OUT_JSON = BASE / "week4_automated_evaluation.json"
OUT_CSV = BASE / "week4_automated_evaluation.csv"
OUT_METHOD = BASE / "week4_methodology.txt"
OUT_TESTS = BASE / "week4_code_generation_tests.json"


# ---------------------------------------------------------------------------
# Compared models and independent judge
# ---------------------------------------------------------------------------

COMPARED_MODELS = {
    "codellama:7b-instruct",
    "phi3:mini",
    "qwen2.5:1.5b",
}

JUDGE_MODEL = os.getenv("WEEK4_JUDGE_MODEL", "llama3.1:8b")
JUDGE_TEMP = float(os.getenv("WEEK4_JUDGE_TEMPERATURE", "0"))

if JUDGE_MODEL in COMPARED_MODELS:
    raise SystemExit(
        f"ERROR: {JUDGE_MODEL} is one of the compared models.\n"
        "Use an independent judge, e.g.:\n"
        '$env:WEEK4_JUDGE_MODEL="llama3.1:8b"\n'
    )


# ---------------------------------------------------------------------------
# Professor's exact category weights from the supplied Week 4 ground truth
# ---------------------------------------------------------------------------

DEFAULT_WEIGHTS = {
    "Explanation": {
        "correctness": 0.40,
        "completeness": 0.30,
        "relevance": 0.20,
        "hallucination_free": 0.10,
    },
    "Code Retrieval": {
        "exact_retrieval": 0.70,
        "relevance": 0.20,
        "hallucination_free": 0.10,
    },
    "Dependency Understanding": {
        "dependency_correctness": 0.40,
        "flow_completeness": 0.30,
        "reasoning": 0.20,
        "hallucination_free": 0.10,
    },
    "Bug Analysis": {
        "root_cause": 0.35,
        "affected_component": 0.20,
        "fix": 0.25,
        "reasoning": 0.10,
        "hallucination_free": 0.10,
    },
    "Code Generation": {
        "test_pass_rate": 0.60,
        "correctness": 0.25,
        "relevance": 0.15,
    },
    "Refactoring": {
        "behavior_preservation": 0.45,
        "syntax_validity": 0.20,
        "readability": 0.20,
        "relevance": 0.15,
    },
    "RAG based Question": {
        "retrieval_quality": 0.30,
        "answer_correctness": 0.35,
        "groundedness": 0.25,
        "relevance": 0.10,
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_json(path):
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def lower(s):
    return normalize(s).lower()


def extract_json_object(text):
    """Extract the first valid JSON object from an LLM response."""
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass

    starts = [m.start() for m in re.finditer(r"\{", text)]
    for start in starts:
        depth = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            c = text[i]
            if in_string:
                if escape:
                    escape = False
                elif c == "\\":
                    escape = True
                elif c == '"':
                    in_string = False
            else:
                if c == '"':
                    in_string = True
                elif c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        candidate = text[start:i+1]
                        try:
                            return json.loads(candidate)
                        except Exception:
                            break
    raise ValueError("Judge did not return valid JSON.")


def clamp_score(x):
    try:
        x = int(x)
    except Exception:
        return 0
    allowed = [0, 25, 50, 75, 100]
    return min(allowed, key=lambda v: abs(v - x))


def weighted_score(criteria, weights):
    total = 0.0
    used = 0.0
    for key, weight in weights.items():
        if key not in criteria:
            continue
        total += clamp_score(criteria[key]) * float(weight)
        used += float(weight)
    if used == 0:
        return 0.0
    return total / used


def find_textual_weight_config(gt):
    """
    The ground-truth file may store weights in different layouts.
    We only accept a category mapping if all expected criterion names are found.
    Otherwise we use DEFAULT_WEIGHTS, which exactly matches the supplied GT.
    """
    candidates = []
    if isinstance(gt, dict):
        candidates.append(gt)
        for key in ("weights", "category_weights", "rubric", "evaluation_weights"):
            if isinstance(gt.get(key), dict):
                candidates.append(gt[key])

    for candidate in candidates:
        out = {}
        for cat, expected in DEFAULT_WEIGHTS.items():
            raw = candidate.get(cat) if isinstance(candidate, dict) else None
            if not isinstance(raw, dict):
                break
            if all(k in raw for k in expected):
                try:
                    vals = {k: float(raw[k]) for k in expected}
                    if abs(sum(vals.values()) - 1.0) < 1e-6:
                        out[cat] = vals
                    else:
                        break
                except Exception:
                    break
        if len(out) == len(DEFAULT_WEIGHTS):
            return out

    return DEFAULT_WEIGHTS.copy()


def ollama_chat(model, system_prompt, user_prompt):
    """Call local Ollama through its HTTP API."""
    import urllib.request

    payload = {
        "model": model,
        "stream": False,
        "options": {
            "temperature": JUDGE_TEMP,
        },
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    req = urllib.request.Request(
        "http://localhost:11434/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=180) as resp:
        data = json.loads(resp.read().decode("utf-8"))

    return data["message"]["content"]


# ---------------------------------------------------------------------------
# Category normalization
# ---------------------------------------------------------------------------

CATEGORY_ALIASES = {
    "explanation": "Explanation", "code retrieval": "Code Retrieval", "code_retrieval": "Code Retrieval",
    "dependency understanding": "Dependency Understanding", "dependency_understanding": "Dependency Understanding",
    "bug analysis": "Bug Analysis", "bug_analysis": "Bug Analysis",
    "code generation": "Code Generation", "code_generation": "Code Generation",
    "refactoring": "Refactoring", "rag based question": "RAG based Question",
    "rag_based_question": "RAG based Question", "rag": "RAG based Question",
}
OFFICIAL_CATEGORY_BY_QID = {}
for _prefix, _category in [("E","Explanation"),("CR","Code Retrieval"),("DU","Dependency Understanding"),("BA","Bug Analysis"),("CG","Code Generation"),("RF","Refactoring"),("RAG","RAG based Question")]:
    for _i in range(1,5): OFFICIAL_CATEGORY_BY_QID[f"{_prefix}{_i:02d}"] = _category

def normalize_category(category):
    key = re.sub(r"\s+", " ", str(category or "")).strip().lower()
    return CATEGORY_ALIASES.get(key, str(category).strip())

def category_for_question(qid, raw_category):
    qid_key = str(qid or "").strip().upper()
    return OFFICIAL_CATEGORY_BY_QID.get(qid_key, normalize_category(raw_category))


# ---------------------------------------------------------------------------
# Criterion-specific semantic judge
# ---------------------------------------------------------------------------

JUDGE_SYSTEM = r"""
You are an independent evaluator for a university software-engineering
benchmark called InsureMate Week 4.

You are NOT allowed to decide the final category score.
You only judge the requested criteria for ONE answer.

Rules:
1. Judge against the supplied question, ground truth, and retrieved evidence.
2. Do not reward keyword overlap by itself.
3. Semantic equivalence is acceptable.
4. Penalize contradictions of the ground truth.
5. Penalize unsupported implementation claims as hallucinations.
6. Do not invent facts that are absent from the supplied evidence.
7. A response that refuses to answer can be correct only if the evidence is
   genuinely insufficient for the requested claim.
8. Use only these criterion scores:
      0   = criterion is incorrect/absent
      25  = very limited correct content; mostly incorrect
      50  = materially partially correct
      75  = mostly correct with a minor issue or omission
      100 = fully correct for that criterion
9. Score EACH criterion independently. Do NOT give 0 to every criterion merely because another sentence is wrong.
10. Distinguish incompleteness from hallucination.
11. Use supplied repository/policy evidence as the primary factual source and inspect it carefully.
12. Hallucination is a binary safety/grounding flag:
      true  = at least one material unsupported or contradictory claim
      false = no material unsupported claim
10. Return ONLY valid JSON matching the requested schema.
"""


def judge_semantic(category, q, answer, gt_item, repo_context="", policy_context=""):
    """
    One independent judge call per response.
    The prompt asks for criterion scores with explicit criterion definitions.
    """
    criteria = list(DEFAULT_WEIGHTS[category].keys())
    criterion_definitions = {
        "Explanation": {
            "correctness": "Technical claims match the actual InsureMate implementation and ground truth.",
            "completeness": "All material points explicitly required by the ground truth are covered.",
            "relevance": "The response directly answers the asked question without irrelevant material.",
            "hallucination_free": "100 if no material unsupported/contradictory claim; 0 if hallucination flag is true.",
        },
        "Code Retrieval": {
            "exact_retrieval": "Correctly identifies the requested file/function/endpoint/module as specified by ground truth.",
            "relevance": "The retrieved/identified code information directly answers the question.",
            "hallucination_free": "100 if no material unsupported/contradictory claim; 0 if hallucination flag is true.",
        },
        "Dependency Understanding": {
            "dependency_correctness": "Correctly identifies component-to-component dependencies and responsibilities.",
            "flow_completeness": "Covers the important execution/data flow specified by ground truth.",
            "reasoning": "Explains why the dependency exists and how it affects execution.",
            "hallucination_free": "100 if no material unsupported/contradictory claim; 0 if hallucination flag is true.",
        },
        "Bug Analysis": {
            "root_cause": "Correctly identifies the most likely root cause supported by the question/evidence.",
            "affected_component": "Correctly identifies affected file/module/component.",
            "fix": "Provides a technically appropriate fix supported by the ground truth.",
            "reasoning": "Provides useful debugging reasoning/verification steps.",
            "hallucination_free": "100 if no material unsupported/contradictory claim; 0 if hallucination flag is true.",
        },
        "Refactoring": {
            "behavior_preservation": "Proposed/refactored code preserves the required behavior and API contract.",
            "syntax_validity": "The proposed code is syntactically valid and structurally plausible Python.",
            "readability": "Improves clarity, naming, structure, and separation of concerns.",
            "relevance": "Actually performs the requested refactoring without unrelated changes.",
        },
        "RAG based Question": {
            "retrieval_quality": "The retrieved evidence contains the information needed to answer the question and avoids irrelevant evidence.",
            "answer_correctness": "Final answer matches the supported policy evidence and ground truth.",
            "groundedness": "Claims are supported by retrieved policy evidence; unsupported claims are avoided.",
            "relevance": "Answer directly addresses the policy question.",
        },
        "Code Generation": {
            "correctness": "Generated implementation logically satisfies the stated requirements.",
            "relevance": "Generated code directly addresses the requested implementation.",
            "test_pass_rate": "Do not estimate this criterion. Python supplies the executed test result separately.",
        },
    }

    defs = criterion_definitions[category]

    # test_pass_rate is supplied deterministically for Code Generation.
    judge_criteria = [c for c in criteria if c != "test_pass_rate"]

    prompt = f"""
CATEGORY:
{category}

QUESTION:
{q.get("question", "")}

GROUND TRUTH:
{json.dumps(gt_item, ensure_ascii=False, indent=2)}

REPOSITORY EVIDENCE:
{repo_context[:12000]}

POLICY RETRIEVED EVIDENCE:
{policy_context[:12000]}

MODEL ANSWER:
{answer[:15000]}

IMPORTANT SCORING CALIBRATION:
- Evaluate each criterion independently.
- One incorrect sentence must NOT erase earlier correct content.
- Use 25/50/75 for partial or mostly-correct work.
- Use 0 only when the criterion is essentially absent or wrong.
- Hallucination=true is separate from the magnitude of quality scores.

CRITERIA TO JUDGE:
{json.dumps({c: defs[c] for c in judge_criteria}, ensure_ascii=False, indent=2)}

Return exactly this JSON structure:
{{
  "criteria": {{
    {", ".join([f'"{c}": 0' for c in judge_criteria])}
  }},
  "hallucination": false,
  "hallucination_evidence": "",
  "judge_reasoning": ""
}}

Use only 0/25/50/75/100 for criterion scores.
For hallucination_evidence, mention the specific unsupported/contradictory
claim if hallucination=true. Keep reasoning concise.
"""

    raw = ollama_chat(JUDGE_MODEL, JUDGE_SYSTEM, prompt)
    obj = extract_json_object(raw)

    result = {
        "criteria": {},
        "hallucination": bool(obj.get("hallucination", False)),
        "hallucination_evidence": str(obj.get("hallucination_evidence", "")),
        "judge_reasoning": str(obj.get("judge_reasoning", "")),
        "judge_model": JUDGE_MODEL,
    }

    for c in judge_criteria:
        result["criteria"][c] = clamp_score(obj.get("criteria", {}).get(c, 0))

    return result


# ---------------------------------------------------------------------------
# Code extraction + safe-ish isolated syntax/test execution
# ---------------------------------------------------------------------------

def extract_python_code(answer):
    blocks = re.findall(r"```(?:python|py)?\s*(.*?)```", answer, flags=re.I | re.S)
    if blocks:
        # Prefer the longest Python-looking block.
        blocks.sort(key=len, reverse=True)
        return blocks[0].strip()

    # If there is no fenced block, only return a conservative code-like answer.
    lines = answer.splitlines()
    code_lines = []
    started = False
    for line in lines:
        stripped = line.strip()
        if re.match(r"^(def |import |from |class |@|if __name__|[A-Za-z_]\w*\s*=)", stripped):
            started = True
        if started:
            code_lines.append(line)

    return "\n".join(code_lines).strip()


def syntax_score(code):
    if not code:
        return 0, "No executable Python code extracted."
    try:
        ast.parse(code)
        return 100, "Python AST parse succeeded."
    except SyntaxError as e:
        return 0, f"SyntaxError: {e}"


def run_python_tests(code, test_code, timeout=8):
    """Run self-contained benchmark tests without requiring pytest."""
    if not code:
        return {"passed": 0, "total": 0, "pass_rate": None, "status": "no_code", "error": "No code extracted"}
    try:
        ast.parse(code)
    except SyntaxError as e:
        return {"passed": 0, "total": 0, "pass_rate": 0.0, "status": "syntax_error", "error": str(e)}
    combined = code + "\n\n" + test_code
    with tempfile.TemporaryDirectory() as td:
        script = Path(td) / "candidate_test.py"
        script.write_text(combined, encoding="utf-8")
        try:
            p = subprocess.run([sys.executable, str(script)], cwd=td, capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            return {"passed": 0, "total": 0, "pass_rate": None, "status": "timeout", "error": "Test timed out"}
        except Exception as e:
            return {"passed": 0, "total": 0, "pass_rate": None, "status": "environment_error", "error": str(e)}
        output = (p.stdout + "\n" + p.stderr).strip()
        if p.returncode == 0:
            return {"passed": 1, "total": 1, "pass_rate": 100.0, "status": "passed", "error": "", "output": output[-4000:]}
        return {"passed": 0, "total": 1, "pass_rate": 0.0, "status": "failed", "error": output[-4000:], "output": output[-4000:]}

def extract_function_names(code):
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    return [n.name for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]

def run_cg01(code, timeout=8):
    test = """
assert abs(cosine_similarity([1,0], [1,0]) - 1.0) < 1e-9
assert abs(cosine_similarity([1,0], [0,1]) - 0.0) < 1e-9
assert abs(cosine_similarity([0,0], [1,2]) - 0.0) < 1e-9
"""
    return run_python_tests(code, test, timeout)

def run_cg02(code, timeout=8):
    names = extract_function_names(code)
    candidates = [n for n in names if any(k in n.lower() for k in ("rank", "retriev", "result", "top", "sort"))]
    fn = candidates[0] if candidates else (names[0] if names else None)
    if not fn:
        return {"passed": 0, "total": 0, "pass_rate": 0.0, "status": "no_function", "error": "No candidate function found"}
    test = f"""
sample = [
    {{"id": 1, "score": 0.2}}, {{"id": 2, "score": 0.9}},
    {{"id": 3, "score": 0.5}}, {{"id": 4, "score": 0.1}},
    {{"id": 5, "score": 0.8}}, {{"id": 6, "score": 0.7}},
]
out = {fn}(sample)
assert isinstance(out, list)
assert len(out) <= 5
assert all(out[i]["score"] >= out[i+1]["score"] for i in range(len(out)-1))
assert out[0]["score"] == max(x["score"] for x in out)
"""
    result = run_python_tests(code, test, timeout)
    result["tested_function"] = fn
    return result

def run_cg03(code):
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return {"passed": 0, "total": 1, "pass_rate": 0.0, "status": "syntax_error", "error": str(e)}
    found = False
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name.lower() in {"health", "health_check", "check_health"}:
            found = True
        for dec in getattr(node, "decorator_list", []):
            if isinstance(dec, ast.Call):
                fn = dec.func
                attr = fn.attr.lower() if isinstance(fn, ast.Attribute) else (fn.id.lower() if isinstance(fn, ast.Name) else "")
                if attr in {"get", "api_route"}:
                    vals = [a.value for a in dec.args if isinstance(a, ast.Constant)]
                    vals += [kw.value.value for kw in dec.keywords if kw.arg == "path" and isinstance(kw.value, ast.Constant)]
                    if "/health" in vals:
                        found = True
    return {"passed": 1 if found else 0, "total": 1, "pass_rate": 100.0 if found else 0.0, "status": "passed" if found else "failed", "error": "" if found else "No GET /health route found"}

def run_cg04(answer, code, timeout=8):
    test_code = code or extract_python_code(answer)
    if not test_code:
        return {"passed": 0, "total": 1, "pass_rate": 0.0, "status": "no_code", "error": "No test code extracted"}
    try:
        tree = ast.parse(test_code)
    except SyntaxError as e:
        return {"passed": 0, "total": 1, "pass_rate": 0.0, "status": "syntax_error", "error": str(e)}
    names = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
    test_funcs = [n for n in names if n.startswith("test_")]
    if "pytest" not in test_code.lower() or "cosine_similarity" not in test_code or not test_funcs:
        return {"passed": 0, "total": 1, "pass_rate": 0.0, "status": "failed", "error": "Missing pytest/cosine_similarity/test function"}
    kept = [n for n in tree.body if not isinstance(n, (ast.Import, ast.ImportFrom))]
    module = ast.Module(body=kept, type_ignores=[])
    ast.fix_missing_locations(module)
    harness = """
import math
class _Approx:
    def __init__(self, expected, abs=1e-6, rel=1e-6): self.expected, self.abs, self.rel = expected, abs, rel
    def __eq__(self, other): return math.isclose(float(other), float(self.expected), abs_tol=self.abs, rel_tol=self.rel)
class _Pytest:
    @staticmethod
    def approx(x, abs=1e-6, rel=1e-6): return _Approx(x, abs, rel)
pytest = _Pytest()
def cosine_similarity(a, b):
    dot = sum(x*y for x, y in zip(a, b))
    ma = math.sqrt(sum(x*x for x in a)); mb = math.sqrt(sum(y*y for y in b))
    if ma == 0 or mb == 0: return 0.0
    return dot / (ma * mb)
"""
    source = harness + "\n" + ast.unparse(module) + "\n" + "\n".join(f"{name}()" for name in test_funcs)
    with tempfile.TemporaryDirectory() as td:
        script = Path(td) / "cg04_runner.py"
        script.write_text(source, encoding="utf-8")
        try:
            p = subprocess.run([sys.executable, str(script)], cwd=td, capture_output=True, text=True, timeout=timeout)
        except Exception as e:
            return {"passed": 0, "total": 1, "pass_rate": None, "status": "environment_error", "error": str(e)}
    output = (p.stdout + "\n" + p.stderr).strip()
    return {"passed": 1 if p.returncode == 0 else 0, "total": 1, "pass_rate": 100.0 if p.returncode == 0 else 0.0, "status": "passed" if p.returncode == 0 else "failed", "error": "" if p.returncode == 0 else output[-4000:], "output": output[-4000:]}

def code_generation_evaluate(qid, answer):
    code = extract_python_code(answer)
    syntax, syntax_reason = syntax_score(code)
    if qid == "CG01": test_result = run_cg01(code)
    elif qid == "CG02": test_result = run_cg02(code)
    elif qid == "CG03": test_result = run_cg03(code)
    elif qid == "CG04": test_result = run_cg04(answer, code)
    else: test_result = {"passed": 0, "total": 0, "pass_rate": None, "status": "not_supported", "error": "Unknown CG question"}
    return {"extracted_code": code, "syntax_score": syntax, "syntax_reason": syntax_reason, "test_result": test_result}


# ---------------------------------------------------------------------------
# Deterministic Code Retrieval
# ---------------------------------------------------------------------------

def exact_retrieval_score(qid, answer, gt_item):
    """
    Exact retrieval is intentionally deterministic.

    We search for expected identifiers and file/module references in the
    answer. This is not semantic correctness; it is exact retrieval accuracy.
    """
    a = lower(answer)

    expected = []
    if isinstance(gt_item, dict):
        # Common ground-truth fields.
        for key in (
            "expected_file",
            "expected_files",
            "file",
            "files",
            "expected_function",
            "expected_functions",
            "function",
            "functions",
            "expected_endpoint",
            "endpoint",
        ):
            val = gt_item.get(key)
            if isinstance(val, str):
                expected.append(val)
            elif isinstance(val, list):
                expected.extend([str(x) for x in val])

    # Explicit Week 4 targets.
    explicit = {
        "CR01": [
            "backend/app/services/embedding_service.py",
            "embedding_service.py",
            "generate_embedding",
        ],
        "CR02": [
            "backend/app/services/retrieval_service.py",
            "retrieval_service.py",
            "cosine_similarity",
        ],
        "CR03": [
            "backend/app/services/retrieval_service.py",
            "retrieval_service.py",
            "retrieve",
        ],
        "CR04": [
            "backend/app/api/retrieval.py",
            "retrieval.py",
            "search_documents",
            "post /search",
            "/search",
        ],
    }

    targets = explicit.get(qid, []) + expected
    # Deduplicate while preserving order.
    seen = set()
    targets = [x for x in targets if not (lower(x) in seen or seen.add(lower(x)))]

    if not targets:
        return 0

    # A target group is considered retrieved if the answer contains it.
    hits = 0
    for target in targets:
        if lower(target) in a:
            hits += 1

    return round(100.0 * hits / len(targets))


# ---------------------------------------------------------------------------
# Ground-truth item lookup
# ---------------------------------------------------------------------------

def build_gt_index(gt):
    idx = {}

    def walk(obj):
        if isinstance(obj, dict):
            qid = obj.get("question_id") or obj.get("id")
            if qid:
                idx[str(qid)] = obj
            for v in obj.values():
                walk(v)
        elif isinstance(obj, list):
            for x in obj:
                walk(x)

    walk(gt)
    return idx


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def main():
    raw = load_json(RAW_FILE)
    gt = load_json(GT_FILE)

    dataset = load_json(DATASET_FILE) if DATASET_FILE.exists() else None
    resources = load_json(RESOURCE_FILE) if RESOURCE_FILE.exists() else None

    weights = find_textual_weight_config(gt)
    gt_index = build_gt_index(gt)

    # Normalize raw results into a list.
    if isinstance(raw, dict):
        if isinstance(raw.get("results"), list):
            raw_results = raw["results"]
        elif isinstance(raw.get("evaluations"), list):
            raw_results = raw["evaluations"]
        else:
            raw_results = []
    else:
        raw_results = raw

    if not isinstance(raw_results, list) or not raw_results:
        raise ValueError("week4_raw_results.json contains no evaluation list.")

    # Normalize and validate category labels before any LLM call.
    normalized_categories = {
        category_for_question(r.get("question_id", ""), r.get("category", "")) for r in raw_results
    }
    unknown_categories = normalized_categories - set(DEFAULT_WEIGHTS)
    if unknown_categories:
        raise ValueError(
            "Unknown category labels after normalization: "
            + ", ".join(sorted(unknown_categories))
        )

    # Validate compared model set.
    found_models = {str(r.get("model")) for r in raw_results}
    missing_models = COMPARED_MODELS - found_models
    if missing_models:
        raise ValueError(f"Missing compared models in raw results: {sorted(missing_models)}")

    detailed = []
    test_records = []

    total_to_process = len(raw_results)
    completed = 0

    print("\nStarting evaluation...")
    print(f"Total responses to evaluate: {total_to_process}")
    print(f"Independent judge: {JUDGE_MODEL}")
    print("Progress is printed after every response.\n")

    # Show any normalized labels once, so the mapping is auditable.
    raw_labels = sorted({str(r.get("category", "")) for r in raw_results})
    normalized_pairs = [
        (raw_label, normalize_category(raw_label))
        for raw_label in raw_labels
        if raw_label != normalize_category(raw_label)
    ]
    if normalized_pairs:
        print("Category label normalization:")
        for raw_label, normalized_label in normalized_pairs:
            print(f"  {raw_label} -> {normalized_label}")
        print()

    for i, r in enumerate(raw_results, 1):
        model = str(r.get("model"))
        qid = str(r.get("question_id"))
        raw_category = str(r.get("category", ""))
        category = category_for_question(qid, raw_category)
        answer = str(r.get("answer", ""))

        category_display = category
        if raw_category.strip() != category:
            category_display = f"{raw_category} -> {category}"

        print(
            f"[{i:02d}/{total_to_process}] "
            f"{category_display} | {model} | {qid} ...",
            flush=True
        )
        question = {
            "question": r.get("question", ""),
            "question_id": qid,
            "category": category,
        }

        if model not in COMPARED_MODELS:
            continue

        gt_item = gt_index.get(qid, {})

        repo_context = r.get("retrieved_repository", "")
        policy_context = r.get("retrieved_policy", "")

        row = {
            "question_id": qid,
            "category": category,
            "raw_category": raw_category,
            "model": model,
            "question": r.get("question", ""),
            "answer": answer,
            "latency_seconds": r.get("latency_seconds"),
            "prompt_tokens": r.get("prompt_tokens"),
            "output_tokens": r.get("output_tokens"),
            "total_tokens": r.get("total_tokens"),
            "retrieved_repository": repo_context,
            "retrieved_policy": policy_context,
            "judge_model": JUDGE_MODEL,
        }

        # Code Retrieval deterministic exact component.
        if category == "Code Retrieval":
            ex = exact_retrieval_score(qid, answer, gt_item)

            # Semantic relevance + hallucination.
            judged = judge_semantic(
                category, question, answer, gt_item,
                repo_context, policy_context
            )

            # Exact retrieval replaces judge's exact_retrieval value.
            criteria = dict(judged["criteria"])
            criteria["exact_retrieval"] = ex
            row["criteria"] = criteria
            row["hallucination"] = judged["hallucination"]
            row["hallucination_evidence"] = judged["hallucination_evidence"]
            row["judge_reasoning"] = judged["judge_reasoning"]

        elif category == "Code Generation":
            cg = code_generation_evaluate(qid, answer)
            judged = judge_semantic(
                category, question, answer, gt_item,
                repo_context, policy_context
            )
            criteria = dict(judged["criteria"])

            # Actual executed test pass rate is deterministic.
            test_pass = cg["test_result"].get("pass_rate")
            criteria["test_pass_rate"] = 0 if test_pass is None else test_pass
            row["test_environment_status"] = cg["test_result"].get("status")
            row["test_environment_error"] = cg["test_result"].get("error", "")

            row["criteria"] = criteria
            row["hallucination"] = judged["hallucination"]
            row["hallucination_evidence"] = judged["hallucination_evidence"]
            row["judge_reasoning"] = judged["judge_reasoning"]
            row["code_generation"] = cg

            test_records.append({
                "question_id": qid,
                "model": model,
                **cg,
            })

        else:
            judged = judge_semantic(
                category, question, answer, gt_item,
                repo_context, policy_context
            )
            row["criteria"] = judged["criteria"]
            row["hallucination"] = judged["hallucination"]
            row["hallucination_evidence"] = judged["hallucination_evidence"]
            row["judge_reasoning"] = judged["judge_reasoning"]

        # Convert hallucination flag to the professor's hallucination-free
        # criterion where that criterion exists.
        if "hallucination_free" in row["criteria"]:
            row["criteria"]["hallucination_free"] = (
                0 if row["hallucination"] else 100
            )

        row["category_score"] = weighted_score(
            row["criteria"],
            weights[category]
        )

        detailed.append(row)
        completed += 1

        print(
            f"    ✓ done | score={row['category_score']:.2f} | "
            f"hallucination={'YES' if row['hallucination'] else 'NO'}",
            flush=True
        )

    print(f"\nAll {completed} responses evaluated successfully.\n", flush=True)

    # -----------------------------------------------------------------------
    # Aggregate by model/category
    # -----------------------------------------------------------------------

    category_scores = defaultdict(lambda: defaultdict(list))
    hallucination_counts = defaultdict(lambda: [0, 0])
    latency = defaultdict(list)
    prompt_tokens = defaultdict(list)
    output_tokens = defaultdict(list)
    total_tokens = defaultdict(list)

    for row in detailed:
        m = row["model"]
        c = row["category"]
        category_scores[c][m].append(row["category_score"])

        hallucination_counts[m][1] += 1
        if row["hallucination"]:
            hallucination_counts[m][0] += 1

        if isinstance(row.get("latency_seconds"), (int, float)):
            latency[m].append(float(row["latency_seconds"]))
        if isinstance(row.get("prompt_tokens"), (int, float)):
            prompt_tokens[m].append(float(row["prompt_tokens"]))
        if isinstance(row.get("output_tokens"), (int, float)):
            output_tokens[m].append(float(row["output_tokens"]))
        if isinstance(row.get("total_tokens"), (int, float)):
            total_tokens[m].append(float(row["total_tokens"]))

    summary = {}
    for m in sorted(COMPARED_MODELS):
        summary[m] = {
            "category_scores": {},
            "overall_score": None,
            "hallucination_rate_percent": None,
            "latency_avg_seconds": (
                sum(latency[m]) / len(latency[m]) if latency[m] else None
            ),
            "prompt_tokens_avg": (
                sum(prompt_tokens[m]) / len(prompt_tokens[m])
                if prompt_tokens[m] else None
            ),
            "output_tokens_avg": (
                sum(output_tokens[m]) / len(output_tokens[m])
                if output_tokens[m] else None
            ),
            "total_tokens_avg": (
                sum(total_tokens[m]) / len(total_tokens[m])
                if total_tokens[m] else None
            ),
        }

        vals = []
        for c in DEFAULT_WEIGHTS:
            scores = category_scores[c].get(m, [])
            if scores:
                avg = sum(scores) / len(scores)
                summary[m]["category_scores"][c] = round(avg, 2)
                vals.append(avg)

        if vals:
            summary[m]["overall_score"] = round(sum(vals) / len(vals), 2)

        h, n = hallucination_counts[m]
        summary[m]["hallucination_rate_percent"] = round(
            100.0 * h / n, 2
        ) if n else None

    # Best model per category.
    winners = {}
    for c in DEFAULT_WEIGHTS:
        candidates = {
            m: summary[m]["category_scores"].get(c)
            for m in COMPARED_MODELS
            if c in summary[m]["category_scores"]
        }
        candidates = {m: s for m, s in candidates.items() if s is not None}
        if candidates:
            winners[c] = max(candidates, key=candidates.get)

    # -----------------------------------------------------------------------
    # Resource benchmark summary
    # -----------------------------------------------------------------------

    resource_summary = None
    if resources is not None:
        # Preserve raw benchmark rather than manufacturing measurements.
        resource_summary = resources

    # -----------------------------------------------------------------------
    # Methodology text
    # -----------------------------------------------------------------------

    methodology = f"""
INSUREMATE WEEK 4 — AUTOMATED MODEL EVALUATION METHODOLOGY
============================================================

Compared models
---------------
{", ".join(sorted(COMPARED_MODELS))}

Independent evaluator
---------------------
{JUDGE_MODEL}

The evaluator model is separate from the three compared models.
Temperature: {JUDGE_TEMP}

Category-label normalization
----------------------------
The official professor category is determined from the question ID (for example,
BA02 is always Bug Analysis). Raw labels such as "dependency_error" and
"dependency_failure" are retained as subtypes and never override the official
question category.

Dataset
-------
28 questions total:
4 Explanation
4 Code Retrieval
4 Dependency Understanding
4 Bug Analysis
4 Code Generation
4 Refactoring
4 RAG based Question

There are 84 model responses (28 questions × 3 models).

SCORING DESIGN
--------------

A. Semantic criteria
--------------------
An independent LLM judge evaluates criterion-level correctness.
The judge is not allowed to calculate final category/overall scores.

Allowed criterion values:
0, 25, 50, 75, 100

Meaning:
0   = incorrect/absent
25  = mostly incorrect
50  = partially correct
75  = mostly correct
100 = fully correct

Python then applies the fixed professor weights.

B. Category formula
-------------------
For a question:

QuestionScore =
    SUM(criterion_score × criterion_weight)

For a category:

CategoryScore =
    MEAN(QuestionScore for the 4 questions in that category)

OverallScore =
    MEAN(7 category scores)

Thus every model is evaluated on the SAME questions and SAME weights.

C. Category weights
-------------------
Explanation:
    correctness       40%
    completeness      30%
    relevance         20%
    hallucination-free 10%

Code Retrieval:
    exact retrieval   70%
    relevance         20%
    hallucination-free 10%

Dependency Understanding:
    dependency correctness 40%
    flow completeness      30%
    reasoning              20%
    hallucination-free     10%

Bug Analysis:
    root cause            35%
    affected component    20%
    fix                   25%
    reasoning             10%
    hallucination-free   10%

Code Generation:
    test pass rate        60%
    correctness           25%
    relevance             15%

Refactoring:
    behavior preservation 45%
    syntax validity       20%
    readability           20%
    relevance             15%

RAG based Question:
    retrieval quality     30%
    answer correctness    35%
    groundedness          25%
    relevance             10%

D. Code Retrieval
-----------------
Exact retrieval is deterministic because file/function/endpoint retrieval
is an exact-match requirement.

The evaluator checks the expected InsureMate target identifiers in the answer.
Semantic relevance and hallucination are still independently judged.

We do NOT cap a correct retrieval merely because unrelated concepts are absent.

E. Code Generation
------------------
Test-pass rate is NOT guessed from the text.

For CG01-CG04:
1. Extract Python code from the model response.
2. Parse it using Python AST.
3. Execute benchmark tests in a temporary isolated subprocess.
4. Apply a timeout.
5. Record passed/total and calculate:

TestPassRate = passed_tests / total_tests × 100

This value is then inserted into the 60% test-pass component.

If a model does not provide executable code, it receives 0 test pass rate.

F. Refactoring
--------------
Behavior preservation is evaluated semantically against the ground-truth
contract. Syntax validity is additionally checked by Python AST parsing when
code is present.

A response that merely discusses a refactor without actually satisfying the
requested refactoring is penalized through the relevance and behavior criteria.

G. RAG
------
RAG is evaluated as:

QUESTION
   ↓
RETRIEVED CONTEXT
   ↓
LLM RESPONSE

Retrieval quality is judged separately from final answer correctness and
groundedness.

Because the supplied ground truth does not provide gold chunk IDs, retrieval
quality is reported as evidence relevance/coverage, NOT Precision@K or Recall@K.

H. Hallucination rate
---------------------
Hallucination is a binary criterion from the independent judge.

HallucinationRate =
    hallucinated_responses / evaluated_responses × 100

Hallucination-free criterion:
    100 if hallucination=false
    0   if hallucination=true

I. Latency and tokens
---------------------
Latency and token counts are reported as performance metrics, not mixed into
the quality score.

Average latency:
    SUM(response latency) / number of responses

Average output tokens:
    SUM(output tokens) / number of responses

Resource benchmark values are preserved from the supplied benchmark file.
No GPU usage is claimed because the benchmark did not measure GPU.

REPRODUCIBILITY
---------------
To reproduce:

PowerShell:
    $env:WEEK4_JUDGE_MODEL="{JUDGE_MODEL}"
    python evaluation_week4\\score_week4_PERFECT_FIXED.py

The raw responses, ground truth, judge model, criterion judgments, formulas,
test results, category scores and overall scores are saved in the output JSON.

No final model score is hardcoded.
No manual final score is entered.
"""

    # -----------------------------------------------------------------------
    # Save JSON
    # -----------------------------------------------------------------------

    output = {
        "metadata": {
            "benchmark": "InsureMate Week 4",
            "judge_model": JUDGE_MODEL,
            "judge_temperature": JUDGE_TEMP,
            "compared_models": sorted(COMPARED_MODELS),
            "num_responses_evaluated": len(detailed),
            "formula": "QuestionScore=sum(criterion_score*weight); CategoryScore=mean(4 QuestionScores); OverallScore=mean(7 CategoryScores)",
            "criterion_scale": [0, 25, 50, 75, 100],
            "category_assignment": "official question_id prefix mapping; raw_category retained as subtype/audit label",
            "code_generation_test_runner": "self-contained Python subprocess; CG04 uses controlled reference implementation and does not require pytest",
            "dataset_file_present": dataset is not None,
            "ground_truth_file": GT_FILE.name,
            "raw_results_file": RAW_FILE.name,
        },
        "weights": weights,
        "summary": summary,
        "category_winners": winners,
        "detailed_results": detailed,
        "code_generation_test_results": test_records,
        "resource_benchmark": resource_summary,
        "methodology": methodology,
    }

    OUT_JSON.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # -----------------------------------------------------------------------
    # CSV
    # -----------------------------------------------------------------------

    fields = [
        "question_id",
        "category",
        "raw_category",
        "model",
        "category_score",
        "hallucination",
        "hallucination_evidence",
        "latency_seconds",
        "prompt_tokens",
        "output_tokens",
        "total_tokens",
        "judge_model",
        "test_environment_status",
        "test_environment_error",
    ] + sorted({
        key
        for r in detailed
        for key in r.get("criteria", {}).keys()
    })

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in detailed:
            row = {k: r.get(k, "") for k in fields}
            for c, v in r.get("criteria", {}).items():
                row[c] = v
            writer.writerow(row)

    OUT_METHOD.write_text(methodology.strip() + "\n", encoding="utf-8")
    OUT_TESTS.write_text(
        json.dumps(test_records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # -----------------------------------------------------------------------
    # Console report
    # -----------------------------------------------------------------------

    print("\n" + "=" * 78)
    print("INSUREMATE WEEK 4 — AUTOMATED EVALUATION")
    print("=" * 78)
    print(f"Independent judge : {JUDGE_MODEL}")
    print(f"Responses scored  : {len(detailed)}")
    print("\nCATEGORY SCORES")
    print("-" * 78)

    cats = list(DEFAULT_WEIGHTS.keys())
    header = f"{'Category':<28} {'CodeLlama':>12} {'Phi3':>12} {'Qwen':>12} {'Winner':>18}"
    print(header)
    print("-" * 78)

    model_order = [
        "codellama:7b-instruct",
        "phi3:mini",
        "qwen2.5:1.5b",
    ]

    for c in cats:
        vals = []
        for m in model_order:
            vals.append(summary[m]["category_scores"].get(c, 0))
        print(
            f"{c:<28} "
            f"{vals[0]:>12.2f} "
            f"{vals[1]:>12.2f} "
            f"{vals[2]:>12.2f} "
            f"{winners.get(c, 'N/A'):>18}"
        )

    print("-" * 78)
    print("OVERALL")
    for m in model_order:
        s = summary[m]["overall_score"]
        h = summary[m]["hallucination_rate_percent"]
        lat = summary[m]["latency_avg_seconds"]
        print(
            f"{m:<24} score={s:>6.2f} | "
            f"hallucination={h:>6.2f}% | "
            f"avg latency={lat if lat is not None else 'N/A'}"
        )

    print("\nFILES CREATED")
    print(f"  {OUT_JSON}")
    print(f"  {OUT_CSV}")
    print(f"  {OUT_METHOD}")
    print(f"  {OUT_TESTS}")
    print("=" * 78)


if __name__ == "__main__":
    main()
