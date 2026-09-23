

// function UploadPolicyPage() {
//   const [file, setFile] = React.useState(null);

//   const [session, setSession] = React.useState(() => {
//     try {
//       const savedSession = localStorage.getItem(
//         "insuremate_upload_session"
//       );

//       return savedSession
//         ? JSON.parse(savedSession)
//         : null;
//     } catch (error) {
//       console.error(
//         "Failed to restore upload session:",
//         error
//       );

//       return null;
//     }
//   });

//   const [question, setQuestion] = React.useState("");
//   const [answer, setAnswer] = React.useState("");
//   const [results, setResults] = React.useState([]);
//   const [chunks, setChunks] = React.useState([]);
//   const [showChunkInspector, setShowChunkInspector] =
//     React.useState(false);

//   const [showEmbeddingInspector, setShowEmbeddingInspector] =
//     React.useState(false);

//   const [uploadedEmbeddings, setUploadedEmbeddings] =
//     React.useState([]);

//   const [selectedEmbeddingChunk, setSelectedEmbeddingChunk] =
//     React.useState(0);

//   const [embeddingLoading, setEmbeddingLoading] =
//     React.useState(false);

//   const [loading, setLoading] = React.useState(false);
//   const [uploading, setUploading] = React.useState(false);

//   // Mode 2 AI Assistant conversation
//   const [chatMessages, setChatMessages] = React.useState([]);

//   const [error, setError] = React.useState("");

//   const uploadPDF = async () => {
//     if (!file) {
//       setError("Please select a PDF first.");
//       return;
//     }

//     setUploading(true);
//     setError("");
//     setAnswer("");
//     setResults([]);
//     setChatMessages([]);
//     setChunks([]);
//     setUploadedEmbeddings([]);

//     try {
//       const formData = new FormData();

//       formData.append("file", file);

//       const response = await fetch(
//         `${API_URL}/api/upload`,
//         {
//           method: "POST",
//           body: formData
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.detail || "PDF upload failed."
//         );
//       }

//       // Save session in React state
//       setSession(data);

//       // Persist session when navigating to another page
//       localStorage.setItem(
//         "insuremate_upload_session",
//         JSON.stringify(data)
//       );

//     } catch (err) {
//       setError(err.message);

//     } finally {
//       setUploading(false);
//     }
//   };

//   const askUploadedPolicy = async () => {
//     if (loading) {
//       return;
//     }

//     if (!session) {
//       setError("Upload a PDF first.");
//       return;
//     }

//     if (!question.trim()) {
//       setError("Enter a question.");
//       return;
//     }

//     const userQuestion = question.trim();

//     setLoading(true);
//     setError("");
//     setQuestion("");

//     // Immediately add the user's message
//     setChatMessages((prev) => [
//       ...prev,
//       {
//         role: "user",
//         content: userQuestion
//       }
//     ]);

//     try {
//       const response = await fetch(`${API_URL}/api/upload/chat`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           session_id: session.session_id,
//           question: userQuestion,
//           model: "codellama:7b-instruct",
//           top_k: 3
//         })
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.detail || "Unable to answer question."
//         );
//       }

//       const aiAnswer = data.answer || "";
//       const retrievedChunks = data.retrieved_chunks || [];

//       setAnswer(aiAnswer);
//       setResults(retrievedChunks);

//       // Add AI response with its own retrieved evidence
//       setChatMessages((prev) => [
//         ...prev,
//         {
//           role: "assistant",
//           content: aiAnswer,
//           sources: retrievedChunks,
//           confidence: data.retrieval_confidence
//         }
//       ]);

//     } catch (err) {

//       setError(err.message);

//       setChatMessages((prev) => [
//         ...prev,
//         {
//           role: "assistant",
//           content:
//             "Sorry, I couldn't process that question.",
//           error: true
//         }
//       ]);

//     } finally {
//       setLoading(false);
//     }
//   };




// const resetUpload = () => {
//   setFile(null);
//   setSession(null);
//   setQuestion("");
//   setAnswer("");
//   setResults([]);
//   setChunks([]);
//   setUploadedEmbeddings([]);
//   setChatMessages([]);
//   setShowChunkInspector(false);
//   setShowEmbeddingInspector(false);
//   setSelectedEmbeddingChunk(0);
//   setError("");

//   localStorage.removeItem(
//     "insuremate_upload_session"
//   );
// };

//   return (
//     <section>
//       <header className="topbar">
//         <div>
//           <p className="eyebrow">MODE 2</p>
//           <h1>Upload Your Own Policy</h1>
//           <p className="subtitle">
//             Upload any insurance policy PDF and ask questions using RAG.
//           </p>
//         </div>
//       </header>

//       <section className="chat-card">
//         <div className="chat-header">
//           <div>
//             <h2>Upload Policy Document</h2>
//             <p>
//               The uploaded document is independently chunked, embedded and
//               searched before generating an answer.
//             </p>
//           </div>
//         </div>

//         <div style={{
//           padding: "24px",
//           border: "2px dashed #d1d5db",
//           borderRadius: "12px",
//           marginTop: "20px",
//           background: "#fafafa"
//         }}>
//           <input
//             type="file"
//             accept=".pdf,application/pdf"
//             onChange={(e) => {
//               setFile(e.target.files?.[0] || null);
//               setError("");
//             }}
//           />

//           {file && (
//             <p style={{ marginTop: "12px" }}>
//               Selected: <strong>{file.name}</strong>
//             </p>
//           )}

//           <div style={{ marginTop: "16px" }}>
//             <button
//               className="ask-button"
//               onClick={uploadPDF}
//               disabled={uploading || !file}
//             >
//               {uploading ? "Processing PDF..." : "Upload & Process PDF →"}
//             </button>

//             {session && (
//               <button
//                 className="clear-chat-button"
//                 onClick={resetUpload}
//                 style={{ marginLeft: "10px" }}
//               >
//                 Upload Another PDF
//               </button>
//             )}
//           </div>

//           {error && (
//             <p style={{
//               marginTop: "15px",
//               color: "#b91c1c"
//             }}>
//               {error}
//             </p>
//           )}
//         </div>
//       </section>

//       {session && (
//         <>
//           <section className="status-grid" style={{ marginTop: "20px" }}>
//             <div className="status-card">
//               <div className="card-label">UPLOADED DOCUMENT</div>
//               <div
//                 className="card-value"
//                 style={{ fontSize: "17px" }}
//               >
//                 {session.document}
//               </div>
//               <div className="card-status">● Ready</div>
//             </div>

//             <div
//               className="status-card"
//               onClick={async () => {
//                 try {
//                   setLoading(true);
//                   setError("");

//                   const response = await fetch(
//                     `${API_URL}/api/upload/chunks`,
//                     {
//                       method: "POST",
//                       headers: {
//                         "Content-Type": "application/json"
//                       },
//                       body: JSON.stringify({
//                         session_id: session.session_id
//                       })
//                     }
//                   );

//                   const data = await response.json();

//                   if (!response.ok) {
//                     throw new Error(
//                       data.detail || "Unable to load chunks."
//                     );
//                   }

//                   setChunks(data.chunks || []);
//                   setShowChunkInspector(true);
//                 } catch (err) {
//                   setError(err.message);
//                 } finally {
//                   setLoading(false);
//                 }
//               }}
//               style={{
//                 cursor: "pointer"
//               }}
//             >
//               <div className="card-label">CHUNKS</div>
//               <div className="card-value">{session.chunks}</div>
//               <div className="card-status">● Processed · Click to inspect</div>
//             </div>

//             <div
//               className="status-card"
//               style={{ cursor: "pointer" }}
//               onClick={async () => {
//                 try {
//                   setEmbeddingLoading(true);
//                   setError("");

//                   const response = await fetch(
//                     `${API_URL}/api/upload/embeddings`,
//                     {
//                       method: "POST",
//                       headers: {
//                         "Content-Type": "application/json"
//                       },
//                       body: JSON.stringify({
//                         session_id: session.session_id
//                       })
//                     }
//                   );

//                   const data = await response.json();

//                   if (!response.ok) {
//                     throw new Error(
//                       data.detail || "Unable to load embeddings."
//                     );
//                   }

//                   setUploadedEmbeddings(data.embeddings || []);
//                   setSelectedEmbeddingChunk(0);
//                   setShowEmbeddingInspector(true);
//                 } catch (err) {
//                   setError(err.message);
//                 } finally {
//                   setEmbeddingLoading(false);
//                 }
//               }}
//             >
//               <div className="card-label">
//                 EMBEDDING DIMENSIONS
//               </div>

//               <div className="card-value">
//                 {embeddingLoading
//                   ? "Loading..."
//                   : session.embedding_dimensions}
//               </div>

//               <div className="card-status">
//                 ● Embedded · Click to inspect
//               </div>
//             </div>

//             <div className="status-card">
//               <div className="card-label">RAG STATUS</div>
//               <div className="card-value">Active</div>
//               <div className="card-status">● Ready</div>
//             </div>
//           </section>

//           {showChunkInspector && chunks.length > 0 && (
//             <section
//               className="pipeline-card"
//               style={{ marginTop: "20px" }}
//             >
//               <div
//                 className="pipeline-title"
//                 style={{
//                   display: "flex",
//                   justifyContent: "space-between",
//                   alignItems: "center"
//                 }}
//               >
//                 <div>
//                   <h2>Chunk Inspector</h2>
//                   <p>
//                     Inspect how your uploaded policy was divided before
//                     embedding and retrieval.
//                   </p>
//                 </div>

//                 <button
//                   className="clear-chat-button"
//                   onClick={() => setShowChunkInspector(false)}
//                 >
//                   ← Back to Policy Chat
//                 </button>
//               </div>

//               {/* CHUNKING CONFIGURATION */}

//               <div
//                 style={{
//                   marginTop: "20px",
//                   padding: "22px",
//                   border: "1px solid #1e3354",
//                   borderRadius: "12px",
//                   background: "#0d1526"
//                 }}
//               >
//                 <h2 style={{ marginBottom: "6px" }}>
//                   Chunking Configuration
//                 </h2>

//                 <p style={{
//                   color: "#94a3b8",
//                   marginBottom: "20px"
//                 }}>
//                   Parameters used during document preprocessing.
//                 </p>

//                 <div
//                   style={{
//                     display: "grid",
//                     gridTemplateColumns:
//                       "repeat(4, minmax(150px, 1fr))",
//                     gap: "15px"
//                   }}
//                 >
//                   <div className="status-card">
//                     <div className="card-label">
//                       CHUNK SIZE
//                     </div>
//                     <div className="card-value">
//                       600
//                     </div>
//                     <div className="card-status">
//                       characters
//                     </div>
//                   </div>

//                   <div className="status-card">
//                     <div className="card-label">
//                       OVERLAP
//                     </div>
//                     <div className="card-value">
//                       100
//                     </div>
//                     <div className="card-status">
//                       characters
//                     </div>
//                   </div>

//                   <div className="status-card">
//                     <div className="card-label">
//                       STEP SIZE
//                     </div>
//                     <div className="card-value">
//                       500
//                     </div>
//                     <div className="card-status">
//                       characters
//                     </div>
//                   </div>

//                   <div className="status-card">
//                     <div className="card-label">
//                       TOTAL CHUNKS
//                     </div>
//                     <div className="card-value">
//                       {chunks.length}
//                     </div>
//                     <div className="card-status">
//                       in document
//                     </div>
//                   </div>
//                 </div>

//                 {/* OVERLAP EXPLANATION */}

//                 <div
//                   style={{
//                     marginTop: "22px",
//                     padding: "18px",
//                     borderRadius: "10px",
//                     background: "#f9fafb",
//                     border: "1px solid #e5e7eb"
//                   }}
//                 >
//                   <h3 style={{ marginBottom: "8px" }}>
//                     How Chunk Overlap Works
//                   </h3>

//                   <p style={{
//                     color: "#94a3b8",
//                     lineHeight: "1.6"
//                   }}>
//                     Each new chunk starts 500 characters after the
//                     previous chunk, leaving 100 characters of shared
//                     context.
//                   </p>

//                   <div
//                     style={{
//                       display: "flex",
//                       gap: "20px",
//                       alignItems: "center",
//                       marginTop: "18px",
//                       flexWrap: "wrap"
//                     }}
//                   >
//                     <div>
//                       <strong>CHUNK #1</strong>
//                       <div style={{ marginTop: "6px" }}>
//                         0 → 600
//                       </div>
//                     </div>

//                     <div style={{ fontSize: "24px" }}>
//                       ↔
//                     </div>

//                     <div>
//                       <strong>CHUNK #2</strong>
//                       <div style={{ marginTop: "6px" }}>
//                         500 → 1100
//                       </div>
//                     </div>
//                   </div>

//                   <p style={{
//                     marginTop: "15px",
//                     color: "#94a3b8"
//                   }}>
//                     600 character chunk − 100 character overlap ={" "}
//                     <strong>500 character step</strong>
//                   </p>
//                 </div>
//               </div>

//               {/* ACTUAL CHUNKS */}

//               <div
//                 style={{
//                   marginTop: "25px"
//                 }}
//               >
//                 <div className="chunks-heading">
//                   <div>
//                     <h2>Document Chunks</h2>
//                     <p>
//                       Showing the actual chunks generated from the
//                       uploaded PDF.
//                     </p>
//                   </div>

//                   <span>
//                     {chunks.length} chunks
//                   </span>
//                 </div>

//                 <div className="chunks-list">
//                   {chunks.map((chunk, index) => {
//                     const start = index * 500;
//                     const end = start + 600;

//                     return (
//                       <div
//                         className="chunk-card"
//                         key={
//                           chunk.chunk_id ??
//                           `${session?.document}-${index}`
//                         }
//                       >
//                         <div className="chunk-header">
//                           <div className="chunk-number">
//                             CHUNK #{index + 1}
//                           </div>

//                           <div className="chunk-page">
//                             Page {chunk.page ?? "N/A"}
//                           </div>
//                         </div>

//                         <div className="chunk-meta">
//                           <span>
//                             {chunk.text?.length ?? 0} characters
//                           </span>

//                           <span>
//                             Chunk ID: {chunk.chunk_id ?? index}
//                           </span>

//                           <span>
//                             Range: {start} → {end}
//                           </span>
//                         </div>

//                         <div className="chunk-text">
//                           {chunk.text}
//                         </div>

//                         <div className="chunk-boundary">
//                           <div>
//                             <span>START</span>
//                             <strong>{start}</strong>
//                           </div>

//                           <div className="boundary-line">
//                             <span>
//                               {chunk.text?.length ?? 0} characters
//                             </span>
//                           </div>

//                           <div>
//                             <span>END</span>
//                             <strong>{end}</strong>
//                           </div>
//                         </div>

//                         {index > 0 && (
//                           <div className="overlap-indicator">
//                             <span>
//                               ↳ 100 characters overlap
//                               with previous chunk
//                             </span>
//                           </div>
//                         )}
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>

//             </section>
//           )}

//           {showEmbeddingInspector && uploadedEmbeddings.length > 0 && (
//             <section
//               className="pipeline-card"
//               style={{ marginTop: "20px" }}
//             >

//               <div className="pipeline-title">
//                 <div>
//                   <h2>Embedding Inspector</h2>
//                   <p>
//                     Vector representation generated for your uploaded PDF.
//                   </p>
//                 </div>

//                 <button
//                   className="clear-chat-button"
//                   onClick={() => setShowEmbeddingInspector(false)}
//                 >
//                   ← Back to Policy Chat
//                 </button>
//               </div>

//               <div
//                 style={{
//                   display: "grid",
//                   gridTemplateColumns:
//                     "repeat(3, minmax(180px, 1fr))",
//                   gap: "15px",
//                   marginTop: "20px"
//                 }}
//               >

//                 <div className="status-card">
//                   <div className="card-label">
//                     EMBEDDING MODEL
//                   </div>
//                   <div className="card-value">
//                     nomic-embed-text
//                   </div>
//                   <div className="card-status">
//                     ● Active
//                   </div>
//                 </div>

//                 <div className="status-card">
//                   <div className="card-label">
//                     DIMENSIONS
//                   </div>
//                   <div className="card-value">
//                     {uploadedEmbeddings[0].embedding.length}
//                   </div>
//                   <div className="card-status">
//                     ● Per chunk
//                   </div>
//                 </div>

//                 <div className="status-card">
//                   <div className="card-label">
//                     EMBEDDED CHUNKS
//                   </div>
//                   <div className="card-value">
//                     {uploadedEmbeddings.length}
//                   </div>
//                   <div className="card-status">
//                     ● Complete
//                   </div>
//                 </div>

//               </div>

//               <div
//                 style={{
//                   marginTop: "25px",
//                   padding: "20px",
//                   border: "1px solid #1e3354",
//                   borderRadius: "12px",
//                   background: "#0d1526"
//                 }}
//               >

//                 <h2>Inspect a Chunk Embedding</h2>

//                 <p
//                   style={{
//                     color: "#94a3b8",
//                     marginTop: "6px"
//                   }}
//                 >
//                   Select a chunk to inspect its 768-dimensional vector.
//                 </p>

//                 <select
//                   value={selectedEmbeddingChunk}
//                   onChange={(e) =>
//                     setSelectedEmbeddingChunk(
//                       Number(e.target.value)
//                     )
//                   }
//                   style={{
//                     marginTop: "15px",
//                     padding: "10px",
//                     borderRadius: "8px",
//                     border: "1px solid #d1d5db",
//                     minWidth: "220px"
//                   }}
//                 >
//                   {uploadedEmbeddings.map((item, index) => (
//                     <option
//                       key={item.chunk_id}
//                       value={index}
//                     >
//                       Chunk {item.chunk_id} · Page {item.page}
//                     </option>
//                   ))}
//                 </select>

//               </div>

//               {(() => {
//                 const item =
//                   uploadedEmbeddings[selectedEmbeddingChunk];

//                 if (!item) return null;

//                 const vector = item.embedding;

//                 const min = Math.min(...vector);
//                 const max = Math.max(...vector);

//                 const mean =
//                   vector.reduce(
//                     (sum, value) => sum + value,
//                     0
//                   ) / vector.length;

//                 const magnitude = Math.sqrt(
//                   vector.reduce(
//                     (sum, value) =>
//                       sum + value * value,
//                     0
//                   )
//                 );

//                 return (
//                   <>
//                     <div
//                       style={{
//                         marginTop: "20px",
//                         padding: "20px",
//                         border: "1px solid #1e3354",
//                         borderRadius: "12px",
//                         background: "#0d1526"
//                       }}
//                     >

//                       <h2>
//                         Chunk {item.chunk_id} Embedding
//                       </h2>

//                       <p
//                         style={{
//                           color: "#94a3b8",
//                           marginTop: "6px"
//                         }}
//                       >
//                         Page {item.page}
//                       </p>

//                       <div
//                         style={{
//                           display: "grid",
//                           gridTemplateColumns:
//                             "repeat(4, minmax(130px, 1fr))",
//                           gap: "12px",
//                           marginTop: "20px"
//                         }}
//                       >

//                         <div>
//                           <strong>Dimensions</strong>
//                           <div>{vector.length}</div>
//                         </div>

//                         <div>
//                           <strong>Minimum</strong>
//                           <div>{min.toFixed(6)}</div>
//                         </div>

//                         <div>
//                           <strong>Maximum</strong>
//                           <div>{max.toFixed(6)}</div>
//                         </div>

//                         <div>
//                           <strong>Magnitude</strong>
//                           <div>{magnitude.toFixed(6)}</div>
//                         </div>

//                       </div>

//                     </div>

//                     <div
//                       style={{
//                         marginTop: "20px",
//                         padding: "20px",
//                         border: "1px solid #1e3354",
//                         borderRadius: "12px",
//                         background: "#0d1526"
//                       }}
//                     >

//                       <h2>Embedding Vector</h2>

//                       <p
//                         style={{
//                           color: "#94a3b8",
//                           marginBottom: "15px"
//                         }}
//                       >
//                         First 50 dimensions of the 768-dimensional
//                         embedding vector.
//                       </p>

//                       <div
//                         style={{
//                           display: "grid",
//                           gridTemplateColumns:
//                             "repeat(5, minmax(120px, 1fr))",
//                           gap: "8px"
//                         }}
//                       >

//                         {vector
//                           .slice(0, 50)
//                           .map((value, index) => (
//                             <div
//                               key={index}
//                               style={{
//                                 padding: "8px",
//                                 borderRadius: "6px",
//                                 background: "#f9fafb",
//                                 fontSize: "12px"
//                               }}
//                             >
//                               <strong>
//                                 {index + 1}
//                               </strong>
//                               <br />
//                               {value.toFixed(6)}
//                             </div>
//                           ))}

//                       </div>

//                     </div>
//                   </>
//                 );
//               })()}

//             </section>
//           )}

//           <section
//             className="chat-card"
//             style={{ marginTop: "20px" }}
//           >

//             <div className="chat-header">

//               <div>
//                 <h2>InsureMate AI Assistant</h2>

//                 <p>
//                   Ask questions about your uploaded insurance policy.
//                   Answers are generated using the retrieved policy evidence.
//                 </p>
//               </div>

//               <span className="model-badge">
//                 codellama:7b-instruct
//               </span>

//             </div>


//             {/* CHAT HISTORY */}

//             <div
//               style={{
//                 minHeight: "360px",
//                 maxHeight: "600px",
//                 overflowY: "auto",
//                 padding: "20px",
//                 marginTop: "15px"
//               }}
//             >

//               {chatMessages.length === 0 && (

//                 <div
//                   style={{
//                     textAlign: "center",
//                     padding: "70px 20px"
//                   }}
//                 >

//                   <div
//                     style={{
//                       fontSize: "42px",
//                       marginBottom: "15px"
//                     }}
//                   >
//                     🤖
//                   </div>

//                   <h2>
//                     Hi! I'm InsureMate
//                   </h2>

//                   <p
//                     style={{
//                       marginTop: "8px",
//                       color: "#94a3b8"
//                     }}
//                   >
//                     I've analyzed your uploaded policy.
//                     Ask me anything about it.
//                   </p>

//                 </div>

//               )}


//               {chatMessages.map((message, index) => (

//                 <div
//                   key={index}
//                   style={{
//                     marginBottom: "22px",
//                     display: "flex",
//                     justifyContent:
//                       message.role === "user"
//                         ? "flex-end"
//                         : "flex-start"
//                   }}
//                 >

//                   <div
//                     style={{
//                       maxWidth: "78%",
//                       padding: "15px 18px",
//                       borderRadius: "14px",
//                       background:
//                         message.role === "user"
//                           ? "#2563eb"
//                           : "#f3f4f6",
//                       color:
//                         message.role === "user"
//                           ? "#ffffff"
//                           : "#111827"
//                     }}
//                   >

//                     <div
//                       style={{
//                         fontSize: "12px",
//                         fontWeight: "700",
//                         marginBottom: "7px",
//                         opacity: 0.75
//                       }}
//                     >
//                       {message.role === "user"
//                         ? "YOU"
//                         : "INSUREMATE AI"}
//                     </div>

//                     <div
//                       style={{
//                         lineHeight: "1.6",
//                         whiteSpace: "pre-wrap"
//                       }}
//                     >
//                       {message.content}
//                     </div>


//                     {/* RETRIEVED EVIDENCE */}

//                     {message.role === "assistant" &&
//                       message.sources &&
//                       message.sources.length > 0 && (

//                       <details
//                         style={{
//                           marginTop: "15px",
//                           borderTop:
//                             "1px solid rgba(107,114,128,0.25)",
//                           paddingTop: "10px"
//                         }}
//                       >

//                         <summary
//                           style={{
//                             cursor: "pointer",
//                             fontWeight: "600",
//                             fontSize: "13px"
//                           }}
//                         >
//                           View Retrieved Evidence
//                         </summary>

//                         <div
//                           style={{
//                             marginTop: "12px",
//                             display: "grid",
//                             gap: "10px"
//                           }}
//                         >

//                           {message.sources.map(
//                             (item, sourceIndex) => (

//                             <div
//                               key={`${item.chunk_id}-${sourceIndex}`}
//                               style={{
//                                 padding: "12px",
//                                 borderRadius: "8px",
//                                 background:
//                                   "rgba(107,114,128,0.08)"
//                               }}
//                             >

//                               <div
//                                 style={{
//                                   display: "flex",
//                                   justifyContent:
//                                     "space-between",
//                                   fontSize: "12px",
//                                   fontWeight: "700"
//                                 }}
//                               >

//                                 <span>
//                                   Result #{sourceIndex + 1}
//                                 </span>

//                                 <span>
//                                   Similarity{" "}
//                                   {(item.score * 100).toFixed(1)}%
//                                 </span>

//                               </div>

//                               <div
//                                 style={{
//                                   marginTop: "6px",
//                                   fontSize: "12px",
//                                   opacity: 0.7
//                                 }}
//                               >
//                                 {item.document}
//                                 {" · "}
//                                 Page {item.page}
//                                 {" · "}
//                                 Chunk {item.chunk_id}
//                               </div>

//                               <div
//                                 style={{
//                                   marginTop: "8px",
//                                   fontSize: "13px",
//                                   lineHeight: "1.5"
//                                 }}
//                               >
//                                 {item.text}
//                               </div>

//                             </div>

//                           ))}

//                         </div>

//                       </details>

//                     )}

//                   </div>

//                 </div>

//               ))}


//               {loading && (

//                 <div
//                   style={{
//                     display: "flex",
//                     justifyContent: "flex-start",
//                     marginBottom: "20px"
//                   }}
//                 >

//                   <div
//                     style={{
//                       padding: "15px 18px",
//                       borderRadius: "14px",
//                       background: "#0d1526",
//                       color: "#67e8f9",
//                       border: "1px solid #164e63",
//                       boxShadow: "0 0 18px rgba(34, 211, 238, 0.08)"
//                     }}
//                   >
//                     <strong>
//                       INSUREMATE AI
//                     </strong>

//                     <div
//                       style={{
//                         marginTop: "7px"
//                       }}
//                     >
//                       Analyzing your policy...
//                     </div>

//                   </div>

//                 </div>

//               )}

//             </div>


//             {/* CHAT INPUT */}

//             <div
//               style={{
//                 borderTop: "1px solid #e5e7eb",
//                 paddingTop: "18px"
//               }}
//             >

//               <div className="input-area">

//                 <textarea
//                   value={question}
//                   onChange={(e) =>
//                     setQuestion(e.target.value)
//                   }
//                   onKeyDown={(e) => {

//                     if (
//                       e.key === "Enter" &&
//                       !e.shiftKey
//                     ) {
//                       e.preventDefault();

//                       if (
//                         question.trim() &&
//                         !loading
//                       ) {
//                         askUploadedPolicy();
//                       }
//                     }

//                   }}
//                   placeholder="Ask anything about your uploaded policy..."
//                   rows="3"
//                   disabled={loading}
//                 />

//                 <div style={{
//                   display: "flex",
//                   gap: "10px",
//                   flexWrap: "wrap"
//                 }}>

//                   <button
//                     className="ask-button"
//                     onClick={askUploadedPolicy}
//                     disabled={
//                       loading ||
//                       !question.trim()
//                     }
//                   >
//                     {loading
//                       ? "Analyzing..."
//                       : "Send →"}
//                   </button>


//                 </div>

//               </div>


//               {chatMessages.length > 0 && (

//                 <button
//                   className="clear-chat-button"
//                   onClick={() =>
//                     setChatMessages([])
//                   }
//                   style={{
//                     marginTop: "10px"
//                   }}
//                 >
//                   Clear Conversation
//                 </button>

//               )}

//             </div>


//             {error && (

//               <p
//                 style={{
//                   marginTop: "12px",
//                   color: "#b91c1c"
//                 }}
//               >
//                 {error}
//               </p>

//             )}

//           </section>

//         </>
//       )}
//     </section>
//   );
// }


// import React from "react";
// import { useEffect, useState } from "react";
// import EvaluationInsightsPage from "./EvaluationInsightsPage";
// import "./App.css";

// const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

// function App() {
//   const [question, setQuestion] = useState("");
//   const [answer, setAnswer] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [responseTime, setResponseTime] = useState(null);
//   const [model, setModel] = useState("Code Llama 7B");

//   const [activePage, setActivePage] = useState("Dashboard");

//   const [chatModel, setChatModel] = useState("codellama:7b-instruct");

//   // AI Assistant conversation state
//   const [chatMessages, setChatMessages] = useState([]);
//   const [chatQuestion, setChatQuestion] = useState("");
//   const [chatLoading, setChatLoading] = useState(false);
//   const [chatResponseTime, setChatResponseTime] = useState(null);

//   // Documents
//   const [documents, setDocuments] = useState([]);
//   const [totalChunks, setTotalChunks] = useState(0);

//   // Chunk Inspector
//   const [selectedDocument, setSelectedDocument] = useState(null);
//   const [chunks, setChunks] = useState([]);
//   const [chunksLoading, setChunksLoading] = useState(false);

//   // Embeddings
//   const [embeddingDocument, setEmbeddingDocument] = useState(null);
//   const [embeddingChunk, setEmbeddingChunk] = useState(0);
//   const [embeddingData, setEmbeddingData] = useState(null);
//   const [embeddingLoading, setEmbeddingLoading] = useState(false);
//   // =========================================================
//   // LOAD DOCUMENTS
//   // =========================================================

