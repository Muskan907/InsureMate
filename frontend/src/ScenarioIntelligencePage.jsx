
import React, { useMemo, useState } from "react";

const API = "http://localhost:8000";

const examples = [
  "I have been continuously insured for 52 months and now need surgery for a pre-existing condition. Will it be covered?",
  "I have been insured for 36 months and need treatment for a pre-existing disease. What does the policy evidence indicate?",
  "I need surgery, but I have not specified the type of surgery. Is there enough evidence to determine the waiting period?"
];

function StatusPill({ status }) {
  const cls = status === "SUPPORTED" ? "si-good" :
    status === "CONDITIONAL" ? "si-warn" :
    status === "CONFLICT" ? "si-danger" : "si-muted";
  return <span className={`si-pill ${cls}`}>{status || "NOT ANALYZED"}</span>;
}

function Check({ label, ok }) {
  return (
    <div className={`si-check ${ok ? "ok" : "bad"}`}>
      <span>{ok ? "✓" : "✕"}</span>
      <div><b>{label}</b><small>{ok ? "Passed" : "Failed"}</small></div>
    </div>
  );
}

export default function ScenarioIntelligencePage() {
  const [scenario, setScenario] = useState(examples[0]);
  const [months, setMonths] = useState(52);
  const [useMonths, setUseMonths] = useState(true);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/api/scenario/analyze`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          scenario,
          policy_months: useMonths ? months : null,
          model: "qwen2.5:1.5b",
          validator_model: "phi3:mini",
          top_k: 5
        })
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.detail || "Scenario analysis failed");
      setData(body);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const grouped = useMemo(() => {
    const map = {};
    (data?.evidence || []).forEach(e => {
      map[e.document] = (map[e.document] || 0) + 1;
    });
    return Object.entries(map);
  }, [data]);

  const v = data?.output_validation;
  const result = data?.result;

  return (
    <div className="si-page">
      <style>{`
        .si-page{min-height:100%;padding:34px 38px 70px;background:#08111f;color:#e9f0f8;font-family:Inter,system-ui,sans-serif}
        .si-wrap{max-width:1220px;margin:auto}
        .si-eyebrow{font-size:11px;letter-spacing:.18em;color:#7f9ab8;font-weight:800;margin-bottom:8px}
        .si-title{font-size:38px;margin:0 0 8px;font-weight:850;letter-spacing:-.04em}
        .si-sub{color:#9eb0c5;max-width:850px;line-height:1.6;font-size:14px}
        .si-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;margin-top:25px}
        .si-card{background:#0d1a2b;border:1px solid #20334b;border-radius:16px;padding:19px;box-shadow:0 12px 35px rgba(0,0,0,.15)}
        .si-card h2{font-size:15px;margin:0 0 13px}.si-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#7188a3;font-weight:800}
        .si-textarea{width:100%;min-height:150px;box-sizing:border-box;background:#091523;border:1px solid #29405b;border-radius:12px;color:#eaf2fb;padding:14px;resize:vertical;outline:none;line-height:1.55}
        .si-examples{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}.si-example{background:#12243a;border:1px solid #28415f;color:#a9c0d9;border-radius:9px;padding:7px 9px;font-size:11px;cursor:pointer}
        .si-actions{display:flex;align-items:center;gap:14px;margin-top:13px}.si-btn{border:0;border-radius:10px;padding:11px 16px;background:#d9e8f7;color:#09111d;font-weight:850;cursor:pointer}.si-btn:disabled{opacity:.55}
        .si-slider{flex:1}.si-range{width:100%}.si-months{font-weight:850;min-width:85px;text-align:right}
        .si-facts{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.si-fact{background:#0a1625;border:1px solid #1e3147;border-radius:11px;padding:11px}.si-fact b{display:block;font-size:12px}.si-fact span{display:block;color:#b7c6d7;margin-top:4px;font-size:12px}.si-fact small{color:#66819e;font-size:9px;text-transform:uppercase}
        .si-result{margin-top:18px}.si-result-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.si-pill{padding:6px 9px;border-radius:999px;font-size:10px;font-weight:900;border:1px solid}.si-good{color:#83e0b1;border-color:#27684a;background:#0d2b20}.si-warn{color:#ffd17d;border-color:#70551f;background:#2c2310}.si-danger{color:#ff9a9a;border-color:#743232;background:#301515}.si-muted{color:#a7b7ca;border-color:#3a4d63;background:#142235}
        .si-answer{font-size:14px;line-height:1.7;color:#dce7f3;margin-top:12px}.si-missing{margin-top:14px;padding:12px;border-radius:11px;background:#261e10;border:1px solid #58451e;color:#e8ca89;font-size:12px}
        .si-validation{margin-top:18px}.si-checks{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.si-check{display:flex;gap:9px;padding:10px;border-radius:10px;background:#0a1625;border:1px solid #20334a}.si-check.ok span{color:#70dca5}.si-check.bad span{color:#ff8585}.si-check b{font-size:11px;display:block}.si-check small{color:#7188a3;font-size:10px}
        .si-evidence{margin-top:18px}.si-e{padding:12px;background:#0a1625;border:1px solid #20334a;border-radius:11px;margin-top:8px}.si-e-top{display:flex;justify-content:space-between;gap:10px;font-size:11px}.si-e-doc{font-weight:850}.si-score{color:#8da8c4}.si-e-text{font-size:11px;line-height:1.55;color:#afbed0;margin-top:8px}
        .si-trace{display:grid;gap:7px}.si-step{display:flex;gap:11px;align-items:center;padding:10px;background:#0a1625;border:1px solid #20334a;border-radius:10px}.si-num{width:23px;height:23px;border-radius:50%;display:grid;place-items:center;background:#19304a;font-size:10px;font-weight:900}.si-step b{font-size:11px}.si-step span{color:#7e94ac;font-size:10px;margin-left:auto}
        .si-policies{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:10px}.si-policy{background:#0a1625;border:1px solid #20334a;border-radius:10px;padding:11px}.si-policy b{font-size:11px}.si-policy span{display:block;color:#7f95ac;font-size:10px;margin-top:4px}
        .si-error{margin-top:14px;padding:12px;background:#32191d;border:1px solid #70333b;border-radius:10px;color:#ffb5bd;font-size:12px}
        .si-note{color:#6f879f;font-size:10px;line-height:1.5;margin-top:9px}
        @media(max-width:900px){.si-grid{grid-template-columns:1fr}.si-page{padding:24px 16px}.si-title{font-size:30px}}
        @media(max-width:560px){.si-facts,.si-checks,.si-policies{grid-template-columns:1fr}}
      `}</style>

      <div className="si-wrap">
        <div className="si-eyebrow">INSUREMATE · EVIDENCE-GROUNDED DECISION SUPPORT</div>
        <h1 className="si-title">Scenario Intelligence</h1>
        <div className="si-sub">
          Analyze a multi-fact insurance scenario instead of treating it as a simple question.
          InsureMate extracts known and missing facts, retrieves policy clauses, checks whether
          those clauses actually apply, and independently tests the generated output before showing it.
        </div>

        <div className="si-grid">
          <section className="si-card">
            <div className="si-label">1 · Scenario input</div>
            <h2>Describe the situation</h2>
            <textarea className="si-textarea" value={scenario} onChange={e=>setScenario(e.target.value)} />
            <div className="si-examples">
              {examples.map((x,i)=><button key={i} className="si-example" onClick={()=>setScenario(x)}>Example {i+1}</button>)}
            </div>
            <div className="si-label" style={{marginTop:14}}>Decision-sensitive variable</div>
            <div className="si-actions">
              <input type="checkbox" checked={useMonths} onChange={e=>setUseMonths(e.target.checked)} />
              <div className="si-slider"><input className="si-range" type="range" min="0" max="120" value={months} onChange={e=>setMonths(Number(e.target.value))}/></div>
              <div className="si-months">{months} months</div>
            </div>
            <div className="si-note">The duration is an explicit scenario input. It is not treated as proof of coverage; policy evidence still controls the result.</div>
            <div className="si-actions">
              <button className="si-btn" disabled={loading || !scenario.trim()} onClick={analyze}>{loading ? "Analyzing…" : "Analyze Scenario →"}</button>
            </div>
            {error && <div className="si-error">{error}</div>}
          </section>

          <section className="si-card">
            <div className="si-label">2 · Fact matrix</div>
            <h2>Known vs missing information</h2>
            {!data ? <div className="si-note">Run an analysis to populate the fact matrix.</div> :
              <div className="si-facts">{data.facts.map((f,i)=>
                <div className="si-fact" key={i}><b>{f.name}</b><span>{f.value}</span><small>{f.status}</small></div>
              )}</div>
            }
            <div className="si-result">
              <div className="si-result-head"><div className="si-label">3 · Decision</div><StatusPill status={result?.status}/></div>
              {result && <div className="si-answer">{result.answer}</div>}
              {result?.missing_facts?.length > 0 && <div className="si-missing"><b>Missing information</b><br/>{result.missing_facts.map((x,i)=><div key={i}>• {x}</div>)}</div>}
            </div>
          </section>
        </div>

        <div className="si-grid">
          <section className="si-card">
            <div className="si-label">4 · Independent AI output testing</div>
            <h2>Acceptance checks</h2>
            {!v ? <div className="si-note">The generated answer is not accepted until it passes these checks.</div> :
              <><div className="si-checks">
                <Check label="Relevance" ok={v.checks?.relevance}/>
                <Check label="Supported by evidence" ok={v.checks?.supported_by_evidence}/>
                <Check label="No unsupported claims" ok={!v.unsupported_claims?.length}/>
                <Check label="Expected format" ok={v.checks?.expected_format}/>
                <Check label="Schema" ok={v.checks?.schema}/>
                <Check label="Evidence available" ok={v.checks?.evidence_available}/>
              </div>
              <div className="si-note">Independent validator: phi3:mini · Grounding overlap is only a diagnostic, not a probability of correctness.</div>
              {v.unsupported_claims?.length > 0 && <div className="si-missing"><b>Unsupported claims detected</b>{v.unsupported_claims.map((x,i)=><div key={i}>• {x}</div>)}</div>}</>
            }
          </section>

          <section className="si-card">
            <div className="si-label">5 · Pipeline trace</div>
            <h2>How the decision was produced</h2>
            <div className="si-trace">{(data?.decision_trace || []).map(s=>
              <div className="si-step" key={s.step}><div className="si-num">{s.step}</div><b>{s.name}</b><span>{s.detail}</span></div>
            )}</div>
          </section>
        </div>

        <section className="si-card si-evidence">
          <div className="si-label">6 · Policy evidence</div>
          <h2>Retrieved clauses used for the analysis</h2>
          <div className="si-policies">{grouped.map(([doc,count])=><div className="si-policy" key={doc}><b>{doc}</b><span>{count} retrieved evidence item(s)</span></div>)}</div>
          {(data?.evidence || []).map(e=>
            <div className="si-e" key={e.id}>
              <div className="si-e-top"><span className="si-e-doc">Evidence {e.id} · {e.document}</span><span className="si-score">similarity {e.score}</span></div>
              <div className="si-e-text">{e.text}</div>
            </div>
          )}
        </section>

        {data && <section className="si-card" style={{marginTop:18}}>
          <div className="si-label">7 · What-if analysis</div>
          <h2>Change one fact and rerun the same pipeline</h2>
          <div className="si-actions">
            <div className="si-slider"><input className="si-range" type="range" min="0" max="120" value={months} onChange={e=>setMonths(Number(e.target.value))}/></div>
            <div className="si-months">{months} months</div>
            <button className="si-btn" disabled={loading} onClick={analyze}>Re-analyze</button>
          </div>
          <div className="si-note">This is a sensitivity experiment: changing a scenario variable does not override policy wording.</div>
        </section>}
      </div>
    </div>
  );
}
