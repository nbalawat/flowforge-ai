<p align="center">
  <h1 align="center">&#9889; FlowForge AI</h1>
  <p align="center"><strong>Enterprise Agent Development Studio</strong></p>
  <p align="center">
    Design multi-agent workflows visually. Generate production-ready code across 6 frameworks.<br/>
    Test with real LLMs. Download and deploy.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT License" />
</p>

---

## Screenshots

### Welcome & Getting Started
<p align="center">
  <img src="docs/screenshots/01-welcome.png" alt="Welcome Screen" width="800" />
</p>
<p align="center"><em>Fresh canvas with guided onboarding — start from a template or describe your workflow to the AI Copilot</em></p>

### Template Gallery
<p align="center">
  <img src="docs/screenshots/02-template-gallery.png" alt="Template Gallery" width="800" />
</p>
<p align="center"><em>8 pre-built workflow templates from Beginner to Expert — with difficulty badges, feature tags, and one-click loading</em></p>

### Visual Workflow Canvas
<p align="center">
  <img src="docs/screenshots/03-complex-workflow-v2.png" alt="Complex Workflow" width="800" />
</p>
<p align="center"><em>Content Moderation Pipeline — agents, conditional routing ("Is Safe?"), HITL review, color-coded edges, state schema, and guidance bar</em></p>

### AI Copilot
<p align="center">
  <img src="docs/screenshots/05-ai-copilot.png" alt="AI Copilot" width="800" />
</p>
<p align="center"><em>Claude-powered copilot with quick actions — describe what you want in natural language and watch the canvas update</em></p>

### 5-Stage Certification Pipeline

**Step 1 — Choose a Framework**
<p align="center">
  <img src="docs/screenshots/08-framework-selection.png" alt="Framework Selection" width="800" />
</p>
<p align="center"><em>Select from 6 frameworks: LangGraph, Google ADK, Claude Agent SDK, CrewAI, AutoGen, AWS Strands</em></p>

**Step 2 — Code Generation**
<p align="center">
  <img src="docs/screenshots/09-code-generation.png" alt="Code Generation" width="800" />
</p>
<p align="center"><em>7 Python files generated for Google ADK — agents, tools, orchestrator, requirements, and test harness</em></p>

**Step 3 — Validation**
<p align="center">
  <img src="docs/screenshots/10-validation.png" alt="Validation" width="800" />
</p>
<p align="center"><em>6 automated validation checks: Schema, Referential Integrity, Graph Validity, Semantic, Framework Compatibility, Security Scan — all passed</em></p>

**Step 4 — Live LLM Test Execution**
<p align="center">
  <img src="docs/screenshots/12-test-passed.png" alt="Test Passed" width="800" />
</p>
<p align="center"><em>Real execution with Google ADK and Gemini — PASSED with structured execution trace showing agent hierarchy and responses</em></p>

**Step 5 — Certified & Download**
<p align="center">
  <img src="docs/screenshots/13-certified-download.png" alt="Certified Download" width="800" />
</p>
<p align="center"><em>Workflow Certified — summary with framework, files, validation results, and Download ZIP button for production-ready code</em></p>

### About & Documentation
<p align="center">
  <img src="docs/screenshots/06-about-page.png" alt="About Page" width="800" />
</p>
<p align="center"><em>Built-in documentation page with feature overview, requirements, and getting started guide</em></p>

---

## Key Features