//   useEffect(() => {
//     fetch(`${API_URL}/api/knowledge/documents`)
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Failed to fetch documents");
//         }

//         return response.json();
//       })
//       .then((data) => {
//         setDocuments(data.documents || []);
//         setTotalChunks(data.total_chunks || 0);
//       })
//       .catch((error) => {
//         console.error("Failed to load documents:", error);
//       });
//   }, []);

//   // =========================================================
//   // LOAD CHUNKS WHEN DOCUMENT IS SELECTED
//   // =========================================================

//   useEffect(() => {
//     if (
//       activePage !== "Chunk Inspector" ||
//       !selectedDocument
//     ) {
//       return;
//     }

//     setChunksLoading(true);
//     setChunks([]);

//     fetch(
//       `${API_URL}/api/knowledge/chunks?document=${encodeURIComponent(
//         selectedDocument
//       )}`
//     )
//       .then((response) => {
//         if (!response.ok) {
//           throw new Error("Failed to fetch chunks");
//         }

//         return response.json();
//       })
//       .then((data) => {
//         setChunks(data.chunks || []);
//       })
//       .catch((error) => {
//         console.error("Failed to load chunks:", error);
//       })
//       .finally(() => {
//         setChunksLoading(false);
//       });
//   }, [activePage, selectedDocument]);

//   // =========================================================
// // LOAD EMBEDDING
// // =========================================================

// useEffect(() => {
//   if (
//     activePage !== "Embeddings" ||
//     !embeddingDocument
//   ) {
//     return;
//   }

//   setEmbeddingLoading(true);
//   setEmbeddingData(null);

//   fetch(
//     `${API_URL}/api/knowledge/embeddings?document=${encodeURIComponent(
//       embeddingDocument
//     )}&chunk_id=${embeddingChunk}`
//   )
//     .then((response) => {
//       if (!response.ok) {
//         throw new Error("Failed to fetch embedding");
//       }

//       return response.json();
//     })
//     .then((data) => {
//       setEmbeddingData(data);
//     })
//     .catch((error) => {
//       console.error("Failed to load embedding:", error);
//     })
//     .finally(() => {
//       setEmbeddingLoading(false);
//     });
// }, [activePage, embeddingDocument, embeddingChunk]);

//   // =========================================================
//   // ASK INSUREMATE
//   // =========================================================

//   const askInsureMate = async () => {
//     if (!question.trim()) return;

//     setLoading(true);
//     setAnswer("");

//     const start = performance.now();

//   try {
//     const response = await fetch(
//       `${API_URL}/api/chat?question=${encodeURIComponent(
//         question
//       )}&model=${encodeURIComponent(chatModel)}`,
//       {
//         method: "POST"
//       }
//     );

//       if (!response.ok) {
//         throw new Error("Backend request failed");
//       }

//       const data = await response.json();

//       setAnswer(data.answer);
//       setModel(data.model);

//       setResponseTime(
//         ((performance.now() - start) / 1000).toFixed(2)
//       );
//     } catch (error) {
//        console.error("CHAT ERROR:", error);

//        setAnswer(
//         `Backend error: ${error.message}`
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

// // =========================================================
// // AI ASSISTANT CHAT
// // =========================================================

// const sendChatMessage = async () => {
//   const text = chatQuestion.trim();

//   if (!text || chatLoading) return;

//   const userMessage = {
//     role: "user",
//     content: text
//   };

//   const history = chatMessages.map((message) => ({
//     role: message.role,
//     content: message.content
//   }));

//   setChatMessages((previous) => [
//     ...previous,
//     userMessage
//   ]);

//   setChatQuestion("");
//   setChatLoading(true);

//   const start = performance.now();

//   try {
//     const response = await fetch(
//       `${API_URL}/api/chat`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           question: text,
//           history: history
//         })
//       }
//     );

//     if (!response.ok) {
//       const errorText = await response.text();

//       throw new Error(
//         `Backend request failed: ${response.status} ${errorText}`
//       );
//     }

//     const data = await response.json();

//     setChatMessages((previous) => [
//       ...previous,
//       {
//         role: "assistant",
//         content:
//           data.answer ||
//           "The available insurance documents do not contain enough information to answer this question."
//       }
//     ]);

//     // Backend automatically selects and orchestrates models
//     setModel(
//       data.model ||
//       "Multi-Model Orchestration"
//     );

//     setChatResponseTime(
//       ((performance.now() - start) / 1000).toFixed(2)
//     );

//   } catch (error) {
//     console.error("AI Assistant chat error:", error);

//     setChatMessages((previous) => [
//       ...previous,
//       {
//         role: "assistant",
//         content: `Unable to connect to the InsureMate backend. ${error.message}`
//       }
//     ]);

//   } finally {
//     setChatLoading(false);
//   }
// };

//   // =========================================================
//   // OPEN DOCUMENT CHUNKS
//   // =========================================================

//   const openDocumentChunks = (documentName) => {
//     setSelectedDocument(documentName);
//     setActivePage("Chunk Inspector");
//   };

//   // =========================================================
//   // SIDEBAR NAVIGATION
//   // =========================================================

//   const technicalPages = [
//     "Retrieval",
//     "Sources",
//     "Hallucination",
//     "Models",
//     "System",
//   ];

//   // =========================================================
//   // UI
//   // =========================================================

//   return (
//     <div className="app">

//       {/* =====================================================
//           SIDEBAR
//       ===================================================== */}

//       <aside className="sidebar">

//         {/* BRAND */}

//         <div className="brand">

//           <div className="brand-icon">
//             I
//           </div>

//           <div>
//             <h2>InsureMate</h2>
//             <span>Insurance Intelligence</span>
//           </div>

//         </div>


//         {/* NAVIGATION */}

//         <nav>

//           {/* Dashboard */}

//           <button
//             className={`nav-item ${
//               activePage === "Dashboard"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Dashboard")
//             }
//           >
//             <span>⌂</span>
//             Dashboard
//           </button>


//           {/* AI Assistant */}

//           <button
//             className={`nav-item ${
//               activePage === "AI Assistant"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("AI Assistant")
//             }
//           >
//             <span>◉</span>
//             AI Assistant
//           </button>


//           {/* Upload Your Own Policy */}

//           <button
//             className={`nav-item ${
//               activePage === "Upload Policy"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Upload Policy")
//             }
//           >
//             <span>↑</span>
//             Upload Policy
//           </button>


//           {/* Documents */}

//           <button
//             className={`nav-item ${
//               activePage === "Documents"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Documents")
//             }
//           >
//             <span>▤</span>
//             Documents
//           </button>


//           {/* Chunk Inspector */}

//           <button
//             className={`nav-item ${
//               activePage === "Chunk Inspector"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Chunk Inspector")
//             }
//           >
//             <span>✂</span>
//             Chunk Inspector
//           </button>


//           {/* Embeddings */}

//           <button
//             className={`nav-item ${
//               activePage === "Embeddings"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Embeddings")
//             }
//           >
//             <span>✦</span>
//             Embeddings
//           </button>


//           {/* Retrieval */}

//           <button
//             className={`nav-item ${
//               activePage === "Retrieval"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Retrieval")
//             }
//           >
//             <span>⌕</span>
//             Retrieval
//           </button>


//           {/* Sources */}

//           <button
//             className={`nav-item ${
//               activePage === "Sources"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Sources")
//             }
//           >
//             <span>▣</span>
//             Sources
//           </button>


//           {/* Hallucination */}

//           <button
//             className={`nav-item ${
//               activePage === "Hallucination"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Hallucination")
//             }
//           >
//             <span>⚠</span>
//             Hallucination
//           </button>


//           {/* Models */}

//           <button
//             className={`nav-item ${
//               activePage === "Models"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Models")
//             }
//           >
//             <span>🤖</span>
//             Models
//           </button>


//           {/* Evaluation Lab */}

//           <button
//             className={`nav-item ${
//               activePage === "Evaluation Lab"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("Evaluation Lab")
//             }
//           >
//             <span>📊</span>
//             Evaluation Lab
//           </button>
          
//           {/* Evaluation Insights */}
//           <div style={{ marginTop: "4px", marginBottom: "4px" }}>
//             <button
//               className={`nav-item ${
//                 activePage === "Evaluation Insights" ? "active" : ""
//               }`}
//               onClick={() => setActivePage("Evaluation Insights")}
//               style={{
//                 width: "100%",
//                 display: "flex",
//                 alignItems: "center",
//                 gap: "10px"
//               }}
//             >
//               <span>🔎</span>
//               <span>Evaluation Insights</span>
//             </button>
//           </div>


//           {/* System */}

//           <button
//             className={`nav-item ${
//               activePage === "System"
//                 ? "active"
//                 : ""
//             }`}
//             onClick={() =>
//               setActivePage("System")
//             }
//           >
//             <span>⚙</span>
//             System
//           </button>

//         </nav>


//         {/* SYSTEM STATUS */}

//         <div className="system-status">

//           <div className="system-title">
//             System Status
//           </div>


//           <div className="system-row">

//             <span>
//               <i className="online-dot"></i>
//               Ollama
//             </span>

//             <strong>Online</strong>

//           </div>


//           <div className="system-row">

//             <span>
//               <i className="online-dot"></i>
//               API
//             </span>

//             <strong>Online</strong>

//           </div>

//         </div>

//       </aside>


//       {/* =====================================================
//           MAIN CONTENT
//       ===================================================== */}

//       <main className="main">


//         {/* ===================================================
//             DASHBOARD
//         =================================================== */}

//         {activePage === "Dashboard" && (

//           <>

//             <header className="topbar">

//               <div>

//                 <p className="eyebrow">
//                   INSURANCE INTELLIGENCE PLATFORM
//                 </p>

//                 <h1>
//                   AI Insurance Assistant
//                 </h1>

//                 <p className="subtitle">
//                   Understand your insurance policies using AI.
//                 </p>

//               </div>


//               <div className="status">

//                 <span className="status-dot"></span>

//                 System Online

//               </div>

//             </header>


//             {/* STATUS CARDS */}

//             <section className="status-grid">


//               <div className="status-card">

//                 <div className="card-label">
//                   AI MODEL
//                 </div>

//                 <div className="card-value">
//                   Code Llama 7B
//                 </div>

//                 <div className="card-status">
//                   ● Ready
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   LLM ENGINE
//                 </div>

//                 <div className="card-value">
//                   Ollama
//                 </div>

//                 <div className="card-status">
//                   ● Connected
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   API SERVICE
//                 </div>

//                 <div className="card-value">
//                   FastAPI
//                 </div>

//                 <div className="card-status">
//                   ● Online
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   KNOWLEDGE BASE
//                 </div>

//                 <div className="card-value">
//                   {documents.length} Documents
//                 </div>

//                 <div className="card-status">
//                   ● {totalChunks} Chunks
//                 </div>

//               </div>

//             </section>


//             {/* CHAT */}

//             <section className="chat-card">

//               <div className="chat-header">

//                 <div>

//                   <h2>
//                     Ask InsureMate
//                   </h2>

//                   <p>
//                     Ask questions about insurance coverage,
//                     claims, exclusions and policy terms.
//                   </p>

//                 </div>


//                 <span className="model-badge">
//                   {model}
//                 </span>

//               </div>


//               <div className="input-area">

//                 <textarea
//                   value={question}
//                   onChange={(e) =>
//                     setQuestion(e.target.value)
//                   }
//                   onKeyDown={(e) => {

//                     if (
//                       e.key === "Enter" &&
//                       !e.shiftKey
//                     ) {

//                       e.preventDefault();

//                       askInsureMate();

//                     }

//                   }}
//                   placeholder="Example: Is hospitalization covered?"
//                   rows="4"
//                 />

//                 <select
//                   value={chatModel}
//                   onChange={(event) =>
//                     setChatModel(event.target.value)
//                   }
//                   style={{
//                     padding: "11px 14px",
//                     border: "1px solid  #1e3354",
//                     borderRadius: "8px",
//                     background: "#0d1526",
//                     color: "#e5e7eb",
//                     fontFamily: "inherit",
//                     fontSize: "14px"
//                   }}
//                 >
//                   <option value="codellama:7b-instruct">
//                     Code Llama 7B
//                   </option>

//                   <option value="qwen2.5:1.5b">
//                     Qwen 2.5 1.5B
//                   </option>

//                   <option value="phi3:mini">
//                     Phi-3 Mini
//                   </option>
//                 </select>

//                 <button
//                   className="ask-button"
//                   onClick={askInsureMate}
//                   disabled={loading}
//                 >
//                   {loading
//                     ? "Analyzing..."
//                     : "Ask InsureMate →"}
//                 </button>

//               </div>


//               {/* ANSWER */}

//               <div className="answer-section">

//                 <div className="answer-title">

//                   <span>
//                     AI Response
//                   </span>


//                   {responseTime && (

//                     <span className="response-time">
//                       Response time: {responseTime}s
//                     </span>

//                   )}

//                 </div>


//                 <div className="answer-box">

//                   {loading ? (

//                     <div className="loading">
//                       Code Llama is analyzing your question...
//                     </div>

//                   ) : answer ? (

//                     <p>
//                       {answer}
//                     </p>

//                   ) : (

//                     <div className="empty-answer">

//                       <div className="empty-icon">
//                         ✦
//                       </div>

//                       <p>
//                         Your answer will appear here.
//                       </p>

//                       <span>
//                         Ask a question to get started.
//                       </span>

//                     </div>

//                   )}

//                 </div>

//               </div>

//             </section>


//             {/* PIPELINE */}

//             <section className="pipeline-card">

//               <div className="pipeline-title">

//                 <div>

//                   <h2>
//                     AI Processing Pipeline
//                   </h2>

//                   <p>
//                     How InsureMate processes your request
//                   </p>

//                 </div>

//               </div>


//               <div className="pipeline">


//                 <div className="pipeline-step">

//                   <div className="step-number">
//                     01
//                   </div>

//                   <strong>
//                     Your Question
//                   </strong>

//                   <span>
//                     User input
//                   </span>

//                 </div>


//                 <div className="arrow">
//                   →
//                 </div>


//                 <div className="pipeline-step">

//                   <div className="step-number">
//                     02
//                   </div>

//                   <strong>
//                     InsureMate
//                   </strong>

//                   <span>
//                     Application
//                   </span>

//                 </div>


//                 <div className="arrow">
//                   →
//                 </div>


//                 <div className="pipeline-step">

//                   <div className="step-number">
//                     03
//                   </div>

//                   <strong>
//                     FastAPI
//                   </strong>

//                   <span>
//                     API service
//                   </span>

//                 </div>


//                 <div className="arrow">
//                   →
//                 </div>


//                 <div className="pipeline-step">

//                   <div className="step-number">
//                     04
//                   </div>

//                   <strong>
//                     Ollama
//                   </strong>

//                   <span>
//                     LLM engine
//                   </span>

//                 </div>


//                 <div className="arrow">
//                   →
//                 </div>


//                 <div className="pipeline-step">

//                   <div className="step-number">
//                     05
//                   </div>

//                   <strong>
//                     {chatModel === "codellama:7b-instruct"
//                       ? "Code Llama"
//                       : chatModel === "qwen2.5:1.5b"
//                       ? "Qwen 2.5"
//                       : "Phi-3 Mini"}
//                   </strong>

//                   <span>
//                     AI response
//                   </span>

//                 </div>


//               </div>

//             </section>

//           </>

//         )}


//         {/* ===================================================
//             AI ASSISTANT
//         =================================================== */}

//         {activePage === "AI Assistant" && (

//           <section>

//             <header className="topbar">
//               <div>
//                 <p className="eyebrow">
//                   INSUREMATE
//                 </p>

//                 <h1>
//                   AI Assistant
//                 </h1>

//                 <p className="subtitle">
//                   Chat with your insurance knowledge base using RAG and AI.
//                 </p>
//               </div>
//             </header>

//             <div className="orchestration-pipeline">

//               <div className="pipeline-header">

//                 <div className="pipeline-title-section">
//                   <h2>Multi-Model Orchestration Pipeline</h2>

//                   <p>
//                     InsureMate automatically selects and coordinates AI models
//                     based on the complexity of your question.
//                   </p>
//                 </div>

//                 <div className="pipeline-status">
//                   <span className="pipeline-status-dot"></span>
//                   Active
//                 </div>

//               </div>


//               <div className="pipeline-flow">
//                 <div className="pipeline-step">
//                   <div className="pipeline-number">1</div>
//                   <div className="pipeline-content">
//                     <div className="pipeline-step-title">
//                       User Question
//                     </div>
//                     <div className="pipeline-step-description">
//                       Your insurance query
//                     </div>
//                   </div>
//                 </div>

//                 <div className="pipeline-arrow">→</div>

//                 <div className="pipeline-step">
//                   <div className="pipeline-number">2</div>
//                   <div className="pipeline-content">
//                     <div className="pipeline-step-title">
//                       RAG Retrieval
//                     </div>
//                     <div className="pipeline-step-description">
//                       Searches all policy knowledge
//                     </div>
//                   </div>
//                 </div>

//                 <div className="pipeline-arrow">→</div>

//                 <div className="pipeline-step">
//                   <div className="pipeline-number">3</div>
//                   <div className="pipeline-content">
//                     <div className="pipeline-step-title">
//                       Qwen 2.5
//                     </div>
//                     <div className="pipeline-step-description">
//                       Analyzes complexity
//                     </div>
//                   </div>
//                 </div>

//                 <div className="pipeline-arrow">→</div>

//                 <div className="pipeline-step">
//                   <div className="pipeline-number">4</div>
//                   <div className="pipeline-content">
//                     <div className="pipeline-step-title">
//                       Model Selection
//                     </div>
//                     <div className="pipeline-step-description">
//                       Qwen or Code Llama
//                     </div>
//                   </div>
//                 </div>

//                 <div className="pipeline-arrow">→</div>

//                 <div className="pipeline-step">
//                   <div className="pipeline-number">5</div>
//                   <div className="pipeline-content">
//                     <div className="pipeline-step-title">
//                       Phi-3 Mini
//                     </div>
//                     <div className="pipeline-step-description">
//                       Validates grounding
//                     </div>
//                   </div>
//                 </div>

//                 <div className="pipeline-arrow">→</div>

//                 <div className="pipeline-step final-step">
//                   <div className="pipeline-number">✓</div>
//                   <div className="pipeline-content">
//                     <div className="pipeline-step-title">
//                       Final Answer
//                     </div>
//                     <div className="pipeline-step-description">
//                       Grounded insurance response
//                     </div>
//                   </div>
//                 </div>

                



//               </div>

//             </div>


//             <section className="chat-card assistant-chat-card">

//               <div className="chat-header">

//                 <div>
//                   <h2>
//                     Ask InsureMate
//                   </h2>

//                   <p>
//                     Ask follow-up questions and continue the conversation.
//                   </p>
//                 </div>

//                 <span className="model-badge">
//                   Multi-Model AI
//                 </span>

//               </div>


//               <div className="chat-messages">

//                 {chatMessages.length === 0 ? (

//                   <div className="chat-welcome">
//                     <div className="empty-icon">✦</div>
//                     <p>Ask a question about your insurance policy.</p>
//                     <span>
//                       You can ask follow-up questions just like a normal chatbot.
//                     </span>
//                   </div>

//                 ) : (

//                   chatMessages.map((message, index) => (

//                     <div
//                       key={`${message.role}-${index}`}
//                       className={`chat-message ${message.role}`}
//                     >
//                       <div className="chat-message-label">
//                         {message.role === "user"
//                           ? "You"
//                           : "InsureMate"}
//                       </div>

//                       <div className="chat-message-bubble">
//                         {message.content}
//                       </div>
//                     </div>

//                   ))

//                 )}

//                 {chatLoading && (
//                   <div className="chat-message assistant">

//                     <div className="chat-message-label">
//                       InsureMate
//                     </div>

//                     <div className="chat-message-bubble chat-thinking">
//                       Analyzing your question through the AI pipeline...
//                     </div>

//                   </div>
//                 )}

//               </div>


//               <div className="assistant-input-area">

//                 <textarea
//                   value={chatQuestion}
//                   onChange={(e) =>
//                     setChatQuestion(e.target.value)
//                   }
//                   onKeyDown={(e) => {
//                     if (
//                       e.key === "Enter" &&
//                       !e.shiftKey
//                     ) {
//                       e.preventDefault();
//                       sendChatMessage();
//                     }
//                   }}
//                   placeholder="Ask a question or a follow-up..."
//                   rows="3"
//                   disabled={chatLoading}
//                 />

//                 <div className="assistant-actions">

//                   <button
//                     className="clear-chat-button"
//                     onClick={() => {
//                       setChatMessages([]);
//                       setChatQuestion("");
//                       setChatResponseTime(null);
//                     }}
//                     disabled={
//                       chatLoading ||
//                       chatMessages.length === 0
//                     }
//                   >
//                     Clear Chat
//                   </button>

//                   <button
//                     className="ask-button"
//                     onClick={sendChatMessage}
//                     disabled={
//                       chatLoading ||
//                       !chatQuestion.trim()
//                     }
//                   >
//                     {chatLoading
//                       ? "Analyzing..."
//                       : "Send →"}
//                   </button>

//                 </div>

//               </div>


//               {chatResponseTime && (
//                 <div className="assistant-response-time">
//                   Response time: {chatResponseTime}s
//                 </div>
//               )}

//             </section>

//           </section>

//         )}



//         {/* ===================================================
//             UPLOAD POLICY / MODE 2
//         =================================================== */}

//         {activePage === "Upload Policy" && (
//           <UploadPolicyPage />
//         )}

//         {/* ===================================================
//             WEEK 4 EVALUATION LAB
//         =================================================== */}

//         {activePage === "Evaluation Lab" && (
//           <EvaluationLabPage />
//         )}

//         {activePage === "Evaluation Insights" && (
//           <EvaluationInsightsPage />
//         )}

//         {/* ===================================================
//             DOCUMENTS
//         =================================================== */}

//         {activePage === "Documents" && (

//           <DocumentsPage
//             documents={documents}
//             totalChunks={totalChunks}
//             onOpenDocument={openDocumentChunks}
//           />

//         )}


//         {/* ===================================================
//             CHUNK INSPECTOR
//         =================================================== */}

//         {activePage === "Chunk Inspector" && (

//           <ChunkInspectorPage
//             document={selectedDocument}
//             chunks={chunks}
//             loading={chunksLoading}
//             onBack={() => setActivePage("Documents")}
//           />

//         )}


//         {/* ===================================================
//             EMBEDDINGS
//         =================================================== */}

//         {activePage === "Embeddings" && (
//           <EmbeddingsPage
//             documents={documents}
//             embeddingDocument={embeddingDocument}
//             setEmbeddingDocument={setEmbeddingDocument}
//             embeddingChunk={embeddingChunk}
//             setEmbeddingChunk={setEmbeddingChunk}
//             embeddingData={embeddingData}
//             loading={embeddingLoading}
//           />
//         )}

//         {/* ===================================================
//             OTHER TECHNICAL PAGES
//         =================================================== */}

//         {activePage === "Retrieval" && (
//           <RetrievalPage />
//         )}

//         {technicalPages.includes(activePage) &&
//           activePage !== "Retrieval" && (
//             <TechnicalPage
//               title={activePage}
//               documents={documents}
//               totalChunks={totalChunks}
//             />
//         )}

//       </main>

//     </div>
//   );
// }


// /* =========================================================
//    WEEK 4 EVALUATION LAB
// ========================================================= */

// function EvaluationLabPage() {

// const modelResults = [
//   {
//     name: "CodeLlama 7B",
//     model: "codellama:7b-instruct",
//     accuracy: 77.27,
//     hallucination: 4,
//     latency: 50.92,
//     ram: 4771.7,
//     confidence: 0.7086
//   },
//   {
//     name: "Qwen 2.5 1.5B",
//     model: "qwen2.5:1.5b",
//     accuracy: 59.09,
//     hallucination: 20,
//     latency: 9.63,
//     ram: 1108.3,
//     confidence: 0.7086
//   },
//   {
//     name: "Phi-3 Mini",
//     model: "phi3:mini",
//     accuracy: 77.27,
//     hallucination: 4,
//     latency: 27.84,
//     ram: 2922.7,
//     confidence: 0.7086
//   }
// ];

//   const topK = [
//     {
//       k: 1,
//       latency: 29.59,
//       score: 0.6989,
//       context: 593.5
//     },
//     {
//       k: 3,
//       latency: 49.277,
//       score: 0.6900,
//       context: 1696.8
//     },
//     {
//       k: 5,
//       latency: 66.646,
//       score: 0.6808,
//       context: 2920.5
//     }
//   ];

//   const repositoryFiles = [
//     ["frontend/src/App.jsx", 18],
//     ["backend/app/api/upload.py", 10],
//     ["backend/app/main.py", 9],
//     ["backend/app/services/upload_rag_service.py", 6],
//     ["backend/app/services/document_processor.py", 3],
//     ["backend/app/api/retrieval.py", 1],
//     ["frontend/src/App.css", 1],
//     ["docker/Dockerfile.backend", 1],
//     ["backend/app/services/embedding_service.py", 1]
//   ];

//   return (
//     <div className="evaluation-page">

//       <header className="topbar">
//         <div>
//           <p className="eyebrow">
//             WEEK 4 · QUANTITATIVE EVALUATION
//           </p>

//           <h1>
//             Evaluation Lab
//           </h1>

//           <p className="subtitle">
//             Quantitative analysis of LLM models, RAG retrieval,
//             resource usage and repository-level understanding.
//           </p>
//         </div>

//         <div className="evaluation-badge">
//           ✓ 6 EXERCISES ANALYZED
//         </div>
//       </header>


//       {/* =====================================================
//           OVERVIEW
//       ===================================================== */}

//       <section className="evaluation-summary">

//         <div className="evaluation-stat">
//           <span>MODELS</span>
//           <strong>3</strong>
//           <small>independently evaluated</small>
//         </div>

//         <div className="evaluation-stat">
//           <span>QUESTIONS</span>
//           <strong>25</strong>
//           <small>same dataset for all models</small>
//         </div>

//         <div className="evaluation-stat">
//           <span>EVALUATIONS</span>
//           <strong>75</strong>
//           <small>successful model evaluations</small>
//         </div>

//         <div className="evaluation-stat highlight">
//           <span>BEST ACCURACY</span>
//           <strong>77.27%</strong>
//           <small>CodeLlama 7B - Phi-3 Mini</small>
//         </div>

//       </section>


//       {/* =====================================================
//           MAIN FINDING
//       ===================================================== */}

//       <section className="evaluation-insight">

//         <div className="insight-icon">
//           ★
//         </div>

//         <div>
//           <h2>
//             Quality vs Latency Trade-off
//           </h2>

//           <p>
//              CodeLlama and Phi-3 achieved the highest measured
//             accuracy at 77.27%, while Qwen was substantially
//             faster and required much less memory. The controlled
//             RAG experiment also showed a 40 percentage-point
//             accuracy improvement over the No-RAG baseline.
//           </p>
//         </div>

//       </section>


//       {/* =====================================================
//           MODEL COMPARISON
//       ===================================================== */}

//       <section className="evaluation-card">

//         <div className="evaluation-section-heading">
//           <div>
//             <p className="eyebrow">
//               EXERCISE 1 + 3 + 4
//             </p>

//             <h2>
//               Model Comparison
//             </h2>

//             <p>
//               Same questions, knowledge base, RAG context,
//               prompt and generation settings.
//             </p>
//           </div>
//         </div>


//         <div className="evaluation-table-wrap">

//           <table className="evaluation-table">

//             <thead>
//               <tr>
//                 <th>MODEL</th>
//                 <th>ACCURACY</th>
//                 <th>HALLUCINATION</th>
//                 <th>LATENCY</th>
//                 <th>RAM</th>
//                 <th>RETRIEVAL CONF.</th>
//               </tr>
//             </thead>

//             <tbody>

//               {modelResults.map((item) => (

//                 <tr key={item.model}>

//                   <td>
//                     <strong>{item.name}</strong>
//                     <small>{item.model}</small>
//                   </td>

//                   <td>
//                     <strong
//                       className={
//                         item.accuracy === 66
//                           ? "metric-best"
//                           : ""
//                       }
//                     >
//                       {item.accuracy}%
//                     </strong>
//                   </td>

//                   <td>
//                     <strong
//                       className={
//                         item.hallucination === 4
//                           ? "metric-best"
//                           : ""
//                       }
//                     >
//                       {item.hallucination}%
//                     </strong>
//                   </td>

//                   <td>
//                     {item.latency.toFixed(2)}s
//                   </td>

//                   <td>
//                     {item.ram.toFixed(0)} MB
//                   </td>

//                   <td>
//                     {(item.confidence * 100).toFixed(2)}%
//                   </td>

//                 </tr>

//               ))}

//             </tbody>

//           </table>

//         </div>

//       </section>


//       {/* =====================================================
//           RESOURCE BENCHMARK
//       ===================================================== */}

//       <section className="evaluation-two-column">

//         <div className="evaluation-card">

