# 🛡️ InsureMate

An AI-powered insurance policy assistant that helps users understand complex insurance documents through natural language conversations.

InsureMate uses a **Multi-Model AI Pipeline** combined with **Retrieval-Augmented Generation (RAG)** to retrieve relevant policy information, generate grounded answers, and validate them before returning a response.

---

## 🚀 Features

- 📄 Upload and process insurance policy documents
- 🔍 RAG-based semantic search for relevant policy information
- 💬 Ask questions in natural language
- 🤖 Multi-model AI pipeline
- 🧠 Automatic question complexity classification
- ⚡ Simple questions handled by **Qwen 2.5**
- 🔬 Complex questions handled by **CodeLlama**
- ✅ Answer validation using **Phi-3 Mini**
- 🛡️ Grounded responses based on retrieved policy evidence
- 🔄 Support for follow-up questions and conversational interaction
- 🐳 Fully containerized using Docker

---

## 🧠 Multi-Model Architecture

InsureMate follows a multi-stage AI pipeline:

```text
User Question
      │
      ▼
┌─────────────────────┐
│   RAG Retrieval     │
│ Retrieve relevant   │
│ insurance evidence  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Qwen 2.5        │
│ Question Complexity │
│ Classification      │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
 SIMPLE       COMPLEX
     │           │
     ▼           ▼
┌─────────┐  ┌──────────────┐
│ Qwen    │  │  CodeLlama   │
│ 2.5     │  │     7B       │
└────┬────┘  └──────┬───────┘
     │              │
     └──────┬───────┘
            ▼
┌─────────────────────┐
│    Phi-3 Mini       │
│ Grounding Validation│
└──────────┬──────────┘
           │
           ▼
      Final Answer

```
## 🤖 Models Used

| Model | Purpose |
|-------|---------|
| **Qwen 2.5 1.5B** | Analyzes question complexity and generates answers for simple queries |
| **CodeLlama 7B Instruct** | Handles complex insurance policy questions and generates detailed responses |
| **Phi-3 Mini** | Validates whether generated answers are grounded in the retrieved policy evidence |