| | Feature | Description |
|---|---|---|
| &#127912; | **Visual Canvas** | Drag-and-drop workflow builder powered by React Flow -- agents, tools, conditions, loops, parallel fan-out/fan-in, and human-in-the-loop gates |
| &#129302; | **AI Copilot** | Claude-powered natural language to workflow. Describe what you want; the copilot builds the canvas with multi-round tool use |
| &#128187; | **Multi-Framework Code Generation** | Generate real, executable Python code for LangGraph, Google ADK, Claude Agent SDK, CrewAI, AutoGen, and AWS Strands |
| &#128218; | **8 Pre-built Templates** | From Beginner to Expert -- Simple Chatbot, RAG Pipeline, Multi-Agent Research Team, Enterprise Support Escalation, and more |
| &#9989; | **5-Stage Certification Pipeline** | Framework selection, code generation, validation (schema + referential integrity + security), live LLM testing, and certified ZIP download |
| &#9000; | **Command Palette** | `Cmd+K` quick actions for navigating workflows, templates, and settings |
| &#128190; | **Project Management** | Save, load, rename, export/import JSON, undo/redo (50-level history) |
| &#127919; | **Prompt Playground** | Test agent prompts inline with real LLM execution before generating full projects |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (:3001)                     │
│         Next.js 15 · React Flow · Zustand · TS          │
├─────────────────────────────────────────────────────────┤
│                     Backend (:8010)                      │
│      FastAPI · Python · Anthropic SDK · Generators       │
├──────────────────┬──────────────────────────────────────┤
│  PostgreSQL (:5433) │          Redis (:6380)             │
│  Project persistence │       Caching layer               │
└──────────────────┴──────────────────────────────────────┘
```

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React Flow, Zustand, TypeScript |
| **Backend** | FastAPI, Python 3.11+, Anthropic SDK |
| **Database** | PostgreSQL 16 (project persistence) |
| **Cache** | Redis 7 |
| **IR Schema** | Framework-agnostic JSON intermediate representation |
| **Infrastructure** | Docker Compose (fully containerized) |

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- An [Anthropic API key](https://console.anthropic.com/) (for AI Copilot and LLM testing)
- Google API key (optional, for Google ADK execution)
- Git
- 4 GB+ RAM recommended
- Ports **3001** (frontend) and **8010** (backend) available

### 1. Clone the repository

```bash
git clone <repo-url>
cd next-gen-agentic-application-development/agentforge
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...          # optional, for Google ADK execution
```

### 3. Launch

```bash
docker compose up -d
```

### 4. Open the studio

Navigate to **[http://localhost:3001](http://localhost:3001)** in your browser.

The About / landing page is available at [http://localhost:3001/about](http://localhost:3001/about).

---

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | -- | Anthropic API key for AI Copilot and LLM test execution |
| `GOOGLE_API_KEY` | No | -- | Google API key for Google ADK execution engine |
| `DATABASE_URL` | No | `postgresql+asyncpg://postgres:postgres@postgres:5432/agentforge` | PostgreSQL connection string (set automatically by Docker Compose) |
| `REDIS_URL` | No | `redis://redis:6379/0` | Redis connection string (set automatically by Docker Compose) |
| `STORAGE_PATH` | No | `./generated` | Path for generated project artifacts |
| `DEBUG` | No | `true` | Enable debug mode |

---

## Supported Frameworks

| Framework | Provider | Code Generation Pattern | Status |
|---|---|---|---|
| **LangGraph** | LangChain | `StateGraph` with conditional edges | Available |
| **Google ADK** | Google / Vertex AI | `SequentialAgent` / `ParallelAgent` | Available |
| **Claude Agent SDK** | Anthropic | Agent with tool-use orchestration | Available |
| **CrewAI** | CrewAI | Crew with role-based agents | Coming Soon |
| **AutoGen** | Microsoft | Multi-agent conversation patterns | Coming Soon |
| **AWS Strands** | Amazon Web Services | Strands agent orchestration | Coming Soon |

Each generator produces a complete project structure including the main application file, `requirements.txt`, `Dockerfile`, `.env.example`, and a README.

---

## Workflow Templates