//           <div className="evaluation-section-heading">
//             <p className="eyebrow">
//               PERFORMANCE
//             </p>

//             <h2>
//               Memory Consumption
//             </h2>

//             <p>
//               Average RAM change measured during independent
//               resource benchmarking.
//             </p>
//           </div>


//           <div className="bar-list">

//             {modelResults.map((item) => {

//               const width =
//                 (item.ram / 4771.7) * 100;

//               return (
//                 <div
//                   className="bar-row"
//                   key={item.model}
//                 >

//                   <div className="bar-label">
//                     <span>{item.name}</span>
//                     <strong>
//                       {item.ram.toFixed(0)} MB
//                     </strong>
//                   </div>

//                   <div className="bar-track">
//                     <div
//                       className="bar-fill"
//                       style={{
//                         width: `${width}%`
//                       }}
//                     />
//                   </div>

//                 </div>
//               );

//             })}

//           </div>

//         </div>


//         <div className="evaluation-card">

//           <div className="evaluation-section-heading">
//             <p className="eyebrow">
//               PERFORMANCE
//             </p>

//             <h2>
//               Response Latency
//             </h2>

//             <p>
//               Average response latency across the model
//               comparison experiment.
//             </p>
//           </div>


//           <div className="bar-list">

//             {modelResults.map((item) => {

//               const width =
//                 (item.latency / 50.92) * 100;

//               return (
//                 <div
//                   className="bar-row"
//                   key={item.model}
//                 >

//                   <div className="bar-label">
//                     <span>{item.name}</span>
//                     <strong>
//                       {item.latency.toFixed(2)}s
//                     </strong>
//                   </div>

//                   <div className="bar-track">
//                     <div
//                       className="bar-fill"
//                       style={{
//                         width: `${width}%`
//                       }}
//                     />
//                   </div>

//                 </div>
//               );

//             })}

//           </div>

//         </div>

//       </section>


//       {/* =====================================================
//           TOP K
//       ===================================================== */}

//       <section className="evaluation-card">

//         <div className="evaluation-section-heading">

//           <p className="eyebrow">
//             EXERCISE 5 · TOP-K SENSITIVITY
//           </p>

//           <h2>
//             Retrieval Depth Analysis
//           </h2>

//           <p>
//             How changing retrieval depth affects context,
//             similarity and generation latency.
//           </p>

//         </div>


//         <div className="topk-grid">

//           {topK.map((item) => (

//             <div
//               className={
//                 `topk-card ${
//                   item.k === 3
//                     ? "recommended"
//                     : ""
//                 }`
//               }
//               key={item.k}
//             >

//               {item.k === 3 && (
//                 <div className="recommended-label">
//                   BALANCED
//                 </div>
//               )}

//               <div className="topk-number">
//                 K={item.k}
//               </div>

//               <div className="topk-metric">
//                 <span>Latency</span>
//                 <strong>
//                   {item.latency.toFixed(2)}s
//                 </strong>
//               </div>

//               <div className="topk-metric">
//                 <span>Retrieval Score</span>
//                 <strong>
//                   {item.score.toFixed(4)}
//                 </strong>
//               </div>

//               <div className="topk-metric">
//                 <span>Context</span>
//                 <strong>
//                   {item.context.toFixed(0)}
//                 </strong>
//                 <small>characters</small>
//               </div>

//             </div>

//           ))}

//         </div>


//         <div className="evaluation-conclusion">

//           <strong>
//             Finding:
//           </strong>

//           Increasing K from 1 → 5 increased average context
//           from 594 to 2,921 characters and latency from
//           29.59s to 66.65s, while average retrieval similarity
//           decreased from 0.6989 to 0.6808.

//         </div>

//       </section>


//       {/* =====================================================
//           RAG ABLATION
//       ===================================================== */}

//       <section className="evaluation-card">

//         <div className="evaluation-section-heading">

//           <p className="eyebrow">
//             EXERCISE 5 · RAG ABLATION
//           </p>

//           <h2>
//             RAG vs No-RAG
//           </h2>

//           <p>
//             Controlled comparison of answer accuracy with
//     and     without retrieved policy context.
//           </p>

//         </div>


//         <div className="rag-comparison">

//           <div className="rag-column">

//             <div className="rag-title">
//               RAG ON
//             </div>

//             <strong>
//               90%
//             </strong>

//             <span>
//               Accuracy
//             </span>

//             <div className="rag-status">
//               ✓ 9 / 10 correct
//             </div>

//             <div className="rag-status">
//               +40 percentage points
//             </div>

//             <div className="rag-status">
//               78.47s average latency
//             </div>

//           </div>


//           <div className="rag-vs">
//             VS
//           </div>


//           <div className="rag-column">

//             <div className="rag-title">
//               NO-RAG
//             </div>

//             <strong>
//               50%
//             </strong>

//             <span>
//               Accuracy
//             </span>

//             <div className="rag-status neutral">
//               5 / 10 correct
//             </div>

//             <div className="rag-status neutral">
//               Baseline
//             </div>

//             <div className="rag-status neutral">
//               29.18s average latency
//             </div>

//           </div>

//         </div>


//       <div className="evaluation-conclusion">

//         <strong>
//           RAG finding:
//         </strong>

//         On the same 10 policy questions, RAG achieved
//         <strong> 90% accuracy</strong> compared with
//         <strong> 50% without retrieval</strong>.
//         RAG won 5 questions, No-RAG won 1, and both
//         approaches were correct on 4 questions.

//         <br /><br />

//         This represents a
//         <strong> +40 percentage-point improvement</strong>
//         in accuracy, with the trade-off of higher average
//         latency (78.47s vs 29.18s).

//       </div>

//       </section>


//       {/* =====================================================
//           GROUNDEDNESS
//       ===================================================== */}

//       <section className="evaluation-card">

//         <div className="evaluation-section-heading">

//           <p className="eyebrow">
//             AI SAFETY
//           </p>

//           <h2>
//             Groundedness & "Knows When It Doesn't Know"
//           </h2>

//           <p>
//             Evaluation of answers, uncertainty and refusal behavior.
//           </p>

//         </div>


//         <div className="grounded-grid">

//           <div className="grounded-stat">
//             <strong>0</strong>
//             <span>Hallucinations</span>
//             <small>RAG ON sample</small>
//           </div>

//           <div className="grounded-stat">
//             <strong>1</strong>
//             <span>Appropriate Refusal</span>
//             <small>RAG ON</small>
//           </div>

//           <div className="grounded-stat">
//             <strong>1</strong>
//             <span>Appropriate Uncertainty</span>
//             <small>RAG ON</small>
//           </div>

//           <div className="grounded-stat">
//             <strong>5</strong>
//             <span>Answers Given</span>
//             <small>RAG ON</small>
//           </div>

//         </div>

//       </section>


//       {/* =====================================================
//           REPOSITORY RAG
//       ===================================================== */}

//       <section className="evaluation-card">

//         <div className="evaluation-section-heading">

//           <p className="eyebrow">
//             EXERCISE 6 · REPOSITORY UNDERSTANDING
//           </p>

//           <h2>
//             Repository-Level RAG
//           </h2>

//           <p>
//             Testing whether the system can retrieve evidence
//             across multiple files and components.
//           </p>

//         </div>


//         <div className="repository-summary">

//           <div>
//             <strong>10</strong>
//             <span>Questions</span>
//           </div>

//           <div>
//             <strong>50</strong>
//             <span>Chunks Retrieved</span>
//           </div>

//           <div>
//             <strong>0.6160</strong>
//             <span>Average Similarity</span>
//           </div>

//           <div>
//             <strong>0.6972</strong>
//             <span>Highest Score</span>
//           </div>

//         </div>


//         <div className="repository-layout">

//           <div>

//             <h3>
//               Retrieved File Distribution
//             </h3>

//             <div className="repository-files">

//               {repositoryFiles.map(
//                 ([file, count]) => (

//                   <div
//                     className="repository-file"
//                     key={file}
//                   >

//                     <div>
//                       <span>{file}</span>
//                       <strong>{count}</strong>
//                     </div>

//                     <div className="repository-track">

//                       <div
//                         className="repository-fill"
//                         style={{
//                           width:
//                             `${(count / 18) * 100}%`
//                         }}
//                       />

//                     </div>

//                   </div>

//                 )
//               )}

//             </div>

//           </div>


//           <div className="repository-insight">

//             <div className="insight-icon">
//               ⌘
//             </div>

//             <h3>
//               Cross-file understanding
//             </h3>

//             <p>
//               The repository experiment used questions that
//               require reasoning across upload APIs, document
//               processing, retrieval, embeddings, frontend
//               components and backend orchestration.
//             </p>

//             <div className="repository-tag">
//               MULTI-FILE RAG
//             </div>

//           </div>

//         </div>

//       </section>


//       {/* =====================================================
//           FINAL FINDINGS
//       ===================================================== */}

//       <section className="evaluation-card final-findings">

//         <div className="evaluation-section-heading">

//           <p className="eyebrow">
//             FINAL CONCLUSION
//           </p>

//           <h2>
//             What Did Week 4 Prove?
//           </h2>

//         </div>


//         <div className="finding-list">

//           <div>
//             <span>01</span>
//             <p>
//              <strong>CodeLlama and Phi-3 were the strongest quality models.</strong>
//               Both achieved 77.27% accuracy in the corrected
//             </p>
//           </div>

//           <div>
//             <span>02</span>
//             <p>
//               <strong>Qwen was the efficiency winner.</strong>
//               It achieved the lowest latency at 9.63s and
//               lowest average RAM change at 1108 MB.
//             </p>
//           </div>

//           <div>
//             <span>03</span>
//             <p>
//               <strong>More retrieval is not automatically better.</strong>
//               Increasing K increased context and latency while
//               similarity decreased in this experiment.
//             </p>
//           </div>

//           <div>
//             <span>04</span>
//             <p>
//               CodeLlama matched Phi-3 for the highest accuracy, but had the highest latency and memory usage, demonstrating a quality-resource trade-off.
//             </p>
//           </div>

//           <div>
//             <span>05</span>
//             <p>
//               <strong>Repository RAG extends the system beyond policy Q&A.</strong>
//               Ten multi-file questions were evaluated across
//               backend and frontend components.
//             </p>
//           </div>

//           <div>
//             <span>06</span>
//             <p>
//               <strong>RAG substantially improved answer accuracy.</strong>
//               In the controlled 10-question policy evaluation,
//               RAG achieved 90% accuracy compared with 50% for
//               No-RAG, a 40 percentage-point improvement.
//             </p>
//           </div>

//         </div>

//       </section>


//       <div className="evaluation-footer">
//         InsureMate · Week 4 Evaluation · Experimental results
//       </div>

//     </div>
//   );
// }


// /* =========================================================
//    DOCUMENTS PAGE
// ========================================================= */

// function DocumentsPage({
//   documents,
//   totalChunks,
//   onOpenDocument,
// }) {

//   return (

//     <div>

//       <header className="topbar">

//         <div>

//           <p className="eyebrow">
//             KNOWLEDGE BASE
//           </p>

//           <h1>
//             Insurance Documents
//           </h1>

//           <p className="subtitle">
//             Documents processed by InsureMate.
//           </p>

//         </div>


//         <div className="status">

//           <span className="status-dot"></span>

//           Knowledge Base Ready

//         </div>

//       </header>


//       {/* SUMMARY */}

//       <section className="status-grid">


//         <div className="status-card">

//           <div className="card-label">
//             DOCUMENTS
//           </div>

//           <div className="card-value">
//             {documents.length}
//           </div>

//           <div className="card-status">
//             ● Loaded
//           </div>

//         </div>


//         <div className="status-card">

//           <div className="card-label">
//             TOTAL CHUNKS
//           </div>

//           <div className="card-value">
//             {totalChunks}
//           </div>

//           <div className="card-status">
//             ● Processed
//           </div>

//         </div>


//         <div className="status-card">

//           <div className="card-label">
//             PROCESSING
//           </div>

//           <div className="card-value">
//             Complete
//           </div>

//           <div className="card-status">
//             ● Ready
//           </div>

//         </div>


//         <div className="status-card">

//           <div className="card-label">
//             EMBEDDING MODEL
//           </div>

//           <div className="card-value">
//             Nomic Embed
//           </div>

//           <div className="card-status">
//             ● Available
//           </div>

//         </div>

//       </section>


//       {/* DOCUMENT LIST */}

//       <section className="documents-card">

//         <div className="documents-header">

//           <div>

//             <h2>
//               Uploaded Documents
//             </h2>

//             <p>
//               Click any document to inspect its chunks.
//             </p>

//           </div>


//           <span className="document-count">
//             {documents.length} files
//           </span>

//         </div>


//         <div className="document-list">

//           {documents.map((doc) => (

//             <div
//               className="document-row clickable"
//               key={doc.name}
//               onClick={() =>
//                 onOpenDocument(doc.name)
//               }
//               title="Click to inspect chunks"
//             >

//               <div className="document-icon">
//                 PDF
//               </div>


//               <div className="document-info">

//                 <strong>
//                   {doc.name}
//                 </strong>

//                 <span>
//                   Click to inspect document chunks
//                 </span>

//               </div>


//               <div className="document-chunks">

//                 <strong>
//                   {doc.chunks}
//                 </strong>

//                 <span>
//                   chunks
//                 </span>

//               </div>


//               <div className="document-status">

//                 <span className="status-dot"></span>

//                 Processed

//               </div>

//             </div>

//           ))}

//         </div>

//       </section>

//     </div>

//   );
// }



// function ChunkInspectorPage({
//   document,
//   chunks,
//   loading,
//   onBack,
// }) {

//   if (!document) {

//     return (

//       <div>

//         <header className="topbar">

//           <div>

//             <p className="eyebrow">
//               KNOWLEDGE BASE
//             </p>

//             <h1>
//               Chunk Inspector
//             </h1>

//             <p className="subtitle">
//               Select a document from the Documents page
//               to inspect its chunks.
//             </p>

//           </div>

//         </header>


//         <section className="documents-card">

//           <div className="empty-answer">

//             <div className="empty-icon">
//               ✂
//             </div>

//             <p>
//               No document selected
//             </p>

//             <span>
//               Go to Documents and select a PDF.
//             </span>

//           </div>

//         </section>

//       </div>

//     );
//   }


//   const CHUNK_SIZE = 800;
//   const OVERLAP = 150;
//   const STEP_SIZE = CHUNK_SIZE - OVERLAP;


//   return (

//     <div>

//       {/* HEADER */}

//       <header className="topbar">

//         <div>

//           <button
//             className="back-button"
//             onClick={onBack}
//           >
//             ← Back to Documents
//           </button>

//           <p className="eyebrow">
//             CHUNK INSPECTOR
//           </p>

//           <h1>
//             {document}
//           </h1>

//           <p className="subtitle">
//             Inspect how the document was divided into chunks.
//           </p>

//         </div>


//         <div className="status">

//           <span className="status-dot"></span>

//           {loading
//             ? "Loading..."
//             : `${chunks.length} Chunks`}

//         </div>

//       </header>


//       {/* =====================================================
//           CHUNKING CONFIGURATION
//       ===================================================== */}

//       <section className="chunk-config">

//         <div className="config-title">

//           <div>

//             <h2>
//               Chunking Configuration
//             </h2>

//             <p>
//               Parameters used during document preprocessing.
//             </p>

//           </div>

//           <span className="config-badge">
//             Character Based
//           </span>

//         </div>


//         <div className="config-grid">


//           <div className="config-item">

//             <span>
//               CHUNK SIZE
//             </span>

//             <strong>
//               800
//             </strong>

//             <small>
//               characters
//             </small>

//           </div>


//           <div className="config-item">

//             <span>
//               OVERLAP
//             </span>

//             <strong>
//               150
//             </strong>

//             <small>
//               characters
//             </small>

//           </div>


//           <div className="config-item">

//             <span>
//               STEP SIZE
//             </span>

//             <strong>
//               650
//             </strong>

//             <small>
//               characters
//             </small>

//           </div>


//           <div className="config-item">

//             <span>
//               TOTAL CHUNKS
//             </span>

//             <strong>
//               {loading ? "..." : chunks.length}
//             </strong>

//             <small>
//               in document
//             </small>

//           </div>

//         </div>

//       </section>


//       {/* =====================================================
//           WHY OVERLAP
//       ===================================================== */}

//       <section className="overlap-card">

//         <div className="overlap-heading">

//           <div className="overlap-icon">
//             ↔
//           </div>

//           <div>

//             <h2>
//               How Chunk Overlap Works
//             </h2>

//             <p>
//               Each new chunk starts 650 characters after
//               the previous chunk, leaving 150 characters
//               of shared context.
//             </p>

//           </div>

//         </div>


//         <div className="overlap-visual">


//           <div className="visual-label">
//             CHUNK #1
//           </div>

//           <div className="visual-bar">

//             <div className="chunk-main">
//               0 → 650
//             </div>

//             <div className="chunk-overlap">
//               650 → 800
//               <span>
//                 150 overlap
//               </span>
//             </div>

//           </div>


//           <div className="visual-label second">
//             CHUNK #2
//           </div>

//           <div className="visual-bar second-bar">

//             <div className="chunk-main">
//               650 → 1300
//             </div>

//             <div className="chunk-overlap">
//               1300 → 1450
//               <span>
//                 150 overlap
//               </span>
//             </div>

//           </div>


//           <div className="formula">

//             800 character chunk
//             −
//             150 character overlap
//             =
//             <strong>
//               650 character step
//             </strong>

//           </div>

//         </div>

//       </section>


//       {/* =====================================================
//           LOADING
//       ===================================================== */}

//       {loading && (

//         <section className="documents-card">

//           <div className="empty-answer">

//             <div className="empty-icon">
//               ⟳
//             </div>

//             <p>
//               Loading chunks...
//             </p>

//             <span>
//               Fetching chunk data from FastAPI.
//             </span>

//           </div>

//         </section>

//       )}


//       {/* =====================================================
//           CHUNK LIST
//       ===================================================== */}

//       {!loading && chunks.length > 0 && (

//         <section>

//           <div className="chunks-heading">

//             <div>

//               <h2>
//                 Chunk Breakdown
//               </h2>

//               <p>
//                 Showing all {chunks.length} chunks generated
//                 from this document.
//               </p>

//             </div>

//             <span>
//               {chunks.length} chunks
//             </span>

//           </div>


//           <div className="chunks-list">

//             {chunks.map((chunk, index) => {

//               const start =
//                 index * STEP_SIZE;

//               const end =
//                 start + CHUNK_SIZE;


//               return (

//                 <div
//                   className="chunk-card"
//                   key={
//                     chunk.chunk_id ??
//                     `${document}-${index}`
//                   }
//                 >

//                   {/* HEADER */}

//                   <div className="chunk-header">

//                     <div className="chunk-number">

//                       CHUNK #{index + 1}

//                     </div>


//                     <div className="chunk-page">

//                       Page {chunk.page ?? "N/A"}

//                     </div>

//                   </div>


//                   {/* METADATA */}

//                   <div className="chunk-meta">

//                     <span>
//                       {chunk.characters ??
//                         chunk.text?.length ??
//                         0}{" "}
//                       characters
//                     </span>

//                     <span>
//                       Chunk ID:{" "}
//                       {chunk.chunk_id ?? index}
//                     </span>

//                     <span>
//                       Range: {start} → {end}
//                     </span>

//                   </div>


//                   {/* TEXT */}

//                   <div className="chunk-text">

//                     {chunk.text}

//                   </div>


//                   {/* BOUNDARY */}

//                   <div className="chunk-boundary">

//                     <div>

//                       <span>
//                         START
//                       </span>

//                       <strong>
//                         {start}
//                       </strong>

//                     </div>


//                     <div className="boundary-line">

//                       <span>
//                         {chunk.characters ??
//                           chunk.text?.length ??
//                           0}{" "}
//                         characters
//                       </span>

//                     </div>


//                     <div>

//                       <span>
//                         END
//                       </span>

//                       <strong>
//                         {end}
//                       </strong>

//                     </div>

//                   </div>


//                   {/* OVERLAP INDICATOR */}

//                   {index > 0 && (

//                     <div className="overlap-indicator">

//                       <span>
//                         ↳ 150 characters overlap
//                         with previous chunk
//                       </span>

//                     </div>

//                   )}

//                 </div>

//               );

//             })}

//           </div>

//         </section>

//       )}


//       {/* NO CHUNKS */}

//       {!loading && chunks.length === 0 && (

//         <section className="documents-card">

//           <div className="empty-answer">

//             <div className="empty-icon">
//               ⚠
//             </div>

//             <p>
//               No chunks found
//             </p>

//             <span>
//               Check the backend chunk endpoint.
//             </span>

//           </div>

//         </section>

//       )}

//     </div>

//   );
// }


// /* =========================================================
//    EMBEDDINGS PAGE
// ========================================================= */

// function EmbeddingsPage({
//   documents,
//   embeddingDocument,
//   setEmbeddingDocument,
//   embeddingChunk,
//   setEmbeddingChunk,
//   embeddingData,
//   loading,
// }) {
//   const vector =
//     embeddingData?.embeddings?.[0]?.embedding || [];

//   const dimensions =
//     embeddingData?.embeddings?.[0]?.dimensions ||
//     vector.length ||
//     768;

//   return (
//     <div>

//       <header className="topbar">

//         <div>
//           <p className="eyebrow">
//             VECTOR DATABASE
//           </p>

//           <h1>
//             Embedding Inspector
//           </h1>

//           <p className="subtitle">
//             Inspect how document chunks are converted into
//             numerical vector representations.
//           </p>
//         </div>

//         <div className="status">
//           <span className="status-dot"></span>
//           Nomic Embed Online
//         </div>

//       </header>


//       {/* SELECT DOCUMENT */}

//       <section className="documents-card">

//         <div className="documents-header">

//           <div>
//             <h2>
//               Select Document
//             </h2>

//             <p>
//               Choose a document and chunk to inspect its
//               embedding vector.
//             </p>
//           </div>

//         </div>


//         <div
//           style={{
//             display: "flex",
//             gap: "16px",
//             padding: "24px",
//             flexWrap: "wrap",
//           }}
//         >

//           <select
//             value={embeddingDocument || ""}
//             onChange={(e) => {
//               setEmbeddingDocument(e.target.value);
//               setEmbeddingChunk(0);
//             }}
//             style={{
//               flex: 1,
//               minWidth: "280px",
//               padding: "14px",
//               borderRadius: "10px",
//               border: "1px solid #1e3354",
//               fontSize: "15px",
//               background: "#0d1526",
//               color: "#e5e7eb",
//             }}
//           >

//             <option value="">
//               Select a document
//             </option>

//             {documents.map((doc) => (
//               <option
//                 key={doc.name}
//                 value={doc.name}
//               >
//                 {doc.name}
//               </option>
//             ))}

//           </select>


//           <input
//             type="number"
//             min="0"
//             value={embeddingChunk}
//             onChange={(e) =>
//               setEmbeddingChunk(
//                 Math.max(0, Number(e.target.value))
//               )
//             }
//             placeholder="Chunk ID"
//             style={{
//               width: "120px",
//               padding: "14px",
//               borderRadius: "10px",
//               border: "1px solid #ddd",
//               fontSize: "15px",
//             }}
//           />

//         </div>

//       </section>


//       {/* PIPELINE */}

//       <section className="pipeline-card">

//         <div className="pipeline-title">

//           <div>
//             <h2>
//               Embedding Pipeline
//             </h2>

//             <p>
//               How InsureMate converts text into vectors.
//             </p>
//           </div>

//         </div>


//         <div className="pipeline">

//           <div className="pipeline-step">
//             <div className="step-number">
//               01
//             </div>

//             <strong>
//               Document
//             </strong>

//             <span>
//               PDF policy
//             </span>
//           </div>


//           <div className="arrow">
//             →
//           </div>


//           <div className="pipeline-step">
//             <div className="step-number">
//               02
//             </div>

//             <strong>
//               Chunk
//             </strong>

//             <span>
//               Text segment
//             </span>
//           </div>


//           <div className="arrow">
//             →
//           </div>


//           <div className="pipeline-step">
//             <div className="step-number">
//               03
//             </div>

//             <strong>
//               Nomic Embed
//             </strong>

//             <span>
//               Embedding model
//             </span>
//           </div>


//           <div className="arrow">
//             →
//           </div>


//           <div className="pipeline-step">
//             <div className="step-number">
//               04
//             </div>

//             <strong>
//               768-D Vector
//             </strong>

//             <span>
//               Numerical representation
//             </span>
//           </div>

//         </div>

//       </section>


//       {/* VECTOR DETAILS */}

//       {loading && (
//         <section className="documents-card">

//           <div className="empty-answer">

//             <div className="empty-icon">
//               ⟳
//             </div>

//             <p>
//               Generating embedding...
//             </p>

//             <span>
//               Fetching vector from nomic-embed-text.
//             </span>

//           </div>

//         </section>
//       )}


//       {!loading && embeddingData && (

//         <>

//           {/* SUMMARY */}

//           <section className="status-grid">

//             <div className="status-card">

//               <div className="card-label">
//                 EMBEDDING MODEL
//               </div>

//               <div className="card-value">
//                 nomic-embed-text
//               </div>

//               <div className="card-status">
//                 ● Active
//               </div>

//             </div>


//             <div className="status-card">

//               <div className="card-label">
//                 DIMENSIONS
//               </div>

//               <div className="card-value">
//                 {dimensions}
//               </div>

//               <div className="card-status">
//                 ● Vector size
//               </div>

//             </div>


//             <div className="status-card">

//               <div className="card-label">
//                 DOCUMENT
//               </div>

//               <div
//                 className="card-value"
//                 style={{
//                   fontSize: "15px",
//                   wordBreak: "break-word",
//                 }}
//               >
//                 {embeddingDocument}
//               </div>

//               <div className="card-status">
//                 ● Loaded
//               </div>

//             </div>


//             <div className="status-card">

//               <div className="card-label">
//                 CHUNK
//               </div>

//               <div className="card-value">
//                 #{embeddingChunk}
//               </div>

//               <div className="card-status">
//                 ● Embedded
//               </div>

//             </div>

//           </section>


//           {/* VECTOR */}

//           <section className="documents-card">

//             <div className="documents-header">

//               <div>

//                 <h2>
//                   Vector Representation
//                 </h2>

//                 <p>
//                   The actual {dimensions}-dimensional
//                   embedding generated for this chunk.
//                 </p>

//               </div>

//               <span className="document-count">
//                 {dimensions} values
//               </span>

//             </div>


//             <div
//               style={{
//                 margin: "20px",
//                 padding: "20px",
//                 background: "#111827",
//                 borderRadius: "12px",
//                 color: "#d1d5db",
//                 fontFamily: "monospace",
//                 fontSize: "13px",
//                 lineHeight: "1.8",
//                 maxHeight: "400px",
//                 overflowY: "auto",
//                 wordBreak: "break-all",
//               }}
//             >

//               {vector.map((value, index) => (
//                 <span key={index}>
//                   <span
//                     style={{
//                       color: "#9ca3af",
//                     }}
//                   >
//                     {index}:
//                   </span>{" "}

//                   {Number(value).toFixed(7)}

//                   {index < vector.length - 1
//                     ? ", "
//                     : ""}
//                 </span>
//               ))}

//             </div>

//           </section>


//           {/* EXPLANATION */}

//           <section className="overlap-card">

//             <div className="overlap-heading">

//               <div className="overlap-icon">
//                 ✦
//               </div>

//               <div>

//                 <h2>
//                   What is this vector?
//                 </h2>

//                 <p>
//                   Each insurance text chunk is converted
//                   into a numerical representation containing
//                   {dimensions} values. Similar insurance
//                   concepts produce vectors that are closer
//                   together in the embedding space. InsureMate
//                   uses these representations during semantic
//                   retrieval to find relevant policy chunks.
//                 </p>

//               </div>

//             </div>

//           </section>

//         </>

//       )}


//       {!loading && !embeddingData && !embeddingDocument && (

//         <section className="documents-card">

//           <div className="empty-answer">

//             <div className="empty-icon">
//               ✦
//             </div>

//             <p>
//               Select a document to inspect embeddings.
//             </p>

//             <span>
//               Choose a PDF above to load its vector.
//             </span>

//           </div>

//         </section>

//       )}

//     </div>
//   );
// }



// /* =========================================================
//    RETRIEVAL PAGE
// ========================================================= */

// function RetrievalPage() {

//   const API_BASE = API_URL;

//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const searchRetrieval = async () => {

//     if (!query.trim()) return;

//     try {

//       setLoading(true);
//       setError("");
//       setResults([]);

//       const response = await fetch(
//         `${API_BASE}/api/retrieval/search`,
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json"
//           },
//           body: JSON.stringify({
//             question: query,
//             top_k: 5
//           })
//         }
//       );

//       if (!response.ok) {
//         throw new Error(
//           `Retrieval request failed: HTTP ${response.status}`
//         );
//       }

//       const data = await response.json();

//       setResults(
//         data.results ||
//         data.chunks ||
//         data.retrieved_chunks ||
//         []
//       );

//     } catch (err) {

//       console.error("Retrieval error:", err);

