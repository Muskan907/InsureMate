// import React, { useEffect, useMemo, useState } from "react";

// const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

// const MODELS = [
//   { id: "codellama:7b-instruct", name: "CodeLlama 7B" },
//   { id: "phi3:mini", name: "Phi-3 Mini" },
//   { id: "qwen2.5:1.5b", name: "Qwen 2.5 1.5B" }
// ];

// const retrievalSignals = { RAG01: 40, RAG02: 100, RAG03: 60, RAG04: 100 };

// function pct(v) {
//   return typeof v === "number" ? `${v.toFixed(2)}%` : "—";
// }

// function scoreClass(v) {
//   if (v >= 80) return "good";
//   if (v >= 50) return "mid";
//   return "low";
// }

// function Week4ExercisesPage() {
//   const [summary, setSummary] = useState(null);
//   const [ragTraces, setRagTraces] = useState([]);
//   const [repoCases, setRepoCases] = useState([]);
//   const [repoIndex, setRepoIndex] = useState(null);
//   const [selectedRag, setSelectedRag] = useState("RAG01");
//   const [selectedRagModel, setSelectedRagModel] = useState("qwen2.5:1.5b");
//   const [selectedCase, setSelectedCase] = useState("REPO01");
//   const [repoModel, setRepoModel] = useState("qwen2.5:1.5b");
//   const [repoResult, setRepoResult] = useState(null);
//   const [loadingRepo, setLoadingRepo] = useState(false);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     Promise.all([
//       fetch(`${API_URL}/api/week4/summary`).then(r => r.json()),
//       fetch(`${API_URL}/api/week4/rag-traces`).then(r => r.json()),
//       fetch(`${API_URL}/api/week4/repository/cases`).then(r => r.json()),
//       fetch(`${API_URL}/api/week4/repository/index`).then(r => r.ok ? r.json() : null).catch(() => null)
//     ])
//       .then(([s, r, c, i]) => {
//         setSummary(s);
//         setRagTraces(r.traces || []);
//         setRepoCases(c.cases || []);
//         setRepoIndex(i);
//       })
//       .catch(err => setError(`Unable to load Week 4 evidence: ${err.message}`));
//   }, []);

//   const modelRows = useMemo(() => {
//     if (!summary?.summary) return [];
//     return MODELS.map(m => {
//       const x = summary.summary[m.id] || {};
//       const resource = summary.resource_benchmark?.[m.id] || {};
//       return {
//         ...m,
//         score: x.overall_score,
//         hallucination: x.hallucination_rate_percent,
//         latency: x.avg_latency_seconds,
//         ram: resource.avg_ram_change_mb,
//         prompt: resource.avg_prompt_tokens,
//         output: resource.avg_output_tokens
//       };
//     });
//   }, [summary]);

//   const categories = useMemo(() => {
//     if (!summary?.category_winners) return [];
//     return Object.entries(summary.category_winners).map(([category, winner]) => {
//       const scores = MODELS.reduce((acc, m) => {
//         const row = summary.summary?.[m.id]?.category_scores || {};
//         acc[m.id] = row[category];
//         return acc;
//       }, {});
//       const winnerName = MODELS.find(m => m.id === winner)?.name || winner;
//       return { category, winner, winnerName, scores };
//     });
//   }, [summary]);

//   const currentRag = ragTraces.find(
//     x => x.question_id === selectedRag && x.model === selectedRagModel
//   );

//   const ragQuestions = [...new Set(ragTraces.map(x => x.question_id))];

//   const runRepoCase = async () => {
//     setLoadingRepo(true);
//     setError("");
//     try {
//       const response = await fetch(`${API_URL}/api/week4/repository/case`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ case_id: selectedCase, model: repoModel, top_k: 5 })
//       });
//       const data = await response.json();
//       if (!response.ok) throw new Error(data.detail || "Repository request failed");
//       setRepoResult(data);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoadingRepo(false);
//     }
//   };

//   if (!summary) {
//     return <div className="evaluation-page"><div className="evaluation-card"><h2>Loading Week 4 experiments…</h2><p>{error}</p></div></div>;
//   }

//   return (
//     <div className="evaluation-page" style={{ paddingBottom: 80 }}>
//       <header className="topbar">
//         <div>
//           <p className="eyebrow">WEEK 4 · EXERCISES 4–6</p>
//           <h1>Experimental Evidence Lab</h1>
//           <p className="subtitle">
//             Live evidence from the completed model evaluation, the existing RAG pipeline, and repository-level code understanding.
//           </p>
//         </div>
//         <div className="evaluation-badge">✓ RESULTS + LIVE TRACE</div>
//       </header>

//       {error && <div className="evaluation-card" style={{ borderColor: "#ef4444" }}><strong>ERROR</strong><p>{error}</p></div>}

//       <section className="evaluation-summary">
//         <div className="evaluation-stat"><span>MODELS</span><strong>3</strong><small>same benchmark</small></div>
//         <div className="evaluation-stat"><span>QUESTIONS</span><strong>28</strong><small>84 model evaluations</small></div>
//         <div className="evaluation-stat"><span>BEST SCORE</span><strong>{pct(Math.max(...modelRows.map(x => x.score || 0)))}</strong><small>Qwen 2.5 1.5B</small></div>
//         <div className="evaluation-stat highlight"><span>FASTEST</span><strong>{Math.min(...modelRows.map(x => x.latency || Infinity)).toFixed(2)}s</strong><small>Qwen average</small></div>
//       </section>

//       <section className="evaluation-insight">
//         <div className="insight-icon">★</div>
//         <div>
//           <h2>Exercise 4 — Quantitative conclusion</h2>
//           <p>
//             Qwen has the highest overall rubric score ({pct(modelRows.find(x => x.id === "qwen2.5:1.5b")?.score)}), the lowest hallucination rate ({pct(modelRows.find(x => x.id === "qwen2.5:1.5b")?.hallucination)}) and the lowest latency ({modelRows.find(x => x.id === "qwen2.5:1.5b")?.latency?.toFixed(2)}s). Phi-3 remains stronger for code retrieval and dependency understanding. This is a measurable quality–latency trade-off, not a visual preference.
//           </p>
//         </div>
//       </section>

