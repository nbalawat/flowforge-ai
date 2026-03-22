"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Intersection-observer fade-in hook                                 */
/* ------------------------------------------------------------------ */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("revealed");
          io.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal-section ${className}`}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tiny SVG icons (no external deps)                                  */
/* ------------------------------------------------------------------ */
const icons = {
  canvas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <line x1="10" y1="6.5" x2="14" y2="6.5" strokeDasharray="2 2" />
      <line x1="6.5" y1="10" x2="6.5" y2="14" strokeDasharray="2 2" />
    </svg>
  ),
  copilot: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
      <path d="M12 2a7 7 0 0 1 7 7v1a4 4 0 0 1-2 3.46V18a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-4.54A4 4 0 0 1 5 10V9a7 7 0 0 1 7-7z" />
      <circle cx="9.5" cy="10" r="1" fill="currentColor" />
      <circle cx="14.5" cy="10" r="1" fill="currentColor" />
      <path d="M9.5 14.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
      <line x1="14" y1="4" x2="10" y2="20" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8">
      <path d="M12 2l8 4v5c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.49.5.09.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 inline ml-1">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 inline text-green-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 inline text-yellow-400">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const capabilities = [
  {
    icon: icons.canvas,
    title: "Visual Canvas",
    items: [
      "Drag-and-drop workflow designer",
      "Agent nodes, tool nodes, conditions, loops, parallel fan-out/fan-in",
      "Human-in-the-loop gates",
      "State schema editor with reducers",
      "Auto-layout and minimap",
      "8 pre-built templates (Beginner to Expert)",
    ],
  },
  {
    icon: icons.copilot,
    title: "AI Copilot",
    items: [
      "Describe your workflow in natural language",
      "Claude-powered copilot builds the canvas for you",
      "Multi-round tool-use: adds agents, tools, edges automatically",
      'Quick actions: "Build a pipeline", "Add HITL", "Suggest improvements"',
      "Refine prompts and architecture conversationally",
    ],
  },
  {
    icon: icons.code,
    title: "Multi-Framework Code Generation",
    items: [
      "Generates real, executable Python code",
      "6 frameworks: LangGraph, Google ADK, Claude Agent SDK, CrewAI, AutoGen, AWS Strands",
      "Framework-specific patterns (StateGraph, SequentialAgent, etc.)",
      "Proper project structure with requirements.txt, Dockerfile, .env",
    ],
  },
  {
    icon: icons.shield,
    title: "5-Stage Certification Pipeline",
    items: [
      "Stage 1: Choose framework",
      "Stage 2: Generate code (browse generated files)",
      "Stage 3: Validate (schema, referential integrity, graph, semantic, compatibility, security)",
      "Stage 4: Test with real LLM (live execution with Claude API)",
      "Stage 5: Certified \u2192 Download ZIP",
    ],
  },
];

const steps = [
  { num: "01", title: "Design", desc: "Build your workflow on the canvas or let AI Copilot do it" },
  { num: "02", title: "Choose", desc: "Select a target framework from 6 supported options" },
  { num: "03", title: "Certify", desc: "Generate \u2192 Validate \u2192 Test \u2192 Certify" },
  { num: "04", title: "Deploy", desc: "Download production-ready code as a ZIP" },
];

const frameworks = [
  { name: "LangGraph", emoji: "\u26d3\ufe0f", desc: "LangChain", gen: "StateGraph with conditional edges", status: "available" as const },
  { name: "Google ADK", emoji: "\ud83c\udf10", desc: "Vertex AI", gen: "SequentialAgent / ParallelAgent", status: "available" as const },
  { name: "Claude Agent SDK", emoji: "\ud83e\udde0", desc: "Anthropic", gen: "Agent with tool-use orchestration", status: "available" as const },
  { name: "CrewAI", emoji: "\ud83d\ude80", desc: "Crew framework", gen: "Crew with role-based agents", status: "soon" as const },
  { name: "AutoGen", emoji: "\ud83d\udd27", desc: "Microsoft", gen: "Multi-agent conversation patterns", status: "soon" as const },
  { name: "AWS Strands", emoji: "\u2601\ufe0f", desc: "Amazon Web Services", gen: "Strands agent orchestration", status: "soon" as const },
];

const templates = [
  { name: "Simple Chatbot", level: "Beginner" },
  { name: "Customer Support Classifier", level: "Beginner" },
  { name: "RAG Pipeline", level: "Intermediate" },
  { name: "Content Moderation", level: "Intermediate" },
  { name: "Multi-Agent Research Team", level: "Advanced" },
  { name: "Sales Lead Qualification", level: "Advanced" },
  { name: "Automated Code Review", level: "Expert" },
  { name: "Enterprise Support Escalation", level: "Expert" },
];

const levelColors: Record<string, string> = {
  Beginner: "bg-green-500/20 text-green-300 border-green-500/30",
  Intermediate: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Advanced: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Expert: "bg-red-500/20 text-red-300 border-red-500/30",
};

const archItems = [
  { label: "Frontend", value: "Next.js 15 + React Flow + Zustand" },
  { label: "Backend", value: "FastAPI + Python" },
  { label: "IR Schema", value: "Framework-agnostic JSON" },
  { label: "Execution", value: "Docker-based sandboxed code execution" },
  { label: "Database", value: "PostgreSQL + Redis" },
  { label: "Deployment", value: "Docker Compose (all containerized)" },
];

const prereqs = [
  { icon: "\ud83d\udc33", label: "Docker & Docker Compose" },
  { icon: "\ud83d\udd11", label: "Anthropic API Key" },
  { icon: "\ud83d\udcc1", label: "Git" },
  { icon: "\ud83d\udcbe", label: "4 GB+ RAM recommended" },
  { icon: "\ud83d\udd0c", label: "Ports 3001 (frontend) & 8010 (backend)" },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-hidden">
      <style>{`
        /* reveal animations */
        .reveal-section {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s cubic-bezier(.16,1,.3,1), transform 0.7s cubic-bezier(.16,1,.3,1);
        }
        .reveal-section.revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* hero glow */
        .hero-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          filter: blur(120px);
          opacity: 0.18;
          pointer-events: none;
        }

        /* gradient text */
        .gradient-text {
          background: linear-gradient(135deg, #e94560 0%, #c77dff 50%, #7b2ff7 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* card hover lift */
        .card-hover {
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(233, 69, 96, 0.08);
          border-color: rgba(233, 69, 96, 0.4);
        }

        /* code block */
        .code-block {
          background: #0d0d1a;
          border: 1px solid #2a2a4a;
          border-radius: 12px;
          font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
        }

        /* step connector line */
        .step-line {
          position: absolute;
          top: 24px;
          left: 24px;
          right: -24px;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), transparent);
        }
      `}</style>

      {/* ============================================================ */}
      {/*  NAV BAR                                                      */}
      {/* ============================================================ */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[var(--bg-primary)]/80 border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/about" className="text-lg font-bold tracking-tight">
            <span className="gradient-text">AgentForge</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">Features</a>
            <a href="#frameworks" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">Frameworks</a>
            <a href="#quickstart" className="text-sm text-[var(--text-secondary)] hover:text-white transition-colors">Get Started</a>
            <Link
              href="/"
              className="ml-2 px-4 py-1.5 text-sm font-medium rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all"
            >
              Open Studio
            </Link>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/*  HERO                                                         */}
      {/* ============================================================ */}
      <section className="relative pt-32 pb-24 flex flex-col items-center text-center px-6 overflow-hidden">
        {/* glow orbs */}
        <div className="hero-glow bg-[#e94560] -top-40 -left-40" style={{ position: "absolute" }} />
        <div className="hero-glow bg-[#7b2ff7] -bottom-20 -right-40" style={{ position: "absolute" }} />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-block px-4 py-1 mb-6 text-xs font-semibold uppercase tracking-widest rounded-full border border-[var(--accent)]/40 text-[var(--accent)] bg-[var(--accent)]/5">
            Enterprise Agent Development Studio
          </div>

          <h1 className="text-6xl sm:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            <span className="gradient-text">AgentForge</span>
          </h1>

          <p className="text-lg sm:text-xl text-[var(--text-secondary)] leading-relaxed max-w-2xl mx-auto mb-10">
            Design multi-agent workflows visually. Generate production code in 6 frameworks.
            Test with real LLMs. Download and deploy.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/"
              className="px-6 py-3 rounded-lg font-semibold text-sm bg-[var(--accent)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--accent)]/20"
            >
              Open Studio {icons.arrow}
            </Link>
            <a
              href="#"
              className="px-6 py-3 rounded-lg font-semibold text-sm border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-white transition-all flex items-center gap-2"
            >
              {icons.github} View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  KEY CAPABILITIES                                             */}
      {/* ============================================================ */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-center mb-2">What It Does</h2>
          <p className="text-center text-[var(--text-secondary)] mb-14 max-w-xl mx-auto">
            Four powerful capabilities that take you from idea to production-ready agent code.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6">
          {capabilities.map((cap) => (
            <Reveal key={cap.title}>
              <div className="card-hover rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 h-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                    {cap.icon}
                  </div>
                  <h3 className="text-lg font-semibold">{cap.title}</h3>
                </div>
                <ul className="space-y-2">
                  {cap.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  HOW IT WORKS                                                 */}
      {/* ============================================================ */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-center mb-2">How It Works</h2>
          <p className="text-center text-[var(--text-secondary)] mb-14 max-w-md mx-auto">
            Four steps from idea to deployed agent.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <Reveal key={s.num}>
              <div className="relative">
                <div className="text-5xl font-black gradient-text opacity-30 mb-2">{s.num}</div>
                <h3 className="text-lg font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block step-line" />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  ARCHITECTURE                                                 */}
      {/* ============================================================ */}
      <section className="py-20 border-t border-b border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <h2 className="text-3xl font-bold text-center mb-2">Architecture</h2>
            <p className="text-center text-[var(--text-secondary)] mb-14 max-w-md mx-auto">
              Modern, containerized stack built for reliability.
            </p>
          </Reveal>

          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {archItems.map((a) => (
                <div
                  key={a.label}
                  className="card-hover rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4"
                >
                  <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-semibold mb-1">
                    {a.label}
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">{a.value}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FRAMEWORKS                                                   */}
      {/* ============================================================ */}
      <section id="frameworks" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-center mb-2">Supported Frameworks</h2>
          <p className="text-center text-[var(--text-secondary)] mb-14 max-w-lg mx-auto">
            Generate production code targeting 6 major agent frameworks.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {frameworks.map((fw) => (
            <Reveal key={fw.name}>
              <div className="card-hover rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{fw.emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{fw.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{fw.desc}</div>
                    </div>
                  </div>
                  {fw.status === "available" ? icons.check : icons.clock}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{fw.gen}</p>
                <div className="mt-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      fw.status === "available"
                        ? "bg-green-500/15 text-green-300"
                        : "bg-yellow-500/15 text-yellow-300"
                    }`}
                  >
                    {fw.status === "available" ? "Available" : "Coming Soon"}
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TEMPLATE GALLERY                                             */}
      {/* ============================================================ */}
      <section className="py-20 border-t border-[var(--border-color)]">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <h2 className="text-3xl font-bold text-center mb-2">Template Gallery</h2>
            <p className="text-center text-[var(--text-secondary)] mb-14 max-w-lg mx-auto">
              Start fast with 8 pre-built workflow templates, from beginner to expert.
            </p>
          </Reveal>

          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
              {templates.map((t) => (
                <div
                  key={t.name}
                  className="card-hover rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
                >
                  <div className="text-sm font-medium mb-2">{t.name}</div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${levelColors[t.level]}`}
                  >
                    {t.level}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  GETTING STARTED                                              */}
      {/* ============================================================ */}
      <section id="quickstart" className="max-w-6xl mx-auto px-6 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-center mb-2">Get Started</h2>
          <p className="text-center text-[var(--text-secondary)] mb-14 max-w-md mx-auto">
            Up and running in under 5 minutes.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-10 max-w-5xl mx-auto">
          {/* Prerequisites */}
          <Reveal>
            <div>
              <h3 className="text-lg font-semibold mb-5">Prerequisites</h3>
              <div className="space-y-3">
                {prereqs.map((p) => (
                  <div
                    key={p.label}
                    className="flex items-center gap-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3"
                  >
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-sm">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Quick Start */}
          <Reveal>
            <div>
              <h3 className="text-lg font-semibold mb-5">Quick Start</h3>
              <div className="code-block p-5 text-sm leading-7 overflow-x-auto">
                <div className="text-[var(--text-secondary)]"># Clone the repository</div>
                <div><span className="text-[var(--accent)]">$</span> git clone &lt;repo-url&gt;</div>
                <div><span className="text-[var(--accent)]">$</span> cd agentforge</div>
                <div className="mt-3 text-[var(--text-secondary)]"># Configure environment</div>
                <div><span className="text-[var(--accent)]">$</span> cp .env.example .env</div>
                <div className="text-[var(--text-secondary)] text-xs pl-4"># Add your ANTHROPIC_API_KEY</div>
                <div className="mt-3 text-[var(--text-secondary)]"># Launch</div>
                <div><span className="text-[var(--accent)]">$</span> docker compose up -d</div>
                <div><span className="text-[var(--accent)]">$</span> open http://localhost:3001</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER                                                       */}
      {/* ============================================================ */}
      <footer className="border-t border-[var(--border-color)] py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold gradient-text">AgentForge</span>
              <span className="text-xs text-[var(--text-secondary)] border border-[var(--border-color)] rounded-full px-3 py-0.5">
                Built with Claude
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
              <Link href="/" className="hover:text-white transition-colors">Studio</Link>
              <a href="#" className="hover:text-white transition-colors">GitHub</a>
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
            </div>
          </div>

          <div className="mt-8 text-center text-xs text-[var(--text-secondary)]">
            AgentForge is open source. Design, generate, and deploy agentic workflows with confidence.
          </div>
        </div>
      </footer>
    </div>
  );
}