//       setError(
//         err.message ||
//         "Unable to connect to retrieval service."
//       );

//     } finally {

//       setLoading(false);

//     }
//   };

//   return (

//     <div>

//       <header className="topbar">

//         <div>

//           <p className="eyebrow">
//             INSUREMATE AI
//           </p>

//           <h1>
//             Retrieval
//           </h1>

//           <p className="subtitle">
//             Search the indexed insurance knowledge base
//             using semantic retrieval.
//           </p>

//         </div>

//       </header>


//       <section className="documents-card">

//         <div style={{ padding: "24px" }}>

//           <h2>
//             Semantic Retrieval
//           </h2>

//           <p
//             style={{
//               color: "#94a3b8",
//               marginBottom: "18px"
//             }}
//           >
//             Enter a policy question to find the most
//             relevant evidence chunks.
//           </p>


//           <div
//             style={{
//               display: "flex",
//               gap: "12px",
//               flexWrap: "wrap"
//             }}
//           >

//             <input
//               value={query}
//               onChange={(event) =>
//                 setQuery(event.target.value)
//               }
//               onKeyDown={(event) => {
//                 if (event.key === "Enter") {
//                   searchRetrieval();
//                 }
//               }}
//               placeholder="e.g. What expenses are covered after hospitalization?"
//               style={{
//                 flex: 1,
//                 minWidth: "280px",
//                 padding: "13px 14px",
//                 border: "1px solid #d1d5db",
//                 borderRadius: "9px",
//                 fontFamily: "inherit"
//               }}
//             />


//             <button
//               className="ask-button"
//               onClick={searchRetrieval}
//               disabled={
//                 loading ||
//                 !query.trim()
//               }
//             >
//               {loading
//                 ? "Searching..."
//                 : "Search Evidence →"}
//             </button>

//           </div>

//         </div>

//       </section>


//       {error && (

//         <section className="documents-card">

//           <div className="empty-answer">

//             <div className="empty-icon">
//               ⚠
//             </div>

//             <p>
//               Retrieval failed
//             </p>

//             <span>
//               {error}
//             </span>

//           </div>

//         </section>

//       )}


//       {!loading &&
//        !error &&
//        results.length > 0 && (

//         <section className="documents-card">

//           <div className="documents-header">

//             <div>

//               <h2>
//                 Retrieved Evidence
//               </h2>

//               <p>
//                 Most relevant policy chunks for your query.
//               </p>

//             </div>

//             <span className="document-count">
//               {results.length} results
//             </span>

//           </div>


//           <div
//             style={{
//               padding: "0 24px 24px",
//               display: "grid",
//               gap: "14px"
//             }}
//           >

//             {results.map(
//               (result, index) => {

//                 const document =
//                   result.document ||
//                   "Unknown document";

//                 const page =
//                   result.page ??
//                   "N/A";

//                 const chunkId =
//                   result.chunk_id ??
//                   "N/A";

//                 const score =
//                   result.score ??
//                   result.similarity ??
//                   null;

//                 const text =
//                   result.text ||
//                   result.content ||
//                   "";

//                 return (

//                   <div
//                     key={`${document}-${chunkId}-${index}`}
//                     style={{
//                       border:
//                         "1px solid #e5e7eb",
//                       borderRadius:
//                         "12px",
//                       padding:
//                         "18px",
//                       background:
//                         "#ffffff"
//                     }}
//                   >

//                     <div
//                       style={{
//                         display:
//                           "flex",
//                         justifyContent:
//                           "space-between",
//                         gap:
//                           "12px",
//                         flexWrap:
//                           "wrap",
//                         marginBottom:
//                           "12px"
//                       }}
//                     >

//                       <strong>
//                         Result #{index + 1}
//                       </strong>

//                       {score !== null && (

//                         <span
//                           style={{
//                             fontWeight: 600
//                           }}
//                         >
//                           Similarity:{" "}
//                           {(Number(score) * 100)
//                             .toFixed(1)}%
//                         </span>

//                       )}

//                     </div>


//                     <div
//                       style={{
//                         fontSize: "13px",
//                         color: "#94a3b8",
//                         marginBottom: "12px"
//                       }}
//                     >
//                       {document}
//                       {" · "}
//                       Page {page}
//                       {" · "}
//                       Chunk {chunkId}
//                     </div>


//                     <div
//                       style={{
//                         lineHeight: "1.65",
//                         color: "#374151",
//                         fontSize: "14px"
//                       }}
//                     >
//                       {text}
//                     </div>

//                   </div>

//                 );

//               }
//             )}

//           </div>

//         </section>

//       )}


//       {!loading &&
//        !error &&
//        query &&
//        results.length === 0 && (

//         <section className="documents-card">

//           <div className="empty-answer">

//             <div className="empty-icon">
//               ⌕
//             </div>

//             <p>
//               No evidence found
//             </p>

//             <span>
//               Try asking the question in a different way.
//             </span>

//           </div>

//         </section>

//       )}

//     </div>

//   );
// }



// /* =========================================================
//    TECHNICAL PAGE PLACEHOLDER
// ========================================================= */

// function TechnicalPage({
//   title,
//   documents,
//   totalChunks,
// }) {

//   const API_BASE = API_URL;

//   /* =========================================================
//      SOURCES STATE
//   ========================================================= */

//   // const [documents, setDocuments] = useState([]);
//   const [chunks, setChunks] = useState([]);
//   const [sourcesLoading, setSourcesLoading] = useState(false);
//   const [sourcesError, setSourcesError] = useState("");
//   const [selectedDocument, setSelectedDocument] = useState(null);


//   /* =========================================================
//      MODELS STATE
//   ========================================================= */

//   const [models, setModels] = useState([]);
//   const [modelsLoading, setModelsLoading] = useState(false);
//   const [modelsError, setModelsError] = useState("");


//   /* =========================================================
//      HALLUCINATION STATE
//   ========================================================= */

//   const [hallucinationQuestion, setHallucinationQuestion] =
//     useState("");

//   const [hallucinationModel, setHallucinationModel] =
//     useState("qwen2.5:1.5b");

//   const [hallucinationResult, setHallucinationResult] =
//     useState(null);

//   const [hallucinationLoading, setHallucinationLoading] =
//     useState(false);

//   const [comparisonResults, setComparisonResults] =
//     useState([]);

//   const [comparisonLoading, setComparisonLoading] =
//     useState(false);


//   /* =========================================================
//      SYSTEM STATE
//   ========================================================= */

//   const [systemStatus, setSystemStatus] =
//     useState(null);

//   const [systemLoading, setSystemLoading] =
//     useState(false);


//   /* =========================================================
//      LOAD SOURCES
//   ========================================================= */

//   const loadSources = async () => {

//     try {

//       setSourcesLoading(true);
//       setSourcesError("");

//       // const documentsResponse =
//       //   await fetch(
//       //     `${API_BASE}/api/knowledge/documents`
//       //   );

//       // if (!documentsResponse.ok) {
//       //   throw new Error("Failed to load documents");
//       // }

//       // const documentsData =
//       //   await documentsResponse.json();

//       // setDocuments(
//       //   documentsData.documents || []
//       // );


//       const chunksResponse =
//         await fetch(
//           `${API_BASE}/api/knowledge/chunks`
//         );

//       if (!chunksResponse.ok) {
//         throw new Error("Failed to load chunks");
//       }

//       const chunksData =
//         await chunksResponse.json();

//       setChunks(
//         chunksData.chunks || []
//       );

//     } catch (error) {

//       console.error(
//         "Sources error:",
//         error
//       );

//       setSourcesError(
//         error.message ||
//         "Unable to load policy sources."
//       );

//     } finally {

//       setSourcesLoading(false);

//     }
//   };


//   /* =========================================================
//      LOAD MODELS
//   ========================================================= */

//   const loadModels = async () => {

//     try {

//       setModelsLoading(true);
//       setModelsError("");

//       const response =
//         await fetch(
//           `${API_BASE}/api/models`
//         );

//       if (!response.ok) {
//         throw new Error(
//           "Failed to load models"
//         );
//       }

//       const data =
//         await response.json();

//       setModels(
//         data.models || []
//       );

//     } catch (error) {

//       console.error(
//         "Models error:",
//         error
//       );

//       setModelsError(
//         error.message ||
//         "Unable to load models."
//       );

//     } finally {

//       setModelsLoading(false);

//     }
//   };


//   /* =========================================================
//      SYSTEM STATUS
//   ========================================================= */
//   const loadSystemStatus = async () => {

//   try {

//     setSystemLoading(true);

//     // Check FastAPI
//     const apiResponse = await fetch(
//       `${API_BASE}/`,
//       {
//         cache: "no-store"
//       }
//     );

//     // Check Ollama through FastAPI
//     const ollamaResponse = await fetch(
//       `${API_BASE}/api/models`,
//       {
//         cache: "no-store"
//       }
//     );

//     const ollamaData =
//       await ollamaResponse.json();

//     const ollamaOnline =
//       ollamaResponse.ok &&
//       Array.isArray(ollamaData.models) &&
//       ollamaData.models.length > 0;

//     setSystemStatus({

//       api: apiResponse.ok,

//       ollama: ollamaOnline

//     });

//   } catch (error) {

//     console.error(
//       "System status error:",
//       error
//     );

//     setSystemStatus({

//       api: false,

//       ollama: false

//     });

//   } finally {

//     setSystemLoading(false);

//   }

// };


//   /* =========================================================
//      INITIAL LOAD
//   ========================================================= */

//   useEffect(() => {

//     if (title === "Sources") {
//       loadSources();
//     }

//     if (title === "Models" || title === "Hallucination") {
//       loadModels();
//     }

//     if (title === "System") {
//       loadSystemStatus();
//     }

//   }, [title]);


//   /* =========================================================
//      HALLUCINATION CHECK
//   ========================================================= */

//   const runHallucinationCheck =
//     async () => {

//       if (!hallucinationQuestion.trim()) {
//         return;
//       }

//       try {

//         setHallucinationLoading(true);
//         setHallucinationResult(null);

//         const response =
//           await fetch(
//             `${API_BASE}/api/hallucination/check`,
//             {
//               method: "POST",

//               headers: {
//                 "Content-Type":
//                   "application/json"
//               },

//               body: JSON.stringify({
//                 question:
//                   hallucinationQuestion,

//                 model:
//                   hallucinationModel,

//                 top_k: 3
//               })
//             }
//           );

//         if (!response.ok) {

//           const text =
//             await response.text();

//           throw new Error(
//             text ||
//             `HTTP ${response.status}`
//           );
//         }

//         const data =
//           await response.json();

//         setHallucinationResult(
//           data
//         );

//       } catch (error) {

//         console.error(
//           "Hallucination error:",
//           error
//         );

//         setHallucinationResult({
//           error:
//             error.message ||
//             "Evaluation failed."
//         });

//       } finally {

//         setHallucinationLoading(false);

//       }
//     };


//   /* =========================================================
//      COMPARE MODELS
//   ========================================================= */

//   const compareModels =
//     async () => {

//       if (!hallucinationQuestion.trim()) {
//         return;
//       }

//       const generationModels =
//         models.filter(
//           (model) =>
//             model.capabilities &&
//             model.capabilities.includes(
//               "completion"
//             )
//         );

//       if (
//         generationModels.length === 0
//       ) {

//         await loadModels();
//         return;

//       }

//       try {

//         setComparisonLoading(true);
//         setComparisonResults([]);

//         const results = [];

//         for (
//           const model of generationModels
//         ) {

//           try {

//             const response =
//               await fetch(
//                 `${API_BASE}/api/hallucination/check`,
//                 {
//                   method: "POST",

//                   headers: {
//                     "Content-Type":
//                       "application/json"
//                   },

//                   body: JSON.stringify({

//                     question:
//                       hallucinationQuestion,

//                     model:
//                       model.name,

//                     top_k: 3

//                   })

//                 }
//               );

//             if (!response.ok) {
//               throw new Error(
//                 `HTTP ${response.status}`
//               );
//             }

//             const data =
//               await response.json();

//             results.push({

//               name:
//                 model.name,

//               grounding_score:
//                 data.grounding_score,

//               risk:
//                 data.risk,

//               supported:
//                 (
//                   data.supported_claims ||
//                   []
//                 ).length,

//               unsupported:
//                 (
//                   data.unsupported_claims ||
//                   []
//                 ).length

//             });

//           } catch (error) {

//             results.push({

//               name:
//                 model.name,

//               grounding_score:
//                 null,

//               risk:
//                 "ERROR",

//               supported: 0,

//               unsupported: 0

//             });

//           }

//         }

//         setComparisonResults(
//           results
//         );

//       } catch (error) {

//         console.error(
//           "Comparison error:",
//           error
//         );

//       } finally {

//         setComparisonLoading(false);

//       }
//     };


//   /* =========================================================
//      SOURCES PAGE
//   ========================================================= */

//   if (title === "Sources") {

//     return (

//       <div>

//         <header className="topbar">

//           <div>

//             <p className="eyebrow">
//               KNOWLEDGE BASE
//             </p>

//             <h1>
//               Sources
//             </h1>

//             <p className="subtitle">
//               Policy documents and evidence chunks
//               used by the InsureMate AI pipeline.
//             </p>

//           </div>

//           <button
//             className="ask-button"
//             onClick={loadSources}
//             disabled={sourcesLoading}
//           >
//             {sourcesLoading
//               ? "Refreshing..."
//               : "↻ Refresh Sources"}
//           </button>

//         </header>


//         {sourcesError && (

//           <section className="documents-card">

//             <div className="empty-answer">

//               <div className="empty-icon">
//                 ⚠
//               </div>

//               <p>
//                 Sources unavailable
//               </p>

//               <span>
//                 {sourcesError}
//               </span>

//             </div>

//           </section>

//         )}


//         {!sourcesLoading &&
//          !sourcesError && (

//           <>

//             <section className="status-grid">

//               <div className="status-card">

//                 <div className="card-label">
//                   DOCUMENTS
//                 </div>

//                 <div className="card-value">
//                   {documents.length}
//                 </div>

//                 <div className="card-status">
//                   ● Indexed
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   EVIDENCE CHUNKS
//                 </div>

//                 <div className="card-value">
//                   {chunks.length}
//                 </div>

//                 <div className="card-status">
//                   ● Available
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   CHUNK SIZE
//                 </div>

//                 <div className="card-value">
//                   800
//                 </div>

//                 <div className="card-status">
//                   ● Characters
//                 </div>

//               </div>

//             </section>


//             <section className="documents-card">

//               <div className="documents-header">

//                 <div>

//                   <h2>
//                     Policy Sources
//                   </h2>

//                   <p>
//                     Documents currently indexed
//                     in the InsureMate knowledge base.
//                   </p>

//                 </div>

//                 <span className="document-count">
//                   {documents.length} document
//                   {documents.length !== 1
//                     ? "s"
//                     : ""}
//                 </span>

//               </div>


//               <div
//                 style={{
//                   padding:
//                     "0 24px 24px",
//                   display: "grid",
//                   gap: "16px"
//                 }}
//               >

//                 {documents.map(
//                   (document) => {

//                     const documentChunks =
//                       chunks.filter(
//                         (chunk) =>
//                           chunk.document ===
//                           document.name
//                       );

//                     const isSelected =
//                       selectedDocument ===
//                       document.name;

//                     const pages =
//                       new Set(
//                         documentChunks.map(
//                           (chunk) =>
//                             chunk.page
//                         )
//                       ).size;

//                     return (

//                       <div
//                         key={
//                           document.name
//                         }
//                         style={{
//                           border:
//                             "1px solid #1e3354",
//                           borderRadius:
//                             "14px",
//                           padding:
//                             "20px",
//                           background:
//                             "#0d1526",
//                           boxShadow:
//                             "0 0 20px rgba(34, 211, 238, 0.06)"
//                         }}
//                       >

//                         <div
//                           style={{
//                             display:
//                               "flex",
//                             justifyContent:
//                               "space-between",
//                             alignItems:
//                               "center",
//                             gap:
//                               "16px",
//                             flexWrap:
//                               "wrap"
//                           }}
//                         >

//                           <div>

//                             <div
//                               style={{
//                                 fontSize:
//                                   "18px",
//                                 fontWeight:
//                                   700,
//                                 color:
//                                   "#f1f5f9"
//                               }}
//                             >
//                               📄{" "}
//                               {document.name}
//                             </div>

//                             <div
//                               style={{
//                                 marginTop:
//                                   "6px",
//                                 color:
//                                   "#94a3b8",
//                                 fontSize:
//                                   "13px"
//                               }}
//                             >
//                               Insurance policy
//                               document
//                             </div>

//                           </div>

//                           <span
//                             style={{
//                               color:
//                                 "#15803d",
//                               fontSize:
//                                 "13px",
//                               fontWeight:
//                                 600
//                             }}
//                           >
//                             ● Indexed
//                           </span>

//                         </div>


//                         <div
//                           className="status-grid"
//                           style={{
//                             marginTop:
//                               "18px"
//                           }}
//                         >

//                           <div className="status-card">

//                             <div className="card-label">
//                               CHUNKS
//                             </div>

//                             <div className="card-value">
//                               {document.chunks}
//                             </div>

//                           </div>


//                           <div className="status-card">

//                             <div className="card-label">
//                               PAGES
//                             </div>

//                             <div className="card-value">
//                               {pages}
//                             </div>

//                           </div>


//                           <div className="status-card">

//                             <div className="card-label">
//                               OVERLAP
//                             </div>

//                             <div className="card-value">
//                               150
//                             </div>

//                           </div>

//                         </div>


//                         <button
//                           className="ask-button"
//                           style={{
//                             marginTop:
//                               "18px"
//                           }}
//                           onClick={() =>
//                             setSelectedDocument(
//                               isSelected
//                                 ? null
//                                 : document.name
//                             )
//                           }
//                         >
//                           {isSelected
//                             ? "Hide Evidence"
//                             : "View Evidence"}
//                         </button>


//                         {isSelected && (

//                           <div
//                             style={{
//                               marginTop:
//                                 "18px",
//                               borderTop:
//                                 "1px solid #e5e7eb",
//                               paddingTop:
//                                 "18px"
//                             }}
//                           >

//                             <div
//                               style={{
//                                 fontWeight:
//                                   700,
//                                 marginBottom:
//                                   "12px"
//                               }}
//                             >
//                               Evidence Chunks
//                             </div>


//                             {documentChunks
//                               .slice(0, 10)
//                               .map(
//                                 (chunk) => (

//                                   <div
//                                     key={`${chunk.document}-${chunk.chunk_id}`}
//                                     style={{
//                                       padding:
//                                         "14px",
//                                       marginBottom:
//                                         "10px",
//                                       background:
//                                         "#f8fafc",
//                                       borderRadius:
//                                         "10px"
//                                     }}
//                                   >

//                                     <div
//                                       style={{
//                                         display:
//                                           "flex",
//                                         justifyContent:
//                                           "space-between",
//                                         marginBottom:
//                                           "7px",
//                                         fontSize:
//                                           "12px",
//                                         fontWeight:
//                                           600
//                                       }}
//                                     >

//                                       <span>
//                                         Chunk #
//                                         {
//                                           chunk.chunk_id
//                                         }
//                                       </span>

//                                       <span>
//                                         Page{" "}
//                                         {
//                                           chunk.page
//                                         }
//                                       </span>

//                                     </div>


//                                     <div
//                                       style={{
//                                         fontSize:
//                                           "13px",
//                                         lineHeight:
//                                           "1.6",
//                                         color:
//                                           "#4b5563"
//                                       }}
//                                     >
//                                       {
//                                         chunk.text
//                                       }
//                                     </div>

//                                   </div>

//                                 )
//                               )}

//                           </div>

//                         )}

//                       </div>

//                     );

//                   }
//                 )}

//               </div>

//             </section>

//           </>

//         )}

//       </div>

//     );

//   }


//   /* =========================================================
//      MODELS PAGE
//   ========================================================= */

//   if (title === "Models") {

//     const generationModels =
//       models.filter(
//         (model) =>
//           model.capabilities &&
//           model.capabilities.includes(
//             "completion"
//           )
//       );

//     const embeddingModels =
//       models.filter(
//         (model) =>
//           model.capabilities &&
//           model.capabilities.includes(
//             "embedding"
//           )
//       );

//     return (

//       <div>

//         <header className="topbar">

//           <div>

//             <p className="eyebrow">
//               AI MODEL INFRASTRUCTURE
//             </p>

//             <h1>
//               Models
//             </h1>

//             <p className="subtitle">
//               Live models available through
//               the InsureMate Ollama runtime.
//             </p>

//           </div>

//           <button
//             className="ask-button"
//             onClick={loadModels}
//             disabled={modelsLoading}
//           >
//             {modelsLoading
//               ? "Refreshing..."
//               : "↻ Refresh Models"}
//           </button>

//         </header>


//         {modelsError && (

//           <section className="documents-card">

//             <div className="empty-answer">

//               <div className="empty-icon">
//                 ⚠
//               </div>

//               <p>
//                 Model service unavailable
//               </p>

//               <span>
//                 {modelsError}
//               </span>

//             </div>

//           </section>

//         )}


//         {!modelsError && (

//           <>

//             <section className="status-grid">

//               <div className="status-card">

//                 <div className="card-label">
//                   OLLAMA
//                 </div>

//                 <div className="card-value">
//                   Online
//                 </div>

//                 <div className="card-status">
//                   ● Connected
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   AVAILABLE MODELS
//                 </div>

//                 <div className="card-value">
//                   {models.length}
//                 </div>

//                 <div className="card-status">
//                   ● Detected
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   GENERATION
//                 </div>

//                 <div className="card-value">
//                   {generationModels.length}
//                 </div>

//                 <div className="card-status">
//                   ● Completion Models
//                 </div>

//               </div>


//               <div className="status-card">

//                 <div className="card-label">
//                   EMBEDDING
//                 </div>

//                 <div className="card-value">
//                   {embeddingModels.length}
//                 </div>

//                 <div className="card-status">
//                   ● Embedding Models
//                 </div>

//               </div>

//             </section>


//             <section className="documents-card">

//               <div className="documents-header">

//                 <div>

//                   <h2>
//                     Available Models
//                   </h2>

//                   <p>
//                     Models detected from the
//                     local Ollama service.
//                   </p>

//                 </div>

//                 <span className="document-count">
//                   {models.length} models
//                 </span>

//               </div>


//               <div
//                 style={{
//                   padding:
//                     "0 24px 24px",
//                   display:
//                     "grid",
//                   gap:
//                     "14px"
//                 }}
//               >

//                 {models.map(
//                   (model) => {

//                     const isEmbedding =
//                       model.capabilities &&
//                       model.capabilities.includes(
//                         "embedding"
//                       );

//                     const sizeGB =
//                       model.size
//                         ? (
//                             model.size /
//                             (1024 ** 3)
//                           ).toFixed(2)
//                         : "N/A";

//                     const context =
//                       model.details &&
//                       model.details.context_length
//                         ? Math.round(
//                             model.details
//                               .context_length /
//                             1000
//                           ) + "K"
//                         : "N/A";

//                     return (

//                       <div
//                         key={
//                           model.name
//                         }
//                         style={{
//                           border:
//                             "1px solid #1e3354",
//                           borderRadius:
//                             "14px",
//                           padding:
//                             "20px",
//                           background:
//                             "#0d1526",
//                           boxShadow:
//                             "0 0 20px rgba(34, 211, 238, 0.06)"
//                         }}
//                       >

//                         <div
//                           style={{
//                             display:
//                               "flex",
//                             justifyContent:
//                               "space-between",
//                             alignItems:
//                               "center",
//                             gap:
//                               "16px",
//                             flexWrap:
//                               "wrap"
//                           }}
//                         >

//                           <div>

//                             <div
//                               style={{
//                                 fontSize:
//                                   "18px",
//                                 fontWeight:
//                                   700
//                               }}
//                             >
//                               {isEmbedding
//                                 ? "EMB"
//                                 : "AI"}{" "}
//                               {model.name}
//                             </div>

//                             <div
//                               style={{
//                                 marginTop:
//                                   "6px",
//                                 color:
//                                   "#6b7280",
//                                 fontSize:
//                                   "13px"
//                               }}
//                             >
//                               {isEmbedding
//                                 ? "Embedding Model"
//                                 : "Language Model"}
//                             </div>

//                           </div>

//                           <span
//                             style={{
//                               color:
//                                 "#15803d",
//                               fontWeight:
//                                 600,
//                               fontSize:
//                                 "13px"
//                             }}
//                           >
//                             ● Ready
//                           </span>

//                         </div>


//                         <div
//                           className="status-grid"
//                           style={{
//                             marginTop:
//                               "18px"
//                           }}
//                         >

//                           <div className="status-card">

//                             <div className="card-label">
//                               PARAMETERS
//                             </div>

//                             <div className="card-value">
//                               {
//                                 model.details
//                                   ?.parameter_size ||
//                                 "N/A"
//                               }
//                             </div>

//                           </div>


//                           <div className="status-card">

//                             <div className="card-label">
//                               MODEL SIZE
//                             </div>

//                             <div className="card-value">
//                               {sizeGB} GB
//                             </div>

//                           </div>


//                           <div className="status-card">

//                             <div className="card-label">
//                               CONTEXT
//                             </div>

//                             <div className="card-value">
//                               {context}
//                             </div>

//                           </div>

//                         </div>

//                       </div>

//                     );

//                   }
//                 )}

//               </div>

//             </section>

//           </>

//         )}

//       </div>

//     );

//   }


//   /* =========================================================
//      HALLUCINATION PAGE
//   ========================================================= */

//   if (title === "Hallucination") {

//     const bestModel =
//       comparisonResults.length > 0
//         ? comparisonResults
//             .filter(
//               (item) =>
//                 item.grounding_score !== null
//             )
//             .sort(
//               (a, b) =>
//                 b.grounding_score -
//                 a.grounding_score
//             )[0]
//         : null;

//     return (

//       <div>

//         <header className="topbar">

//           <div>

//             <p className="eyebrow">
//               AI SAFETY & EVALUATION
//             </p>

//             <h1>
//               Hallucination Detector
//             </h1>

//             <p className="subtitle">
//               Evaluate whether AI-generated insurance
//               answers are grounded in retrieved policy evidence.
//             </p>

//           </div>

//         </header>


//         <section className="documents-card">

//           <div
//             style={{
//               padding: "24px"
//             }}
//           >

//             <h2>
//               Test AI Grounding
//             </h2>

//             <p
//               style={{
//                 color: "#94a3b8",
//                 marginBottom: "20px"
//               }}
//             >
//               Ask a policy question and evaluate how
//               well the generated answer is supported
//               by evidence.
//             </p>


//             <div
//               style={{
//                 display: "grid",
//                 gap: "14px"
//               }}
//             >

//               <textarea
//                 value={
//                   hallucinationQuestion
//                 }
//                 onChange={(event) =>
//                   setHallucinationQuestion(
//                     event.target.value
//                   )
//                 }
//                 placeholder="Ask a policy question..."
//                 rows={4}
//                 style={{
//                   width: "100%",
//                   padding: "14px",
//                   border:
//                     "1px solid #d1d5db",
//                   borderRadius: "10px",
//                   resize: "vertical",
//                   fontFamily:
//                     "inherit"
//                 }}
//               />


//               <div
//                 style={{
//                   display: "flex",
//                   gap: "12px",
//                   flexWrap: "wrap"
//                 }}
//               >

//                 <select
//                   value={
//                     hallucinationModel
//                   }
//                   onChange={(event) =>
//                     setHallucinationModel(
//                       event.target.value
//                     )
//                   }
//                   style={{
//                     padding: "11px",
//                     border:
//                       "1px solid #d1d5db",
//                     borderRadius:
//                       "8px"
//                   }}
//                 >

//                   {models
//                     .filter(
//                       (model) =>
//                         model.capabilities &&
//                         model.capabilities.includes(
//                           "completion"
//                         )
//                     )
//                     .map(
//                       (model) => (
//                         <option
//                           key={
//                             model.name
//                           }
//                           value={
//                             model.name
//                           }
//                         >
//                           {model.name}
//                         </option>
//                       )
//                     )}

//                 </select>


//                 <button
//                   className="ask-button"
//                   onClick={
//                     runHallucinationCheck
//                   }
//                   disabled={
//                     hallucinationLoading ||
//                     !hallucinationQuestion.trim()
//                   }
//                 >
//                   {hallucinationLoading
//                     ? "Analyzing..."
//                     : "Analyze Answer →"}
//                 </button>


//                 <button
//                   className="ask-button"
//                   onClick={
//                     compareModels
//                   }
//                   disabled={
//                     comparisonLoading ||
//                     !hallucinationQuestion.trim()
//                   }
//                 >
//                   {comparisonLoading
//                     ? "Comparing..."
//                     : "Compare All Models"}
//                 </button>

//               </div>

//             </div>

//           </div>

//         </section>


//         {hallucinationResult && (

//           <section className="documents-card">

//             <div
//               style={{
//                 padding: "24px"
//               }}
//             >

//               {hallucinationResult.error ? (

//                 <div className="empty-answer">

//                   <div className="empty-icon">
//                     ⚠
//                   </div>

