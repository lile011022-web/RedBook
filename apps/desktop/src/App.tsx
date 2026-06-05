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

type MediaAsset = {
  id: string;
  account_id: string;
  filename: string;
  content_type: string;
  storage_key: string;
  preview_url: string | null;
  sha256: string | null;
  reused_from_asset_id: string | null;
  created_at: string;
};

type PublishLog = {
  id: string;
  account_id: string;
  draft_id: string;
  published_at: string;
  note_url: string;
  created_at: string;
};

type AnalyticsRecord = {
  id: string;
  account_id: string;
  publish_log_id: string;
  views: number;
  likes: number;
  favorites: number;
  comments: number;
  recorded_at: string;
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

const navItems = [
  "Dashboard",
  "Accounts",
  "Personas",
  "Media",
  "Drafts",
  "Schedule",
  "Compliance",
  "Publish Records",
  "Settings"
];

const CREATOR_URL = "https://creator.xiaohongshu.com/";
const EXPECTED_BACKEND_SERVICE = "redbook-api";

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

async function copyText(value: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
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
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [publishLogs, setPublishLogs] = useState<PublishLog[]>([]);
  const [analyticsRecords, setAnalyticsRecords] = useState<AnalyticsRecord[]>([]);
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
  const [mediaForm, setMediaForm] = useState({
    filename: "",
    content_type: "image/png",
    preview_url: "",
    sha256: ""
  });
  const [publishForm, setPublishForm] = useState({
    draft_id: "",
    published_at: "",
    note_url: ""
  });
  const [analyticsForm, setAnalyticsForm] = useState({
    publish_log_id: "",
    views: "0",
    likes: "0",
    favorites: "0",
    comments: "0",
    recorded_at: ""
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
      if (response.service !== EXPECTED_BACKEND_SERVICE) {
        setHealth(null);
        setError(
          `The API base URL is responding, but it is not RedBook API. Current service: ${
            response.service || "unknown"
          }. Please update the API base URL to the RedBook backend, such as http://127.0.0.1:8010.`
        );
        return;
      }
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
      const [accountList, draftList, taskList, riskList, publishLogList, analyticsList] = await Promise.all([
        apiRequest<Account[]>("/accounts"),
        apiRequest<Draft[]>("/drafts"),
        apiRequest<PublishTask[]>("/publish-tasks"),
        apiRequest<RiskLog[]>("/risk-logs"),
        apiRequest<PublishLog[]>("/publish-logs"),
        apiRequest<AnalyticsRecord[]>("/analytics-records")
      ]);
      setAccounts(accountList);
      setDrafts(draftList);
      setPublishTasks(taskList);
      setRiskLogs(riskList);
      setPublishLogs(publishLogList);
      setAnalyticsRecords(analyticsList);
      if (!selectedAccountId && accountList[0]) {
        setSelectedAccountId(accountList[0].account_id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load records.");
    }
  }, [selectedAccountId]);

  const loadMedia = useCallback(async (accountId: string) => {
    if (!accountId || !getToken()) {
      setMediaAssets([]);
      return;
    }

    try {
      const mediaList = await apiRequest<MediaAsset[]>(`/accounts/${accountId}/media-assets`);
      setMediaAssets(mediaList);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load media.");
    }
  }, []);

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

  useEffect(() => {
    if (isAuthenticated && selectedAccountId) {
      void loadMedia(selectedAccountId);
    }
  }, [isAuthenticated, loadMedia, selectedAccountId]);

  function updateApiBaseUrl(value: string) {
    setApiBaseUrlState(value);
    setApiBaseUrl(value);
  }

  async function handleAuth(mode: "login" | "register", email: string, password: string) {
    setError("");
    setIsBusy(true);
    try {
      const healthResponse = await apiRequest<HealthResponse>("/health");
      if (healthResponse.service !== EXPECTED_BACKEND_SERVICE) {
        throw new Error(
          `The API base URL is not RedBook API. Current service: ${
            healthResponse.service || "unknown"
          }. Please start RedBook backend at this URL.`
        );
      }
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
      if (selectedAccountId) {
        await loadMedia(selectedAccountId);
      }
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
    setMediaAssets([]);
    setPublishLogs([]);
    setAnalyticsRecords([]);
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
            analyticsRecords={analyticsRecords}
            drafts={drafts}
            mediaAssets={mediaAssets}
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
        {activePage === "Media" ? (
          <MediaPage
            accounts={accounts}
            form={mediaForm}
            isBusy={isBusy}
            mediaAssets={mediaAssets}
            selectedAccountId={selectedAccountId}
            onChange={setMediaForm}
            onSelect={setSelectedAccountId}
            onSubmit={() =>
              runMutation(async () => {
                await apiRequest<MediaAsset>("/media-assets", {
                  body: JSON.stringify({
                    account_id: selectedAccountId,
                    filename: mediaForm.filename,
                    content_type: mediaForm.content_type,
                    preview_url: mediaForm.preview_url || null,
                    sha256: mediaForm.sha256 || null
                  }),
                  method: "POST"
                });
                setMediaForm({ filename: "", content_type: "image/png", preview_url: "", sha256: "" });
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
            onCopy={(value) =>
              runMutation(async () => {
                await copyText(value);
              })
            }
            onOpenCreator={() => window.open(CREATOR_URL, "_blank", "noopener,noreferrer")}
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
        {activePage === "Publish Records" ? (
          <PublishRecordsPage
            accounts={accounts}
            analyticsForm={analyticsForm}
            analyticsRecords={analyticsRecords}
            drafts={drafts}
            isBusy={isBusy}
            publishForm={publishForm}
            publishLogs={publishLogs}
            selectedAccountId={selectedAccountId}
            onAnalyticsChange={setAnalyticsForm}
            onAnalyticsSubmit={() =>
              runMutation(async () => {
                const publishLog = publishLogs.find((item) => item.id === analyticsForm.publish_log_id);
                if (!publishLog) {
                  throw new Error("Choose a publish record before adding analytics.");
                }
                await apiRequest<AnalyticsRecord>("/analytics-records", {
                  body: JSON.stringify({
                    account_id: publishLog.account_id,
                    publish_log_id: publishLog.id,
                    views: Number(analyticsForm.views),
                    likes: Number(analyticsForm.likes),
                    favorites: Number(analyticsForm.favorites),
                    comments: Number(analyticsForm.comments),
                    recorded_at: new Date(analyticsForm.recorded_at).toISOString()
                  }),
                  method: "POST"
                });
                setAnalyticsForm({
                  publish_log_id: "",
                  views: "0",
                  likes: "0",
                  favorites: "0",
                  comments: "0",
                  recorded_at: ""
                });
              })
            }
            onPublishChange={setPublishForm}
            onPublishSubmit={() =>
              runMutation(async () => {
                const draft = drafts.find((item) => item.id === publishForm.draft_id);
                if (!draft) {
                  throw new Error("Choose a draft before recording publish result.");
                }
                await apiRequest<PublishLog>("/publish-logs", {
                  body: JSON.stringify({
                    account_id: draft.account_id,
                    draft_id: draft.id,
                    published_at: new Date(publishForm.published_at).toISOString(),
                    note_url: publishForm.note_url
                  }),
                  method: "POST"
                });
                setPublishForm({ draft_id: "", published_at: "", note_url: "" });
              })
            }
            onSelect={setSelectedAccountId}
          />
        ) : null}
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
  analyticsRecords,
  drafts,
  mediaAssets,
  publishTasks,
  riskLogs
}: {
  accounts: Account[];
  analyticsRecords: AnalyticsRecord[];
  drafts: Draft[];
  mediaAssets: MediaAsset[];
  publishTasks: PublishTask[];
  riskLogs: RiskLog[];
}) {
  const pendingDrafts = drafts.filter((draft) => draft.review_status === "needs_review").length;
  return (
    <section className="dashboard-grid">
      <Metric label="Accounts" tone="green" value={String(accounts.length)} />
      <Metric label="Drafts pending review" tone="amber" value={String(pendingDrafts)} />
      <Metric label="Scheduled tasks" tone="blue" value={String(publishTasks.length)} />
      <Metric label="Media assets" tone="blue" value={String(mediaAssets.length)} />
      <Metric label="Publish records" tone="green" value={String(analyticsRecords.length)} />
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

function MediaPage({
  accounts,
  form,
  isBusy,
  mediaAssets,
  selectedAccountId,
  onChange,
  onSelect,
  onSubmit
}: {
  accounts: Account[];
  form: { filename: string; content_type: string; preview_url: string; sha256: string };
  isBusy: boolean;
  mediaAssets: MediaAsset[];
  selectedAccountId: string;
  onChange: (value: { filename: string; content_type: string; preview_url: string; sha256: string }) => void;
  onSelect: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="page-grid">
      <Panel title="Add Media Metadata">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            Filename
            <input
              value={form.filename}
              onChange={(event) => onChange({ ...form, filename: event.target.value })}
              placeholder="cover.png"
            />
          </label>
          <label>
            Content type
            <input
              value={form.content_type}
              onChange={(event) => onChange({ ...form, content_type: event.target.value })}
              placeholder="image/png"
            />
          </label>
          <label>
            Preview URL
            <input
              value={form.preview_url}
              onChange={(event) => onChange({ ...form, preview_url: event.target.value })}
              placeholder="https://example.com/cover.png"
            />
          </label>
          <label>
            SHA256
            <input
              value={form.sha256}
              onChange={(event) => onChange({ ...form, sha256: event.target.value })}
              placeholder="Optional 64-character checksum"
            />
          </label>
          <button className="primary-button" disabled={isBusy || !selectedAccountId || !form.filename} type="submit">
            Save media
          </button>
        </form>
      </Panel>
      <Panel title="Media Library">
        <div className="media-grid">
          {mediaAssets.length ? (
            mediaAssets.map((asset) => (
              <article className="media-card" key={asset.id}>
                <div className="media-preview">
                  {asset.content_type.startsWith("image/") && asset.preview_url ? (
                    <img alt={asset.filename} src={asset.preview_url} />
                  ) : (
                    <span>{asset.content_type}</span>
                  )}
                </div>
                <div>
                  <h3>{asset.filename}</h3>
                  <p>{asset.storage_key}</p>
                  {asset.reused_from_asset_id ? (
                    <span className="badge amber">Reuse warning</span>
                  ) : (
                    <span className="badge green">Scoped</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">No media metadata yet.</div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function DraftsPage({
  accounts,
  drafts,
  form,
  isBusy,
  selectedAccountId,
  onChange,
  onCopy,
  onOpenCreator,
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
  onCopy: (value: string) => void;
  onOpenCreator: () => void;
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
                  <button className="quiet-button" onClick={() => onCopy(draft.title)} type="button">
                    Copy title
                  </button>
                  <button className="quiet-button" onClick={() => onCopy(draft.body)} type="button">
                    Copy body
                  </button>
                  <button className="quiet-button" onClick={() => onCopy(draft.tags.join(", "))} type="button">
                    Copy tags
                  </button>
                  <button className="quiet-button" onClick={() => onCopy(draft.cover_text)} type="button">
                    Copy cover
                  </button>
                  <button className="quiet-button" onClick={() => onReview(draft.id, "approved")} type="button">
                    Approve
                  </button>
                  <button className="quiet-button" onClick={() => onReview(draft.id, "rejected")} type="button">
                    Reject
                  </button>
                  <button className="secondary-button" onClick={onOpenCreator} type="button">
                    Open creator
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

function PublishRecordsPage({
  accounts,
  analyticsForm,
  analyticsRecords,
  drafts,
  isBusy,
  publishForm,
  publishLogs,
  selectedAccountId,
  onAnalyticsChange,
  onAnalyticsSubmit,
  onPublishChange,
  onPublishSubmit,
  onSelect
}: {
  accounts: Account[];
  analyticsForm: {
    publish_log_id: string;
    views: string;
    likes: string;
    favorites: string;
    comments: string;
    recorded_at: string;
  };
  analyticsRecords: AnalyticsRecord[];
  drafts: Draft[];
  isBusy: boolean;
  publishForm: { draft_id: string; published_at: string; note_url: string };
  publishLogs: PublishLog[];
  selectedAccountId: string;
  onAnalyticsChange: (value: {
    publish_log_id: string;
    views: string;
    likes: string;
    favorites: string;
    comments: string;
    recorded_at: string;
  }) => void;
  onAnalyticsSubmit: () => void;
  onPublishChange: (value: { draft_id: string; published_at: string; note_url: string }) => void;
  onPublishSubmit: () => void;
  onSelect: (value: string) => void;
}) {
  const accountMap = new Map(accounts.map((account) => [account.account_id, account.display_name]));
  const selectedDrafts = drafts.filter((draft) => !selectedAccountId || draft.account_id === selectedAccountId);

  return (
    <section className="page-grid">
      <Panel title="Manual Publish Result">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onPublishSubmit();
          }}
        >
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            Draft
            <select
              value={publishForm.draft_id}
              onChange={(event) => onPublishChange({ ...publishForm, draft_id: event.target.value })}
            >
              <option value="">Choose draft</option>
              {selectedDrafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Published time
            <input
              type="datetime-local"
              value={publishForm.published_at}
              onChange={(event) => onPublishChange({ ...publishForm, published_at: event.target.value })}
            />
          </label>
          <label>
            Note URL
            <input
              value={publishForm.note_url}
              onChange={(event) => onPublishChange({ ...publishForm, note_url: event.target.value })}
              placeholder="https://www.xiaohongshu.com/explore/..."
            />
          </label>
          <button
            className="primary-button"
            disabled={isBusy || !publishForm.draft_id || !publishForm.published_at}
            type="submit"
          >
            Save publish record
          </button>
        </form>
      </Panel>
      <Panel title="Analytics Entry">
        <form
          className="form-grid two-column"
          onSubmit={(event) => {
            event.preventDefault();
            onAnalyticsSubmit();
          }}
        >
          <label>
            Publish record
            <select
              value={analyticsForm.publish_log_id}
              onChange={(event) =>
                onAnalyticsChange({ ...analyticsForm, publish_log_id: event.target.value })
              }
            >
              <option value="">Choose record</option>
              {publishLogs.map((log) => (
                <option key={log.id} value={log.id}>
                  {accountMap.get(log.account_id) || log.account_id} / {formatDate(log.published_at)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Recorded time
            <input
              type="datetime-local"
              value={analyticsForm.recorded_at}
              onChange={(event) => onAnalyticsChange({ ...analyticsForm, recorded_at: event.target.value })}
            />
          </label>
          <NumberField form={analyticsForm} label="Views" name="views" onChange={onAnalyticsChange} />
          <NumberField form={analyticsForm} label="Likes" name="likes" onChange={onAnalyticsChange} />
          <NumberField form={analyticsForm} label="Favorites" name="favorites" onChange={onAnalyticsChange} />
          <NumberField form={analyticsForm} label="Comments" name="comments" onChange={onAnalyticsChange} />
          <button
            className="primary-button"
            disabled={isBusy || !analyticsForm.publish_log_id || !analyticsForm.recorded_at}
            type="submit"
          >
            Save analytics
          </button>
        </form>
      </Panel>
      <Panel title="Publish Records">
        <div className="record-stack">
          {publishLogs.length ? (
            publishLogs.map((log) => (
              <article className="record-card compact" key={log.id}>
                <div>
                  <h3>{accountMap.get(log.account_id) || log.account_id}</h3>
                  <p>{formatDate(log.published_at)}</p>
                  {log.note_url ? (
                    <a href={log.note_url} rel="noreferrer" target="_blank">
                      Open note
                    </a>
                  ) : null}
                </div>
                <span className="badge green">manual</span>
              </article>
            ))
          ) : (
            <div className="empty-state">No publish records yet.</div>
          )}
        </div>
      </Panel>
      <Panel title="Analytics Records">
        <div className="record-stack">
          {analyticsRecords.length ? (
            analyticsRecords.map((record) => (
              <article className="record-card compact" key={record.id}>
                <div>
                  <h3>{record.views.toLocaleString()} views</h3>
                  <p>
                    {record.likes} likes / {record.favorites} favorites / {record.comments} comments
                  </p>
                </div>
                <span className="badge blue">{formatDate(record.recorded_at)}</span>
              </article>
            ))
          ) : (
            <div className="empty-state">No analytics records yet.</div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function NumberField({
  form,
  label,
  name,
  onChange
}: {
  form: {
    publish_log_id: string;
    views: string;
    likes: string;
    favorites: string;
    comments: string;
    recorded_at: string;
  };
  label: string;
  name: "views" | "likes" | "favorites" | "comments";
  onChange: (value: {
    publish_log_id: string;
    views: string;
    likes: string;
    favorites: string;
    comments: string;
    recorded_at: string;
  }) => void;
}) {
  return (
    <label>
      {label}
      <input
        min="0"
        type="number"
        value={form[name]}
        onChange={(event) => onChange({ ...form, [name]: event.target.value })}
      />
    </label>
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
