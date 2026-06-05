import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "./api/client";

type HealthResponse = {
  status: string;
  service: string;
};

const navItems = [
  "Dashboard",
  "RedBook Conversation",
  "Accounts",
  "Personas",
  "Media",
  "Drafts",
  "Compliance",
  "Schedule",
  "Publish Records",
  "Settings"
];

const phaseCards = [
  { label: "API health", value: "Ready", tone: "green" },
  { label: "Publishing mode", value: "Manual only", tone: "blue" },
  { label: "Automation boundary", value: "Protected", tone: "amber" }
];

function App() {
  const [activePage, setActivePage] = useState(navItems[0]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState("Checking API health...");

  useEffect(() => {
    apiRequest<HealthResponse>("/health")
      .then((response) => {
        setHealth(response);
        setStatusMessage("Local API is reachable.");
      })
      .catch(() => {
        setStatusMessage("API is not running yet. Start FastAPI or configure a remote URL.");
      });
  }, []);

  const pageSummary = useMemo(() => {
    if (activePage === "Dashboard") {
      return "Phase 0 foundation status for the compliant operations console.";
    }

    if (activePage === "Settings") {
      return "Configure API connection details when the next stage adds persisted settings.";
    }

    if (activePage === "RedBook Conversation") {
      return "Create a guided RedBook content conversation for compliant draft preparation.";
    }

    return `${activePage} workspace placeholder for the next MVP stage.`;
  }, [activePage]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <strong>RedBook</strong>
            <span>Compliance Ops</span>
          </div>
        </div>

        <button
          className="create-conversation-button"
          onClick={() => setActivePage("RedBook Conversation")}
          type="button"
        >
          <span className="create-conversation-icon" aria-hidden="true">
            +
          </span>
          <span>
            <strong>创建对话</strong>
            <small>RedBook content chat</small>
          </span>
        </button>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={item === activePage ? "nav-item active" : "nav-item"}
              key={item}
              onClick={() => setActivePage(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phase 0 foundation</p>
            <h1>{activePage}</h1>
            <p>{pageSummary}</p>
          </div>
          <span className={health ? "status-pill online" : "status-pill attention"}>
            {health ? `${health.service}: ${health.status}` : "API pending"}
          </span>
        </header>

        {activePage === "Dashboard" ? (
          <section className="dashboard-grid">
            {phaseCards.map((card) => (
              <article className="metric-card" key={card.label}>
                <span className={`badge ${card.tone}`}>{card.label}</span>
                <strong>{card.value}</strong>
              </article>
            ))}
            <article className="panel wide">
              <div>
                <h2>System Readiness</h2>
                <p>{statusMessage}</p>
              </div>
              <div className="checklist">
                <span>FastAPI health endpoint</span>
                <span>Electron React shell</span>
                <span>Manual publishing compliance posture</span>
              </div>
            </article>
          </section>
        ) : (
          <section className="panel workspace-panel">
            <div>
              <span className="badge blue">Coming next</span>
              <h2>{activePage}</h2>
              <p>
                This phase establishes the running desktop surface. Data workflows will be added
                incrementally with reviewed drafts, reminders, and manual publishing helpers only.
              </p>
            </div>
            <div className="empty-state">
              <strong>No records yet</strong>
              <span>
                {activePage === "RedBook Conversation"
                  ? "Click 创建对话 to prepare a new compliant content session."
                  : "Phase 0 keeps this area intentionally empty."}
              </span>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