//                   <p>
//                     Evaluation failed
//                   </p>

//                   <span>
//                     {
//                       hallucinationResult.error
//                     }
//                   </span>

//                 </div>

//               ) : (

//                 <>

//                   <div
//                     className="status-grid"
//                   >

//                     <div className="status-card">

//                       <div className="card-label">
//                         GROUNDING SCORE
//                       </div>

//                       <div className="card-value">
//                         {
//                           hallucinationResult
//                             .grounding_score
//                         }%
//                       </div>

//                     </div>


//                     <div className="status-card">

//                       <div className="card-label">
//                         HALLUCINATION RISK
//                       </div>

//                       <div className="card-value">
//                         {
//                           hallucinationResult
//                             .risk
//                         }
//                       </div>

//                     </div>


//                     <div className="status-card">

//                       <div className="card-label">
//                         EVIDENCE CHUNKS
//                       </div>

//                       <div className="card-value">
//                         {
//                           (
//                             hallucinationResult
//                               .sources ||
//                             []
//                           ).length
//                         }
//                       </div>

//                     </div>

//                   </div>


//                   <h2
//                     style={{
//                       marginTop:
//                         "28px"
//                     }}
//                   >
//                     AI Answer
//                   </h2>

//                   <div
//                     style={{
//                       padding:
//                         "18px",
//                       background:
//                         "#f8fafc",
//                       borderRadius:
//                         "10px",
//                       lineHeight:
//                         "1.7"
//                     }}
//                   >
//                     {
//                       hallucinationResult
//                         .answer
//                     }
//                   </div>


//                   <h2
//                     style={{
//                       marginTop:
//                         "28px"
//                     }}
//                   >
//                     ✓ Supported Claims
//                   </h2>

//                   <div>

//                     {(
//                       hallucinationResult
//                         .supported_claims ||
//                       []
//                     ).map(
//                       (claim, index) => (

//                         <div
//                           key={index}
//                           style={{
//                             padding:
//                               "12px",
//                             marginBottom:
//                               "8px",
//                             background:
//                               "#f0fdf4",
//                             borderRadius:
//                               "8px"
//                           }}
//                         >
//                           {claim}
//                         </div>

//                       )
//                     )}

//                     {(
//                       hallucinationResult
//                         .supported_claims ||
//                       []
//                     ).length === 0 && (

//                       <p>
//                         No supported claims detected.
//                       </p>

//                     )}

//                   </div>


//                   <h2
//                     style={{
//                       marginTop:
//                         "28px"
//                     }}
//                   >
//                     ✕ Unsupported Claims
//                   </h2>

//                   <div>

//                     {(
//                       hallucinationResult
//                         .unsupported_claims ||
//                       []
//                     ).map(
//                       (claim, index) => (

//                         <div
//                           key={index}
//                           style={{
//                             padding:
//                               "12px",
//                             marginBottom:
//                               "8px",
//                             background:
//                               "#fef2f2",
//                             borderRadius:
//                               "8px"
//                           }}
//                         >
//                           {claim}
//                         </div>

//                       )
//                     )}

//                     {(
//                       hallucinationResult
//                         .unsupported_claims ||
//                       []
//                     ).length === 0 && (

//                       <p>
//                         No unsupported claims detected.
//                       </p>

//                     )}

//                   </div>


//                   <h2
//                     style={{
//                       marginTop:
//                         "28px"
//                     }}
//                   >
//                     Retrieved Evidence
//                   </h2>

//                   {(
//                     hallucinationResult
//                       .sources ||
//                     []
//                   ).map(
//                     (source, index) => (

//                       <div
//                         key={index}
//                         style={{
//                           padding:
//                             "16px",
//                           marginBottom:
//                             "12px",
//                           background:
//                             "#f8fafc",
//                           borderRadius:
//                             "10px"
//                         }}
//                       >

//                         <strong>
//                           Result #{index + 1}
//                         </strong>

//                         <div
//                           style={{
//                             marginTop:
//                               "5px",
//                             fontSize:
//                               "13px",
//                             color:
//                               "#6b7280"
//                           }}
//                         >
//                           {source.document}
//                           {" · "}
//                           Page {source.page}
//                           {" · "}
//                           Chunk {source.chunk_id}
//                         </div>

//                         <div
//                           style={{
//                             marginTop:
//                               "10px",
//                             fontSize:
//                               "13px",
//                             lineHeight:
//                               "1.6"
//                           }}
//                         >
//                           {source.text}
//                         </div>

//                       </div>

//                     )
//                   )}

//                 </>

//               )}

//             </div>

//           </section>

//         )}


//         {comparisonResults.length > 0 && (

//           <section className="documents-card">

//             <div
//               style={{
//                 padding: "24px"
//               }}
//             >

//               <p className="eyebrow">
//                 MODEL EVALUATION
//               </p>

//               <h2>
//                 Model Comparison
//               </h2>

//               <p
//                 style={{
//                   color: "#94a3b8"
//                 }}
//               >
//                 Compare how consistently each AI model
//                 grounds its answer in the policy evidence.
//               </p>


//               {bestModel && (

//                 <div
//                   style={{
//                     marginTop: "20px",
//                     padding: "20px",
//                     borderRadius: "12px",
//                     background:
//                       "#f8fafc"
//                   }}
//                 >

//                   <div className="card-label">
//                     🏆 BEST GROUNDED MODEL
//                   </div>

//                   <div
//                     style={{
//                       fontSize:
//                         "24px",
//                       fontWeight:
//                         700,
//                       marginTop:
//                         "6px"
//                     }}
//                   >
//                     {bestModel.name}
//                   </div>

//                   <div
//                     style={{
//                       marginTop:
//                         "5px"
//                     }}
//                   >
//                     {bestModel.grounding_score}%
//                     {" "}
//                     grounding score
//                   </div>

//                 </div>

//               )}


//               <div
//                 style={{
//                   marginTop:
//                     "20px",
//                   overflowX:
//                     "auto"
//                 }}
//               >

//                 <table
//                   style={{
//                     width:
//                       "100%",
//                     borderCollapse:
//                       "collapse"
//                   }}
//                 >

//                   <thead>

//                     <tr>

//                       <th
//                         style={{
//                           textAlign:
//                             "left",
//                           padding:
//                             "12px"
//                         }}
//                       >
//                         Model
//                       </th>

//                       <th
//                         style={{
//                           textAlign:
//                             "left",
//                           padding:
//                             "12px"
//                         }}
//                       >
//                         Grounding
//                       </th>

//                       <th
//                         style={{
//                           textAlign:
//                             "left",
//                           padding:
//                             "12px"
//                         }}
//                       >
//                         Risk
//                       </th>

//                       <th
//                         style={{
//                           textAlign:
//                             "left",
//                           padding:
//                             "12px"
//                         }}
//                       >
//                         Claims
//                       </th>

//                     </tr>

//                   </thead>


//                   <tbody>

//                     {comparisonResults.map(
//                       (result) => (

//                         <tr
//                           key={
//                             result.name
//                           }
//                         >

//                           <td
//                             style={{
//                               padding:
//                                 "12px",
//                               borderTop:
//                                 "1px solid #e5e7eb"
//                             }}
//                           >
//                             {result.name}
//                           </td>

//                           <td
//                             style={{
//                               padding:
//                                 "12px",
//                               borderTop:
//                                 "1px solid #e5e7eb"
//                             }}
//                           >
//                             {result.grounding_score ===
//                             null
//                               ? "ERROR"
//                               : `${result.grounding_score}%`}
//                           </td>

//                           <td
//                             style={{
//                               padding:
//                                 "12px",
//                               borderTop:
//                                 "1px solid #e5e7eb"
//                             }}
//                           >
//                             {result.risk}
//                           </td>

//                           <td
//                             style={{
//                               padding:
//                                 "12px",
//                               borderTop:
//                                 "1px solid #e5e7eb"
//                             }}
//                           >
//                             {result.supported}
//                             {" supported / "}
//                             {result.unsupported}
//                             {" unsupported"}
//                           </td>

//                         </tr>

//                       )
//                     )}

//                   </tbody>

//                 </table>

//               </div>

//             </div>

//           </section>

//         )}

//       </div>

//     );

//   }


//   /* =========================================================
//      SYSTEM PAGE
//   ========================================================= */

//   if (title === "System") {

//     return (

//       <div>

//         <header className="topbar">

//           <div>

//             <p className="eyebrow">
//               INSUREMATE
//             </p>

//             <h1>
//               System
//             </h1>

//             <p className="subtitle">
//               Live status of the InsureMate
//               processing infrastructure.
//             </p>

//           </div>

//           <button
//             className="ask-button"
//             onClick={loadSystemStatus}
//             disabled={systemLoading}
//           >
//             {systemLoading
//               ? "Checking..."
//               : "↻ Refresh Status"}
//           </button>

//         </header>


//         <section className="status-grid">

//           <div className="status-card">

//             <div className="card-label">
//               FASTAPI
//             </div>

//             <div className="card-value">
//               {systemStatus?.api
//                 ? "Online"
//                 : "Offline"}
//             </div>

//             <div className="card-status">
//               {systemStatus?.api
//                 ? "● Connected"
//                 : "● Unavailable"}
//             </div>

//           </div>


//           <div className="status-card">

//             <div className="card-label">
//               OLLAMA
//             </div>

//             <div className="card-value">
//               {systemStatus?.ollama
//                 ? "Online"
//                 : "Offline"}
//             </div>

//             <div className="card-status">
//               {systemStatus?.ollama
//                 ? "● Connected"
//                 : "● Unavailable"}
//             </div>

//           </div>


//           <div className="status-card">

//             <div className="card-label">
//               KNOWLEDGE BASE
//             </div>

//             <div className="card-value">
//               6 Documents
//             </div>

//             <div className="card-status">
//               ● Indexed
//             </div>

//           </div>

//         </section>


//         <section className="documents-card">

//           <div
//             className="empty-answer"
//           >

//             <div className="empty-icon">
//               ✓
//             </div>

//             <p>
//               InsureMate infrastructure
//               is connected.
//             </p>

//             <span>
//               FastAPI, Ollama and the
//               knowledge base are available.
//             </span>

//           </div>

//         </section>

//       </div>

//     );

//   }


//   /* =========================================================
//      FALLBACK
//   ========================================================= */

//   return (

//     <div>

//       <header className="topbar">

//         <div>

//           <p className="eyebrow">
//             INSUREMATE
//           </p>

//           <h1>
//             {title}
//           </h1>

//         </div>

//       </header>

//     </div>

//   );

// }



// export default App;





function UploadPolicyPage() {
  const [file, setFile] = React.useState(null);

  const [session, setSession] = React.useState(() => {
    try {
      const savedSession = localStorage.getItem(
        "insuremate_upload_session"
      );

      return savedSession
        ? JSON.parse(savedSession)
        : null;
    } catch (error) {
      console.error(
        "Failed to restore upload session:",
        error
      );

      return null;
    }
  });

  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [chunks, setChunks] = React.useState([]);
  const [showChunkInspector, setShowChunkInspector] =
    React.useState(false);

  const [showEmbeddingInspector, setShowEmbeddingInspector] =
    React.useState(false);

  const [uploadedEmbeddings, setUploadedEmbeddings] =
    React.useState([]);

  const [selectedEmbeddingChunk, setSelectedEmbeddingChunk] =
    React.useState(0);

  const [embeddingLoading, setEmbeddingLoading] =
    React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  // Mode 2 AI Assistant conversation
  const [chatMessages, setChatMessages] = React.useState([]);

  const [error, setError] = React.useState("");

  const uploadPDF = async () => {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    setUploading(true);
    setError("");
    setAnswer("");
    setResults([]);
    setChatMessages([]);
    setChunks([]);
    setUploadedEmbeddings([]);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch(
        `${API_URL}/api/upload`,
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "PDF upload failed."
        );
      }

      // Save session in React state
      setSession(data);

      // Persist session when navigating to another page
      localStorage.setItem(
        "insuremate_upload_session",
        JSON.stringify(data)
      );

    } catch (err) {
      setError(err.message);

    } finally {
      setUploading(false);
    }
  };

  const askUploadedPolicy = async () => {
    if (loading) {
      return;
    }

    if (!session) {
      setError("Upload a PDF first.");
      return;
    }

    if (!question.trim()) {
      setError("Enter a question.");
      return;
    }

    const userQuestion = question.trim();

    setLoading(true);
    setError("");
    setQuestion("");

    // Immediately add the user's message
    setChatMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userQuestion
      }
    ]);

    try {
      const response = await fetch(`${API_URL}/api/upload/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          session_id: session.session_id,
          question: userQuestion,
          model: "codellama:7b-instruct",
          top_k: 3
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to answer question."
        );
      }

      const aiAnswer = data.answer || "";
      const retrievedChunks = data.retrieved_chunks || [];

      setAnswer(aiAnswer);
      setResults(retrievedChunks);

      // Add AI response with its own retrieved evidence
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiAnswer,
          sources: retrievedChunks,
          confidence: data.retrieval_confidence
        }
      ]);

    } catch (err) {

      setError(err.message);

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I couldn't process that question.",
          error: true
        }
      ]);

    } finally {
      setLoading(false);
    }
  };




const resetUpload = () => {
  setFile(null);
  setSession(null);
  setQuestion("");
  setAnswer("");
  setResults([]);
  setChunks([]);
  setUploadedEmbeddings([]);
  setChatMessages([]);
  setShowChunkInspector(false);
  setShowEmbeddingInspector(false);
  setSelectedEmbeddingChunk(0);
  setError("");

  localStorage.removeItem(
    "insuremate_upload_session"
  );
};

  return (
    <section>
      <header className="topbar">
        <div>
          <p className="eyebrow">MODE 2</p>
          <h1>Upload Your Own Policy</h1>
          <p className="subtitle">
            Upload any insurance policy PDF and ask questions using RAG.
          </p>
        </div>
      </header>

      <section className="chat-card">
        <div className="chat-header">
          <div>
            <h2>Upload Policy Document</h2>
            <p>
              The uploaded document is independently chunked, embedded and
              searched before generating an answer.
            </p>
          </div>
        </div>

        <div style={{
          padding: "24px",
          border: "2px dashed #d1d5db",
          borderRadius: "12px",
          marginTop: "20px",
          background: "#fafafa"
        }}>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError("");
            }}
          />

          {file && (
            <p style={{ marginTop: "12px" }}>
              Selected: <strong>{file.name}</strong>
            </p>
          )}

          <div style={{ marginTop: "16px" }}>
            <button
              className="ask-button"
              onClick={uploadPDF}
              disabled={uploading || !file}
            >
              {uploading ? "Processing PDF..." : "Upload & Process PDF →"}
            </button>

            {session && (
              <button
                className="clear-chat-button"
                onClick={resetUpload}
                style={{ marginLeft: "10px" }}
              >
                Upload Another PDF
              </button>
            )}
          </div>

          {error && (
            <p style={{
              marginTop: "15px",
              color: "#b91c1c"
            }}>
              {error}
            </p>
          )}
        </div>
      </section>

      {session && (
        <>
          <section className="status-grid" style={{ marginTop: "20px" }}>
            <div className="status-card">
              <div className="card-label">UPLOADED DOCUMENT</div>
              <div
                className="card-value"
                style={{ fontSize: "17px" }}
              >
                {session.document}
              </div>
              <div className="card-status">● Ready</div>
            </div>

            <div
              className="status-card"
              onClick={async () => {
                try {
                  setLoading(true);
                  setError("");

                  const response = await fetch(
                    `${API_URL}/api/upload/chunks`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        session_id: session.session_id
                      })
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data.detail || "Unable to load chunks."
                    );
                  }

                  setChunks(data.chunks || []);
                  setShowChunkInspector(true);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              style={{
                cursor: "pointer"
              }}
            >
              <div className="card-label">CHUNKS</div>
              <div className="card-value">{session.chunks}</div>
              <div className="card-status">● Processed · Click to inspect</div>
            </div>

            <div
              className="status-card"
              style={{ cursor: "pointer" }}
              onClick={async () => {
                try {
                  setEmbeddingLoading(true);
                  setError("");

                  const response = await fetch(
                    `${API_URL}/api/upload/embeddings`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        session_id: session.session_id
                      })
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data.detail || "Unable to load embeddings."
                    );
                  }

                  setUploadedEmbeddings(data.embeddings || []);
                  setSelectedEmbeddingChunk(0);
                  setShowEmbeddingInspector(true);
                } catch (err) {
                  setError(err.message);
                } finally {
                  setEmbeddingLoading(false);
                }
              }}
            >
              <div className="card-label">
                EMBEDDING DIMENSIONS
              </div>

              <div className="card-value">
                {embeddingLoading
                  ? "Loading..."
                  : session.embedding_dimensions}
              </div>

              <div className="card-status">
                ● Embedded · Click to inspect
              </div>
            </div>

            <div className="status-card">
              <div className="card-label">RAG STATUS</div>
              <div className="card-value">Active</div>
              <div className="card-status">● Ready</div>
            </div>
          </section>

          {showChunkInspector && chunks.length > 0 && (
            <section
              className="pipeline-card"
              style={{ marginTop: "20px" }}
            >
              <div
                className="pipeline-title"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <h2>Chunk Inspector</h2>
                  <p>
                    Inspect how your uploaded policy was divided before
                    embedding and retrieval.
                  </p>
                </div>

                <button
                  className="clear-chat-button"
                  onClick={() => setShowChunkInspector(false)}
                >
                  ← Back to Policy Chat
                </button>
              </div>

              {/* CHUNKING CONFIGURATION */}

              <div
                style={{
                  marginTop: "20px",
                  padding: "22px",
                  border: "1px solid #1e3354",
                  borderRadius: "12px",
                  background: "#0d1526"
                }}
              >
                <h2 style={{ marginBottom: "6px" }}>
                  Chunking Configuration
                </h2>

                <p style={{
                  color: "#94a3b8",
                  marginBottom: "20px"
                }}>
                  Parameters used during document preprocessing.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(150px, 1fr))",
                    gap: "15px"
                  }}
                >
                  <div className="status-card">
                    <div className="card-label">
                      CHUNK SIZE
                    </div>
                    <div className="card-value">
                      600
                    </div>
                    <div className="card-status">
                      characters
                    </div>
                  </div>

                  <div className="status-card">
                    <div className="card-label">
                      OVERLAP
                    </div>
                    <div className="card-value">
                      100
                    </div>
                    <div className="card-status">
                      characters
                    </div>
                  </div>

                  <div className="status-card">
                    <div className="card-label">
                      STEP SIZE
                    </div>
                    <div className="card-value">
                      500
                    </div>
                    <div className="card-status">
                      characters
                    </div>
                  </div>

                  <div className="status-card">
                    <div className="card-label">
                      TOTAL CHUNKS
                    </div>
                    <div className="card-value">
                      {chunks.length}
                    </div>
                    <div className="card-status">
                      in document
                    </div>
                  </div>
                </div>

                {/* OVERLAP EXPLANATION */}

                <div
                  style={{
                    marginTop: "22px",
                    padding: "18px",
                    borderRadius: "10px",
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb"
                  }}
                >
                  <h3 style={{ marginBottom: "8px" }}>
                    How Chunk Overlap Works
                  </h3>

                  <p style={{
                    color: "#94a3b8",
                    lineHeight: "1.6"
                  }}>
                    Each new chunk starts 500 characters after the
                    previous chunk, leaving 100 characters of shared
                    context.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "20px",
                      alignItems: "center",
                      marginTop: "18px",
                      flexWrap: "wrap"
                    }}
                  >
                    <div>
                      <strong>CHUNK #1</strong>
                      <div style={{ marginTop: "6px" }}>
                        0 → 600
                      </div>
                    </div>

                    <div style={{ fontSize: "24px" }}>
                      ↔
                    </div>

                    <div>
                      <strong>CHUNK #2</strong>
                      <div style={{ marginTop: "6px" }}>
                        500 → 1100
                      </div>
                    </div>
                  </div>

                  <p style={{
                    marginTop: "15px",
                    color: "#94a3b8"
                  }}>
                    600 character chunk − 100 character overlap ={" "}
                    <strong>500 character step</strong>
                  </p>
                </div>
              </div>

              {/* ACTUAL CHUNKS */}

              <div
                style={{
                  marginTop: "25px"
                }}
              >
                <div className="chunks-heading">
                  <div>
                    <h2>Document Chunks</h2>
                    <p>
                      Showing the actual chunks generated from the
                      uploaded PDF.
                    </p>
                  </div>

                  <span>
                    {chunks.length} chunks
                  </span>
                </div>

                <div className="chunks-list">
                  {chunks.map((chunk, index) => {
                    const start = index * 500;
                    const end = start + 600;

                    return (
                      <div
                        className="chunk-card"
                        key={
                          chunk.chunk_id ??
                          `${session?.document}-${index}`
                        }
                      >
                        <div className="chunk-header">
                          <div className="chunk-number">
                            CHUNK #{index + 1}
                          </div>

                          <div className="chunk-page">
                            Page {chunk.page ?? "N/A"}
                          </div>
                        </div>

                        <div className="chunk-meta">
                          <span>
                            {chunk.text?.length ?? 0} characters
                          </span>

                          <span>
                            Chunk ID: {chunk.chunk_id ?? index}
                          </span>

                          <span>
                            Range: {start} → {end}
                          </span>
                        </div>

                        <div className="chunk-text">
                          {chunk.text}
                        </div>

                        <div className="chunk-boundary">
                          <div>
                            <span>START</span>
                            <strong>{start}</strong>
                          </div>

                          <div className="boundary-line">
                            <span>
                              {chunk.text?.length ?? 0} characters
                            </span>
                          </div>

                          <div>
                            <span>END</span>
                            <strong>{end}</strong>
                          </div>
                        </div>

                        {index > 0 && (
                          <div className="overlap-indicator">
                            <span>
                              ↳ 100 characters overlap
                              with previous chunk
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </section>
          )}

          {showEmbeddingInspector && uploadedEmbeddings.length > 0 && (
            <section
              className="pipeline-card"
              style={{ marginTop: "20px" }}
            >

              <div className="pipeline-title">
                <div>
                  <h2>Embedding Inspector</h2>
                  <p>
                    Vector representation generated for your uploaded PDF.
                  </p>
                </div>

                <button
                  className="clear-chat-button"
                  onClick={() => setShowEmbeddingInspector(false)}
                >
                  ← Back to Policy Chat
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, minmax(180px, 1fr))",
                  gap: "15px",
                  marginTop: "20px"
                }}
              >

                <div className="status-card">
                  <div className="card-label">
                    EMBEDDING MODEL
                  </div>
                  <div className="card-value">
                    nomic-embed-text
                  </div>
                  <div className="card-status">
                    ● Active
                  </div>
                </div>

                <div className="status-card">
                  <div className="card-label">
                    DIMENSIONS
                  </div>
                  <div className="card-value">
                    {uploadedEmbeddings[0].embedding.length}
                  </div>
                  <div className="card-status">
                    ● Per chunk
                  </div>
                </div>

                <div className="status-card">
                  <div className="card-label">
                    EMBEDDED CHUNKS
                  </div>
                  <div className="card-value">
                    {uploadedEmbeddings.length}
                  </div>
                  <div className="card-status">
                    ● Complete
                  </div>
                </div>

              </div>

              <div
                style={{
                  marginTop: "25px",
                  padding: "20px",
                  border: "1px solid #1e3354",
                  borderRadius: "12px",
                  background: "#0d1526"
                }}
              >

                <h2>Inspect a Chunk Embedding</h2>

                <p
                  style={{
                    color: "#94a3b8",
                    marginTop: "6px"
                  }}
                >
                  Select a chunk to inspect its 768-dimensional vector.
                </p>

                <select
                  value={selectedEmbeddingChunk}
                  onChange={(e) =>
                    setSelectedEmbeddingChunk(
                      Number(e.target.value)
                    )
                  }
                  style={{
                    marginTop: "15px",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    minWidth: "220px"
                  }}
                >
                  {uploadedEmbeddings.map((item, index) => (
                    <option
                      key={item.chunk_id}
                      value={index}
                    >
                      Chunk {item.chunk_id} · Page {item.page}
                    </option>
                  ))}
                </select>

              </div>

              {(() => {
                const item =
                  uploadedEmbeddings[selectedEmbeddingChunk];

                if (!item) return null;

                const vector = item.embedding;

                const min = Math.min(...vector);
                const max = Math.max(...vector);

                const mean =
                  vector.reduce(
                    (sum, value) => sum + value,
                    0
                  ) / vector.length;

                const magnitude = Math.sqrt(
                  vector.reduce(
                    (sum, value) =>
                      sum + value * value,
                    0
                  )
                );

                return (
                  <>
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "20px",
                        border: "1px solid #1e3354",
                        borderRadius: "12px",
                        background: "#0d1526"
                      }}
                    >

                      <h2>
                        Chunk {item.chunk_id} Embedding
                      </h2>

                      <p
                        style={{
                          color: "#94a3b8",
                          marginTop: "6px"
                        }}
                      >
                        Page {item.page}
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(4, minmax(130px, 1fr))",
                          gap: "12px",
                          marginTop: "20px"
                        }}
                      >

                        <div>
                          <strong>Dimensions</strong>
                          <div>{vector.length}</div>
                        </div>

                        <div>
                          <strong>Minimum</strong>
                          <div>{min.toFixed(6)}</div>
                        </div>

                        <div>
                          <strong>Maximum</strong>
                          <div>{max.toFixed(6)}</div>
                        </div>

                        <div>
                          <strong>Magnitude</strong>
                          <div>{magnitude.toFixed(6)}</div>
                        </div>

                      </div>

                    </div>

                    <div
                      style={{
                        marginTop: "20px",
                        padding: "20px",
                        border: "1px solid #1e3354",
                        borderRadius: "12px",
                        background: "#0d1526"
                      }}
                    >

                      <h2>Embedding Vector</h2>

                      <p
                        style={{
                          color: "#94a3b8",
                          marginBottom: "15px"
                        }}
                      >
                        First 50 dimensions of the 768-dimensional
                        embedding vector.
                      </p>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(5, minmax(120px, 1fr))",
                          gap: "8px"
                        }}
                      >

                        {vector
                          .slice(0, 50)
                          .map((value, index) => (
                            <div
                              key={index}
                              style={{
                                padding: "8px",
                                borderRadius: "6px",
                                background: "#f9fafb",
                                fontSize: "12px"
                              }}
                            >
                              <strong>
                                {index + 1}
                              </strong>
                              <br />
                              {value.toFixed(6)}
                            </div>
                          ))}

                      </div>

                    </div>
                  </>
                );
              })()}

            </section>
          )}

          <section
            className="chat-card"
            style={{ marginTop: "20px" }}
          >

            <div className="chat-header">

              <div>
                <h2>InsureMate AI Assistant</h2>

                <p>
                  Ask questions about your uploaded insurance policy.
                  Answers are generated using the retrieved policy evidence.
                </p>
              </div>

              <span className="model-badge">
                codellama:7b-instruct
              </span>

            </div>


            {/* CHAT HISTORY */}

            <div
              style={{
                minHeight: "360px",
                maxHeight: "600px",
                overflowY: "auto",
                padding: "20px",
                marginTop: "15px"
              }}
            >

              {chatMessages.length === 0 && (

                <div
                  style={{
                    textAlign: "center",
                    padding: "70px 20px"
                  }}
                >

                  <div
                    style={{
                      fontSize: "42px",
                      marginBottom: "15px"
                    }}
                  >
                    🤖
                  </div>

                  <h2>
                    Hi! I'm InsureMate
                  </h2>

                  <p
                    style={{
                      marginTop: "8px",
                      color: "#94a3b8"
                    }}
                  >
                    I've analyzed your uploaded policy.
                    Ask me anything about it.
                  </p>

                </div>

              )}


              {chatMessages.map((message, index) => (

                <div
                  key={index}
                  style={{
                    marginBottom: "22px",
                    display: "flex",
                    justifyContent:
                      message.role === "user"
                        ? "flex-end"
                        : "flex-start"
                  }}
                >

                  <div
                    style={{
                      maxWidth: "78%",
                      padding: "15px 18px",
                      borderRadius: "14px",
                      background:
                        message.role === "user"
                          ? "#2563eb"
                          : "#f3f4f6",
                      color:
                        message.role === "user"
                          ? "#ffffff"
                          : "#111827"
                    }}
                  >

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "700",
                        marginBottom: "7px",
                        opacity: 0.75
                      }}
                    >
                      {message.role === "user"
                        ? "YOU"
                        : "INSUREMATE AI"}
                    </div>

                    <div
                      style={{
                        lineHeight: "1.6",
                        whiteSpace: "pre-wrap"
                      }}
                    >
                      {message.content}
                    </div>


                    {/* RETRIEVED EVIDENCE */}

                    {message.role === "assistant" &&
                      message.sources &&
                      message.sources.length > 0 && (

                      <details
                        style={{
                          marginTop: "15px",
                          borderTop:
                            "1px solid rgba(107,114,128,0.25)",
                          paddingTop: "10px"
                        }}
                      >

                        <summary
                          style={{
                            cursor: "pointer",
                            fontWeight: "600",
                            fontSize: "13px"
                          }}
                        >
                          View Retrieved Evidence
                        </summary>

                        <div
                          style={{
                            marginTop: "12px",
                            display: "grid",
                            gap: "10px"
                          }}
                        >

                          {message.sources.map(
                            (item, sourceIndex) => (

                            <div
                              key={`${item.chunk_id}-${sourceIndex}`}
                              style={{
                                padding: "12px",
                                borderRadius: "8px",
                                background:
                                  "rgba(107,114,128,0.08)"
                              }}
                            >

                              <div
                                style={{
                                  display: "flex",
                                  justifyContent:
                                    "space-between",
                                  fontSize: "12px",
                                  fontWeight: "700"
                                }}
                              >

                                <span>
                                  Result #{sourceIndex + 1}
                                </span>

                                <span>
                                  Similarity{" "}
                                  {(item.score * 100).toFixed(1)}%
                                </span>

                              </div>

                              <div
                                style={{
                                  marginTop: "6px",
                                  fontSize: "12px",
                                  opacity: 0.7
                                }}
                              >
                                {item.document}
                                {" · "}
                                Page {item.page}
                                {" · "}
                                Chunk {item.chunk_id}
                              </div>

                              <div
                                style={{
                                  marginTop: "8px",
                                  fontSize: "13px",
                                  lineHeight: "1.5"
                                }}
                              >
                                {item.text}
                              </div>

                            </div>

                          ))}

                        </div>

                      </details>

                    )}

                  </div>

                </div>

              ))}


              {loading && (

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    marginBottom: "20px"
                  }}
                >

                  <div
                    style={{
                      padding: "15px 18px",
                      borderRadius: "14px",
                      background: "#0d1526",
                      color: "#67e8f9",
                      border: "1px solid #164e63",
                      boxShadow: "0 0 18px rgba(34, 211, 238, 0.08)"
                    }}
                  >
                    <strong>
                      INSUREMATE AI
                    </strong>

                    <div
                      style={{
                        marginTop: "7px"
                      }}
                    >
                      Analyzing your policy...
                    </div>

                  </div>

                </div>

              )}

            </div>


            {/* CHAT INPUT */}

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                paddingTop: "18px"
              }}
            >

              <div className="input-area">

                <textarea
                  value={question}
                  onChange={(e) =>
                    setQuestion(e.target.value)
                  }
                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();

                      if (
                        question.trim() &&
                        !loading
                      ) {
                        askUploadedPolicy();
                      }
                    }

                  }}
                  placeholder="Ask anything about your uploaded policy..."
                  rows="3"
                  disabled={loading}
                />

                <div style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap"
                }}>

                  <button
                    className="ask-button"
                    onClick={askUploadedPolicy}
                    disabled={
                      loading ||
                      !question.trim()
                    }
                  >
                    {loading
                      ? "Analyzing..."
                      : "Send →"}
                  </button>


                </div>

              </div>


              {chatMessages.length > 0 && (

                <button
                  className="clear-chat-button"
                  onClick={() =>
                    setChatMessages([])
                  }
                  style={{
                    marginTop: "10px"
                  }}
                >
                  Clear Conversation
                </button>

              )}

            </div>


            {error && (

              <p
                style={{
                  marginTop: "12px",
                  color: "#b91c1c"
                }}
              >
                {error}
              </p>

            )}

          </section>

        </>
      )}
    </section>
  );
}


import React from "react";
import { useEffect, useState } from "react";
import EvaluationInsightsPage from "./EvaluationInsightsPage";
import Week4ExercisesPage from "./Week4ExercisesPage";
import Week5GuardrailLab from "./Week5GuardrailLab";
import ScenarioIntelligencePage from "./ScenarioIntelligencePage";
import "./App.css";

const API_URL = `${window.location.protocol}//${window.location.hostname}:8000`;

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [responseTime, setResponseTime] = useState(null);
  const [model, setModel] = useState("Code Llama 7B");

  const [activePage, setActivePage] = useState("Dashboard");

  const [chatModel, setChatModel] = useState("codellama:7b-instruct");

  // AI Assistant conversation state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponseTime, setChatResponseTime] = useState(null);

  // Documents
  const [documents, setDocuments] = useState([]);
  const [totalChunks, setTotalChunks] = useState(0);

  // Chunk Inspector
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [chunksLoading, setChunksLoading] = useState(false);

  // Embeddings
  const [embeddingDocument, setEmbeddingDocument] = useState(null);
  const [embeddingChunk, setEmbeddingChunk] = useState(0);
  const [embeddingData, setEmbeddingData] = useState(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);
  // =========================================================
  // LOAD DOCUMENTS
  // =========================================================

  useEffect(() => {
    fetch(`${API_URL}/api/knowledge/documents`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch documents");
        }

        return response.json();
      })
      .then((data) => {
        setDocuments(data.documents || []);
        setTotalChunks(data.total_chunks || 0);
      })
      .catch((error) => {
        console.error("Failed to load documents:", error);
      });
  }, []);

  // =========================================================
  // LOAD CHUNKS WHEN DOCUMENT IS SELECTED
  // =========================================================

  useEffect(() => {
    if (
      activePage !== "Chunk Inspector" ||
      !selectedDocument
    ) {
      return;
    }

    setChunksLoading(true);
    setChunks([]);

    fetch(
      `${API_URL}/api/knowledge/chunks?document=${encodeURIComponent(
        selectedDocument
      )}`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch chunks");
        }

        return response.json();
      })
      .then((data) => {
        setChunks(data.chunks || []);
      })
      .catch((error) => {
        console.error("Failed to load chunks:", error);
      })
      .finally(() => {
        setChunksLoading(false);
      });
  }, [activePage, selectedDocument]);

  // =========================================================