//       <section className="evaluation-card">
//         <div className="evaluation-section-heading"><div><p className="eyebrow">EXERCISE 4</p><h2>Model comparison</h2><p>Overall rubric score, hallucination, latency and resource benchmark.</p></div></div>
//         <div className="evaluation-table-wrap">
//           <table className="evaluation-table">
//             <thead><tr><th>MODEL</th><th>QUALITY SCORE</th><th>HALLUCINATION</th><th>AVG LATENCY</th><th>RAM Δ*</th><th>PROMPT TOKENS</th><th>OUTPUT TOKENS</th></tr></thead>
//             <tbody>{modelRows.map(x => <tr key={x.id}><td><strong>{x.name}</strong></td><td><strong>{pct(x.score)}</strong></td><td>{pct(x.hallucination)}</td><td>{x.latency?.toFixed(2)}s</td><td>{x.ram?.toFixed(2)} MB</td><td>{x.prompt?.toFixed(2)}</td><td>{x.output?.toFixed(2)}</td></tr>)}</tbody>
//           </table>
//         </div>
//         <p style={{ marginTop: 14, fontSize: 13, opacity: .72 }}>* RAM/CPU values are process-level benchmark measurements from 7 representative samples; GPU was not measured. They should not be interpreted as whole-system Ollama resource usage.</p>
//       </section>

//       <section className="evaluation-card">
//         <div className="evaluation-section-heading"><div><p className="eyebrow">CATEGORY WINNERS</p><h2>Where does each model win?</h2></div></div>
//         <div className="evaluation-table-wrap">
//           <table className="evaluation-table"><thead><tr><th>CATEGORY</th><th>CODELLAMA</th><th>PHI-3</th><th>QWEN</th><th>WINNER</th></tr></thead><tbody>
//             {categories.map(row => <tr key={row.category}><td>{row.category}</td>{MODELS.map(m => <td key={m.id}><span className={`score-pill ${scoreClass(row.scores[m.id] || 0)}`}>{row.scores[m.id] == null ? "—" : row.scores[m.id].toFixed(2)}</span></td>)}<td><strong>{row.winnerName}</strong></td></tr>)}
//           </tbody></table>
//         </div>
//         <div className="evaluation-conclusion">
//           <strong>Interpretation:</strong> Qwen wins the broadest set of categories, while Phi-3 wins the repository-oriented retrieval/dependency categories. CodeLlama's 25.00% hallucination rate and 54.17s average latency are the weakest overall efficiency indicators in this run.
//         </div>
//       </section>

//       <section className="evaluation-card">
//         <div className="evaluation-section-heading"><div><p className="eyebrow">CODE GENERATION</p><h2>Actual executable test evidence</h2><p>These results come from the generated-code test runner, not from the LLM judge alone.</p></div></div>
//         <div className="evaluation-table-wrap"><table className="evaluation-table"><thead><tr><th>MODEL</th><th>CG01</th><th>CG02</th><th>CG03</th><th>CG04</th></tr></thead><tbody>
//           {MODELS.map(m => <tr key={m.id}><td><strong>{m.name}</strong></td>{["CG01","CG02","CG03","CG04"].map(q => { const t=summary.code_generation_tests?.find(x=>x.model===m.id && x.question_id===q); const r=t?.test_result||{}; return <td key={q}>{r.status === "passed" ? "✓ PASS" : r.status === "no_code" ? "— NO CODE" : `✗ ${r.pass_rate == null ? 0 : r.pass_rate}%`}</td>})}</tr>)}
//         </tbody></table></div>
//         <div className="evaluation-conclusion"><strong>Important:</strong> test-pass rate is kept separate from semantic quality scoring. A model can receive partial rubric credit while still failing executable behavior.</div>
//       </section>

//       <section className="evaluation-card">
//         <div className="evaluation-section-heading"><div><p className="eyebrow">EXERCISE 5 · EXISTING WEEK-3 RAG</p><h2>Question → Retrieved Context → LLM Response</h2><p>Inspect the actual retrieved policy chunks and the answer produced from them.</p></div></div>
//         <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
//           <select value={selectedRag} onChange={e => setSelectedRag(e.target.value)} style={{ padding: 10, borderRadius: 8 }}>{ragQuestions.map(q => <option key={q}>{q}</option>)}</select>
//           <select value={selectedRagModel} onChange={e => setSelectedRagModel(e.target.value)} style={{ padding: 10, borderRadius: 8 }}>{MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
//         </div>
//         {currentRag && <>
//           <div className="evaluation-insight"><div><strong>QUESTION</strong><p>{currentRag.question}</p></div></div>
//           <h3>1. Retrieved context</h3>
//           <div style={{ display: "grid", gap: 12 }}>{currentRag.retrieved_policy.map((c,i) => <div key={`${c.chunk_id}-${i}`} style={{ padding: 15, border: "1px solid #e5e7eb", borderRadius: 12 }}><strong>#{i+1} {c.document}</strong><span style={{ marginLeft: 8 }}>Page {c.page} · Chunk {c.chunk_id} · similarity {c.score}</span><p style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{c.text}</p></div>)}</div>
//           <h3 style={{ marginTop: 22 }}>2. LLM response</h3>
//           <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, whiteSpace: "pre-wrap" }}>{currentRag.answer}</div>
//           <h3 style={{ marginTop: 22 }}>3. Retrieval → Context → Response analysis</h3>
//           <div className="evaluation-table-wrap"><table className="evaluation-table"><tbody>
//             <tr><td><strong>Retrieval quality signal</strong></td><td>{currentRag.retrieval_quality_signal}% ({Math.round((currentRag.retrieval_quality_signal || 0)/20)}/5 reviewed relevant chunks)</td></tr>
//             <tr><td><strong>Context quality</strong></td><td>{currentRag.retrieval_quality_signal === 100 ? "All selected chunks reviewed as relevant" : "Relevant evidence was retrieved, but some top-K context was not the strongest evidence"}</td></tr>
//             <tr><td><strong>Answer score</strong></td><td>{currentRag.category_score?.toFixed(2)}%</td></tr>
//             <tr><td><strong>Hallucination</strong></td><td>{currentRag.hallucination ? "⚠ YES — " + (currentRag.hallucination_evidence || "unsupported claim") : "✓ NO"}</td></tr>
//             <tr><td><strong>Judge reasoning</strong></td><td>{currentRag.judge_reasoning || "—"}</td></tr>
//           </tbody></table></div>
//         </>}
//       </section>

