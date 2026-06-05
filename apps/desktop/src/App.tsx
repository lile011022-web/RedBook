import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import {
  apiRequest,
  clearToken,
  getApiBaseUrl,
  getToken,
  setApiBaseUrl,
  setToken
} from "./api/client";

type HealthResponse = {
  status: string;
  service: string;
};

type TokenResponse = {
  access_token: string;
  token_type: string;
};

type Account = {
  id: string;
  account_id: string;
  display_name: string;
  status: string;
  health_score: number;
  created_at: string;
};

type Persona = {
  id: string;
  account_id: string;
  positioning: string;
  content_direction: string;
  tone: string;
  disabled_words: string[];
  publish_frequency: string;
  created_at: string;
};

type Draft = {
  id: string;
  account_id: string;
  title: string;
  body: string;
  tags: string[];
  cover_text: string;
  source: string;
  review_status: string;
  compliance_status: string;
  created_at: string;
};

type PublishTask = {
  id: string;
  account_id: string;
  draft_id: string;
  scheduled_at: string;
  status: string;
  created_at: string;
};

type RiskLog = {
  id: string;
  account_id: string | null;
  risk_type: string;
  severity: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};

type PersonaForm = {
  positioning: string;
  content_direction: string;
  tone: string;
  disabled_words: string;
  publish_frequency: string;
};

const navItems = ["Dashboard", "Accounts", "Personas", "Drafts", "Schedule", "Compliance", "Settings"];