| Template | Difficulty | Agents | Nodes | Tools | Features | Description |
|---|---|---|---|---|---|---|
| Simple Chatbot | Beginner | 1 | 3 | 0 | -- | Single-agent chatbot for basic conversations |
| Customer Support Classifier | Beginner | 2 | 4 | 0 | -- | Sequential ticket classifier and resolver pipeline |
| RAG Pipeline | Intermediate | 3 | 5 | 1 | Tools | Query analysis, vector search, grounded response generation |
| Content Moderation | Intermediate | 2 | 6 | 0 | Conditions, HITL | Content safety analysis with conditional routing to human review |
| Multi-Agent Research Team | Advanced | 4 | 8 | 2 | Parallel, Tools | Parallel research execution feeding into a report writer |
| Sales Lead Qualification | Advanced | 5 | 8 | 2 | Conditions, Tools | Multi-stage lead processing with scoring and conditional routing |
| Automated Code Review | Expert | 4 | 8 | 2 | Conditions, Loops, Tools | Iterative review with static analysis, AI reviewer, and auto-fix loop |
| Enterprise Support Escalation | Expert | 6 | 10 | 3 | Conditions, HITL, Tools, Parallel | Full enterprise pipeline with urgency routing and multi-path resolution |

---

## Project Structure

```
agentforge/
├── frontend/                   # Next.js 15 application
│   └── src/
│       ├── app/                # Pages (studio, about, dashboard)
│       ├── components/         # React components
│       │   ├── canvas/         #   Visual workflow canvas
│       │   ├── copilot/        #   AI Copilot chat panel
│       │   ├── generation/     #   Code generation & test runner
│       │   ├── panels/         #   Properties panel
│       │   ├── editors/        #   Node editor modal
│       │   ├── templates/      #   Template gallery
│       │   └── common/         #   Header, command palette
│       └── lib/
│           ├── store/          #   Zustand state (canvasStore)
│           ├── ir/             #   IR type definitions
│           └── templates/      #   8 workflow template factories
├── backend/                    # FastAPI application
│   └── app/
│       ├── api/v1/             # REST endpoints
│       │   ├── copilot.py      #   AI Copilot conversations
│       │   ├── generation.py   #   Code generation
│       │   ├── execution.py    #   LLM test execution
│       │   ├── projects.py     #   Project CRUD
│       │   └── ir.py           #   IR validation
│       ├── core/
│       │   ├── copilot/        #   Copilot service, tools, prompts
│       │   ├── generators/     #   LangGraph, Google ADK, Claude SDK
│       │   ├── execution/      #   Sandboxed code runner
│       │   └── ir/             #   IR schema & validation
│       ├── enterprise/         #   Auth & audit (future)
│       └── db/                 #   Database models
├── infra/
│   ├── docker/                 # Dockerfiles (frontend, backend)
│   └── pulumi/                 # Infrastructure-as-code
└── docker-compose.yml          # Full-stack orchestration
```

---

## Development

### Running without Docker

**Backend:**

```bash
cd agentforge/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL and Redis locally, then:
export ANTHROPIC_API_KEY=sk-ant-...
export DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/agentforge
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**

```bash
cd agentforge/frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

The frontend runs at `http://localhost:3000` by default (or `3001` via Docker Compose).

### Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd+K` / `Ctrl+K` | Open command palette |
| `Cmd+Z` / `Ctrl+Z` | Undo |
| `Cmd+Shift+Z` / `Ctrl+Shift+Z` | Redo |
| `Cmd+S` / `Ctrl+S` | Save project |
| `Delete` / `Backspace` | Remove selected node |

---

## Roadmap

- [ ] CrewAI, AutoGen, and AWS Strands execution engines
- [ ] Real-time collaborative editing (multiplayer canvas)
- [ ] RBAC and SSO authentication
- [ ] Template marketplace (community-contributed workflows)
- [ ] CI/CD deployment generation (GitHub Actions, GitLab CI)
- [ ] MCP server integration for tool discovery
- [ ] Observability dashboard (OpenTelemetry traces and metrics)
- [ ] Version history and diff viewer for IR documents

---

## Contributing

Contributions are welcome! To get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes and add tests where applicable
4. Run linting and tests before committing
5. Open a pull request with a clear description of the change

Please follow the existing code style and conventions. For larger changes, open an issue first to discuss the approach.

---

## License

This project is licensed under the [MIT License](LICENSE).
