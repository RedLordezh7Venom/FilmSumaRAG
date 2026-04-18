<div align="center">
  <img src="https://raw.githubusercontent.com/lfnovo/open-notebook/main/public/logo.png" width="120" height="120" alt="Sum A Film Logo">
  
  # 🎞️ Sum A Film
  
  **The ultimate agentic RAG platform for cinematic deep dives and narrative analysis.**

  [![Star on GitHub](https://img.shields.io/github/stars/RedLordezh7Venom/FilmSumaRAG?style=for-the-badge&color=white&logo=github)](https://github.com/RedLordezh7Venom/FilmSumaRAG)
  [![License](https://img.shields.io/github/license/RedLordezh7Venom/FilmSumaRAG?style=for-the-badge&color=white)](LICENSE.txt)
  [![Made with Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
  [![Powered by FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)

  [Demo Video](#-demo) • [Features](#-key-features) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Setup](#-getting-started) • [Contributing](#-contributing)
</div>

---

## 📽️ The Vision

Sum A Film isn't just another movie database. It's an **Agentic AI Playground** designed for film buffs, researchers, and casual viewers alike. By combining state-of-the-art **Retrieval-Augmented Generation (RAG)** with multi-agent orchestration, Sum A Film allows you to dissect narratives, compare cinematic structures across multiple films, and uncover hidden subtexts with the help of specialized AI personas.

> "Film is a reflection of society, and Sum A Film is the magnifying glass." — *The Architect*

---

## 📺 Demo

<!-- PROJECT_DEMO_VIDEO -->
<div align="center">
  <h3>🎞️ Platform Walkthrough</h3>
  <a href="https://www.youtube.com/watch?v=qntnLEh5fX4">
    <img src="https://img.youtube.com/vi/qntnLEh5fX4/maxresdefault.jpg" width="100%" style="max-width: 800px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" alt="FilmSumaRAG Demo">
  </a>
  <p><i>Click the image above to watch the deep-dive walkthrough on YouTube.</i></p>
</div>

---

## ✨ Key Features

### 🧠 Agentic Deep Dives
Engage with specialized AI personas like **The Critic**, **The Philosopher**, and **The Scene Creator**. Each persona utilizes a unique retrieval strategy to provide insights tailored to their specific expertise.

### 🔍 Comparative RAG
Analyze and compare multiple films in a single session. Our RAG engine cross-references vector embeddings from different cinematic titles to highlight structural parallels and thematic contrasts.

### 📚 Intelligent Research Crawler
Automated agents crawl the web (including YouTube) to find high-quality video essays and archival critiques, enriching the context available for the RAG pipeline.

### 🎞️ Citation Highlighting
Every insight is backed by evidence. The platform highlights exact "Scene Evidence" from the transcript archive, complete with source footnotes for unverifiable claims.

---

## 📸 Screenshots

<div align="center">
  <table border="0">
    <tr>
      <td><img src="https://via.placeholder.com/400x225/0b0f17/ffffff?text=Landing+Page+UI" width="400" alt="Landing Page"></td>
      <td><img src="https://via.placeholder.com/400x225/0b0f17/ffffff?text=Deep+Dive+Chat+UI" width="400" alt="Deep Dive UI"></td>
    </tr>
    <tr>
      <td><img src="https://via.placeholder.com/400x225/0b0f17/ffffff?text=Multi-Movie+Comparison" width="400" alt="Comparison UI"></td>
      <td><img src="https://via.placeholder.com/400x225/0b0f17/ffffff?text=Video+Essay+Crawler" width="400" alt="Crawler UI"></td>
    </tr>
  </table>
</div>

---

## 🛠️ Tech Stack

Sum A Film is built with modern, high-performance technologies:

- **Frontend**: [Next.js 15+](https://nextjs.org) (App Router), [Tailwind CSS](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion/)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com) (Python), [Uvicorn](https://www.uvicorn.org/)
- **AI/LLM**: [LangGraph](https://www.langchain.com/langgraph) (Agent Orchestration), [LangChain](https://www.langchain.com/), [OpenAI/Groq](https://openai.com/)
- **Vector DB**: [ChromaDB](https://www.trychroma.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [SQLAlchemy](https://www.sqlalchemy.org/))
- **Auth**: [Clerk](https://clerk.com/)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- TMDB API Key
- OpenAI or Groq API Key

### 1. Clone the repository
```bash
git clone https://github.com/RedLordezh7Venom/FilmSumaRAG.git
cd FilmSumaRAG
```

### 2. Setup Backend
```bash
cd backend_fastapi
pip install -r requirements.txt
cp .env.example .env # Update with your API keys
python main.py
```

### 3. Setup Frontend
```bash
cd ../frontend_next
npm install
cp .env.example .env.local # Update with your Clerk & TMDB keys
npm run dev
```

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.

---

## 📜 License

Distributed under the MIT License. See `LICENSE.txt` for more information.

---

<div align="center">
  <p>Built with ❤️ for the love of Cinema.</p>
  <p><b>Sum A Film.</b> Analyze. Discover. Immerse.</p>
</div>