const emptyPersonaForm: PersonaForm = {
  positioning: "",
  content_direction: "",
  tone: "",
  disabled_words: "",
  publish_frequency: ""
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function badgeTone(status: string) {
  if (["approved", "active", "scheduled", "reviewed"].includes(status)) {
    return "green";
  }
  if (["needs_review", "blocked", "warning"].includes(status)) {
    return "amber";
  }
  if (["rejected", "failed"].includes(status)) {
    return "red";
  }
  return "blue";
}

function tagList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function AuthScreen({
  apiBaseUrl,
  error,
  isBusy,
  onApiBaseUrlChange,
  onSubmit
}: {
  apiBaseUrl: string;
  error: string;
  isBusy: boolean;
  onApiBaseUrlChange: (value: string) => void;
  onSubmit: (mode: "login" | "register", email: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("operator@example.com");
  const [password, setPassword] = useState("password123");

  function submit(event: FormEvent) {
    event.preventDefault();
    void onSubmit(mode, email, password);
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">R</div>
          <div>
            <strong>RedBook</strong>
            <span>Compliance Ops</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">Phase 5 workspace</p>
          <h1>Sign in to operate manual publishing workflows.</h1>
          <p className="muted">
            Connect to the FastAPI backend, review AI drafts, and schedule only human-approved
            content.
          </p>
        </div>
        {error ? <div className="alert">{error}</div> : null}
        <form className="form-grid" onSubmit={submit}>
          <label>
            API base URL
            <input value={apiBaseUrl} onChange={(event) => onApiBaseUrlChange(event.target.value)} />
          </label>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>
          <div className="segmented">
            <button
              className={mode === "login" ? "selected" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={mode === "register" ? "selected" : ""}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>
          <button className="primary-button" disabled={isBusy} type="submit">
            {isBusy ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App() {
  const [activePage, setActivePage] = useState(navItems[0]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getToken()));
  const [apiBaseUrl, setApiBaseUrlState] = useState(getApiBaseUrl());
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [publishTasks, setPublishTasks] = useState<PublishTask[]>([]);
  const [riskLogs, setRiskLogs] = useState<RiskLog[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [personaForm, setPersonaForm] = useState<PersonaForm>(emptyPersonaForm);
  const [draftForm, setDraftForm] = useState({
    title: "",
    body: "",
    tags: "",
    cover_text: "",
    topic: ""
  });
  const [scheduleForm, setScheduleForm] = useState({
    draft_id: "",
    scheduled_at: ""
  });

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.account_id === selectedAccountId) || null,
    [accounts, selectedAccountId]
  );

  const approvedDrafts = useMemo(
    () => drafts.filter((draft) => draft.review_status === "approved"),
    [drafts]
  );

  const loadHealth = useCallback(async () => {
    try {
      const response = await apiRequest<HealthResponse>("/health");
      setHealth(response);
    } catch {
      setHealth(null);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!getToken()) {
      return;
    }
    try {
      const [accountList, draftList, taskList, riskList] = await Promise.all([
        apiRequest<Account[]>("/accounts"),
        apiRequest<Draft[]>("/drafts"),
        apiRequest<PublishTask[]>("/publish-tasks"),
        apiRequest<RiskLog[]>("/risk-logs")
      ]);
      setAccounts(accountList);
      setDrafts(draftList);
      setPublishTasks(taskList);
      setRiskLogs(riskList);
      if (!selectedAccountId && accountList[0]) {
        setSelectedAccountId(accountList[0].account_id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load records.");
    }
  }, [selectedAccountId]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadData();
    }
  }, [isAuthenticated, loadData]);

  useEffect(() => {
    if (!selectedAccountId || !isAuthenticated) {
      setPersonaForm(emptyPersonaForm);
      return;
    }

    apiRequest<Persona>(`/accounts/${selectedAccountId}/persona`)
      .then((persona) => {
        setPersonaForm({
          positioning: persona.positioning,
          content_direction: persona.content_direction,
          tone: persona.tone,
          disabled_words: persona.disabled_words.join(", "),
          publish_frequency: persona.publish_frequency
        });
      })
      .catch(() => setPersonaForm(emptyPersonaForm));
  }, [isAuthenticated, selectedAccountId]);

  function updateApiBaseUrl(value: string) {
    setApiBaseUrlState(value);
    setApiBaseUrl(value);
  }

  async function handleAuth(mode: "login" | "register", email: string, password: string) {
    setError("");
    setIsBusy(true);
    try {
      if (mode === "register") {
        await apiRequest<{ id: string; email: string }>("/auth/register", {
          body: JSON.stringify({ email, password }),
          method: "POST"
        });
      }
      const token = await apiRequest<TokenResponse>("/auth/login", {
        body: JSON.stringify({ email, password }),
        method: "POST"
      });
      setToken(token.access_token);
      setIsAuthenticated(true);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Authentication failed.");
    } finally {
      setIsBusy(false);
    }
  }

  async function runMutation(action: () => Promise<void>) {
    setError("");
    setIsBusy(true);
    try {
      await action();
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Request failed.");
    } finally {
      setIsBusy(false);
    }
  }

  function logout() {
    clearToken();
    setIsAuthenticated(false);
    setAccounts([]);
    setDrafts([]);
    setPublishTasks([]);
    setRiskLogs([]);
    setSelectedAccountId("");
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        apiBaseUrl={apiBaseUrl}
        error={error}
        isBusy={isBusy}
        onApiBaseUrlChange={updateApiBaseUrl}
        onSubmit={handleAuth}
      />
    );
  }

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
            <p className="eyebrow">Phase 5 real data</p>
            <h1>{activePage}</h1>
            <p>
              Manual publishing operations connected to FastAPI. No platform automation is built
              into this workspace.
            </p>
          </div>
          <div className="topbar-actions">
            <span className={health ? "status-pill online" : "status-pill attention"}>
              {health ? `${health.service}: ${health.status}` : "API pending"}
            </span>
            <button className="quiet-button" onClick={logout} type="button">
              Logout
            </button>
          </div>
        </header>

        {error ? <div className="alert">{error}</div> : null}

        {activePage === "Dashboard" ? (
          <Dashboard
            accounts={accounts}
            drafts={drafts}
            publishTasks={publishTasks}
            riskLogs={riskLogs}
          />
        ) : null}
        {activePage === "Accounts" ? (
          <AccountsPage
            accountName={accountName}
            accounts={accounts}
            isBusy={isBusy}
            onAccountNameChange={setAccountName}
            onCreate={() =>
              runMutation(async () => {
                await apiRequest<Account>("/accounts", {
                  body: JSON.stringify({ display_name: accountName }),
                  method: "POST"
                });
                setAccountName("");
              })
            }
          />
        ) : null}
        {activePage === "Personas" ? (
          <PersonasPage
            accounts={accounts}
            form={personaForm}
            isBusy={isBusy}
            selectedAccountId={selectedAccountId}
            onChange={setPersonaForm}
            onSelect={setSelectedAccountId}
            onSubmit={() =>
              runMutation(async () => {
                await apiRequest<Persona>(`/accounts/${selectedAccountId}/persona`, {
                  body: JSON.stringify({
                    ...personaForm,
                    disabled_words: tagList(personaForm.disabled_words)
                  }),
                  method: "PUT"
                });
              })
            }
          />
        ) : null}
        {activePage === "Drafts" ? (
          <DraftsPage
            accounts={accounts}
            drafts={drafts}
            form={draftForm}
            isBusy={isBusy}
            selectedAccountId={selectedAccountId}
            onChange={setDraftForm}
            onReview={(draftId, reviewStatus) =>
              runMutation(async () => {
                await apiRequest<Draft>(`/drafts/${draftId}/review`, {
                  body: JSON.stringify({ review_status: reviewStatus }),
                  method: "PATCH"
                });
              })
            }
            onSelect={setSelectedAccountId}
            onSubmitManual={() =>
              runMutation(async () => {
                await apiRequest<Draft>("/drafts", {
                  body: JSON.stringify({
                    account_id: selectedAccountId,
                    title: draftForm.title,
                    body: draftForm.body,
                    tags: tagList(draftForm.tags),
                    cover_text: draftForm.cover_text,
                    source: "manual"
                  }),
                  method: "POST"
                });
                setDraftForm({ title: "", body: "", tags: "", cover_text: "", topic: "" });
              })
            }
            onSubmitAi={() =>
              runMutation(async () => {
                await apiRequest<Draft>("/ai/generate-draft", {
                  body: JSON.stringify({ account_id: selectedAccountId, topic: draftForm.topic }),
                  method: "POST"
                });
                setDraftForm((current) => ({ ...current, topic: "" }));
              })
            }
          />
        ) : null}
        {activePage === "Schedule" ? (
          <SchedulePage
            accounts={accounts}
            approvedDrafts={approvedDrafts}
            form={scheduleForm}
            isBusy={isBusy}
            publishTasks={publishTasks}
            onChange={setScheduleForm}
            onSubmit={() =>
              runMutation(async () => {
                const draft = drafts.find((item) => item.id === scheduleForm.draft_id);
                if (!draft) {
                  throw new Error("Choose an approved draft before scheduling.");
                }
                await apiRequest<PublishTask>("/publish-tasks", {
                  body: JSON.stringify({
                    account_id: draft.account_id,
                    draft_id: draft.id,
                    scheduled_at: new Date(scheduleForm.scheduled_at).toISOString()
                  }),
                  method: "POST"
                });
                setScheduleForm({ draft_id: "", scheduled_at: "" });
              })
            }
          />
        ) : null}
        {activePage === "Compliance" ? <CompliancePage riskLogs={riskLogs} /> : null}
        {activePage === "Settings" ? (
          <SettingsPage
            apiBaseUrl={apiBaseUrl}
            health={health}
            onApiBaseUrlChange={updateApiBaseUrl}
            onRefresh={() => {
              void loadHealth();
              void loadData();
            }}
          />
        ) : null}
      </main>
    </div>
  );
}

function Dashboard({
  accounts,
  drafts,
  publishTasks,
  riskLogs
}: {
  accounts: Account[];
  drafts: Draft[];
  publishTasks: PublishTask[];
  riskLogs: RiskLog[];
}) {
  const pendingDrafts = drafts.filter((draft) => draft.review_status === "needs_review").length;
  return (
    <section className="dashboard-grid">
      <Metric label="Accounts" tone="green" value={String(accounts.length)} />
      <Metric label="Drafts pending review" tone="amber" value={String(pendingDrafts)} />
      <Metric label="Scheduled tasks" tone="blue" value={String(publishTasks.length)} />
      <article className="panel wide">
        <div>
          <h2>Operational Readiness</h2>
          <p>
            Backend workflows are connected for account setup, persona guidance, draft review,
            compliant scheduling, and risk log visibility.
          </p>
        </div>
        <div className="checklist">
          <span>{riskLogs.length} risk logs visible</span>
          <span>{drafts.filter((draft) => draft.source === "ai").length} AI suggestions saved</span>
          <span>Manual publishing boundary protected</span>
        </div>
      </article>
    </section>
  );
}

function Metric({ label, tone, value }: { label: string; tone: string; value: string }) {
  return (
    <article className="metric-card">
      <span className={`badge ${tone}`}>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AccountsPage({
  accountName,
  accounts,
  isBusy,
  onAccountNameChange,
  onCreate
}: {
  accountName: string;
  accounts: Account[];
  isBusy: boolean;
  onAccountNameChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <section className="page-grid">
      <Panel title="Create Account">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate();
          }}
        >
          <label>
            Display name
            <input value={accountName} onChange={(event) => onAccountNameChange(event.target.value)} />
          </label>
          <button className="primary-button" disabled={isBusy || !accountName.trim()} type="submit">
            Add account
          </button>
        </form>
      </Panel>
      <RecordList
        emptyText="No accounts yet."
        items={accounts.map((account) => ({
          id: account.id,
          meta: `${account.health_score} health score`,
          status: account.status,
          title: account.display_name
        }))}
        title="Accounts"
      />
    </section>
  );
}

function PersonasPage({
  accounts,
  form,
  isBusy,
  selectedAccountId,
  onChange,
  onSelect,
  onSubmit
}: {
  accounts: Account[];
  form: PersonaForm;
  isBusy: boolean;
  selectedAccountId: string;
  onChange: (value: PersonaForm) => void;
  onSelect: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Panel title="Persona Settings">
      <form
        className="form-grid two-column"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          Account
          <select value={selectedAccountId} onChange={(event) => onSelect(event.target.value)}>
            <option value="">Choose account</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.display_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tone
          <input
            value={form.tone}
            onChange={(event) => onChange({ ...form, tone: event.target.value })}
          />
        </label>
        <label>
          Positioning
          <textarea
            value={form.positioning}
            onChange={(event) => onChange({ ...form, positioning: event.target.value })}
          />
        </label>
        <label>
          Content direction
          <textarea
            value={form.content_direction}
            onChange={(event) => onChange({ ...form, content_direction: event.target.value })}
          />
        </label>
        <label>
          Disabled words
          <input
            value={form.disabled_words}
            onChange={(event) => onChange({ ...form, disabled_words: event.target.value })}
            placeholder="guaranteed, permanent"
          />
        </label>
        <label>
          Publish frequency
          <input
            value={form.publish_frequency}
            onChange={(event) => onChange({ ...form, publish_frequency: event.target.value })}
            placeholder="3/week"
          />
        </label>
        <button className="primary-button" disabled={isBusy || !selectedAccountId} type="submit">
          Save persona
        </button>
      </form>
    </Panel>
  );
}

function DraftsPage({
  accounts,
  drafts,
  form,
  isBusy,
  selectedAccountId,
  onChange,
  onReview,
  onSelect,
  onSubmitAi,
  onSubmitManual
}: {
  accounts: Account[];
  drafts: Draft[];
  form: { title: string; body: string; tags: string; cover_text: string; topic: string };
  isBusy: boolean;
  selectedAccountId: string;
  onChange: (value: { title: string; body: string; tags: string; cover_text: string; topic: string }) => void;
  onReview: (draftId: string, reviewStatus: string) => void;
  onSelect: (value: string) => void;
  onSubmitAi: () => void;
  onSubmitManual: () => void;
}) {
  return (
    <section className="page-grid">
      <Panel title="Create Draft">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitManual();
          }}
        >
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            Title
            <input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
          </label>
          <label>
            Body
            <textarea value={form.body} onChange={(event) => onChange({ ...form, body: event.target.value })} />
          </label>
          <label>
            Tags
            <input
              value={form.tags}
              onChange={(event) => onChange({ ...form, tags: event.target.value })}
              placeholder="skincare, summer"
            />
          </label>
          <label>
            Cover text
            <input
              value={form.cover_text}
              onChange={(event) => onChange({ ...form, cover_text: event.target.value })}
            />
          </label>
          <button className="primary-button" disabled={isBusy || !selectedAccountId || !form.title} type="submit">
            Save manual draft
          </button>
        </form>
        <div className="divider" />
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitAi();
          }}
        >
          <label>
            AI topic
            <input
              value={form.topic}
              onChange={(event) => onChange({ ...form, topic: event.target.value })}
              placeholder="summer moisturizer"
            />
          </label>
          <button className="secondary-button" disabled={isBusy || !selectedAccountId || !form.topic} type="submit">
            Generate AI suggestion
          </button>
        </form>
      </Panel>
      <Panel title="Draft Review">
        <div className="record-stack">
          {drafts.length ? (
            drafts.map((draft) => (
              <article className="record-card" key={draft.id}>
                <div>
                  <h3>{draft.title}</h3>
                  <p>{draft.body}</p>
                  <small>{draft.tags.join(", ") || "No tags"} / {draft.source}</small>
                </div>
                <div className="record-actions">
                  <span className={`badge ${badgeTone(draft.review_status)}`}>{draft.review_status}</span>
                  <button className="quiet-button" onClick={() => onReview(draft.id, "approved")} type="button">
                    Approve
                  </button>
                  <button className="quiet-button" onClick={() => onReview(draft.id, "rejected")} type="button">
                    Reject
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No drafts yet.</div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function SchedulePage({
  accounts,
  approvedDrafts,
  form,
  isBusy,
  publishTasks,
  onChange,
  onSubmit
}: {
  accounts: Account[];
  approvedDrafts: Draft[];
  form: { draft_id: string; scheduled_at: string };
  isBusy: boolean;
  publishTasks: PublishTask[];
  onChange: (value: { draft_id: string; scheduled_at: string }) => void;
  onSubmit: () => void;
}) {
  const accountMap = new Map(accounts.map((account) => [account.account_id, account.display_name]));
  return (
    <section className="page-grid">
      <Panel title="Schedule Approved Draft">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label>
            Approved draft
            <select value={form.draft_id} onChange={(event) => onChange({ ...form, draft_id: event.target.value })}>
              <option value="">Choose draft</option>
              {approvedDrafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Scheduled time
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(event) => onChange({ ...form, scheduled_at: event.target.value })}
            />
          </label>
          <button className="primary-button" disabled={isBusy || !form.draft_id || !form.scheduled_at} type="submit">
            Schedule
          </button>
        </form>
      </Panel>
      <Panel title="Schedule Queue">
        <div className="record-stack">
          {publishTasks.length ? (
            publishTasks.map((task) => (
              <article className="record-card compact" key={task.id}>
                <div>
                  <h3>{accountMap.get(task.account_id) || task.account_id}</h3>
                  <p>{formatDate(task.scheduled_at)}</p>
                </div>
                <span className={`badge ${badgeTone(task.status)}`}>{task.status}</span>
              </article>
            ))
          ) : (
            <div className="empty-state">No scheduled tasks.</div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function CompliancePage({ riskLogs }: { riskLogs: RiskLog[] }) {
  return (
    <Panel title="Compliance Risk Logs">
      <div className="risk-grid">
        {riskLogs.length ? (
          riskLogs.map((risk) => (
            <article className="risk-card" key={risk.id}>
              <div>
                <span className={`badge ${badgeTone(risk.severity)}`}>{risk.severity}</span>
                <h3>{risk.risk_type}</h3>
                <p>{risk.message}</p>
              </div>
              <small>
                {risk.account_id || "Global"} / {risk.related_entity_type || "record"} / {formatDate(risk.created_at)}
              </small>
            </article>
          ))
        ) : (
          <div className="empty-state">No risk logs yet.</div>
        )}
      </div>
    </Panel>
  );
}

function SettingsPage({
  apiBaseUrl,
  health,
  onApiBaseUrlChange,
  onRefresh
}: {
  apiBaseUrl: string;
  health: HealthResponse | null;
  onApiBaseUrlChange: (value: string) => void;
  onRefresh: () => void;
}) {
  return (
    <Panel title="Local Desktop Settings">
      <div className="form-grid">
        <label>
          API base URL
          <input value={apiBaseUrl} onChange={(event) => onApiBaseUrlChange(event.target.value)} />
        </label>
        <div className="settings-row">
          <div>
            <strong>Backend health</strong>
            <span>{health ? `${health.service}: ${health.status}` : "Not reachable"}</span>
          </div>
          <button className="secondary-button" onClick={onRefresh} type="button">
            Refresh
          </button>
        </div>
      </div>
    </Panel>
  );
}

function AccountSelect({
  accounts,
  selectedAccountId,
  onSelect
}: {
  accounts: Account[];
  selectedAccountId: string;
  onSelect: (value: string) => void;
}) {
  return (
    <label>
      Account
      <select value={selectedAccountId} onChange={(event) => onSelect(event.target.value)}>
        <option value="">Choose account</option>
        {accounts.map((account) => (
          <option key={account.account_id} value={account.account_id}>
            {account.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function Panel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function RecordList({
  emptyText,
  items,
  title
}: {
  emptyText: string;
  items: Array<{ id: string; meta: string; status: string; title: string }>;
  title: string;
}) {
  return (
    <Panel title={title}>
      <div className="record-stack">
        {items.length ? (
          items.map((item) => (
            <article className="record-card compact" key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.meta}</p>
              </div>
              <span className={`badge ${badgeTone(item.status)}`}>{item.status}</span>
            </article>
          ))
        ) : (
          <div className="empty-state">{emptyText}</div>
        )}
      </div>
    </Panel>
  );
}

export default App;