// LOAD EMBEDDING
// =========================================================

useEffect(() => {
  if (
    activePage !== "Embeddings" ||
    !embeddingDocument
  ) {
    return;
  }

  setEmbeddingLoading(true);
  setEmbeddingData(null);

  fetch(
    `${API_URL}/api/knowledge/embeddings?document=${encodeURIComponent(
      embeddingDocument
    )}&chunk_id=${embeddingChunk}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch embedding");
      }

      return response.json();
    })
    .then((data) => {
      setEmbeddingData(data);
    })
    .catch((error) => {
      console.error("Failed to load embedding:", error);
    })
    .finally(() => {
      setEmbeddingLoading(false);
    });
}, [activePage, embeddingDocument, embeddingChunk]);

  // =========================================================
  // ASK INSUREMATE
  // =========================================================

  const askInsureMate = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    const start = performance.now();

  try {
    const response = await fetch(
      `${API_URL}/api/chat?question=${encodeURIComponent(
        question
      )}&model=${encodeURIComponent(chatModel)}`,
      {
        method: "POST"
      }
    );

      if (!response.ok) {
        throw new Error("Backend request failed");
      }

      const data = await response.json();

      setAnswer(data.answer);
      setModel(data.model);

      setResponseTime(
        ((performance.now() - start) / 1000).toFixed(2)
      );
    } catch (error) {
       console.error("CHAT ERROR:", error);

       setAnswer(
        `Backend error: ${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

// =========================================================
// AI ASSISTANT CHAT
// =========================================================

const sendChatMessage = async () => {
  const text = chatQuestion.trim();

  if (!text || chatLoading) return;

  const userMessage = {
    role: "user",
    content: text
  };

  const history = chatMessages.map((message) => ({
    role: message.role,
    content: message.content
  }));

  setChatMessages((previous) => [
    ...previous,
    userMessage
  ]);

  setChatQuestion("");
  setChatLoading(true);

  const start = performance.now();

  try {
    const response = await fetch(
      `${API_URL}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          question: text,
          history: history
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Backend request failed: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();

    setChatMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        content:
          data.answer ||
          "The available insurance documents do not contain enough information to answer this question."
      }
    ]);

    // Backend automatically selects and orchestrates models
    setModel(
      data.model ||
      "Multi-Model Orchestration"
    );

    setChatResponseTime(
      ((performance.now() - start) / 1000).toFixed(2)
    );

  } catch (error) {
    console.error("AI Assistant chat error:", error);

    setChatMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        content: `Unable to connect to the InsureMate backend. ${error.message}`
      }
    ]);

  } finally {
    setChatLoading(false);
  }
};

  // =========================================================
  // OPEN DOCUMENT CHUNKS
  // =========================================================

  const openDocumentChunks = (documentName) => {
    setSelectedDocument(documentName);
    setActivePage("Chunk Inspector");
  };

  // =========================================================
  // SIDEBAR NAVIGATION
  // =========================================================

  const technicalPages = [
    "Retrieval",
    "Sources",
    "Hallucination",
    "Models",
    "System",
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        {/* BRAND */}

        <div className="brand">

          <div className="brand-icon">
            I
          </div>

          <div>
            <h2>InsureMate</h2>
            <span>Insurance Intelligence</span>
          </div>

        </div>


        {/* NAVIGATION */}

        <nav>

          {/* Dashboard */}

          <button
            className={`nav-item ${
              activePage === "Dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>


          {/* AI Assistant */}

          <button
            className={`nav-item ${
              activePage === "AI Assistant"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("AI Assistant")
            }
          >
            <span>◉</span>
            AI Assistant
          </button>


          {/* Upload Your Own Policy */}

          <button
            className={`nav-item ${
              activePage === "Upload Policy"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Upload Policy")
            }
          >
            <span>↑</span>
            Upload Policy
          </button>


          {/* Documents */}

          <button
            className={`nav-item ${
              activePage === "Documents"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Documents")
            }
          >
            <span>▤</span>
            Documents
          </button>


          {/* Chunk Inspector */}

          <button
            className={`nav-item ${
              activePage === "Chunk Inspector"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Chunk Inspector")
            }
          >
            <span>✂</span>
            Chunk Inspector
          </button>


          {/* Embeddings */}

          <button
            className={`nav-item ${
              activePage === "Embeddings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Embeddings")
            }
          >
            <span>✦</span>
            Embeddings
          </button>


          {/* Retrieval */}

          <button
            className={`nav-item ${
              activePage === "Retrieval"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Retrieval")
            }
          >
            <span>⌕</span>
            Retrieval
          </button>


          {/* Sources */}

          <button
            className={`nav-item ${
              activePage === "Sources"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Sources")
            }
          >
            <span>▣</span>
            Sources
          </button>


          {/* Hallucination */}

          <button
            className={`nav-item ${
              activePage === "Hallucination"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Hallucination")
            }
          >
            <span>⚠</span>
            Hallucination
          </button>


          {/* Models */}

          <button
            className={`nav-item ${
              activePage === "Models"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Models")
            }
          >
            <span>🤖</span>
            Models
          </button>


          {/* Evaluation Lab */}

          <button
            className={`nav-item ${
              activePage === "Evaluation Lab"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Evaluation Lab")
            }
          >
            <span>📊</span>
            Evaluation Lab
          </button>


          <button
            className={`nav-item ${
              activePage === "Guardrail Lab"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("Guardrail Lab")
            }
          >
            <span>🛡️</span>
            Guardrail Lab
          </button>


          <button
            className={`nav-item ${
              activePage === "Scenario Intelligence" ? "active" : ""
            }`}
            onClick={() => setActivePage("Scenario Intelligence")}
          >
            <span>🧠</span>
            Scenario Intelligence
          </button>
          
          {/* Evaluation Insights */}
          <div style={{ marginTop: "4px", marginBottom: "4px" }}>
            <button
              className={`nav-item ${
                activePage === "Evaluation Insights" ? "active" : ""
              }`}
              onClick={() => setActivePage("Evaluation Insights")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px"
              }}
            >
              <span>🔎</span>
              <span>Evaluation Insights</span>
            </button>
          </div>


          {/* System */}

          <button
            className={`nav-item ${
              activePage === "System"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("System")
            }
          >
            <span>⚙</span>
            System
          </button>

        </nav>


        {/* SYSTEM STATUS */}

        <div className="system-status">

          <div className="system-title">
            System Status
          </div>


          <div className="system-row">

            <span>
              <i className="online-dot"></i>
              Ollama
            </span>

            <strong>Online</strong>

          </div>


          <div className="system-row">

            <span>
              <i className="online-dot"></i>
              API
            </span>

            <strong>Online</strong>

          </div>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="main">


        {/* ===================================================
            DASHBOARD
        =================================================== */}

        {activePage === "Dashboard" && (

          <>

            <header className="topbar">

              <div>

                <p className="eyebrow">
                  INSURANCE INTELLIGENCE PLATFORM
                </p>

                <h1>
                  AI Insurance Assistant
                </h1>

                <p className="subtitle">
                  Understand your insurance policies using AI.
                </p>

              </div>


              <div className="status">

                <span className="status-dot"></span>

                System Online

              </div>

            </header>


            {/* STATUS CARDS */}

            <section className="status-grid">


              <div className="status-card">

                <div className="card-label">
                  AI MODEL
                </div>

                <div className="card-value">
                  Code Llama 7B
                </div>

                <div className="card-status">
                  ● Ready
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  LLM ENGINE
                </div>

                <div className="card-value">
                  Ollama
                </div>

                <div className="card-status">
                  ● Connected
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  API SERVICE
                </div>

                <div className="card-value">
                  FastAPI
                </div>

                <div className="card-status">
                  ● Online
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  KNOWLEDGE BASE
                </div>

                <div className="card-value">
                  {documents.length} Documents
                </div>

                <div className="card-status">
                  ● {totalChunks} Chunks
                </div>

              </div>

            </section>


            {/* CHAT */}

            <section className="chat-card">

              <div className="chat-header">

                <div>

                  <h2>
                    Ask InsureMate
                  </h2>

                  <p>
                    Ask questions about insurance coverage,
                    claims, exclusions and policy terms.
                  </p>

                </div>


                <span className="model-badge">
                  {model}
                </span>

              </div>


              <div className="input-area">

                <textarea
                  value={question}
                  onChange={(e) =>
                    setQuestion(e.target.value)
                  }
                  onKeyDown={(e) => {

                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {

                      e.preventDefault();

                      askInsureMate();

                    }

                  }}
                  placeholder="Example: Is hospitalization covered?"
                  rows="4"
                />

                <select
                  value={chatModel}
                  onChange={(event) =>
                    setChatModel(event.target.value)
                  }
                  style={{
                    padding: "11px 14px",
                    border: "1px solid  #1e3354",
                    borderRadius: "8px",
                    background: "#0d1526",
                    color: "#e5e7eb",
                    fontFamily: "inherit",
                    fontSize: "14px"
                  }}
                >
                  <option value="codellama:7b-instruct">
                    Code Llama 7B
                  </option>

                  <option value="qwen2.5:1.5b">
                    Qwen 2.5 1.5B
                  </option>

                  <option value="phi3:mini">
                    Phi-3 Mini
                  </option>
                </select>

                <button
                  className="ask-button"
                  onClick={askInsureMate}
                  disabled={loading}
                >
                  {loading
                    ? "Analyzing..."
                    : "Ask InsureMate →"}
                </button>

              </div>


              {/* ANSWER */}

              <div className="answer-section">

                <div className="answer-title">

                  <span>
                    AI Response
                  </span>


                  {responseTime && (

                    <span className="response-time">
                      Response time: {responseTime}s
                    </span>

                  )}

                </div>


                <div className="answer-box">

                  {loading ? (

                    <div className="loading">
                      Code Llama is analyzing your question...
                    </div>

                  ) : answer ? (

                    <p>
                      {answer}
                    </p>

                  ) : (

                    <div className="empty-answer">

                      <div className="empty-icon">
                        ✦
                      </div>

                      <p>
                        Your answer will appear here.
                      </p>

                      <span>
                        Ask a question to get started.
                      </span>

                    </div>

                  )}

                </div>

              </div>

            </section>


            {/* PIPELINE */}

            <section className="pipeline-card">

              <div className="pipeline-title">

                <div>

                  <h2>
                    AI Processing Pipeline
                  </h2>

                  <p>
                    How InsureMate processes your request
                  </p>

                </div>

              </div>


              <div className="pipeline">


                <div className="pipeline-step">

                  <div className="step-number">
                    01
                  </div>

                  <strong>
                    Your Question
                  </strong>

                  <span>
                    User input
                  </span>

                </div>


                <div className="arrow">
                  →
                </div>


                <div className="pipeline-step">

                  <div className="step-number">
                    02
                  </div>

                  <strong>
                    InsureMate
                  </strong>

                  <span>
                    Application
                  </span>

                </div>


                <div className="arrow">
                  →
                </div>


                <div className="pipeline-step">

                  <div className="step-number">
                    03
                  </div>

                  <strong>
                    FastAPI
                  </strong>

                  <span>
                    API service
                  </span>

                </div>


                <div className="arrow">
                  →
                </div>


                <div className="pipeline-step">

                  <div className="step-number">
                    04
                  </div>

                  <strong>
                    Ollama
                  </strong>

                  <span>
                    LLM engine
                  </span>

                </div>


                <div className="arrow">
                  →
                </div>


                <div className="pipeline-step">

                  <div className="step-number">
                    05
                  </div>

                  <strong>
                    {chatModel === "codellama:7b-instruct"
                      ? "Code Llama"
                      : chatModel === "qwen2.5:1.5b"
                      ? "Qwen 2.5"
                      : "Phi-3 Mini"}
                  </strong>

                  <span>
                    AI response
                  </span>

                </div>


              </div>

            </section>

          </>

        )}


        {/* ===================================================
            AI ASSISTANT
        =================================================== */}

        {activePage === "AI Assistant" && (

          <section>

            <header className="topbar">
              <div>
                <p className="eyebrow">
                  INSUREMATE
                </p>

                <h1>
                  AI Assistant
                </h1>

                <p className="subtitle">
                  Chat with your insurance knowledge base using RAG and AI.
                </p>
              </div>
            </header>

            <div className="orchestration-pipeline">

              <div className="pipeline-header">

                <div className="pipeline-title-section">
                  <h2>Multi-Model Orchestration Pipeline</h2>

                  <p>
                    InsureMate automatically selects and coordinates AI models
                    based on the complexity of your question.
                  </p>
                </div>

                <div className="pipeline-status">
                  <span className="pipeline-status-dot"></span>
                  Active
                </div>

              </div>


              <div className="pipeline-flow">
                <div className="pipeline-step">
                  <div className="pipeline-number">1</div>
                  <div className="pipeline-content">
                    <div className="pipeline-step-title">
                      User Question
                    </div>
                    <div className="pipeline-step-description">
                      Your insurance query
                    </div>
                  </div>
                </div>

                <div className="pipeline-arrow">→</div>

                <div className="pipeline-step">
                  <div className="pipeline-number">2</div>
                  <div className="pipeline-content">
                    <div className="pipeline-step-title">
                      RAG Retrieval
                    </div>
                    <div className="pipeline-step-description">
                      Searches all policy knowledge
                    </div>
                  </div>
                </div>

                <div className="pipeline-arrow">→</div>

                <div className="pipeline-step">
                  <div className="pipeline-number">3</div>
                  <div className="pipeline-content">
                    <div className="pipeline-step-title">
                      Qwen 2.5
                    </div>
                    <div className="pipeline-step-description">
                      Analyzes complexity
                    </div>
                  </div>
                </div>

                <div className="pipeline-arrow">→</div>

                <div className="pipeline-step">
                  <div className="pipeline-number">4</div>
                  <div className="pipeline-content">
                    <div className="pipeline-step-title">
                      Model Selection
                    </div>
                    <div className="pipeline-step-description">
                      Qwen or Code Llama
                    </div>
                  </div>
                </div>

                <div className="pipeline-arrow">→</div>

                <div className="pipeline-step">
                  <div className="pipeline-number">5</div>
                  <div className="pipeline-content">
                    <div className="pipeline-step-title">
                      Phi-3 Mini
                    </div>
                    <div className="pipeline-step-description">
                      Validates grounding
                    </div>
                  </div>
                </div>

                <div className="pipeline-arrow">→</div>

                <div className="pipeline-step final-step">
                  <div className="pipeline-number">✓</div>
                  <div className="pipeline-content">
                    <div className="pipeline-step-title">
                      Final Answer
                    </div>
                    <div className="pipeline-step-description">
                      Grounded insurance response
                    </div>
                  </div>
                </div>

                



              </div>

            </div>


            <section className="chat-card assistant-chat-card">

              <div className="chat-header">

                <div>
                  <h2>
                    Ask InsureMate
                  </h2>

                  <p>
                    Ask follow-up questions and continue the conversation.
                  </p>
                </div>

                <span className="model-badge">
                  Multi-Model AI
                </span>

              </div>


              <div className="chat-messages">

                {chatMessages.length === 0 ? (

                  <div className="chat-welcome">
                    <div className="empty-icon">✦</div>
                    <p>Ask a question about your insurance policy.</p>
                    <span>
                      You can ask follow-up questions just like a normal chatbot.
                    </span>
                  </div>

                ) : (

                  chatMessages.map((message, index) => (

                    <div
                      key={`${message.role}-${index}`}
                      className={`chat-message ${message.role}`}
                    >
                      <div className="chat-message-label">
                        {message.role === "user"
                          ? "You"
                          : "InsureMate"}
                      </div>

                      <div className="chat-message-bubble">
                        {message.content}
                      </div>
                    </div>

                  ))

                )}

                {chatLoading && (
                  <div className="chat-message assistant">

                    <div className="chat-message-label">
                      InsureMate
                    </div>

                    <div className="chat-message-bubble chat-thinking">
                      Analyzing your question through the AI pipeline...
                    </div>

                  </div>
                )}

              </div>


              <div className="assistant-input-area">

                <textarea
                  value={chatQuestion}
                  onChange={(e) =>
                    setChatQuestion(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey
                    ) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                  placeholder="Ask a question or a follow-up..."
                  rows="3"
                  disabled={chatLoading}
                />

                <div className="assistant-actions">

                  <button
                    className="clear-chat-button"
                    onClick={() => {
                      setChatMessages([]);
                      setChatQuestion("");
                      setChatResponseTime(null);
                    }}
                    disabled={
                      chatLoading ||
                      chatMessages.length === 0
                    }
                  >
                    Clear Chat
                  </button>

                  <button
                    className="ask-button"
                    onClick={sendChatMessage}
                    disabled={
                      chatLoading ||
                      !chatQuestion.trim()
                    }
                  >
                    {chatLoading
                      ? "Analyzing..."
                      : "Send →"}
                  </button>

                </div>

              </div>


              {chatResponseTime && (
                <div className="assistant-response-time">
                  Response time: {chatResponseTime}s
                </div>
              )}

            </section>

          </section>

        )}



        {/* ===================================================
            UPLOAD POLICY / MODE 2
        =================================================== */}

        {activePage === "Upload Policy" && (
          <UploadPolicyPage />
        )}

        {/* ===================================================
            WEEK 4 EVALUATION LAB
        =================================================== */}

        {activePage === "Evaluation Lab" && (
          <Week4ExercisesPage />
        )}

        {activePage === "Guardrail Lab" && (
          <Week5GuardrailLab />
        )}

        {activePage === "Scenario Intelligence" && (
          <ScenarioIntelligencePage />
        )}

        {activePage === "Evaluation Insights" && (
          <EvaluationInsightsPage />
        )}

        {/* ===================================================
            DOCUMENTS
        =================================================== */}

        {activePage === "Documents" && (

          <DocumentsPage
            documents={documents}
            totalChunks={totalChunks}
            onOpenDocument={openDocumentChunks}
          />

        )}


        {/* ===================================================
            CHUNK INSPECTOR
        =================================================== */}

        {activePage === "Chunk Inspector" && (

          <ChunkInspectorPage
            document={selectedDocument}
            chunks={chunks}
            loading={chunksLoading}
            onBack={() => setActivePage("Documents")}
          />

        )}


        {/* ===================================================
            EMBEDDINGS
        =================================================== */}

        {activePage === "Embeddings" && (
          <EmbeddingsPage
            documents={documents}
            embeddingDocument={embeddingDocument}
            setEmbeddingDocument={setEmbeddingDocument}
            embeddingChunk={embeddingChunk}
            setEmbeddingChunk={setEmbeddingChunk}
            embeddingData={embeddingData}
            loading={embeddingLoading}
          />
        )}

        {/* ===================================================
            OTHER TECHNICAL PAGES
        =================================================== */}

        {activePage === "Retrieval" && (
          <RetrievalPage />
        )}

        {technicalPages.includes(activePage) &&
          activePage !== "Retrieval" && (
            <TechnicalPage
              title={activePage}
              documents={documents}
              totalChunks={totalChunks}
            />
        )}

      </main>

    </div>
  );
}


/* =========================================================
   WEEK 4 EVALUATION LAB
========================================================= */

function EvaluationLabPage() {

const modelResults = [
  {
    name: "CodeLlama 7B",
    model: "codellama:7b-instruct",
    accuracy: 77.27,
    hallucination: 4,
    latency: 50.92,
    ram: 4771.7,
    confidence: 0.7086
  },
  {
    name: "Qwen 2.5 1.5B",
    model: "qwen2.5:1.5b",
    accuracy: 59.09,
    hallucination: 20,
    latency: 9.63,
    ram: 1108.3,
    confidence: 0.7086
  },
  {
    name: "Phi-3 Mini",
    model: "phi3:mini",
    accuracy: 77.27,
    hallucination: 4,
    latency: 27.84,
    ram: 2922.7,
    confidence: 0.7086
  }
];

  const topK = [
    {
      k: 1,
      latency: 29.59,
      score: 0.6989,
      context: 593.5
    },
    {
      k: 3,
      latency: 49.277,
      score: 0.6900,
      context: 1696.8
    },
    {
      k: 5,
      latency: 66.646,
      score: 0.6808,
      context: 2920.5
    }
  ];

  const repositoryFiles = [
    ["frontend/src/App.jsx", 18],
    ["backend/app/api/upload.py", 10],
    ["backend/app/main.py", 9],
    ["backend/app/services/upload_rag_service.py", 6],
    ["backend/app/services/document_processor.py", 3],
    ["backend/app/api/retrieval.py", 1],
    ["frontend/src/App.css", 1],
    ["docker/Dockerfile.backend", 1],
    ["backend/app/services/embedding_service.py", 1]
  ];

  return (
    <div className="evaluation-page">

      <header className="topbar">
        <div>
          <p className="eyebrow">
            WEEK 4 · QUANTITATIVE EVALUATION
          </p>

          <h1>
            Evaluation Lab
          </h1>

          <p className="subtitle">
            Quantitative analysis of LLM models, RAG retrieval,
            resource usage and repository-level understanding.
          </p>
        </div>

        <div className="evaluation-badge">
          ✓ 6 EXERCISES ANALYZED
        </div>
      </header>


      {/* =====================================================
          OVERVIEW
      ===================================================== */}

      <section className="evaluation-summary">

        <div className="evaluation-stat">
          <span>MODELS</span>
          <strong>3</strong>
          <small>independently evaluated</small>
        </div>

        <div className="evaluation-stat">
          <span>QUESTIONS</span>
          <strong>25</strong>
          <small>same dataset for all models</small>
        </div>

        <div className="evaluation-stat">
          <span>EVALUATIONS</span>
          <strong>75</strong>
          <small>successful model evaluations</small>
        </div>

        <div className="evaluation-stat highlight">
          <span>BEST ACCURACY</span>
          <strong>77.27%</strong>
          <small>CodeLlama 7B - Phi-3 Mini</small>
        </div>

      </section>


      {/* =====================================================
          MAIN FINDING
      ===================================================== */}

      <section className="evaluation-insight">

        <div className="insight-icon">
          ★
        </div>

        <div>
          <h2>
            Quality vs Latency Trade-off
          </h2>

          <p>
             CodeLlama and Phi-3 achieved the highest measured
            accuracy at 77.27%, while Qwen was substantially
            faster and required much less memory. The controlled
            RAG experiment also showed a 40 percentage-point
            accuracy improvement over the No-RAG baseline.
          </p>
        </div>

      </section>


      {/* =====================================================
          MODEL COMPARISON
      ===================================================== */}

      <section className="evaluation-card">

        <div className="evaluation-section-heading">
          <div>
            <p className="eyebrow">
              EXERCISE 1 + 3 + 4
            </p>

            <h2>
              Model Comparison
            </h2>

            <p>
              Same questions, knowledge base, RAG context,
              prompt and generation settings.
            </p>
          </div>
        </div>


        <div className="evaluation-table-wrap">

          <table className="evaluation-table">

            <thead>
              <tr>
                <th>MODEL</th>
                <th>ACCURACY</th>
                <th>HALLUCINATION</th>
                <th>LATENCY</th>
                <th>RAM</th>
                <th>RETRIEVAL CONF.</th>
              </tr>
            </thead>

            <tbody>

              {modelResults.map((item) => (

                <tr key={item.model}>

                  <td>
                    <strong>{item.name}</strong>
                    <small>{item.model}</small>
                  </td>

                  <td>
                    <strong
                      className={
                        item.accuracy === 66
                          ? "metric-best"
                          : ""
                      }
                    >
                      {item.accuracy}%
                    </strong>
                  </td>

                  <td>
                    <strong
                      className={
                        item.hallucination === 4
                          ? "metric-best"
                          : ""
                      }
                    >
                      {item.hallucination}%
                    </strong>
                  </td>

                  <td>
                    {item.latency.toFixed(2)}s
                  </td>

                  <td>
                    {item.ram.toFixed(0)} MB
                  </td>

                  <td>
                    {(item.confidence * 100).toFixed(2)}%
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </section>


      {/* =====================================================
          RESOURCE BENCHMARK
      ===================================================== */}

      <section className="evaluation-two-column">

        <div className="evaluation-card">

          <div className="evaluation-section-heading">
            <p className="eyebrow">
              PERFORMANCE
            </p>

            <h2>
              Memory Consumption
            </h2>

            <p>
              Average RAM change measured during independent
              resource benchmarking.
            </p>
          </div>


          <div className="bar-list">

            {modelResults.map((item) => {

              const width =
                (item.ram / 4771.7) * 100;

              return (
                <div
                  className="bar-row"
                  key={item.model}
                >

                  <div className="bar-label">
                    <span>{item.name}</span>
                    <strong>
                      {item.ram.toFixed(0)} MB
                    </strong>
                  </div>

                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${width}%`
                      }}
                    />
                  </div>

                </div>
              );

            })}

          </div>

        </div>


        <div className="evaluation-card">

          <div className="evaluation-section-heading">
            <p className="eyebrow">
              PERFORMANCE
            </p>

            <h2>
              Response Latency
            </h2>

            <p>
              Average response latency across the model
              comparison experiment.
            </p>
          </div>


          <div className="bar-list">

            {modelResults.map((item) => {

              const width =
                (item.latency / 50.92) * 100;

              return (
                <div
                  className="bar-row"
                  key={item.model}
                >

                  <div className="bar-label">
                    <span>{item.name}</span>
                    <strong>
                      {item.latency.toFixed(2)}s
                    </strong>
                  </div>

                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${width}%`
                      }}
                    />
                  </div>

                </div>
              );

            })}

          </div>

        </div>

      </section>


      {/* =====================================================
          TOP K
      ===================================================== */}

      <section className="evaluation-card">

        <div className="evaluation-section-heading">

          <p className="eyebrow">
            EXERCISE 5 · TOP-K SENSITIVITY
          </p>

          <h2>
            Retrieval Depth Analysis
          </h2>

          <p>
            How changing retrieval depth affects context,
            similarity and generation latency.
          </p>

        </div>


        <div className="topk-grid">

          {topK.map((item) => (

            <div
              className={
                `topk-card ${
                  item.k === 3
                    ? "recommended"
                    : ""
                }`
              }
              key={item.k}
            >

              {item.k === 3 && (
                <div className="recommended-label">
                  BALANCED
                </div>
              )}

              <div className="topk-number">
                K={item.k}
              </div>

              <div className="topk-metric">
                <span>Latency</span>
                <strong>
                  {item.latency.toFixed(2)}s
                </strong>
              </div>

              <div className="topk-metric">
                <span>Retrieval Score</span>
                <strong>
                  {item.score.toFixed(4)}
                </strong>
              </div>

              <div className="topk-metric">
                <span>Context</span>
                <strong>
                  {item.context.toFixed(0)}
                </strong>
                <small>characters</small>
              </div>

            </div>

          ))}

        </div>


        <div className="evaluation-conclusion">

          <strong>
            Finding:
          </strong>

          Increasing K from 1 → 5 increased average context
          from 594 to 2,921 characters and latency from
          29.59s to 66.65s, while average retrieval similarity
          decreased from 0.6989 to 0.6808.

        </div>

      </section>


      {/* =====================================================
          RAG ABLATION
      ===================================================== */}

      <section className="evaluation-card">

        <div className="evaluation-section-heading">

          <p className="eyebrow">
            EXERCISE 5 · RAG ABLATION
          </p>

          <h2>
            RAG vs No-RAG
          </h2>

          <p>
            Controlled comparison of answer accuracy with
    and     without retrieved policy context.
          </p>

        </div>


        <div className="rag-comparison">

          <div className="rag-column">

            <div className="rag-title">
              RAG ON
            </div>

            <strong>
              90%
            </strong>

            <span>
              Accuracy
            </span>

            <div className="rag-status">
              ✓ 9 / 10 correct
            </div>

            <div className="rag-status">
              +40 percentage points
            </div>

            <div className="rag-status">
              78.47s average latency
            </div>

          </div>


          <div className="rag-vs">
            VS
          </div>


          <div className="rag-column">

            <div className="rag-title">
              NO-RAG
            </div>

            <strong>
              50%
            </strong>

            <span>
              Accuracy
            </span>

            <div className="rag-status neutral">
              5 / 10 correct
            </div>

            <div className="rag-status neutral">
              Baseline
            </div>

            <div className="rag-status neutral">
              29.18s average latency
            </div>

          </div>

        </div>


      <div className="evaluation-conclusion">

        <strong>
          RAG finding:
        </strong>

        On the same 10 policy questions, RAG achieved
        <strong> 90% accuracy</strong> compared with
        <strong> 50% without retrieval</strong>.
        RAG won 5 questions, No-RAG won 1, and both
        approaches were correct on 4 questions.

        <br /><br />

        This represents a
        <strong> +40 percentage-point improvement</strong>
        in accuracy, with the trade-off of higher average
        latency (78.47s vs 29.18s).

      </div>

      </section>


      {/* =====================================================
          GROUNDEDNESS
      ===================================================== */}

      <section className="evaluation-card">

        <div className="evaluation-section-heading">

          <p className="eyebrow">
            AI SAFETY
          </p>

          <h2>
            Groundedness & "Knows When It Doesn't Know"
          </h2>

          <p>
            Evaluation of answers, uncertainty and refusal behavior.
          </p>

        </div>


        <div className="grounded-grid">

          <div className="grounded-stat">
            <strong>0</strong>
            <span>Hallucinations</span>
            <small>RAG ON sample</small>
          </div>

          <div className="grounded-stat">
            <strong>1</strong>
            <span>Appropriate Refusal</span>
            <small>RAG ON</small>
          </div>

          <div className="grounded-stat">
            <strong>1</strong>
            <span>Appropriate Uncertainty</span>
            <small>RAG ON</small>
          </div>

          <div className="grounded-stat">
            <strong>5</strong>
            <span>Answers Given</span>
            <small>RAG ON</small>
          </div>

        </div>

      </section>


      {/* =====================================================
          REPOSITORY RAG
      ===================================================== */}

      <section className="evaluation-card">

        <div className="evaluation-section-heading">

          <p className="eyebrow">
            EXERCISE 6 · REPOSITORY UNDERSTANDING
          </p>

          <h2>
            Repository-Level RAG
          </h2>

          <p>
            Testing whether the system can retrieve evidence
            across multiple files and components.
          </p>

        </div>


        <div className="repository-summary">

          <div>
            <strong>10</strong>
            <span>Questions</span>
          </div>

          <div>
            <strong>50</strong>
            <span>Chunks Retrieved</span>
          </div>

          <div>
            <strong>0.6160</strong>
            <span>Average Similarity</span>
          </div>

          <div>
            <strong>0.6972</strong>
            <span>Highest Score</span>
          </div>

        </div>


        <div className="repository-layout">

          <div>

            <h3>
              Retrieved File Distribution
            </h3>

            <div className="repository-files">

              {repositoryFiles.map(
                ([file, count]) => (

                  <div
                    className="repository-file"
                    key={file}
                  >

                    <div>
                      <span>{file}</span>
                      <strong>{count}</strong>
                    </div>

                    <div className="repository-track">

                      <div
                        className="repository-fill"
                        style={{
                          width:
                            `${(count / 18) * 100}%`
                        }}
                      />

                    </div>

                  </div>

                )
              )}

            </div>

          </div>


          <div className="repository-insight">

            <div className="insight-icon">
              ⌘
            </div>

            <h3>
              Cross-file understanding
            </h3>

            <p>
              The repository experiment used questions that
              require reasoning across upload APIs, document
              processing, retrieval, embeddings, frontend
              components and backend orchestration.
            </p>

            <div className="repository-tag">
              MULTI-FILE RAG
            </div>

          </div>

        </div>

      </section>


      {/* =====================================================
          FINAL FINDINGS
      ===================================================== */}

      <section className="evaluation-card final-findings">

        <div className="evaluation-section-heading">

          <p className="eyebrow">
            FINAL CONCLUSION
          </p>

          <h2>
            What Did Week 4 Prove?
          </h2>

        </div>


        <div className="finding-list">

          <div>
            <span>01</span>
            <p>
             <strong>CodeLlama and Phi-3 were the strongest quality models.</strong>
              Both achieved 77.27% accuracy in the corrected
            </p>
          </div>

          <div>
            <span>02</span>
            <p>
              <strong>Qwen was the efficiency winner.</strong>
              It achieved the lowest latency at 9.63s and
              lowest average RAM change at 1108 MB.
            </p>
          </div>

          <div>
            <span>03</span>
            <p>
              <strong>More retrieval is not automatically better.</strong>
              Increasing K increased context and latency while
              similarity decreased in this experiment.
            </p>
          </div>

          <div>
            <span>04</span>
            <p>
              CodeLlama matched Phi-3 for the highest accuracy, but had the highest latency and memory usage, demonstrating a quality-resource trade-off.
            </p>
          </div>

          <div>
            <span>05</span>
            <p>
              <strong>Repository RAG extends the system beyond policy Q&A.</strong>
              Ten multi-file questions were evaluated across
              backend and frontend components.
            </p>
          </div>

          <div>
            <span>06</span>
            <p>
              <strong>RAG substantially improved answer accuracy.</strong>
              In the controlled 10-question policy evaluation,
              RAG achieved 90% accuracy compared with 50% for
              No-RAG, a 40 percentage-point improvement.
            </p>
          </div>

        </div>

      </section>


      <div className="evaluation-footer">
        InsureMate · Week 4 Evaluation · Experimental results
      </div>

    </div>
  );
}


/* =========================================================
   DOCUMENTS PAGE
========================================================= */

function DocumentsPage({
  documents,
  totalChunks,
  onOpenDocument,
}) {

  return (

    <div>

      <header className="topbar">

        <div>

          <p className="eyebrow">
            KNOWLEDGE BASE
          </p>

          <h1>
            Insurance Documents
          </h1>

          <p className="subtitle">
            Documents processed by InsureMate.
          </p>

        </div>


        <div className="status">

          <span className="status-dot"></span>

          Knowledge Base Ready

        </div>

      </header>


      {/* SUMMARY */}

      <section className="status-grid">


        <div className="status-card">

          <div className="card-label">
            DOCUMENTS
          </div>

          <div className="card-value">
            {documents.length}
          </div>

          <div className="card-status">
            ● Loaded
          </div>

        </div>


        <div className="status-card">

          <div className="card-label">
            TOTAL CHUNKS
          </div>

          <div className="card-value">
            {totalChunks}
          </div>

          <div className="card-status">
            ● Processed
          </div>

        </div>


        <div className="status-card">

          <div className="card-label">
            PROCESSING
          </div>

          <div className="card-value">
            Complete
          </div>

          <div className="card-status">
            ● Ready
          </div>

        </div>


        <div className="status-card">

          <div className="card-label">
            EMBEDDING MODEL
          </div>

          <div className="card-value">
            Nomic Embed
          </div>

          <div className="card-status">
            ● Available
          </div>

        </div>

      </section>


      {/* DOCUMENT LIST */}

      <section className="documents-card">

        <div className="documents-header">

          <div>

            <h2>
              Uploaded Documents
            </h2>

            <p>
              Click any document to inspect its chunks.
            </p>

          </div>


          <span className="document-count">
            {documents.length} files
          </span>

        </div>


        <div className="document-list">

          {documents.map((doc) => (

            <div
              className="document-row clickable"
              key={doc.name}
              onClick={() =>
                onOpenDocument(doc.name)
              }
              title="Click to inspect chunks"
            >

              <div className="document-icon">
                PDF
              </div>


              <div className="document-info">

                <strong>
                  {doc.name}
                </strong>

                <span>
                  Click to inspect document chunks
                </span>

              </div>


              <div className="document-chunks">

                <strong>
                  {doc.chunks}
                </strong>

                <span>
                  chunks
                </span>

              </div>


              <div className="document-status">

                <span className="status-dot"></span>

                Processed

              </div>

            </div>

          ))}

        </div>

      </section>

    </div>

  );
}



function ChunkInspectorPage({
  document,
  chunks,
  loading,
  onBack,
}) {

  if (!document) {

    return (

      <div>

        <header className="topbar">

          <div>

            <p className="eyebrow">
              KNOWLEDGE BASE
            </p>

            <h1>
              Chunk Inspector
            </h1>

            <p className="subtitle">
              Select a document from the Documents page
              to inspect its chunks.
            </p>

          </div>

        </header>


        <section className="documents-card">

          <div className="empty-answer">

            <div className="empty-icon">
              ✂
            </div>

            <p>
              No document selected
            </p>

            <span>
              Go to Documents and select a PDF.
            </span>

          </div>

        </section>

      </div>

    );
  }


  const CHUNK_SIZE = 800;
  const OVERLAP = 150;
  const STEP_SIZE = CHUNK_SIZE - OVERLAP;


  return (

    <div>

      {/* HEADER */}

      <header className="topbar">

        <div>

          <button
            className="back-button"
            onClick={onBack}
          >
            ← Back to Documents
          </button>

          <p className="eyebrow">
            CHUNK INSPECTOR
          </p>

          <h1>
            {document}
          </h1>

          <p className="subtitle">
            Inspect how the document was divided into chunks.
          </p>

        </div>


        <div className="status">

          <span className="status-dot"></span>

          {loading
            ? "Loading..."
            : `${chunks.length} Chunks`}

        </div>

      </header>


      {/* =====================================================
          CHUNKING CONFIGURATION
      ===================================================== */}

      <section className="chunk-config">

        <div className="config-title">

          <div>

            <h2>
              Chunking Configuration
            </h2>

            <p>
              Parameters used during document preprocessing.
            </p>

          </div>

          <span className="config-badge">
            Character Based
          </span>

        </div>


        <div className="config-grid">


          <div className="config-item">

            <span>
              CHUNK SIZE
            </span>

            <strong>
              800
            </strong>

            <small>
              characters
            </small>

          </div>


          <div className="config-item">

            <span>
              OVERLAP
            </span>

            <strong>
              150
            </strong>

            <small>
              characters
            </small>

          </div>


          <div className="config-item">

            <span>
              STEP SIZE
            </span>

            <strong>
              650
            </strong>

            <small>
              characters
            </small>

          </div>


          <div className="config-item">

            <span>
              TOTAL CHUNKS
            </span>

            <strong>
              {loading ? "..." : chunks.length}
            </strong>

            <small>
              in document
            </small>

          </div>

        </div>

      </section>


      {/* =====================================================
          WHY OVERLAP
      ===================================================== */}

      <section className="overlap-card">

        <div className="overlap-heading">

          <div className="overlap-icon">
            ↔
          </div>

          <div>

            <h2>
              How Chunk Overlap Works
            </h2>

            <p>
              Each new chunk starts 650 characters after
              the previous chunk, leaving 150 characters
              of shared context.
            </p>

          </div>

        </div>


        <div className="overlap-visual">


          <div className="visual-label">
            CHUNK #1
          </div>

          <div className="visual-bar">

            <div className="chunk-main">
              0 → 650
            </div>

            <div className="chunk-overlap">
              650 → 800
              <span>
                150 overlap
              </span>
            </div>

          </div>


          <div className="visual-label second">
            CHUNK #2
          </div>

          <div className="visual-bar second-bar">

            <div className="chunk-main">
              650 → 1300
            </div>

            <div className="chunk-overlap">
              1300 → 1450
              <span>
                150 overlap
              </span>
            </div>

          </div>


          <div className="formula">

            800 character chunk
            −
            150 character overlap
            =
            <strong>
              650 character step
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          LOADING
      ===================================================== */}

      {loading && (

        <section className="documents-card">

          <div className="empty-answer">

            <div className="empty-icon">
              ⟳
            </div>

            <p>
              Loading chunks...
            </p>

            <span>
              Fetching chunk data from FastAPI.
            </span>

          </div>

        </section>

      )}


      {/* =====================================================
          CHUNK LIST
      ===================================================== */}

      {!loading && chunks.length > 0 && (

        <section>

          <div className="chunks-heading">

            <div>

              <h2>
                Chunk Breakdown
              </h2>

              <p>
                Showing all {chunks.length} chunks generated
                from this document.
              </p>

            </div>

            <span>
              {chunks.length} chunks
            </span>

          </div>


          <div className="chunks-list">

            {chunks.map((chunk, index) => {

              const start =
                index * STEP_SIZE;

              const end =
                start + CHUNK_SIZE;


              return (

                <div
                  className="chunk-card"
                  key={
                    chunk.chunk_id ??
                    `${document}-${index}`
                  }
                >

                  {/* HEADER */}

                  <div className="chunk-header">

                    <div className="chunk-number">

                      CHUNK #{index + 1}

                    </div>


                    <div className="chunk-page">

                      Page {chunk.page ?? "N/A"}

                    </div>

                  </div>


                  {/* METADATA */}

                  <div className="chunk-meta">

                    <span>
                      {chunk.characters ??
                        chunk.text?.length ??
                        0}{" "}
                      characters
                    </span>

                    <span>
                      Chunk ID:{" "}
                      {chunk.chunk_id ?? index}
                    </span>

                    <span>
                      Range: {start} → {end}
                    </span>

                  </div>


                  {/* TEXT */}

                  <div className="chunk-text">

                    {chunk.text}

                  </div>


                  {/* BOUNDARY */}

                  <div className="chunk-boundary">

                    <div>

                      <span>
                        START
                      </span>

                      <strong>
                        {start}
                      </strong>

                    </div>


                    <div className="boundary-line">

                      <span>
                        {chunk.characters ??
                          chunk.text?.length ??
                          0}{" "}
                        characters
                      </span>

                    </div>


                    <div>

                      <span>
                        END
                      </span>

                      <strong>
                        {end}
                      </strong>

                    </div>

                  </div>


                  {/* OVERLAP INDICATOR */}

                  {index > 0 && (

                    <div className="overlap-indicator">

                      <span>
                        ↳ 150 characters overlap
                        with previous chunk
                      </span>

                    </div>

                  )}

                </div>

              );

            })}

          </div>

        </section>

      )}


      {/* NO CHUNKS */}

      {!loading && chunks.length === 0 && (

        <section className="documents-card">

          <div className="empty-answer">

            <div className="empty-icon">
              ⚠
            </div>

            <p>
              No chunks found
            </p>

            <span>
              Check the backend chunk endpoint.
            </span>

          </div>

        </section>

      )}

    </div>

  );
}


/* =========================================================
   EMBEDDINGS PAGE
========================================================= */

function EmbeddingsPage({
  documents,
  embeddingDocument,
  setEmbeddingDocument,
  embeddingChunk,
  setEmbeddingChunk,
  embeddingData,
  loading,
}) {
  const vector =
    embeddingData?.embeddings?.[0]?.embedding || [];

  const dimensions =
    embeddingData?.embeddings?.[0]?.dimensions ||
    vector.length ||
    768;

  return (
    <div>

      <header className="topbar">

        <div>
          <p className="eyebrow">
            VECTOR DATABASE
          </p>

          <h1>
            Embedding Inspector
          </h1>

          <p className="subtitle">
            Inspect how document chunks are converted into
            numerical vector representations.
          </p>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Nomic Embed Online
        </div>

      </header>


      {/* SELECT DOCUMENT */}

      <section className="documents-card">

        <div className="documents-header">

          <div>
            <h2>
              Select Document
            </h2>

            <p>
              Choose a document and chunk to inspect its
              embedding vector.
            </p>
          </div>

        </div>


        <div
          style={{
            display: "flex",
            gap: "16px",
            padding: "24px",
            flexWrap: "wrap",
          }}
        >

          <select
            value={embeddingDocument || ""}
            onChange={(e) => {
              setEmbeddingDocument(e.target.value);
              setEmbeddingChunk(0);
            }}
            style={{
              flex: 1,
              minWidth: "280px",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #1e3354",
              fontSize: "15px",
              background: "#0d1526",
              color: "#e5e7eb",
            }}
          >

            <option value="">
              Select a document
            </option>

            {documents.map((doc) => (
              <option
                key={doc.name}
                value={doc.name}
              >
                {doc.name}
              </option>
            ))}

          </select>


          <input
            type="number"
            min="0"
            value={embeddingChunk}
            onChange={(e) =>
              setEmbeddingChunk(
                Math.max(0, Number(e.target.value))
              )
            }
            placeholder="Chunk ID"
            style={{
              width: "120px",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #ddd",
              fontSize: "15px",
            }}
          />

        </div>

      </section>


      {/* PIPELINE */}

      <section className="pipeline-card">

        <div className="pipeline-title">

          <div>
            <h2>
              Embedding Pipeline
            </h2>

            <p>
              How InsureMate converts text into vectors.
            </p>
          </div>

        </div>


        <div className="pipeline">

          <div className="pipeline-step">
            <div className="step-number">
              01
            </div>

            <strong>
              Document
            </strong>

            <span>
              PDF policy
            </span>
          </div>


          <div className="arrow">
            →
          </div>


          <div className="pipeline-step">
            <div className="step-number">
              02
            </div>

            <strong>
              Chunk
            </strong>

            <span>
              Text segment
            </span>
          </div>


          <div className="arrow">
            →
          </div>


          <div className="pipeline-step">
            <div className="step-number">
              03
            </div>

            <strong>
              Nomic Embed
            </strong>

            <span>
              Embedding model
            </span>
          </div>


          <div className="arrow">
            →
          </div>


          <div className="pipeline-step">
            <div className="step-number">
              04
            </div>

            <strong>
              768-D Vector
            </strong>

            <span>
              Numerical representation
            </span>
          </div>

        </div>

      </section>


      {/* VECTOR DETAILS */}

      {loading && (
        <section className="documents-card">

          <div className="empty-answer">

            <div className="empty-icon">
              ⟳
            </div>

            <p>
              Generating embedding...
            </p>

            <span>
              Fetching vector from nomic-embed-text.
            </span>

          </div>

        </section>
      )}


      {!loading && embeddingData && (

        <>

          {/* SUMMARY */}

          <section className="status-grid">

            <div className="status-card">

              <div className="card-label">
                EMBEDDING MODEL
              </div>

              <div className="card-value">
                nomic-embed-text
              </div>

              <div className="card-status">
                ● Active
              </div>

            </div>


            <div className="status-card">

              <div className="card-label">
                DIMENSIONS
              </div>

              <div className="card-value">
                {dimensions}
              </div>

              <div className="card-status">
                ● Vector size
              </div>

            </div>


            <div className="status-card">

              <div className="card-label">
                DOCUMENT
              </div>

              <div
                className="card-value"
                style={{
                  fontSize: "15px",
                  wordBreak: "break-word",
                }}
              >
                {embeddingDocument}
              </div>

              <div className="card-status">
                ● Loaded
              </div>

            </div>


            <div className="status-card">

              <div className="card-label">
                CHUNK
              </div>

              <div className="card-value">
                #{embeddingChunk}
              </div>

              <div className="card-status">
                ● Embedded
              </div>

            </div>

          </section>


          {/* VECTOR */}

          <section className="documents-card">

            <div className="documents-header">

              <div>

                <h2>
                  Vector Representation
                </h2>

                <p>
                  The actual {dimensions}-dimensional
                  embedding generated for this chunk.
                </p>

              </div>

              <span className="document-count">
                {dimensions} values
              </span>

            </div>


            <div
              style={{
                margin: "20px",
                padding: "20px",
                background: "#111827",
                borderRadius: "12px",
                color: "#d1d5db",
                fontFamily: "monospace",
                fontSize: "13px",
                lineHeight: "1.8",
                maxHeight: "400px",
                overflowY: "auto",
                wordBreak: "break-all",
              }}
            >

              {vector.map((value, index) => (
                <span key={index}>
                  <span
                    style={{
                      color: "#9ca3af",
                    }}
                  >
                    {index}:
                  </span>{" "}

                  {Number(value).toFixed(7)}

                  {index < vector.length - 1
                    ? ", "
                    : ""}
                </span>
              ))}

            </div>

          </section>


          {/* EXPLANATION */}

          <section className="overlap-card">

            <div className="overlap-heading">

              <div className="overlap-icon">
                ✦
              </div>

              <div>

                <h2>
                  What is this vector?
                </h2>

                <p>
                  Each insurance text chunk is converted
                  into a numerical representation containing
                  {dimensions} values. Similar insurance
                  concepts produce vectors that are closer
                  together in the embedding space. InsureMate
                  uses these representations during semantic
                  retrieval to find relevant policy chunks.
                </p>

              </div>

            </div>

          </section>

        </>

      )}


      {!loading && !embeddingData && !embeddingDocument && (

        <section className="documents-card">

          <div className="empty-answer">

            <div className="empty-icon">
              ✦
            </div>

            <p>
              Select a document to inspect embeddings.
            </p>

            <span>
              Choose a PDF above to load its vector.
            </span>

          </div>

        </section>

      )}

    </div>
  );
}



/* =========================================================
   RETRIEVAL PAGE
========================================================= */

function RetrievalPage() {

  const API_BASE = API_URL;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchRetrieval = async () => {

    if (!query.trim()) return;

    try {

      setLoading(true);
      setError("");
      setResults([]);

      const response = await fetch(
        `${API_BASE}/api/retrieval/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            question: query,
            top_k: 5
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `Retrieval request failed: HTTP ${response.status}`
        );
      }

      const data = await response.json();

      setResults(
        data.results ||
        data.chunks ||
        data.retrieved_chunks ||
        []
      );

    } catch (err) {

      console.error("Retrieval error:", err);

      setError(
        err.message ||
        "Unable to connect to retrieval service."
      );

    } finally {

      setLoading(false);

    }
  };

  return (

    <div>

      <header className="topbar">

        <div>

          <p className="eyebrow">
            INSUREMATE AI
          </p>

          <h1>
            Retrieval
          </h1>

          <p className="subtitle">
            Search the indexed insurance knowledge base
            using semantic retrieval.
          </p>

        </div>

      </header>


      <section className="documents-card">

        <div style={{ padding: "24px" }}>

          <h2>
            Semantic Retrieval
          </h2>

          <p
            style={{
              color: "#94a3b8",
              marginBottom: "18px"
            }}
          >
            Enter a policy question to find the most
            relevant evidence chunks.
          </p>


          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap"
            }}
          >

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  searchRetrieval();
                }
              }}
              placeholder="e.g. What expenses are covered after hospitalization?"
              style={{
                flex: 1,
                minWidth: "280px",
                padding: "13px 14px",
                border: "1px solid #d1d5db",
                borderRadius: "9px",
                fontFamily: "inherit"
              }}
            />


            <button
              className="ask-button"
              onClick={searchRetrieval}
              disabled={
                loading ||
                !query.trim()
              }
            >
              {loading
                ? "Searching..."
                : "Search Evidence →"}
            </button>

          </div>

        </div>

      </section>


      {error && (

        <section className="documents-card">

          <div className="empty-answer">

            <div className="empty-icon">
              ⚠
            </div>

            <p>
              Retrieval failed
            </p>

            <span>
              {error}
            </span>

          </div>

        </section>

      )}


      {!loading &&
       !error &&
       results.length > 0 && (

        <section className="documents-card">

          <div className="documents-header">

            <div>

              <h2>
                Retrieved Evidence
              </h2>

              <p>
                Most relevant policy chunks for your query.
              </p>

            </div>

            <span className="document-count">
              {results.length} results
            </span>

          </div>


          <div
            style={{
              padding: "0 24px 24px",
              display: "grid",
              gap: "14px"
            }}
          >

            {results.map(
              (result, index) => {

                const document =
                  result.document ||
                  "Unknown document";

                const page =
                  result.page ??
                  "N/A";

                const chunkId =
                  result.chunk_id ??
                  "N/A";

                const score =
                  result.score ??
                  result.similarity ??
                  null;

                const text =
                  result.text ||
                  result.content ||
                  "";

                return (

                  <div
                    key={`${document}-${chunkId}-${index}`}
                    style={{
                      border:
                        "1px solid #e5e7eb",
                      borderRadius:
                        "12px",
                      padding:
                        "18px",
                      background:
                        "#ffffff"
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        gap:
                          "12px",
                        flexWrap:
                          "wrap",
                        marginBottom:
                          "12px"
                      }}
                    >

                      <strong>
                        Result #{index + 1}
                      </strong>

                      {score !== null && (

                        <span
                          style={{
                            fontWeight: 600
                          }}
                        >
                          Similarity:{" "}
                          {(Number(score) * 100)
                            .toFixed(1)}%
                        </span>

                      )}

                    </div>


                    <div
                      style={{
                        fontSize: "13px",
                        color: "#94a3b8",
                        marginBottom: "12px"
                      }}
                    >
                      {document}
                      {" · "}
                      Page {page}
                      {" · "}
                      Chunk {chunkId}
                    </div>


                    <div
                      style={{
                        lineHeight: "1.65",
                        color: "#374151",
                        fontSize: "14px"
                      }}
                    >
                      {text}
                    </div>

                  </div>

                );

              }
            )}

          </div>

        </section>

      )}


      {!loading &&
       !error &&
       query &&
       results.length === 0 && (

        <section className="documents-card">

          <div className="empty-answer">

            <div className="empty-icon">
              ⌕
            </div>

            <p>
              No evidence found
            </p>

            <span>
              Try asking the question in a different way.
            </span>

          </div>

        </section>

      )}

    </div>

  );
}



/* =========================================================
   TECHNICAL PAGE PLACEHOLDER
========================================================= */

function TechnicalPage({
  title,
  documents,
  totalChunks,
}) {

  const API_BASE = API_URL;

  /* =========================================================
     SOURCES STATE
  ========================================================= */

  // const [documents, setDocuments] = useState([]);
  const [chunks, setChunks] = useState([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState("");
  const [selectedDocument, setSelectedDocument] = useState(null);


  /* =========================================================
     MODELS STATE
  ========================================================= */

  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");


  /* =========================================================
     HALLUCINATION STATE
  ========================================================= */

  const [hallucinationQuestion, setHallucinationQuestion] =
    useState("");

  const [hallucinationModel, setHallucinationModel] =
    useState("qwen2.5:1.5b");

  const [hallucinationResult, setHallucinationResult] =
    useState(null);

  const [hallucinationLoading, setHallucinationLoading] =
    useState(false);

  const [comparisonResults, setComparisonResults] =
    useState([]);

  const [comparisonLoading, setComparisonLoading] =
    useState(false);


  /* =========================================================
     SYSTEM STATE
  ========================================================= */

  const [systemStatus, setSystemStatus] =
    useState(null);

  const [systemLoading, setSystemLoading] =
    useState(false);


  /* =========================================================
     LOAD SOURCES
  ========================================================= */

  const loadSources = async () => {

    try {

      setSourcesLoading(true);
      setSourcesError("");

      // const documentsResponse =
      //   await fetch(
      //     `${API_BASE}/api/knowledge/documents`
      //   );

      // if (!documentsResponse.ok) {
      //   throw new Error("Failed to load documents");
      // }

      // const documentsData =
      //   await documentsResponse.json();

      // setDocuments(
      //   documentsData.documents || []
      // );


      const chunksResponse =
        await fetch(
          `${API_BASE}/api/knowledge/chunks`
        );

      if (!chunksResponse.ok) {
        throw new Error("Failed to load chunks");
      }

      const chunksData =
        await chunksResponse.json();

      setChunks(
        chunksData.chunks || []
      );

    } catch (error) {

      console.error(
        "Sources error:",
        error
      );

      setSourcesError(
        error.message ||
        "Unable to load policy sources."
      );

    } finally {

      setSourcesLoading(false);

    }
  };


  /* =========================================================
     LOAD MODELS
  ========================================================= */

  const loadModels = async () => {

    try {

      setModelsLoading(true);
      setModelsError("");

      const response =
        await fetch(
          `${API_BASE}/api/models`
        );

      if (!response.ok) {
        throw new Error(
          "Failed to load models"
        );
      }

      const data =
        await response.json();

      setModels(
        data.models || []
      );

    } catch (error) {

      console.error(
        "Models error:",
        error
      );

      setModelsError(
        error.message ||
        "Unable to load models."
      );

    } finally {

      setModelsLoading(false);

    }
  };


  /* =========================================================
     SYSTEM STATUS
  ========================================================= */
  const loadSystemStatus = async () => {

  try {

    setSystemLoading(true);

    // Check FastAPI
    const apiResponse = await fetch(
      `${API_BASE}/`,
      {
        cache: "no-store"
      }
    );

    // Check Ollama through FastAPI
    const ollamaResponse = await fetch(
      `${API_BASE}/api/models`,
      {
        cache: "no-store"
      }
    );

    const ollamaData =
      await ollamaResponse.json();

    const ollamaOnline =
      ollamaResponse.ok &&
      Array.isArray(ollamaData.models) &&
      ollamaData.models.length > 0;

    setSystemStatus({

      api: apiResponse.ok,

      ollama: ollamaOnline

    });

  } catch (error) {

    console.error(
      "System status error:",
      error
    );

    setSystemStatus({

      api: false,

      ollama: false

    });

  } finally {

    setSystemLoading(false);

  }

};


  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {

    if (title === "Sources") {
      loadSources();
    }

    if (title === "Models" || title === "Hallucination") {
      loadModels();
    }

    if (title === "System") {
      loadSystemStatus();
    }

  }, [title]);


  /* =========================================================
     HALLUCINATION CHECK
  ========================================================= */

  const runHallucinationCheck =
    async () => {

      if (!hallucinationQuestion.trim()) {
        return;
      }

      try {

        setHallucinationLoading(true);
        setHallucinationResult(null);

        const response =
          await fetch(
            `${API_BASE}/api/hallucination/check`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                question:
                  hallucinationQuestion,

                model:
                  hallucinationModel,

                top_k: 3
              })
            }
          );

        if (!response.ok) {

          const text =
            await response.text();

          throw new Error(
            text ||
            `HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        setHallucinationResult(
          data
        );

      } catch (error) {

        console.error(
          "Hallucination error:",
          error
        );

        setHallucinationResult({
          error:
            error.message ||
            "Evaluation failed."
        });

      } finally {

        setHallucinationLoading(false);

      }
    };


  /* =========================================================
     COMPARE MODELS
  ========================================================= */

  const compareModels =
    async () => {

      if (!hallucinationQuestion.trim()) {
        return;
      }

      const generationModels =
        models.filter(
          (model) =>
            model.capabilities &&
            model.capabilities.includes(
              "completion"
            )
        );

      if (
        generationModels.length === 0
      ) {

        await loadModels();
        return;

      }

      try {

        setComparisonLoading(true);
        setComparisonResults([]);

        const results = [];

        for (
          const model of generationModels
        ) {

          try {

            const response =
              await fetch(
                `${API_BASE}/api/hallucination/check`,
                {
                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body: JSON.stringify({

                    question:
                      hallucinationQuestion,

                    model:
                      model.name,

                    top_k: 3

                  })

                }
              );

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}`
              );
            }

            const data =
              await response.json();

            results.push({

              name:
                model.name,

              grounding_score:
                data.grounding_score,

              risk:
                data.risk,

              supported:
                (
                  data.supported_claims ||
                  []
                ).length,

              unsupported:
                (
                  data.unsupported_claims ||
                  []
                ).length

            });

          } catch (error) {

            results.push({

              name:
                model.name,

              grounding_score:
                null,

              risk:
                "ERROR",

              supported: 0,

              unsupported: 0

            });

          }

        }

        setComparisonResults(
          results
        );

      } catch (error) {

        console.error(
          "Comparison error:",
          error
        );

      } finally {

        setComparisonLoading(false);

      }
    };


  /* =========================================================
     SOURCES PAGE
  ========================================================= */

  if (title === "Sources") {

    return (

      <div>

        <header className="topbar">

          <div>

            <p className="eyebrow">
              KNOWLEDGE BASE
            </p>

            <h1>
              Sources
            </h1>

            <p className="subtitle">
              Policy documents and evidence chunks
              used by the InsureMate AI pipeline.
            </p>

          </div>

          <button
            className="ask-button"
            onClick={loadSources}
            disabled={sourcesLoading}
          >
            {sourcesLoading
              ? "Refreshing..."
              : "↻ Refresh Sources"}
          </button>

        </header>


        {sourcesError && (

          <section className="documents-card">

            <div className="empty-answer">

              <div className="empty-icon">
                ⚠
              </div>

              <p>
                Sources unavailable
              </p>

              <span>
                {sourcesError}
              </span>

            </div>

          </section>

        )}


        {!sourcesLoading &&
         !sourcesError && (

          <>

            <section className="status-grid">

              <div className="status-card">

                <div className="card-label">
                  DOCUMENTS
                </div>

                <div className="card-value">
                  {documents.length}
                </div>

                <div className="card-status">
                  ● Indexed
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  EVIDENCE CHUNKS
                </div>

                <div className="card-value">
                  {chunks.length}
                </div>

                <div className="card-status">
                  ● Available
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  CHUNK SIZE
                </div>

                <div className="card-value">
                  800
                </div>

                <div className="card-status">
                  ● Characters
                </div>

              </div>

            </section>


            <section className="documents-card">

              <div className="documents-header">

                <div>

                  <h2>
                    Policy Sources
                  </h2>

                  <p>
                    Documents currently indexed
                    in the InsureMate knowledge base.
                  </p>

                </div>

                <span className="document-count">
                  {documents.length} document
                  {documents.length !== 1
                    ? "s"
                    : ""}
                </span>

              </div>


              <div
                style={{
                  padding:
                    "0 24px 24px",
                  display: "grid",
                  gap: "16px"
                }}
              >

                {documents.map(
                  (document) => {

                    const documentChunks =
                      chunks.filter(
                        (chunk) =>
                          chunk.document ===
                          document.name
                      );

                    const isSelected =
                      selectedDocument ===
                      document.name;

                    const pages =
                      new Set(
                        documentChunks.map(
                          (chunk) =>
                            chunk.page
                        )
                      ).size;

                    return (

                      <div
                        key={
                          document.name
                        }
                        style={{
                          border:
                            "1px solid #1e3354",
                          borderRadius:
                            "14px",
                          padding:
                            "20px",
                          background:
                            "#0d1526",
                          boxShadow:
                            "0 0 20px rgba(34, 211, 238, 0.06)"
                        }}
                      >

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap:
                              "16px",
                            flexWrap:
                              "wrap"
                          }}
                        >

                          <div>

                            <div
                              style={{
                                fontSize:
                                  "18px",
                                fontWeight:
                                  700,
                                color:
                                  "#f1f5f9"
                              }}
                            >
                              📄{" "}
                              {document.name}
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "6px",
                                color:
                                  "#94a3b8",
                                fontSize:
                                  "13px"
                              }}
                            >
                              Insurance policy
                              document
                            </div>

                          </div>

                          <span
                            style={{
                              color:
                                "#15803d",
                              fontSize:
                                "13px",
                              fontWeight:
                                600
                            }}
                          >
                            ● Indexed
                          </span>

                        </div>


                        <div
                          className="status-grid"
                          style={{
                            marginTop:
                              "18px"
                          }}
                        >

                          <div className="status-card">

                            <div className="card-label">
                              CHUNKS
                            </div>

                            <div className="card-value">
                              {document.chunks}
                            </div>

                          </div>


                          <div className="status-card">

                            <div className="card-label">
                              PAGES
                            </div>

                            <div className="card-value">
                              {pages}
                            </div>

                          </div>


                          <div className="status-card">

                            <div className="card-label">
                              OVERLAP
                            </div>

                            <div className="card-value">
                              150
                            </div>

                          </div>

                        </div>


                        <button
                          className="ask-button"
                          style={{
                            marginTop:
                              "18px"
                          }}
                          onClick={() =>
                            setSelectedDocument(
                              isSelected
                                ? null
                                : document.name
                            )
                          }
                        >
                          {isSelected
                            ? "Hide Evidence"
                            : "View Evidence"}
                        </button>


                        {isSelected && (

                          <div
                            style={{
                              marginTop:
                                "18px",
                              borderTop:
                                "1px solid #e5e7eb",
                              paddingTop:
                                "18px"
                            }}
                          >

                            <div
                              style={{
                                fontWeight:
                                  700,
                                marginBottom:
                                  "12px"
                              }}
                            >
                              Evidence Chunks
                            </div>


                            {documentChunks
                              .slice(0, 10)
                              .map(
                                (chunk) => (

                                  <div
                                    key={`${chunk.document}-${chunk.chunk_id}`}
                                    style={{
                                      padding:
                                        "14px",
                                      marginBottom:
                                        "10px",
                                      background:
                                        "#f8fafc",
                                      borderRadius:
                                        "10px"
                                    }}
                                  >

                                    <div
                                      style={{
                                        display:
                                          "flex",
                                        justifyContent:
                                          "space-between",
                                        marginBottom:
                                          "7px",
                                        fontSize:
                                          "12px",
                                        fontWeight:
                                          600
                                      }}
                                    >

                                      <span>
                                        Chunk #
                                        {
                                          chunk.chunk_id
                                        }
                                      </span>

                                      <span>
                                        Page{" "}
                                        {
                                          chunk.page
                                        }
                                      </span>

                                    </div>


                                    <div
                                      style={{
                                        fontSize:
                                          "13px",
                                        lineHeight:
                                          "1.6",
                                        color:
                                          "#4b5563"
                                      }}
                                    >
                                      {
                                        chunk.text
                                      }
                                    </div>

                                  </div>

                                )
                              )}

                          </div>

                        )}

                      </div>

                    );

                  }
                )}

              </div>

            </section>

          </>

        )}

      </div>

    );

  }


  /* =========================================================
     MODELS PAGE
  ========================================================= */

  if (title === "Models") {

    const generationModels =
      models.filter(
        (model) =>
          model.capabilities &&
          model.capabilities.includes(
            "completion"
          )
      );

    const embeddingModels =
      models.filter(
        (model) =>
          model.capabilities &&
          model.capabilities.includes(
            "embedding"
          )
      );

    return (

      <div>

        <header className="topbar">

          <div>

            <p className="eyebrow">
              AI MODEL INFRASTRUCTURE
            </p>

            <h1>
              Models
            </h1>

            <p className="subtitle">
              Live models available through
              the InsureMate Ollama runtime.
            </p>

          </div>

          <button
            className="ask-button"
            onClick={loadModels}
            disabled={modelsLoading}
          >
            {modelsLoading
              ? "Refreshing..."
              : "↻ Refresh Models"}
          </button>

        </header>


        {modelsError && (

          <section className="documents-card">

            <div className="empty-answer">

              <div className="empty-icon">
                ⚠
              </div>

              <p>
                Model service unavailable
              </p>

              <span>
                {modelsError}
              </span>

            </div>

          </section>

        )}


        {!modelsError && (

          <>

            <section className="status-grid">

              <div className="status-card">

                <div className="card-label">
                  OLLAMA
                </div>

                <div className="card-value">
                  Online
                </div>

                <div className="card-status">
                  ● Connected
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  AVAILABLE MODELS
                </div>

                <div className="card-value">
                  {models.length}
                </div>

                <div className="card-status">
                  ● Detected
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  GENERATION
                </div>

                <div className="card-value">
                  {generationModels.length}
                </div>

                <div className="card-status">
                  ● Completion Models
                </div>

              </div>


              <div className="status-card">

                <div className="card-label">
                  EMBEDDING
                </div>

                <div className="card-value">
                  {embeddingModels.length}
                </div>

                <div className="card-status">
                  ● Embedding Models
                </div>

              </div>

            </section>


            <section className="documents-card">

              <div className="documents-header">

                <div>

                  <h2>
                    Available Models
                  </h2>

                  <p>
                    Models detected from the
                    local Ollama service.
                  </p>

                </div>

                <span className="document-count">
                  {models.length} models
                </span>

              </div>


              <div
                style={{
                  padding:
                    "0 24px 24px",
                  display:
                    "grid",
                  gap:
                    "14px"
                }}
              >

                {models.map(
                  (model) => {

                    const isEmbedding =
                      model.capabilities &&
                      model.capabilities.includes(
                        "embedding"
                      );

                    const sizeGB =
                      model.size
                        ? (
                            model.size /
                            (1024 ** 3)
                          ).toFixed(2)
                        : "N/A";

                    const context =
                      model.details &&
                      model.details.context_length
                        ? Math.round(
                            model.details
                              .context_length /
                            1000
                          ) + "K"
                        : "N/A";

                    return (

                      <div
                        key={
                          model.name
                        }
                        style={{
                          border:
                            "1px solid #1e3354",
                          borderRadius:
                            "14px",
                          padding:
                            "20px",
                          background:
                            "#0d1526",
                          boxShadow:
                            "0 0 20px rgba(34, 211, 238, 0.06)"
                        }}
                      >

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "center",
                            gap:
                              "16px",
                            flexWrap:
                              "wrap"
                          }}
                        >

                          <div>

                            <div
                              style={{
                                fontSize:
                                  "18px",
                                fontWeight:
                                  700
                              }}
                            >
                              {isEmbedding
                                ? "EMB"
                                : "AI"}{" "}
                              {model.name}
                            </div>

                            <div
                              style={{
                                marginTop:
                                  "6px",
                                color:
                                  "#6b7280",
                                fontSize:
                                  "13px"
                              }}
                            >
                              {isEmbedding
                                ? "Embedding Model"
                                : "Language Model"}
                            </div>

                          </div>

                          <span
                            style={{
                              color:
                                "#15803d",
                              fontWeight:
                                600,
                              fontSize:
                                "13px"
                            }}
                          >
                            ● Ready
                          </span>

                        </div>


                        <div
                          className="status-grid"
                          style={{
                            marginTop:
                              "18px"
                          }}
                        >

                          <div className="status-card">

                            <div className="card-label">
                              PARAMETERS
                            </div>

                            <div className="card-value">
                              {
                                model.details
                                  ?.parameter_size ||
                                "N/A"
                              }
                            </div>

                          </div>


                          <div className="status-card">

                            <div className="card-label">
                              MODEL SIZE
                            </div>

                            <div className="card-value">
                              {sizeGB} GB
                            </div>

                          </div>


                          <div className="status-card">

                            <div className="card-label">
                              CONTEXT
                            </div>

                            <div className="card-value">
                              {context}
                            </div>

                          </div>

                        </div>

                      </div>

                    );

                  }
                )}

              </div>

            </section>

          </>

        )}

      </div>

    );

  }


  /* =========================================================
     HALLUCINATION PAGE
  ========================================================= */

  if (title === "Hallucination") {

    const bestModel =
      comparisonResults.length > 0
        ? comparisonResults
            .filter(
              (item) =>
                item.grounding_score !== null
            )
            .sort(
              (a, b) =>
                b.grounding_score -
                a.grounding_score
            )[0]
        : null;

    return (

      <div>

        <header className="topbar">

          <div>

            <p className="eyebrow">
              AI SAFETY & EVALUATION
            </p>

            <h1>
              Hallucination Detector
            </h1>

            <p className="subtitle">
              Evaluate whether AI-generated insurance
              answers are grounded in retrieved policy evidence.
            </p>

          </div>

        </header>


        <section className="documents-card">

          <div
            style={{
              padding: "24px"
            }}
          >

            <h2>
              Test AI Grounding
            </h2>

            <p
              style={{
                color: "#94a3b8",
                marginBottom: "20px"
              }}
            >
              Ask a policy question and evaluate how
              well the generated answer is supported
              by evidence.
            </p>


            <div
              style={{
                display: "grid",
                gap: "14px"
              }}
            >

              <textarea
                value={
                  hallucinationQuestion
                }
                onChange={(event) =>
                  setHallucinationQuestion(
                    event.target.value
                  )
                }
                placeholder="Ask a policy question..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "14px",
                  border:
                    "1px solid #d1d5db",
                  borderRadius: "10px",
                  resize: "vertical",
                  fontFamily:
                    "inherit"
                }}
              />


              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap"
                }}
              >

                <select
                  value={
                    hallucinationModel
                  }
                  onChange={(event) =>
                    setHallucinationModel(
                      event.target.value
                    )
                  }
                  style={{
                    padding: "11px",
                    border:
                      "1px solid #d1d5db",
                    borderRadius:
                      "8px"
                  }}
                >

                  {models
                    .filter(
                      (model) =>
                        model.capabilities &&
                        model.capabilities.includes(
                          "completion"
                        )
                    )
                    .map(
                      (model) => (
                        <option
                          key={
                            model.name
                          }
                          value={
                            model.name
                          }
                        >
                          {model.name}
                        </option>
                      )
                    )}

                </select>


                <button
                  className="ask-button"
                  onClick={
                    runHallucinationCheck
                  }
                  disabled={
                    hallucinationLoading ||
                    !hallucinationQuestion.trim()
                  }
                >
                  {hallucinationLoading
                    ? "Analyzing..."
                    : "Analyze Answer →"}
                </button>


                <button
                  className="ask-button"
                  onClick={
                    compareModels
                  }
                  disabled={
                    comparisonLoading ||
                    !hallucinationQuestion.trim()
                  }
                >
                  {comparisonLoading
                    ? "Comparing..."
                    : "Compare All Models"}
                </button>

              </div>

            </div>

          </div>

        </section>


        {hallucinationResult && (

          <section className="documents-card">

            <div
              style={{
                padding: "24px"
              }}
            >

              {hallucinationResult.error ? (

                <div className="empty-answer">

                  <div className="empty-icon">
                    ⚠
                  </div>

                  <p>
                    Evaluation failed
                  </p>

                  <span>
                    {
                      hallucinationResult.error
                    }
                  </span>

                </div>

              ) : (

                <>

                  <div
                    className="status-grid"
                  >

                    <div className="status-card">

                      <div className="card-label">
                        GROUNDING SCORE
                      </div>

                      <div className="card-value">
                        {
                          hallucinationResult
                            .grounding_score
                        }%
                      </div>

                    </div>


                    <div className="status-card">

                      <div className="card-label">
                        HALLUCINATION RISK
                      </div>

                      <div className="card-value">
                        {
                          hallucinationResult
                            .risk
                        }
                      </div>

                    </div>


                    <div className="status-card">

                      <div className="card-label">
                        EVIDENCE CHUNKS
                      </div>

                      <div className="card-value">
                        {
                          (
                            hallucinationResult
                              .sources ||
                            []
                          ).length
                        }
                      </div>

                    </div>

                  </div>


                  <h2
                    style={{
                      marginTop:
                        "28px"
                    }}
                  >
                    AI Answer
                  </h2>

                  <div
                    style={{
                      padding:
                        "18px",
                      background:
                        "#f8fafc",
                      borderRadius:
                        "10px",
                      lineHeight:
                        "1.7"
                    }}
                  >
                    {
                      hallucinationResult
                        .answer
                    }
                  </div>


                  <h2
                    style={{
                      marginTop:
                        "28px"
                    }}
                  >
                    ✓ Supported Claims
                  </h2>

                  <div>

                    {(
                      hallucinationResult
                        .supported_claims ||
                      []
                    ).map(
                      (claim, index) => (

                        <div
                          key={index}
                          style={{
                            padding:
                              "12px",
                            marginBottom:
                              "8px",
                            background:
                              "#f0fdf4",
                            borderRadius:
                              "8px"
                          }}
                        >
                          {claim}
                        </div>

                      )
                    )}

                    {(
                      hallucinationResult
                        .supported_claims ||
                      []
                    ).length === 0 && (

                      <p>
                        No supported claims detected.
                      </p>

                    )}

                  </div>


                  <h2
                    style={{
                      marginTop:
                        "28px"
                    }}
                  >
                    ✕ Unsupported Claims
                  </h2>

                  <div>

                    {(
                      hallucinationResult
                        .unsupported_claims ||
                      []
                    ).map(
                      (claim, index) => (

                        <div
                          key={index}
                          style={{
                            padding:
                              "12px",
                            marginBottom:
                              "8px",
                            background:
                              "#fef2f2",
                            borderRadius:
                              "8px"
                          }}
                        >
                          {claim}
                        </div>

                      )
                    )}

                    {(
                      hallucinationResult
                        .unsupported_claims ||
                      []
                    ).length === 0 && (

                      <p>
                        No unsupported claims detected.
                      </p>

                    )}

                  </div>


                  <h2
                    style={{
                      marginTop:
                        "28px"
                    }}
                  >
                    Retrieved Evidence
                  </h2>

                  {(
                    hallucinationResult
                      .sources ||
                    []
                  ).map(
                    (source, index) => (

                      <div
                        key={index}
                        style={{
                          padding:
                            "16px",
                          marginBottom:
                            "12px",
                          background:
                            "#f8fafc",
                          borderRadius:
                            "10px"
                        }}
                      >

                        <strong>
                          Result #{index + 1}
                        </strong>

                        <div
                          style={{
                            marginTop:
                              "5px",
                            fontSize:
                              "13px",
                            color:
                              "#6b7280"
                          }}
                        >
                          {source.document}
                          {" · "}
                          Page {source.page}
                          {" · "}
                          Chunk {source.chunk_id}
                        </div>

                        <div
                          style={{
                            marginTop:
                              "10px",
                            fontSize:
                              "13px",
                            lineHeight:
                              "1.6"
                          }}
                        >
                          {source.text}
                        </div>

                      </div>

                    )
                  )}

                </>

              )}

            </div>

          </section>

        )}


        {comparisonResults.length > 0 && (

          <section className="documents-card">

            <div
              style={{
                padding: "24px"
              }}
            >

              <p className="eyebrow">
                MODEL EVALUATION
              </p>

              <h2>
                Model Comparison
              </h2>

              <p
                style={{
                  color: "#94a3b8"
                }}
              >
                Compare how consistently each AI model
                grounds its answer in the policy evidence.
              </p>


              {bestModel && (

                <div
                  style={{
                    marginTop: "20px",
                    padding: "20px",
                    borderRadius: "12px",
                    background:
                      "#f8fafc"
                  }}
                >

                  <div className="card-label">
                    🏆 BEST GROUNDED MODEL
                  </div>

                  <div
                    style={{
                      fontSize:
                        "24px",
                      fontWeight:
                        700,
                      marginTop:
                        "6px"
                    }}
                  >
                    {bestModel.name}
                  </div>

                  <div
                    style={{
                      marginTop:
                        "5px"
                    }}
                  >
                    {bestModel.grounding_score}%
                    {" "}
                    grounding score
                  </div>

                </div>

              )}


              <div
                style={{
                  marginTop:
                    "20px",
                  overflowX:
                    "auto"
                }}
              >

                <table
                  style={{
                    width:
                      "100%",
                    borderCollapse:
                      "collapse"
                  }}
                >

                  <thead>

                    <tr>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "12px"
                        }}
                      >
                        Model
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "12px"
                        }}
                      >
                        Grounding
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "12px"
                        }}
                      >
                        Risk
                      </th>

                      <th
                        style={{
                          textAlign:
                            "left",
                          padding:
                            "12px"
                        }}
                      >
                        Claims
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {comparisonResults.map(
                      (result) => (

                        <tr
                          key={
                            result.name
                          }
                        >

                          <td
                            style={{
                              padding:
                                "12px",
                              borderTop:
                                "1px solid #e5e7eb"
                            }}
                          >
                            {result.name}
                          </td>

                          <td
                            style={{
                              padding:
                                "12px",
                              borderTop:
                                "1px solid #e5e7eb"
                            }}
                          >
                            {result.grounding_score ===
                            null
                              ? "ERROR"
                              : `${result.grounding_score}%`}
                          </td>

                          <td
                            style={{
                              padding:
                                "12px",
                              borderTop:
                                "1px solid #e5e7eb"
                            }}
                          >
                            {result.risk}
                          </td>

                          <td
                            style={{
                              padding:
                                "12px",
                              borderTop:
                                "1px solid #e5e7eb"
                            }}
                          >
                            {result.supported}
                            {" supported / "}
                            {result.unsupported}
                            {" unsupported"}
                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </section>

        )}

      </div>

    );

  }


  /* =========================================================
     SYSTEM PAGE
  ========================================================= */

  if (title === "System") {

    return (

      <div>

        <header className="topbar">

          <div>

            <p className="eyebrow">
              INSUREMATE
            </p>

            <h1>
              System
            </h1>

            <p className="subtitle">
              Live status of the InsureMate
              processing infrastructure.
            </p>

          </div>

          <button
            className="ask-button"
            onClick={loadSystemStatus}
            disabled={systemLoading}
          >
            {systemLoading
              ? "Checking..."
              : "↻ Refresh Status"}
          </button>

        </header>


        <section className="status-grid">

          <div className="status-card">

            <div className="card-label">
              FASTAPI
            </div>

            <div className="card-value">
              {systemStatus?.api
                ? "Online"
                : "Offline"}
            </div>

            <div className="card-status">
              {systemStatus?.api
                ? "● Connected"
                : "● Unavailable"}
            </div>

          </div>


          <div className="status-card">

            <div className="card-label">
              OLLAMA
            </div>

            <div className="card-value">
              {systemStatus?.ollama
                ? "Online"
                : "Offline"}
            </div>

            <div className="card-status">
              {systemStatus?.ollama
                ? "● Connected"
                : "● Unavailable"}
            </div>

          </div>


          <div className="status-card">

            <div className="card-label">
              KNOWLEDGE BASE
            </div>

            <div className="card-value">
              6 Documents
            </div>

            <div className="card-status">
              ● Indexed
            </div>

          </div>

        </section>


        <section className="documents-card">

          <div
            className="empty-answer"
          >

            <div className="empty-icon">
              ✓
            </div>

            <p>
              InsureMate infrastructure
              is connected.
            </p>

            <span>
              FastAPI, Ollama and the
              knowledge base are available.
            </span>

          </div>

        </section>

      </div>

    );

  }


  /* =========================================================
     FALLBACK
  ========================================================= */

  return (

    <div>

      <header className="topbar">

        <div>

          <p className="eyebrow">
            INSUREMATE
          </p>

          <h1>
            {title}
          </h1>

        </div>

      </header>

    </div>

  );

}



export default App;



