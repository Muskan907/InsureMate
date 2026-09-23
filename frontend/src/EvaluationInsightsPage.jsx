import React, { useMemo, useState } from "react";

function EvaluationInsightsPage() {
  const [modelSearch, setModelSearch] = useState("");
  const [selectedModel, setSelectedModel] = useState("CodeLlama 7B");

  const [topKSearch, setTopKSearch] = useState("");
  const [selectedK, setSelectedK] = useState(3);

  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState("R03");

  // =========================================================
  // MODEL COMPARISON DATA
  // =========================================================

  const models = [
    {
      name: "CodeLlama 7B",
      model: "codellama:7b-instruct",
      accuracy: 77.27,
      hallucination: 4,
      latency: 50.92,
      ram: 4771.7,
      confidence: 0.7086,
      interpretation:
        "Highest measured quality with very low hallucination, but it has the highest latency and RAM usage."
    },
    {
      name: "Qwen 2.5 1.5B",
      model: "qwen2.5:1.5b",
      accuracy: 59.09,
      hallucination: 20,
      latency: 9.63,
      ram: 1108.3,
      confidence: 0.7086,
      interpretation:
        "Fastest and most memory-efficient model, but its measured accuracy is lower and hallucination rate is higher."
    },
    {
      name: "Phi3 Mini",
      model: "phi3:mini",
      accuracy: 77.27,
      hallucination: 4,
      latency: 27.84,
      ram: 2922.7,
      confidence: 0.7086,
      interpretation:
        "Matches CodeLlama on measured accuracy and hallucination, while being faster and using less RAM."
    }
  ];

  const filteredModels = models.filter((model) =>
    `${model.name} ${model.model}`
      .toLowerCase()
      .includes(modelSearch.toLowerCase())
  );

  const currentModel =
    models.find((model) => model.name === selectedModel) || models[0];

  // =========================================================
  // TOP-K DATA
  // =========================================================

  const topKData = [
    {
      k: 1,
      latency: 29.59,
      score: 0.6989,
      context: 593.5,
      insight:
        "Lowest latency and highest average similarity, but only one retrieved chunk is provided to the LLM."
    },
    {
      k: 3,
      latency: 49.28,
      score: 0.6900,
      context: 1696.8,
      insight:
        "Practical balance between retrieval context and response latency in this experiment."
    },
    {
      k: 5,
      latency: 66.65,
      score: 0.6808,
      context: 2920.5,
      insight:
        "Provides the most context but increases latency and includes lower-ranked chunks, reducing average similarity."
    }
  ];

  const filteredTopK = topKData.filter((item) =>
    `k ${item.k} ${item.latency} ${item.score} ${item.context}`
      .toLowerCase()
      .includes(topKSearch.toLowerCase())
  );

  const currentK =
    topKData.find((item) => item.k === selectedK) || topKData[1];

  // =========================================================
  // REPOSITORY RAG DATA
  // =========================================================

  const repositoryQuestions = [
    {
      id: "R01",
      question: "What happens after a user uploads a policy PDF?",
      average: 0.6105,
      top: 0.6228,
      files: [
        "backend/app/api/upload.py",
        "frontend/src/App.jsx"
      ],
      answer:
        "The uploaded document is independently chunked, embedded and searched before generating an answer.",
      analysis:
        "Retrieval was reasonably focused on the upload flow. The generated answer is concise and captures the main pipeline at a high level."
    },

    {
      id: "R02",
      question:
        "Which backend components are involved in processing an uploaded PDF?",
      average: 0.6142,
      top: 0.6441,
      files: [
        "frontend/src/App.jsx",
        "backend/app/services/document_processor.py",
        "backend/app/services/upload_rag_service.py"
      ],
      answer:
        "The answer identifies document_processor.py and upload_rag_service.py as components involved in PDF processing.",
      analysis:
        "Relevant backend files were retrieved. However, the generated answer duplicated some component descriptions, so retrieval quality was better than answer precision."
    },

    {
      id: "R03",
      question:
        "How does InsureMate convert policy documents into embeddings?",
      average: 0.6406,
      top: 0.6550,
      files: [
        "frontend/src/App.jsx",
        "backend/app/main.py",
        "backend/app/api/upload.py"
      ],
      answer:
        "It appears that InsureMate uses a combination of natural language processing and machine learning techniques to convert policy documents into embeddings. The evidence suggests that the frontend application sends a question to the backend API, which then calls an Ollama model to generate an answer based on the provided policy evidence.\n\nThe process appears to involve document processing, chunking, Nomic embedding and answer generation.",
      analysis:
        "⚠️ Important failure case. Retrieval was reasonably strong, but the generated answer introduced unsupported claims and confused the embedding process with answer generation.\n\nKey insight: Good retrieval does not automatically produce a correct answer."
    },

    {
      id: "R04",
      question:
        "How does the retrieval system find the most relevant chunks?",
      average: 0.6622,
      top: 0.6740,
      files: [
        "backend/app/main.py",
        "frontend/src/App.jsx",
        "backend/app/api/retrieval.py"
      ],
      answer:
        "The model described tokenization, stopword removal, stemming or lemmatization, vectorization and ranking before selecting the top chunks.",
      analysis:
        "⚠️ Strong retrieval score but inaccurate explanation. The answer introduced NLP preprocessing steps that are not the actual retrieval implementation.\n\nThis is another example where retrieval quality alone is not enough."
    },

    {
      id: "R05",
      question:
        "Which endpoint is used to retrieve policy evidence?",
      average: 0.6250,
      top: 0.6400,
      files: [
        "backend/app/api/upload.py",
        "frontend/src/App.jsx",
        "backend/app/main.py"
      ],
      answer:
        "The model guessed that the upload endpoint was used to retrieve policy evidence and proposed additional endpoints.",
      analysis:
        "⚠️ Retrieval returned related backend evidence, but the model guessed an endpoint instead of staying strictly within the retrieved evidence. This is a repository-level hallucination."
    },

    {
      id: "R06",
      question:
        "Trace the flow of a user question from the frontend to the final answer.",
      average: 0.5835,
      top: 0.6109,
      files: [
        "backend/app/main.py",
        "frontend/src/App.jsx"
      ],
      answer:
        "The model described a frontend request, backend chat processing, grounding calculation and a response returned to the frontend.",
      analysis:
        "The retrieval score was lower than several other questions. The answer captured the broad flow but included unsupported details about how grounding generates the answer."
    },

    {
      id: "R07",
      question:
        "Which files are involved in the RAG pipeline?",
      average: 0.5643,
      top: 0.5750,
      files: [
        "backend/app/main.py",
        "backend/app/services/document_processor.py",
        "frontend/src/App.jsx",
        "frontend/src/App.css",
        "docker/Dockerfile.backend"
      ],
      answer:
        "The model listed five files as being involved in the RAG pipeline.",
      analysis:
        "This question had the lowest average retrieval score among the repository questions. The retrieved files provide some relevant evidence, but the result is not necessarily a complete list of the complete RAG implementation."
    },

    {
      id: "R08",
      question:
        "What happens when a PDF is uploaded that already exists in the knowledge base?",
      average: 0.6356,
      top: 0.6972,
      files: [
        "backend/app/services/upload_rag_service.py",
        "frontend/src/App.jsx",
        "backend/app/api/upload.py"
      ],
      answer:
        "The model described checking whether the PDF already exists and returning without further processing when it does. It also described the normal processing path for a new document.",
      analysis:
        "High top retrieval score indicates strong evidence was retrieved. The answer generally follows the upload-session and document-processing flow, although some details should still be verified against source code."
    },

    {
      id: "R09",
      question:
        "How are uploaded documents kept separate using upload sessions?",
      average: 0.6146,
      top: 0.6441,
      files: [
        "frontend/src/App.jsx",
        "backend/app/api/upload.py",
        "backend/app/services/upload_rag_service.py"
      ],
      answer:
        "The model explained that unique upload-session information is used to associate uploaded documents and their embeddings with a particular session.",
      analysis:
        "Relevant upload-session files were retrieved. However, the generated response appears to mix frontend storage behavior with backend session storage, so source-level verification is important."
    },

    {
      id: "R10",
      question:
        "Which components would need to change if the embedding model were replaced?",
      average: 0.6098,
      top: 0.6247,
      files: [
        "backend/app/services/embedding_service.py",
        "frontend/src/App.jsx",
        "backend/app/services/upload_rag_service.py"
      ],
      answer:
        "The model identified embedding_service.py and upload_rag_service.py, and also suggested changes to App.jsx.",
      analysis:
        "The embedding service is directly relevant. The frontend change is questionable because the embedding generation is primarily a backend concern. This demonstrates the importance of repository evidence over model assumptions."
    }
  ];

  const filteredRepository = repositoryQuestions.filter((item) =>
    `${item.id} ${item.question} ${item.files.join(" ")}`
      .toLowerCase()
      .includes(repoSearch.toLowerCase())
  );

  const currentRepo =
    repositoryQuestions.find((item) => item.id === selectedRepoId) ||
    filteredRepository[0] ||
    repositoryQuestions[0];

  // =========================================================
  // SUMMARY METRICS
  // =========================================================

  const bestAccuracy = Math.max(...models.map((m) => m.accuracy));
  const lowestHallucination = Math.min(
    ...models.map((m) => m.hallucination)
  );
  const fastestModel = models.reduce((a, b) =>
    a.latency < b.latency ? a : b
  );
  const lowestRam = models.reduce((a, b) =>
    a.ram < b.ram ? a : b
  );

  const repositoryAverage =
    repositoryQuestions.reduce((sum, q) => sum + q.average, 0) /
    repositoryQuestions.length;

  // =========================================================
  // UI HELPERS
  // =========================================================

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "22px",
    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)"
  };

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "10px",
    fontSize: "14px",
    outline: "none",
    background: "#ffffff"
  };

  const smallButton = (active) => ({
    border: active ? "1px solid #4f46e5" : "1px solid #e5e7eb",
    background: active ? "#eef2ff" : "#ffffff",
    color: active ? "#4338ca" : "#475569",
    padding: "9px 14px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: active ? "600" : "500"
  });

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      style={{
        padding: "34px",
        background: "#f8fafc",
        minHeight: "100vh",
        color: "#0f172a"
      }}
    >
      {/* HEADER */}
      <header style={{ marginBottom: "30px" }}>
        <div
          style={{
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "0.12em",
            color: "#4f46e5",
            marginBottom: "8px"
          }}
        >
          INSUREMATE • WEEK 4 ANALYSIS
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "32px",
            fontWeight: "750"
          }}
        >
          Evaluation Insights
        </h1>

        <p
          style={{
            marginTop: "9px",
            color: "#64748b",
            fontSize: "15px"
          }}
        >
          Interactive interpretation of model performance, retrieval
          configuration and repository-level RAG results.
        </p>
      </header>

      {/* =====================================================
          OVERALL INSIGHTS
      ===================================================== */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "28px"
        }}
      >
        <div style={cardStyle}>
          <div style={{ color: "#64748b", fontSize: "12px" }}>
            BEST ACCURACY
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "750",
              marginTop: "7px"
            }}
          >
            {bestAccuracy}%
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "#475569"
            }}
          >
            CodeLlama / Phi3
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#64748b", fontSize: "12px" }}>
            LOWEST HALLUCINATION
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "750",
              marginTop: "7px"
            }}
          >
            {lowestHallucination}%
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "#475569"
            }}
          >
            CodeLlama / Phi3
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#64748b", fontSize: "12px" }}>
            FASTEST MODEL
          </div>
          <div
            style={{
              fontSize: "25px",
              fontWeight: "750",
              marginTop: "7px"
            }}
          >
            {fastestModel.latency}s
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "#475569"
            }}
          >
            {fastestModel.name}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ color: "#64748b", fontSize: "12px" }}>
            LOWEST RAM
          </div>
          <div
            style={{
              fontSize: "25px",
              fontWeight: "750",
              marginTop: "7px"
            }}
          >
            {lowestRam.ram} MB
          </div>
          <div
            style={{
              marginTop: "6px",
              fontSize: "13px",
              color: "#475569"
            }}
          >
            {lowestRam.name}
          </div>
        </div>
      </section>

      {/* =====================================================
          MODEL PERFORMANCE
      ===================================================== */}

      <section style={{ marginBottom: "30px" }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "21px" }}>
              Model Performance Explorer
            </h2>

            <p
              style={{
                margin: "7px 0 16px",
                color: "#64748b",
                fontSize: "14px"
              }}
            >
              Search or select a model to understand the quality,
              hallucination, speed and resource trade-off.
            </p>

            <input
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="🔍 Search model..."
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "9px",
              flexWrap: "wrap",
              marginBottom: "22px"
            }}
          >
            {filteredModels.map((model) => (
              <button
                key={model.name}
                onClick={() => setSelectedModel(model.name)}
                style={smallButton(selectedModel === model.name)}
              >
                {model.name}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "14px"
            }}
          >
            {[
              ["Accuracy", `${currentModel.accuracy}%`],
              ["Hallucination", `${currentModel.hallucination}%`],
              ["Latency", `${currentModel.latency}s`],
              ["RAM", `${currentModel.ram} MB`]
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: "18px",
                  background: "#f8fafc",
                  borderRadius: "12px"
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b"
                  }}
                >
                  {label}
                </div>

                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "750",
                    marginTop: "7px"
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "18px",
              padding: "17px",
              background: "#eef2ff",
              borderRadius: "12px"
            }}
          >
            <div
              style={{
                fontWeight: "700",
                color: "#3730a3",
                marginBottom: "6px"
              }}
            >
              Interpretation
            </div>

            <div
              style={{
                color: "#4338ca",
                fontSize: "14px",
                lineHeight: 1.6
              }}
            >
              {currentModel.interpretation}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          TOP K
      ===================================================== */}

      <section style={{ marginBottom: "30px" }}>
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: "21px" }}>
            Top-K Retrieval Explorer
          </h2>

          <p
            style={{
              margin: "7px 0 16px",
              color: "#64748b",
              fontSize: "14px"
            }}
          >
            Investigate how the number of retrieved chunks affects
            similarity, context size and latency.
          </p>

          <input
            value={topKSearch}
            onChange={(e) => setTopKSearch(e.target.value)}
            placeholder="🔍 Search K, latency, similarity or context..."
            style={inputStyle}
          />

          <div
            style={{
              display: "flex",
              gap: "9px",
              marginTop: "16px",
              marginBottom: "20px"
            }}
          >
            {filteredTopK.map((item) => (
              <button
                key={item.k}
                onClick={() => setSelectedK(item.k)}
                style={smallButton(selectedK === item.k)}
              >
                K = {item.k}
                {item.k === 3 ? " ⭐" : ""}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "14px"
            }}
          >
            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "12px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                LATENCY
              </div>
              <div
                style={{
                  fontSize: "25px",
                  fontWeight: "750",
                  marginTop: "6px"
                }}
              >
                {currentK.latency}s
              </div>
            </div>

            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "12px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                AVG. SIMILARITY
              </div>
              <div
                style={{
                  fontSize: "25px",
                  fontWeight: "750",
                  marginTop: "6px"
                }}
              >
                {currentK.score}
              </div>
            </div>

            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "12px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                CONTEXT
              </div>
              <div
                style={{
                  fontSize: "25px",
                  fontWeight: "750",
                  marginTop: "6px"
                }}
              >
                {currentK.context} chars
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "18px",
              padding: "17px",
              background: "#f0fdf4",
              borderRadius: "12px"
            }}
          >
            <div
              style={{
                fontWeight: "700",
                color: "#166534",
                marginBottom: "6px"
              }}
            >
              Retrieval Insight
            </div>

            <div
              style={{
                color: "#166534",
                fontSize: "14px",
                lineHeight: 1.6
              }}
            >
              {currentK.insight}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          REPOSITORY RAG
      ===================================================== */}

      <section style={{ marginBottom: "30px" }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: "20px" }}>
            <h2 style={{ margin: 0, fontSize: "21px" }}>
              Repository RAG Analysis
            </h2>

            <p
              style={{
                margin: "7px 0 16px",
                color: "#64748b",
                fontSize: "14px"
              }}
            >
              Search a repository question and inspect the relationship
              between retrieved evidence and the generated answer.
            </p>

            <input
              value={repoSearch}
              onChange={(e) => setRepoSearch(e.target.value)}
              placeholder="🔍 Search R01-R10, question, file or topic..."
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              marginBottom: "22px"
            }}
          >
            {filteredRepository.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedRepoId(item.id)}
                style={smallButton(selectedRepoId === item.id)}
              >
                {item.id}
              </button>
            ))}
          </div>

          {/* QUESTION */}
          <div
            style={{
              padding: "20px",
              border: "1px solid #e5e7eb",
              borderRadius: "13px",
              marginBottom: "16px"
            }}
          >
            <div
              style={{
                color: "#4f46e5",
                fontWeight: "750",
                fontSize: "13px",
                marginBottom: "8px"
              }}
            >
              {currentRepo.id}
            </div>

            <div
              style={{
                fontSize: "18px",
                fontWeight: "650",
                lineHeight: 1.5
              }}
            >
              {currentRepo.question}
            </div>
          </div>

          {/* RETRIEVAL METRICS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "14px",
              marginBottom: "18px"
            }}
          >
            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "12px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                AVERAGE RETRIEVAL SCORE
              </div>

              <div
                style={{
                  fontSize: "25px",
                  fontWeight: "750",
                  marginTop: "6px"
                }}
              >
                {currentRepo.average}
              </div>
            </div>

            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "12px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                TOP RETRIEVAL SCORE
              </div>

              <div
                style={{
                  fontSize: "25px",
                  fontWeight: "750",
                  marginTop: "6px"
                }}
              >
                {currentRepo.top}
              </div>
            </div>

            <div
              style={{
                padding: "18px",
                background: "#f8fafc",
                borderRadius: "12px"
              }}
            >
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                REPOSITORY CHUNKS
              </div>

              <div
                style={{
                  fontSize: "25px",
                  fontWeight: "750",
                  marginTop: "6px"
                }}
              >
                5
              </div>
            </div>
          </div>

          {/* RETRIEVED FILES */}
          <div
            style={{
              padding: "18px",
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              marginBottom: "16px"
            }}
          >
            <div
              style={{
                fontWeight: "700",
                marginBottom: "12px"
              }}
            >
              Retrieved Files
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {currentRepo.files.map((file, index) => (
                <div
                  key={`${file}-${index}`}
                  style={{
                    padding: "9px 11px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    fontFamily: "monospace",
                    fontSize: "13px"
                  }}
                >
                  {index + 1}. {file}
                </div>
              ))}
            </div>
          </div>

          {/* ANSWER */}
          <div
            style={{
              padding: "18px",
              background: "#f8fafc",
              borderRadius: "12px",
              marginBottom: "16px"
            }}
          >
            <div
              style={{
                fontWeight: "700",
                marginBottom: "10px"
              }}
            >
              Generated Answer
            </div>

            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: "14px",
                lineHeight: 1.65,
                color: "#334155"
              }}
            >
              {currentRepo.answer}
            </div>
          </div>

          {/* ANALYSIS */}
          <div
            style={{
              padding: "18px",
              background:
                currentRepo.id === "R03" ||
                currentRepo.id === "R04" ||
                currentRepo.id === "R05"
                  ? "#fff7ed"
                  : "#eef2ff",
              borderRadius: "12px"
            }}
          >
            <div
              style={{
                fontWeight: "750",
                marginBottom: "8px",
                color:
                  currentRepo.id === "R03" ||
                  currentRepo.id === "R04" ||
                  currentRepo.id === "R05"
                    ? "#9a3412"
                    : "#3730a3"
              }}
            >
              Analysis / Insight
            </div>

            <div
              style={{
                fontSize: "14px",
                lineHeight: 1.65,
                color:
                  currentRepo.id === "R03" ||
                  currentRepo.id === "R04" ||
                  currentRepo.id === "R05"
                    ? "#9a3412"
                    : "#4338ca"
              }}
            >
              {currentRepo.analysis}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FINAL RESEARCH INSIGHT
      ===================================================== */}

      <section style={{ marginBottom: "30px" }}>
        <div
          style={{
            ...cardStyle,
            background: "#0f172a",
            color: "#ffffff"
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.1em",
              fontWeight: "700",
              marginBottom: "9px"
            }}
          >
            OVERALL RESEARCH INSIGHT
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "23px"
            }}
          >
            Retrieval quality and answer quality are separate stages.
          </h2>

          <p
            style={{
              marginTop: "12px",
              color: "#cbd5e1",
              lineHeight: 1.7,
              fontSize: "14px"
            }}
          >
            The repository experiment shows that a model can receive
            reasonably strong retrieved evidence and still generate an
            inaccurate or unsupported explanation. R03, R04 and R05 are
            useful examples of this behavior. Therefore, repository-level
            RAG evaluation should inspect not only retrieval similarity,
            but also whether the final answer is actually supported by
            the retrieved code.
          </p>

          <div
            style={{
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "12px"
            }}
          >
            <div
              style={{
                padding: "14px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "10px"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                REPOSITORY QUESTIONS
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  marginTop: "5px"
                }}
              >
                10
              </div>
            </div>

            <div
              style={{
                padding: "14px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "10px"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                RETRIEVED CHUNKS
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  marginTop: "5px"
                }}
              >
                50
              </div>
            </div>

            <div
              style={{
                padding: "14px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "10px"
              }}
            >
              <div style={{ color: "#94a3b8", fontSize: "12px" }}>
                OVERALL AVG. RETRIEVAL
              </div>
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  marginTop: "5px"
                }}
              >
                {repositoryAverage.toFixed(4)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default EvaluationInsightsPage;