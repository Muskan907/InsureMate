# InsureMate Week 5 — Guardrails & AI Output Testing

## Guardrail architecture

`User Input → Input Guardrails → Retrieval → Evidence Sufficiency → LLM → Output Validator → Accepted Answer / Safe Refusal`

### Input guardrails
- Empty input rejection
- 500-character maximum
- Control-character rejection
- Prompt-injection pattern detection
- Insurance-domain scope detection

### Evidence guardrail
The existing retrieval confidence/relevance gate remains in the pipeline. If retrieved evidence is not sufficiently relevant, the LLM is not allowed to produce a policy answer; the API returns the controlled fallback.

### Output guardrails
- Empty output rejection
- Output-length limit
- Prompt/instruction leakage detection
- Evidence-overlap grounding sanity check
- Existing Phi-3 semantic validator is fail-closed: `VALID` is required; ambiguous/error results are rejected.

## Controlled fallback

`The available insurance documents do not contain enough information to answer this question.`

## Test methodology

The test set contains valid, out-of-scope, prompt-injection, oversized, empty, and insufficient-evidence requests. Each test has an expected behavior (`ANSWER` or `REFUSE`). The runner calls the live `/api/chat` endpoint and checks HTTP status, guardrail decision, answer presence, refusal behavior, and final validation state.

`Effectiveness = passed tests / total tests × 100`

A refusal test passes when the request is blocked by an input guardrail or ends in the controlled refusal. A valid-answer test passes when the API returns a non-empty answer that is accepted by the output validation layer.