//       <section className="evaluation-card">
//         <div className="evaluation-section-heading"><div><p className="eyebrow">EXERCISE 6 · REPOSITORY / CODEBASE UNDERSTANDING</p><h2>Live multi-file repository experiment</h2><p>This is an actual query against the InsureMate source tree — not a hardcoded answer.</p></div></div>
//         <div className="evaluation-summary" style={{ marginBottom: 20 }}>
//           <div className="evaluation-stat"><span>SOURCE FILES</span><strong>{repoIndex?.source_file_count ?? "—"}</strong><small>application/config files indexed</small></div>
//           <div className="evaluation-stat"><span>CODE CHUNKS</span><strong>{repoIndex?.chunk_count ?? "—"}</strong><small>line-addressable chunks</small></div>
//           <div className="evaluation-stat"><span>EMBEDDINGS</span><strong>{repoIndex?.embedding_model ?? "—"}</strong><small>Ollama embedding model</small></div>
//           <div className="evaluation-stat highlight"><span>RETRIEVAL</span><strong>HYBRID</strong><small>semantic + lexical + file diversity</small></div>
//         </div>
//         <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
//           <select value={selectedCase} onChange={e => setSelectedCase(e.target.value)} style={{ flex: 1, minWidth: 280, padding: 10, borderRadius: 8 }}>{repoCases.map(c => <option key={c.id} value={c.id}>{c.id} — {c.question}</option>)}</select>
//           <select value={repoModel} onChange={e => setRepoModel(e.target.value)} style={{ padding: 10, borderRadius: 8 }}>{MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
//           <button className="ask-button" onClick={runRepoCase} disabled={loadingRepo}>{loadingRepo ? "Running…" : "Run repository experiment →"}</button>
//         </div>
//         {repoResult && <>
//           <div className="evaluation-insight"><div><strong>LIVE QUESTION</strong><p>{repoResult.question}</p><p><strong>{repoResult.files_analyzed}</strong> files retrieved · multi-file: <strong>{repoResult.multi_file ? "YES" : "NO"}</strong> · retrieval {repoResult.retrieval_latency_seconds}s · generation {repoResult.generation_latency_seconds}s</p></div></div>
//           <h3>Retrieved source evidence</h3>
//           <div style={{ display: "grid", gap: 12 }}>{repoResult.retrieved_chunks.map((c,i) => <div key={`${c.file}-${c.start_line}`} style={{ padding: 15, border: "1px solid #e5e7eb", borderRadius: 12 }}><strong>#{i+1} {c.file}</strong><span style={{ marginLeft: 8 }}>Lines {c.start_line}-{c.end_line} · hybrid score {c.score}</span><p style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{c.text}</p></div>)}</div>
//           <h3 style={{ marginTop: 22 }}>Repository-grounded LLM answer</h3>
//           <div style={{ padding: 16, background: "#f8fafc", borderRadius: 12, whiteSpace: "pre-wrap" }}>{repoResult.answer}</div>
//           <h3 style={{ marginTop: 22 }}>Expected-file coverage</h3>
//           <div className="evaluation-table-wrap"><table className="evaluation-table"><thead><tr><th>EXPECTED FILE</th><th>RETRIEVED?</th></tr></thead><tbody>{repoResult.expected_files.map(f => <tr key={f}><td>{f}</td><td>{repoResult.matched_expected_files.includes(f) ? "✓ YES" : "✗ MISSED"}</td></tr>)}</tbody></table></div>
//           <div className="evaluation-conclusion"><strong>Multi-file evidence coverage: {repoResult.expected_file_coverage_percent}%.</strong> This is a repository-understanding experiment: retrieval is measured separately from the LLM answer so a good-looking answer cannot hide missing source evidence.</div>
//         </>}
//         {!repoResult && <div className="evaluation-conclusion"><strong>Demo:</strong> choose one of the five deliberately cross-file questions and click “Run repository experiment”. The backend will retrieve real source chunks and return their file paths, line ranges, scores and the generated answer.</div>}
//       </section>

//       <section className="evaluation-card final-findings">
//         <div className="evaluation-section-heading"><div><p className="eyebrow">PROFESSOR DEMO CHECKLIST</p><h2>What this proves</h2></div></div>
//         <ol>
//           <li><strong>Exercise 4:</strong> quantitative model comparison with category scores, hallucination, executable code tests, latency and resource measurements.</li>
//           <li><strong>Exercise 5:</strong> actual Question → Retrieved Context → Response traces from the Week-3 RAG pipeline, including failure/hallucination cases.</li>
//           <li><strong>Exercise 6:</strong> live repository queries requiring multiple files/modules, with file-level evidence and expected-file coverage.</li>
//           <li><strong>Boundary:</strong> this is not Sourcegraph; it deliberately demonstrates the current application's RAG-based repository understanding before next week's Sourcegraph activity.</li>
//         </ol>
//       </section>
//     </div>
//   );
// }

// export default Week4ExercisesPage;



import React, { useEffect, useMemo, useState } from "react";

const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

const MODELS = [
  { id: "codellama:7b-instruct", name: "CodeLlama 7B" },
  { id: "phi3:mini", name: "Phi-3 Mini" },
  { id: "qwen2.5:1.5b", name: "Qwen 2.5 1.5B" }
];

function pct(v) {
  return typeof v === "number" ? `${v.toFixed(2)}%` : "—";
}

function scoreClass(v) {
  if (v >= 80) return "good";
  if (v >= 50) return "mid";
  return "low";
}

function MetricCard({ label, value, sub, accent = false }) {
  return (
    <div className={`w4-metric ${accent ? "w4-metric-accent" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

function CodeEvidenceCard({ item, index, repository = false }) {
  const file = repository ? item.file : item.document;
  const meta = repository
    ? `Lines ${item.start_line}-${item.end_line} · hybrid score ${Number(item.score || 0).toFixed(4)}`
    : `Page ${item.page} · Chunk ${item.chunk_id} · similarity ${item.score}`;

  return (
    <article className="w4-evidence-card">
      <div className="w4-evidence-head">
        <div className="w4-evidence-title">
          <span className="w4-rank">#{index + 1}</span>
          <strong>{file}</strong>
        </div>
        <span className="w4-score">{meta}</span>
      </div>

      <pre className="w4-code-block">
        <code>{item.text}</code>
      </pre>
    </article>
  );
}

function AnswerBox({ children, label = "LLM RESPONSE", repository = false }) {
  return (
    <div className={`w4-answer-wrap ${repository ? "w4-answer-repository" : ""}`}>
      <div className="w4-answer-label">{label}</div>
      <div className="w4-answer">{children || "—"}</div>
    </div>
  );
}

function Week4ExercisesPage() {
  const [summary, setSummary] = useState(null);
  const [ragTraces, setRagTraces] = useState([]);
  const [repoCases, setRepoCases] = useState([]);
  const [repoIndex, setRepoIndex] = useState(null);
  const [selectedRag, setSelectedRag] = useState("RAG01");
  const [selectedRagModel, setSelectedRagModel] = useState("qwen2.5:1.5b");
  const [selectedCase, setSelectedCase] = useState("REPO01");
  const [repoModel, setRepoModel] = useState("qwen2.5:1.5b");
  const [repoResult, setRepoResult] = useState(null);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/week4/summary`).then(r => r.json()),
      fetch(`${API_URL}/api/week4/rag-traces`).then(r => r.json()),
      fetch(`${API_URL}/api/week4/repository/cases`).then(r => r.json()),
      fetch(`${API_URL}/api/week4/repository/index`)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null)
    ])
      .then(([s, r, c, i]) => {
        setSummary(s);
        setRagTraces(r.traces || []);
        setRepoCases(c.cases || []);
        setRepoIndex(i);
      })
      .catch(err => setError(`Unable to load Week 4 evidence: ${err.message}`));
  }, []);

  const modelRows = useMemo(() => {
    if (!summary?.summary) return [];

    return MODELS.map(m => {
      const x = summary.summary[m.id] || {};
      const resource = summary.resource_benchmark?.[m.id] || {};

      return {
        ...m,
        score: x.overall_score,
        hallucination: x.hallucination_rate_percent,
        latency: x.avg_latency_seconds,
        ram: resource.avg_ram_change_mb,
        prompt: resource.avg_prompt_tokens,
        output: resource.avg_output_tokens
      };
    });
  }, [summary]);

  const categories = useMemo(() => {
    if (!summary?.category_winners) return [];

    return Object.entries(summary.category_winners).map(([category, winner]) => {
      const scores = MODELS.reduce((acc, m) => {
        const row = summary.summary?.[m.id]?.category_scores || {};
        acc[m.id] = row[category];
        return acc;
      }, {});

      const winnerName = MODELS.find(m => m.id === winner)?.name || winner;
      return { category, winner, winnerName, scores };
    });
  }, [summary]);

  const currentRag = ragTraces.find(
    x => x.question_id === selectedRag && x.model === selectedRagModel
  );

  const ragQuestions = [...new Set(ragTraces.map(x => x.question_id))];

  const runRepoCase = async () => {
    setLoadingRepo(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/week4/repository/case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: selectedCase,
          model: repoModel,
          top_k: 5
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Repository request failed");
      }

      setRepoResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRepo(false);
    }
  };

  if (!summary) {
    return (
      <div className="w4-page">
        <style>{WEEK4_STYLES}</style>
        <div className="w4-card w4-loading">
          <div className="w4-spinner" />
          <h2>Loading Week 4 experiments…</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const fastest = modelRows.length
    ? Math.min(...modelRows.map(x => x.latency ?? Infinity))
    : null;

  const qwen = modelRows.find(x => x.id === "qwen2.5:1.5b");
  const bestScore = modelRows.length
    ? Math.max(...modelRows.map(x => x.score ?? 0))
    : null;

  return (
    <div className="w4-page">
      <style>{WEEK4_STYLES}</style>

      {/* HERO */}
      <header className="w4-hero">
        <div className="w4-hero-copy">
          <p className="w4-eyebrow">WEEK 4 · EXPERIMENTS 4–6</p>
          <h1>Experimental Evidence Lab</h1>
          <p className="w4-subtitle">
            Quantitative model comparison, RAG evidence tracing, and live
            repository-level code understanding for InsureMate.
          </p>
        </div>
        <div className="w4-live-badge">
          <span className="w4-live-dot" />
          RESULTS + LIVE TRACE
        </div>
      </header>

      {error && (
        <div className="w4-error">
          <strong>ERROR</strong>
          <span>{error}</span>
        </div>
      )}

      {/* OVERVIEW */}
      <section className="w4-metrics">
        <MetricCard label="MODELS" value="3" sub="same benchmark" />
        <MetricCard label="QUESTIONS" value="28" sub="84 model evaluations" />
        <MetricCard
          label="BEST SCORE"
          value={pct(bestScore)}
          sub="Qwen 2.5 1.5B"
          accent
        />
        <MetricCard
          label="FASTEST"
          value={fastest === Infinity || fastest == null ? "—" : `${fastest.toFixed(2)}s`}
          sub="Qwen average"
          accent
        />
      </section>

      {/* EXERCISE 4 */}
      <section className="w4-card">
        <div className="w4-section-heading">
          <div>
            <p className="w4-eyebrow">EXERCISE 4</p>
            <h2>Quantitative Model Comparison</h2>
            <p>Quality, hallucination, latency and resource measurements.</p>
          </div>
        </div>

        <div className="w4-conclusion">
          <div className="w4-conclusion-icon">★</div>
          <div>
            <strong>Quantitative conclusion</strong>
            <p>
              Qwen has the highest overall rubric score ({pct(qwen?.score)}),
              the lowest hallucination rate ({pct(qwen?.hallucination)}) and
              the lowest average latency ({qwen?.latency?.toFixed(2)}s).
              Phi-3 remains stronger for code retrieval and dependency
              understanding. This is a measured quality–latency trade-off.
            </p>
          </div>
        </div>

        <div className="w4-table-shell">
          <table className="w4-table">
            <thead>
              <tr>
                <th>MODEL</th>
                <th>QUALITY</th>
                <th>HALLUCINATION</th>
                <th>AVG LATENCY</th>
                <th>RAM Δ*</th>
                <th>PROMPT TOKENS</th>
                <th>OUTPUT TOKENS</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map(x => (
                <tr key={x.id}>
                  <td><strong>{x.name}</strong></td>
                  <td><strong className="w4-number">{pct(x.score)}</strong></td>
                  <td>{pct(x.hallucination)}</td>
                  <td>{x.latency?.toFixed(2)}s</td>
                  <td>{x.ram?.toFixed(2)} MB</td>
                  <td>{x.prompt?.toFixed(2)}</td>
                  <td>{x.output?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="w4-footnote">
          * RAM/CPU values are process-level measurements from 7 representative
          samples. GPU was not measured and these values should not be
          interpreted as whole-system Ollama resource usage.
        </p>
      </section>

      <section className="w4-card">
        <div className="w4-section-heading">
          <div>
            <p className="w4-eyebrow">CATEGORY WINNERS</p>
            <h2>Where Does Each Model Win?</h2>
          </div>
        </div>

        <div className="w4-table-shell">
          <table className="w4-table">
            <thead>
              <tr>
                <th>CATEGORY</th>
                <th>CODELLAMA</th>
                <th>PHI-3</th>
                <th>QWEN</th>
                <th>WINNER</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(row => (
                <tr key={row.category}>
                  <td><strong>{row.category}</strong></td>
                  {MODELS.map(m => (
                    <td key={m.id}>
                      <span className={`w4-pill ${scoreClass(row.scores[m.id] || 0)}`}>
                        {row.scores[m.id] == null
                          ? "—"
                          : row.scores[m.id].toFixed(2)}
                      </span>
                    </td>
                  ))}
                  <td><strong>{row.winnerName}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w4-note">
          <strong>Interpretation:</strong> Qwen wins the broadest set of
          categories, while Phi-3 is strongest for code retrieval and
          dependency understanding. CodeLlama has the weakest overall
          hallucination and latency indicators in this run.
        </div>
      </section>

      <section className="w4-card">
        <div className="w4-section-heading">
          <div>
            <p className="w4-eyebrow">CODE GENERATION</p>
            <h2>Executable Test Evidence</h2>
            <p>Results from the generated-code test runner, not the LLM judge alone.</p>
          </div>
        </div>

        <div className="w4-table-shell">
          <table className="w4-table">
            <thead>
              <tr>
                <th>MODEL</th>
                <th>CG01</th>
                <th>CG02</th>
                <th>CG03</th>
                <th>CG04</th>
              </tr>
            </thead>
            <tbody>
              {MODELS.map(m => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  {["CG01", "CG02", "CG03", "CG04"].map(q => {
                    const t = summary.code_generation_tests?.find(
                      x => x.model === m.id && x.question_id === q
                    );
                    const r = t?.test_result || {};
                    const content =
                      r.status === "passed"
                        ? "✓ PASS"
                        : r.status === "no_code"
                        ? "— NO CODE"
                        : `✗ ${r.pass_rate == null ? 0 : r.pass_rate}%`;

                    return (
                      <td key={q}>
                        <span
                          className={`w4-test ${
                            r.status === "passed"
                              ? "pass"
                              : r.status === "no_code"
                              ? "none"
                              : "fail"
                          }`}
                        >
                          {content}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w4-note">
          <strong>Important:</strong> test-pass rate is kept separate from
          semantic quality scoring. A response can receive rubric credit while
          still failing executable behavior.
        </div>
      </section>

      {/* EXERCISE 5 */}
      <section className="w4-card">
        <div className="w4-section-heading">
          <div>
            <p className="w4-eyebrow">EXERCISE 5 · EXISTING WEEK-3 RAG</p>
            <h2>Question → Retrieved Context → LLM Response</h2>
            <p>Inspect the actual retrieved policy chunks and generated answer.</p>
          </div>
        </div>

        <div className="w4-controls">
          <div className="w4-control">
            <label>RAG CASE</label>
            <select value={selectedRag} onChange={e => setSelectedRag(e.target.value)}>
              {ragQuestions.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>

          <div className="w4-control">
            <label>MODEL</label>
            <select
              value={selectedRagModel}
              onChange={e => setSelectedRagModel(e.target.value)}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        {currentRag && (
          <div className="w4-flow">
            <div className="w4-question-box">
              <span className="w4-label">01 · QUESTION</span>
              <p>{currentRag.question}</p>
            </div>

            <div className="w4-flow-title">
              <span>02</span>
              <h3>Retrieved Context</h3>
            </div>

            <div className="w4-evidence-list">
              {currentRag.retrieved_policy.map((c, i) => (
                <CodeEvidenceCard
                  key={`${c.chunk_id}-${i}`}
                  item={c}
                  index={i}
                />
              ))}
            </div>

            <div className="w4-flow-title">
              <span>03</span>
              <h3>LLM Response</h3>
            </div>

            <AnswerBox>{currentRag.answer}</AnswerBox>

            <div className="w4-flow-title">
              <span>04</span>
              <h3>Retrieval → Context → Response Analysis</h3>
            </div>

            <div className="w4-analysis-grid">
              <div>
                <span>Retrieval quality</span>
                <strong>
                  {currentRag.retrieval_quality_signal}%{" "}
                  <small>
                    ({Math.round((currentRag.retrieval_quality_signal || 0) / 20)}/5 reviewed)
                  </small>
                </strong>
              </div>

              <div>
                <span>Answer score</span>
                <strong>{currentRag.category_score?.toFixed(2)}%</strong>
              </div>

              <div>
                <span>Hallucination</span>
                <strong className={currentRag.hallucination ? "w4-danger" : "w4-success"}>
                  {currentRag.hallucination ? "⚠ YES" : "✓ NO"}
                </strong>
              </div>

              <div className="w4-analysis-wide">
                <span>Context quality</span>
                <p>
                  {currentRag.retrieval_quality_signal === 100
                    ? "All selected chunks reviewed as relevant."
                    : "Relevant evidence was retrieved, but some top-K context was not the strongest evidence."}
                </p>
              </div>

              {currentRag.hallucination && (
                <div className="w4-analysis-wide w4-warning">
                  <span>Hallucination evidence</span>
                  <p>{currentRag.hallucination_evidence || "Unsupported claim"}</p>
                </div>
              )}

              <div className="w4-analysis-wide">
                <span>Judge reasoning</span>
                <p>{currentRag.judge_reasoning || "—"}</p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* EXERCISE 6 */}
      <section className="w4-card w4-repository-card">
        <div className="w4-section-heading">
          <div>
            <p className="w4-eyebrow">EXERCISE 6 · REPOSITORY / CODEBASE UNDERSTANDING</p>
            <h2>Live Multi-File Repository Experiment</h2>
            <p>
              An actual query against the InsureMate source tree — not a hardcoded answer.
            </p>
          </div>
          <div className="w4-repo-badge">LIVE REPOSITORY RAG</div>
        </div>

        <div className="w4-repo-metrics">
          <MetricCard
            label="SOURCE FILES"
            value={repoIndex?.source_file_count ?? "—"}
            sub="application/config indexed"
          />
          <MetricCard
            label="CODE CHUNKS"
            value={repoIndex?.chunk_count ?? "—"}
            sub="line-addressable chunks"
          />
          <MetricCard
            label="EMBEDDINGS"
            value={repoIndex?.embedding_model ?? "—"}
            sub="Ollama embedding model"
          />
          <MetricCard
            label="RETRIEVAL"
            value="HYBRID"
            sub="semantic + lexical + diversity"
            accent
          />
        </div>

        <div className="w4-repo-controls">
          <div className="w4-control w4-case-control">
            <label>REPOSITORY CASE</label>
            <select
              value={selectedCase}
              onChange={e => setSelectedCase(e.target.value)}
            >
              {repoCases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} — {c.question}
                </option>
              ))}
            </select>
          </div>

          <div className="w4-control w4-model-control">
            <label>MODEL</label>
            <select value={repoModel} onChange={e => setRepoModel(e.target.value)}>
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <button className="w4-run-button" onClick={runRepoCase} disabled={loadingRepo}>
            {loadingRepo ? (
              <>
                <span className="w4-button-spinner" />
                Running…
              </>
            ) : (
              <>Run Repository Experiment <span>→</span></>
            )}
          </button>
        </div>

        {repoResult && (
          <div className="w4-flow">
            <div className="w4-repo-live-summary">
              <div>
                <span className="w4-label">LIVE QUESTION</span>
                <p>{repoResult.question}</p>
              </div>

              <div className="w4-live-stats">
                <div>
                  <strong>{repoResult.files_analyzed}</strong>
                  <span>files retrieved</span>
                </div>
                <div>
                  <strong>{repoResult.multi_file ? "YES" : "NO"}</strong>
                  <span>multi-file</span>
                </div>
                <div>
                  <strong>{repoResult.retrieval_latency_seconds}s</strong>
                  <span>retrieval</span>
                </div>
                <div>
                  <strong>{repoResult.generation_latency_seconds}s</strong>
                  <span>generation</span>
                </div>
              </div>
            </div>

            <div className="w4-flow-title">
              <span>01</span>
              <h3>Retrieved Source Evidence</h3>
            </div>

            <div className="w4-evidence-list">
              {repoResult.retrieved_chunks.map((c, i) => (
                <CodeEvidenceCard
                  key={`${c.file}-${c.start_line}`}
                  item={c}
                  index={i}
                  repository
                />
              ))}
            </div>

            <div className="w4-flow-title">
              <span>02</span>
              <h3>Repository-Grounded LLM Answer</h3>
            </div>

            <AnswerBox label="REPOSITORY-GROUNDED ANSWER" repository>
              {repoResult.answer}
            </AnswerBox>

            <div className="w4-flow-title">
              <span>03</span>
              <h3>Expected-File Coverage</h3>
            </div>

            <div className="w4-coverage">
              {repoResult.expected_files.map(f => {
                const matched = repoResult.matched_expected_files.includes(f);
                return (
                  <div key={f} className={`w4-coverage-row ${matched ? "matched" : "missed"}`}>
                    <span className="w4-coverage-icon">{matched ? "✓" : "×"}</span>
                    <code>{f}</code>
                    <strong>{matched ? "RETRIEVED" : "MISSED"}</strong>
                  </div>
                );
              })}
            </div>

            <div className="w4-coverage-summary">
              <strong>Multi-file evidence coverage: {repoResult.expected_file_coverage_percent}%</strong>
              <span>
                Retrieval is measured separately from the LLM answer, so a
                good-looking answer cannot hide missing source evidence.
              </span>
            </div>
          </div>
        )}

        {!repoResult && (
          <div className="w4-demo-hint">
            <span>DEMO</span>
            <p>
              Choose one of the five cross-file questions and click
              <strong> Run Repository Experiment</strong>. The backend will
              retrieve real source chunks and return file paths, line ranges,
              scores and the generated answer.
            </p>
          </div>
        )}
      </section>

      {/* FINAL */}
      <section className="w4-card w4-final">
        <div className="w4-section-heading">
          <div>
            <p className="w4-eyebrow">PROFESSOR DEMO CHECKLIST</p>
            <h2>What This Proves</h2>
          </div>
        </div>

        <div className="w4-checklist">
          <div><span>01</span><p><strong>Exercise 4</strong> — quantitative model comparison with category scores, hallucination, executable code tests, latency and resource measurements.</p></div>
          <div><span>02</span><p><strong>Exercise 5</strong> — actual Question → Retrieved Context → Response traces from the Week-3 RAG pipeline.</p></div>
          <div><span>03</span><p><strong>Exercise 6</strong> — live repository queries requiring multiple files/modules, with file-level evidence and expected-file coverage.</p></div>
          <div><span>04</span><p><strong>Boundary</strong> — this is not Sourcegraph; it demonstrates the application's RAG-based repository understanding before the Sourcegraph activity.</p></div>
        </div>
      </section>
    </div>
  );
}

const WEEK4_STYLES = `
  .w4-page {
    --w4-bg: #07111f;
    --w4-card: #0d1a2b;
    --w4-card-2: #101f33;
    --w4-border: rgba(148, 163, 184, .16);
    --w4-border-strong: rgba(96, 165, 250, .34);
    --w4-text: #f1f5f9;
    --w4-muted: #94a3b8;
    --w4-soft: #cbd5e1;
    --w4-blue: #60a5fa;
    --w4-cyan: #22d3ee;
    --w4-green: #34d399;
    --w4-red: #fb7185;
    --w4-yellow: #fbbf24;

    box-sizing: border-box;
    width: 100%;
    min-height: 100vh;
    padding: 28px 28px 80px;
    color: var(--w4-text);
    background:
      radial-gradient(circle at 85% 0%, rgba(37, 99, 235, .10), transparent 28%),
      var(--w4-bg);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .w4-page *, .w4-page *::before, .w4-page *::after {
    box-sizing: border-box;
  }

  .w4-page h1, .w4-page h2, .w4-page h3, .w4-page p {
    margin-top: 0;
  }

  .w4-hero {
    width: min(1180px, 100%);
    margin: 0 auto 22px;
    padding: 30px 32px;
    border: 1px solid var(--w4-border);
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(16, 31, 51, .98), rgba(9, 22, 38, .98));
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, .20);
  }

  .w4-eyebrow {
    margin: 0 0 9px;
    color: var(--w4-cyan);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .16em;
    text-transform: uppercase;
  }

  .w4-hero h1 {
    margin-bottom: 9px;
    color: #fff;
    font-size: clamp(28px, 3vw, 42px);
    line-height: 1.08;
    letter-spacing: -.025em;
  }

  .w4-subtitle {
    max-width: 760px;
    margin: 0;
    color: var(--w4-muted);
    font-size: 14px;
    line-height: 1.7;
  }

  .w4-live-badge, .w4-repo-badge {
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 10px 13px;
    border: 1px solid rgba(34, 211, 238, .25);
    border-radius: 999px;
    background: rgba(34, 211, 238, .07);
    color: #a5f3fc;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .08em;
    white-space: nowrap;
  }

  .w4-live-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--w4-green);
    box-shadow: 0 0 0 4px rgba(52, 211, 153, .10);
  }

  .w4-error {
    width: min(1180px, 100%);
    margin: 0 auto 18px;
    padding: 13px 16px;
    border: 1px solid rgba(251, 113, 133, .35);
    border-radius: 12px;
    background: rgba(127, 29, 29, .18);
    color: #fecdd3;
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 13px;
  }

  .w4-metrics, .w4-repo-metrics {
    width: min(1180px, 100%);
    margin: 0 auto 22px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .w4-metric {
    min-width: 0;
    padding: 20px;
    border: 1px solid var(--w4-border);
    border-radius: 14px;
    background: var(--w4-card);
  }

  .w4-metric-accent {
    border-color: rgba(96, 165, 250, .30);
    background: linear-gradient(145deg, rgba(18, 39, 67, .98), rgba(13, 26, 43, .98));
  }

  .w4-metric span, .w4-metric small {
    display: block;
    color: var(--w4-muted);
  }

  .w4-metric span {
    margin-bottom: 10px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .13em;
  }

  .w4-metric strong {
    display: block;
    margin-bottom: 6px;
    color: #fff;
    font-size: 25px;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .w4-metric small {
    font-size: 11px;
    line-height: 1.45;
  }

  .w4-card {
    width: min(1180px, 100%);
    margin: 0 auto 22px;
    padding: 25px;
    border: 1px solid var(--w4-border);
    border-radius: 17px;
    background: rgba(13, 26, 43, .96);
    box-shadow: 0 12px 38px rgba(0, 0, 0, .13);
  }

 .w4-section-heading {
    margin-bottom: 21px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 18px;
    text-align: center;
 }

  .w4-section-heading > div:first-child {
    flex: 1;
    min-width: 0;
  }

  .w4-section-heading .w4-eyebrow,
  .w4-section-heading h2,
  .w4-section-heading p {
    text-align: center;
 }

  .w4-section-heading h2 {
    margin-bottom: 6px;
    color: #fff;
    font-size: 21px;
    letter-spacing: -.01em;
  }

  .w4-section-heading > div > p:last-child {
    margin: 0;
    color: var(--w4-muted);
    font-size: 13px;
    line-height: 1.55;
  }

  .w4-conclusion {
    margin-bottom: 20px;
    padding: 16px 18px;
    border: 1px solid var(--w4-border-strong);
    border-radius: 13px;
    background: rgba(37, 99, 235, .08);
    display: flex;
    gap: 14px;
  }

  .w4-conclusion-icon {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: #2563eb;
    color: #fff;
    font-size: 14px;
  }

  .w4-conclusion strong {
    color: #dbeafe;
    font-size: 13px;
  }

  .w4-conclusion p {
    margin: 5px 0 0;
    color: #aebed2;
    font-size: 12px;
    line-height: 1.65;
  }

  .w4-table-shell {
    overflow-x: auto;
    border: 1px solid var(--w4-border);
    border-radius: 12px;
  }

  .w4-table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    color: var(--w4-soft);
    font-size: 12px;
  }

  .w4-table th {
    padding: 12px 14px;
    background: rgba(2, 8, 23, .35);
    border-bottom: 1px solid var(--w4-border);
    color: #7dd3fc;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .10em;
    text-align: left;
    white-space: nowrap;
  }

  .w4-table td {
    padding: 14px;
    border-bottom: 1px solid rgba(148, 163, 184, .09);
    vertical-align: middle;
  }

  .w4-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .w4-table tbody tr:hover {
    background: rgba(96, 165, 250, .035);
  }

  .w4-table td strong {
    color: #f8fafc;
  }

  .w4-number {
    color: #93c5fd !important;
  }

  .w4-footnote {
    margin: 12px 2px 0;
    color: #71839a;
    font-size: 11px;
    line-height: 1.6;
  }

  .w4-pill, .w4-test {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 58px;
    padding: 5px 8px;
    border-radius: 7px;
    font-size: 10px;
    font-weight: 800;
  }

  .w4-pill.good { background: rgba(52, 211, 153, .10); color: #6ee7b7; }
  .w4-pill.mid { background: rgba(251, 191, 36, .10); color: #fcd34d; }
  .w4-pill.low { background: rgba(251, 113, 133, .10); color: #fda4af; }

  .w4-test.pass { color: #6ee7b7; background: rgba(52, 211, 153, .08); }
  .w4-test.fail { color: #fda4af; background: rgba(251, 113, 133, .08); }
  .w4-test.none { color: #94a3b8; background: rgba(148, 163, 184, .08); }

  .w4-note {
    margin-top: 14px;
    padding: 13px 15px;
    border-left: 2px solid #38bdf8;
    border-radius: 0 9px 9px 0;
    background: rgba(56, 189, 248, .055);
    color: #9fb0c4;
    font-size: 11px;
    line-height: 1.65;
  }

  .w4-note strong {
    color: #dbeafe;
  }

  .w4-controls, .w4-repo-controls {
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(180px, 1fr);
    gap: 12px;
    margin-bottom: 21px;
  }

  .w4-control label {
    display: block;
    margin: 0 0 7px;
    color: #7dd3fc;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .12em;
  }

  .w4-control select {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid var(--w4-border);
    border-radius: 9px;
    outline: none;
    background: #091525;
    color: #e2e8f0;
    font-size: 12px;
  }

  .w4-control select:focus {
    border-color: rgba(96, 165, 250, .55);
  }

  .w4-flow {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .w4-question-box {
    padding: 18px;
    border: 1px solid rgba(96, 165, 250, .22);
    border-radius: 12px;
    background: rgba(37, 99, 235, .055);
  }

  .w4-label, .w4-answer-label {
    color: #67e8f9;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .12em;
  }

  .w4-question-box p {
    margin: 8px 0 0;
    color: #e2e8f0;
    font-size: 13px;
    line-height: 1.7;
  }

  .w4-flow-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 7px;
  }

  .w4-flow-title span {
    width: 27px;
    height: 27px;
    flex: 0 0 27px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(34, 211, 238, .25);
    border-radius: 8px;
    color: #67e8f9;
    background: rgba(34, 211, 238, .06);
    font-size: 9px;
    font-weight: 800;
  }

  .w4-flow-title h3 {
    margin: 0;
    color: #f8fafc;
    font-size: 15px;
  }

  .w4-evidence-list {
    display: grid;
    gap: 10px;
  }

  .w4-evidence-card {
    overflow: hidden;
    border: 1px solid var(--w4-border);
    border-radius: 12px;
    background: #091625;
  }

  .w4-evidence-head {
    padding: 12px 14px;
    border-bottom: 1px solid var(--w4-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .w4-evidence-title {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .w4-evidence-title strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #e2e8f0;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 11px;
  }

  .w4-rank {
    color: #60a5fa;
    font-size: 10px;
    font-weight: 900;
  }

  .w4-score {
    flex: 0 0 auto;
    color: #71839a;
    font-size: 10px;
    white-space: nowrap;
  }

  .w4-code-block {
    margin: 0;
    padding: 15px;
    overflow-x: auto;
    color: #cbd5e1;
    background: #07111d;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.65;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .w4-answer-wrap {
    overflow: hidden;
    border: 1px solid rgba(96, 165, 250, .24);
    border-radius: 13px;
    background: #0a1727;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.025);
  }

  .w4-answer-repository {
    border-color: rgba(34, 211, 238, .25);
    background: #091827;
  }

  .w4-answer-label {
    padding: 10px 15px;
    border-bottom: 1px solid rgba(148, 163, 184, .12);
    background: rgba(96, 165, 250, .055);
  }

  .w4-answer {
    padding: 18px;
    color: #e2e8f0 !important;
    background: transparent !important;
    font-size: 13px;
    line-height: 1.8;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .w4-analysis-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .w4-analysis-grid > div {
    padding: 14px;
    border: 1px solid var(--w4-border);
    border-radius: 10px;
    background: #0a1727;
  }

  .w4-analysis-grid span {
    display: block;
    margin-bottom: 6px;
    color: #71839a;
    font-size: 10px;
    font-weight: 700;
  }

  .w4-analysis-grid strong {
    color: #e2e8f0;
    font-size: 14px;
  }

  .w4-analysis-grid strong small {
    color: #71839a;
    font-size: 10px;
    font-weight: 500;
  }

  .w4-analysis-wide {
    grid-column: 1 / -1;
  }

  .w4-analysis-wide p {
    margin: 0;
    color: #aebed2;
    font-size: 11px;
    line-height: 1.6;
  }

  .w4-success { color: #6ee7b7 !important; }
  .w4-danger { color: #fda4af !important; }

  .w4-warning {
    border-color: rgba(251, 191, 36, .22) !important;
    background: rgba(251, 191, 36, .045) !important;
  }

  .w4-repository-card {
    border-color: rgba(34, 211, 238, .18);
  }

  .w4-repo-metrics {
    width: 100%;
    margin: 0 0 18px;
  }

  .w4-repo-controls {
    grid-template-columns: minmax(0, 1fr) 210px auto;
    align-items: end;
  }

  .w4-case-control {
    min-width: 0;
  }

  .w4-run-button {
    min-height: 42px;
    padding: 0 17px;
    border: 0;
    border-radius: 9px;
    background: linear-gradient(135deg, #2563eb, #0891b2);
    color: #fff;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .02em;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 7px 22px rgba(37, 99, 235, .18);
  }

  .w4-run-button:hover:not(:disabled) {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }

  .w4-run-button:disabled {
    opacity: .65;
    cursor: wait;
  }

  .w4-button-spinner, .w4-spinner {
    display: inline-block;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: w4-spin .7s linear infinite;
  }

  .w4-button-spinner {
    width: 11px;
    height: 11px;
    margin-right: 7px;
    vertical-align: -1px;
  }

  .w4-repo-live-summary {
    padding: 17px;
    border: 1px solid rgba(34, 211, 238, .18);
    border-radius: 12px;
    background: rgba(8, 47, 73, .16);
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 22px;
    align-items: center;
  }

  .w4-repo-live-summary p {
    margin: 8px 0 0;
    color: #e2e8f0;
    font-size: 12px;
    line-height: 1.65;
  }

  .w4-live-stats {
    display: grid;
    grid-template-columns: repeat(4, auto);
    gap: 17px;
  }

  .w4-live-stats div {
    text-align: right;
  }

  .w4-live-stats strong {
    display: block;
    color: #fff;
    font-size: 14px;
  }

  .w4-live-stats span {
    color: #71839a;
    font-size: 9px;
    white-space: nowrap;
  }

  .w4-coverage {
    overflow: hidden;
    border: 1px solid var(--w4-border);
    border-radius: 11px;
  }

  .w4-coverage-row {
    min-height: 45px;
    padding: 9px 13px;
    border-bottom: 1px solid rgba(148, 163, 184, .08);
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) auto;
    align-items: center;
    gap: 9px;
    background: #091625;
  }

  .w4-coverage-row:last-child {
    border-bottom: 0;
  }

  .w4-coverage-icon {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 900;
  }

  .w4-coverage-row.matched .w4-coverage-icon {
    background: rgba(52, 211, 153, .10);
    color: #6ee7b7;
  }

  .w4-coverage-row.missed .w4-coverage-icon {
    background: rgba(251, 113, 133, .10);
    color: #fda4af;
  }

  .w4-coverage-row code {
    overflow: hidden;
    text-overflow: ellipsis;
    color: #cbd5e1;
    font-size: 10px;
  }

  .w4-coverage-row strong {
    font-size: 9px;
    letter-spacing: .08em;
  }

  .w4-coverage-row.matched strong { color: #6ee7b7; }
  .w4-coverage-row.missed strong { color: #fda4af; }

  .w4-coverage-summary {
    margin-top: 10px;
    padding: 13px 15px;
    border-left: 2px solid #22d3ee;
    border-radius: 0 9px 9px 0;
    background: rgba(34, 211, 238, .045);
  }

  .w4-coverage-summary strong {
    display: block;
    margin-bottom: 4px;
    color: #a5f3fc;
    font-size: 11px;
  }

  .w4-coverage-summary span {
    color: #8193a8;
    font-size: 10px;
    line-height: 1.5;
  }

  .w4-demo-hint {
    padding: 15px;
    border: 1px dashed rgba(96, 165, 250, .25);
    border-radius: 11px;
    background: rgba(96, 165, 250, .035);
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .w4-demo-hint > span {
    color: #60a5fa;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .12em;
  }

  .w4-demo-hint p {
    margin: 0;
    color: #8fa1b6;
    font-size: 11px;
    line-height: 1.65;
  }

  .w4-demo-hint strong {
    color: #dbeafe;
  }

  .w4-final {
    margin-bottom: 0;
  }

  .w4-checklist {
    display: grid;
    gap: 9px;
  }

  .w4-checklist > div {
    display: grid;
    grid-template-columns: 34px 1fr;
    gap: 12px;
    align-items: start;
    padding: 13px;
    border: 1px solid rgba(148, 163, 184, .10);
    border-radius: 10px;
    background: rgba(2, 8, 23, .20);
  }

  .w4-checklist > div > span {
    color: #60a5fa;
    font-size: 11px;
    font-weight: 900;
  }

  .w4-checklist p {
    margin: 0;
    color: #9fb0c4;
    font-size: 11px;
    line-height: 1.65;
  }

  .w4-checklist strong {
    color: #e2e8f0;
  }

  .w4-loading {
    min-height: 260px;
    display: grid;
    place-items: center;
    align-content: center;
    text-align: center;
  }

  .w4-spinner {
    width: 25px;
    height: 25px;
    margin-bottom: 16px;
    border-color: rgba(96, 165, 250, .25);
    border-top-color: #60a5fa;
  }

  .w4-loading h2 {
    color: #fff;
    font-size: 18px;
  }

  .w4-loading p {
    color: #94a3b8;
    font-size: 12px;
  }

  @keyframes w4-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 900px) {
    .w4-page { padding: 18px 14px 60px; }
    .w4-hero { flex-direction: column; padding: 23px; }
    .w4-metrics, .w4-repo-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .w4-repo-controls { grid-template-columns: 1fr 1fr; }
    .w4-run-button { grid-column: 1 / -1; }
    .w4-repo-live-summary { grid-template-columns: 1fr; }
    .w4-live-stats { grid-template-columns: repeat(4, 1fr); }
    .w4-live-stats div { text-align: left; }
  }

  @media (max-width: 620px) {
    .w4-card { padding: 17px; border-radius: 14px; }
    .w4-metrics, .w4-repo-metrics { grid-template-columns: 1fr 1fr; gap: 8px; }
    .w4-metric { padding: 14px; }
    .w4-metric strong { font-size: 20px; }
    .w4-controls, .w4-repo-controls, .w4-analysis-grid { grid-template-columns: 1fr; }
    .w4-analysis-wide { grid-column: auto; }
    .w4-live-stats { grid-template-columns: 1fr 1fr; }
    .w4-live-stats div { text-align: left; }
    .w4-evidence-head { align-items: flex-start; flex-direction: column; gap: 5px; }
    .w4-score { white-space: normal; }
    .w4-coverage-row { grid-template-columns: 28px minmax(0, 1fr); }
    .w4-coverage-row strong { grid-column: 2; }
  }
`;

export default Week4ExercisesPage;
