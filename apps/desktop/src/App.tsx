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

type DashboardRecord = {
  id: string;
  account_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  exposure_count: number;
  view_count: number;
  like_count: number;
  comment_count: number;
  net_follower_count: number;
  new_follow_count: number;
  cover_click_rate: number;
  video_completion_rate: number;
  favorite_count: number;
  share_count: number;
  unfollow_count: number;
  profile_visit_count: number;
  exposure_change: string;
  view_change: string;
  like_change: string;
  comment_change: string;
  follower_change: string;
  cover_click_change: string;
  video_completion_change: string;
  profile_visit_change: string;
  notes: string;
  created_at: string;
};

type AiDashboardAnalysis = {
  summary: string;
  diagnosis: string[];
  recommendations: string[];
  next_actions: string[];
  content_angles: string[];
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

type DraftForm = {
  title: string;
  body: string;
  tags: string;
  cover_text: string;
  topic: string;
  count: string;
  extra_requirements: string;
};

type AnalyticsForm = {
  publish_log_id: string;
  views: string;
  likes: string;
  favorites: string;
  comments: string;
  recorded_at: string;
};

type DashboardForm = {
  period_label: string;
  period_start: string;
  period_end: string;
  exposure_count: string;
  view_count: string;
  like_count: string;
  comment_count: string;
  net_follower_count: string;
  new_follow_count: string;
  cover_click_rate: string;
  video_completion_rate: string;
  favorite_count: string;
  share_count: string;
  unfollow_count: string;
  profile_visit_count: string;
  exposure_change: string;
  view_change: string;
  like_change: string;
  comment_change: string;
  follower_change: string;
  cover_click_change: string;
  video_completion_change: string;
  profile_visit_change: string;
  notes: string;
};

const navItems = [
  "仪表盘",
  "账号",
  "人设",
  "草稿",
  "排期",
  "合规",
  "运营分析",
  "设置"
];

const CREATOR_URL = "https://creator.xiaohongshu.com/";
const EXPECTED_BACKEND_SERVICE = "redbook-api";
const REMEMBER_LOGIN_KEY = "redbook.rememberLogin";
const REMEMBERED_EMAIL_KEY = "redbook.rememberedEmail";
const REMEMBERED_PASSWORD_KEY = "redbook.rememberedPassword";

const statusLabels: Record<string, string> = {
  active: "启用",
  approved: "已通过",
  blocked: "已阻止",
  draft: "草稿",
  failed: "失败",
  manual: "人工",
  needs_review: "待审核",
  pending: "待处理",
  rejected: "已拒绝",
  reviewed: "已审核",
  scheduled: "已排期",
  warning: "提醒"
};

const emptyPersonaForm: PersonaForm = {
  positioning: "",
  content_direction: "",
  tone: "",
  disabled_words: "",
  publish_frequency: ""
};

const emptyDraftForm: DraftForm = {
  title: "",
  body: "",
  tags: "",
  cover_text: "",
  topic: "",
  count: "3",
  extra_requirements: ""
};

const emptyAnalyticsForm: AnalyticsForm = {
  publish_log_id: "",
  views: "0",
  likes: "0",
  favorites: "0",
  comments: "0",
  recorded_at: ""
};

const emptyDashboardForm: DashboardForm = {
  period_label: "近7日",
  period_start: "",
  period_end: "",
  exposure_count: "0",
  view_count: "0",
  like_count: "0",
  comment_count: "0",
  net_follower_count: "0",
  new_follow_count: "0",
  cover_click_rate: "0",
  video_completion_rate: "0",
  favorite_count: "0",
  share_count: "0",
  unfollow_count: "0",
  profile_visit_count: "0",
  exposure_change: "",
  view_change: "",
  like_change: "",
  comment_change: "",
  follower_change: "",
  cover_click_change: "",
  video_completion_change: "",
  profile_visit_change: "",
  notes: ""
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

function statusLabel(status: string) {
  return statusLabels[status] || status;
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
  onSubmit: (mode: "login" | "register", email: string, password: string, rememberLogin: boolean) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [rememberLogin, setRememberLogin] = useState(localStorage.getItem(REMEMBER_LOGIN_KEY) === "true");
  const [email, setEmail] = useState(localStorage.getItem(REMEMBERED_EMAIL_KEY) || "operator@example.com");
  const [password, setPassword] = useState(localStorage.getItem(REMEMBERED_PASSWORD_KEY) || "password123");

  function submit(event: FormEvent) {
    event.preventDefault();
    void onSubmit(mode, email, password, rememberLogin);
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">R</div>
          <div>
            <strong>RedBook</strong>
            <span>合规运营台</span>
          </div>
        </div>
        <div>
          <p className="eyebrow">RedBook 工作台</p>
          <h1>登录后开始人工发布工作流</h1>
          <p className="muted">
            连接 RedBook 后端，审核 AI 草稿，并只排期人工确认的内容。
          </p>
        </div>
        {error ? <div className="alert">{error}</div> : null}
        <form className="form-grid" onSubmit={submit}>
          <label>
            后端地址
            <input value={apiBaseUrl} onChange={(event) => onApiBaseUrlChange(event.target.value)} />
          </label>
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            密码
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>
          <label className="checkbox-row">
            <input
              checked={rememberLogin}
              onChange={(event) => setRememberLogin(event.target.checked)}
              type="checkbox"
            />
            记住账号和密码
          </label>
          <div className="segmented">
            <button
              className={mode === "login" ? "selected" : ""}
              onClick={() => setMode("login")}
              type="button"
            >
              登录
            </button>
            <button
              className={mode === "register" ? "selected" : ""}
              onClick={() => setMode("register")}
              type="button"
            >
              注册
            </button>
          </div>
          <button className="primary-button" disabled={isBusy} type="submit">
            {isBusy ? "处理中..." : mode === "login" ? "登录" : "创建账号"}
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
  const [dashboardRecords, setDashboardRecords] = useState<DashboardRecord[]>([]);
  const [dashboardAnalysis, setDashboardAnalysis] = useState<AiDashboardAnalysis | null>(null);
  const [riskLogs, setRiskLogs] = useState<RiskLog[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [personaForm, setPersonaForm] = useState<PersonaForm>(emptyPersonaForm);
  const [draftForm, setDraftForm] = useState<DraftForm>(emptyDraftForm);
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
  const [analyticsForm, setAnalyticsForm] = useState<AnalyticsForm>(emptyAnalyticsForm);
  const [dashboardForm, setDashboardForm] = useState<DashboardForm>(emptyDashboardForm);

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
          `当前后端地址有响应，但不是 RedBook API。当前服务：${
            response.service || "unknown"
          }。请把后端地址改为 RedBook 后端，例如 http://127.0.0.1:8010。`
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
      try {
        const dashboardList = await apiRequest<DashboardRecord[]>("/dashboard-records");
        setDashboardRecords(dashboardList);
      } catch (dashboardError) {
        setDashboardRecords([]);
        console.info("创作中心总览接口暂不可用，基础功能继续运行。", dashboardError);
      }
      if (!selectedAccountId && accountList[0]) {
        setSelectedAccountId(accountList[0].account_id);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "无法加载记录。");
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
      setError(requestError instanceof Error ? requestError.message : "无法加载素材。");
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

  async function handleAuth(mode: "login" | "register", email: string, password: string, rememberLogin: boolean) {
    setError("");
    setIsBusy(true);
    try {
      const healthResponse = await apiRequest<HealthResponse>("/health");
      if (healthResponse.service !== EXPECTED_BACKEND_SERVICE) {
        throw new Error(
          `当前后端地址不是 RedBook API。当前服务：${
            healthResponse.service || "unknown"
          }。请在这个地址启动 RedBook 后端。`
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
      localStorage.setItem(REMEMBER_LOGIN_KEY, String(rememberLogin));
      if (rememberLogin) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        localStorage.setItem(REMEMBERED_PASSWORD_KEY, password);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        localStorage.removeItem(REMEMBERED_PASSWORD_KEY);
      }
      setIsAuthenticated(true);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "登录或注册失败。");
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
      setError(requestError instanceof Error ? requestError.message : "请求失败。");
    } finally {
      setIsBusy(false);
    }
  }

  async function openAccountWorkbench(account: Account) {
    setError("");
    if (!window.redbook?.openXhsWorkbench) {
      setError("当前环境不支持小红书独立窗口，请使用桌面版。");
      return;
    }
    try {
      await window.redbook.openXhsWorkbench(account.account_id, account.display_name);
    } catch (workbenchError) {
      setError(workbenchError instanceof Error ? workbenchError.message : "无法打开小红书工作台。");
    }
  }

  async function clearAccountWorkbenchSession(account: Account) {
    setError("");
    if (!window.redbook?.clearXhsSession) {
      setError("当前环境不支持清除小红书登录状态，请使用桌面版。");
      return;
    }
    const confirmed = window.confirm("确认清除该账号的小红书登录状态？清除后需要重新手动登录。");
    if (!confirmed) {
      return;
    }
    try {
      await window.redbook.clearXhsSession(account.account_id);
      setError("已清除该账号的小红书登录状态。");
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "无法清除该账号的小红书登录状态。");
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
    setDashboardRecords([]);
    setDashboardAnalysis(null);
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
            <span>合规运营台</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={item === activePage ? "nav-item active" : "nav-item"}
              key={item}
              onClick={() => {
                setError("");
                setActivePage(item);
              }}
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
            <p className="eyebrow">真实数据工作台</p>
            <h1>{activePage}</h1>
            <p>
              连接 RedBook 后端进行人工发布运营。本工作台不包含平台自动化能力。
            </p>
          </div>
          <div className="topbar-actions">
            <span className={health ? "status-pill online" : "status-pill attention"}>
              {health ? `${health.service}: ${health.status}` : "后端未连接"}
            </span>
            <button className="quiet-button" onClick={logout} type="button">
              退出登录
            </button>
          </div>
        </header>

        {error ? <div className="alert">{error}</div> : null}

        {activePage === "仪表盘" ? (
          <Dashboard
            accounts={accounts}
            analyticsRecords={analyticsRecords}
            drafts={drafts}
            publishTasks={publishTasks}
            riskLogs={riskLogs}
          />
        ) : null}
        {activePage === "账号" ? (
          <AccountsPage
            accountName={accountName}
            accounts={accounts}
            isBusy={isBusy}
            onAccountNameChange={(value) => {
              setError("");
              setAccountName(value);
            }}
            onClearXhsSession={clearAccountWorkbenchSession}
            onCreate={() =>
              runMutation(async () => {
                await apiRequest<Account>("/accounts", {
                  body: JSON.stringify({ display_name: accountName.trim() }),
                  method: "POST"
                });
                setAccountName("");
              })
            }
            onOpenXhsWorkbench={openAccountWorkbench}
          />
        ) : null}
        {activePage === "人设" ? (
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
        {activePage === "素材" ? (
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
        {activePage === "草稿" ? (
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
                setDraftForm((current) => ({
                  ...emptyDraftForm,
                  count: current.count,
                  extra_requirements: current.extra_requirements
                }));
              })
            }
            onSubmitAi={() =>
              runMutation(async () => {
                await apiRequest<Draft[]>("/ai/generate-draft-options", {
                  body: JSON.stringify({
                    account_id: selectedAccountId,
                    topic: draftForm.topic,
                    count: Number(draftForm.count),
                    extra_requirements: draftForm.extra_requirements
                  }),
                  method: "POST"
                });
                setDraftForm((current) => ({ ...current, topic: "" }));
              })
            }
          />
        ) : null}
        {activePage === "排期" ? (
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
                  throw new Error("请先选择已审核通过的草稿再排期。");
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
        {activePage === "合规" ? <CompliancePage riskLogs={riskLogs} /> : null}
        {activePage === "运营分析" ? (
          <PublishRecordsPage
            accounts={accounts}
            dashboardAnalysis={dashboardAnalysis}
            dashboardForm={dashboardForm}
            dashboardRecords={dashboardRecords}
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
                  throw new Error("请先选择发布记录再录入数据。");
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
                setAnalyticsForm(emptyAnalyticsForm);
              })
            }
            onAnalyzeDashboard={() =>
              runMutation(async () => {
                const targetRecord = dashboardRecords.find(
                  (item) => !selectedAccountId || item.account_id === selectedAccountId
                );
                if (!selectedAccountId) {
                  throw new Error("请先选择账号再生成 AI 运营建议。");
                }
                if (!targetRecord) {
                  throw new Error("请先录入至少一条创作中心数据。");
                }
                const analysis = await apiRequest<AiDashboardAnalysis>("/ai/analyze-dashboard", {
                  body: JSON.stringify({
                    account_id: selectedAccountId,
                    dashboard_record_id: targetRecord.id
                  }),
                  method: "POST"
                });
                setDashboardAnalysis(analysis);
              })
            }
            onDashboardChange={setDashboardForm}
            onDashboardSubmit={() =>
              runMutation(async () => {
                if (!selectedAccountId) {
                  throw new Error("请先选择账号再录入创作中心数据。");
                }
                await apiRequest<DashboardRecord>("/dashboard-records", {
                  body: JSON.stringify({
                    account_id: selectedAccountId,
                    period_label: dashboardForm.period_label,
                    period_start: dashboardForm.period_start,
                    period_end: dashboardForm.period_end,
                    exposure_count: Number(dashboardForm.exposure_count),
                    view_count: Number(dashboardForm.view_count),
                    like_count: Number(dashboardForm.like_count),
                    comment_count: Number(dashboardForm.comment_count),
                    net_follower_count: Number(dashboardForm.net_follower_count),
                    new_follow_count: Number(dashboardForm.new_follow_count),
                    cover_click_rate: Number(dashboardForm.cover_click_rate),
                    video_completion_rate: Number(dashboardForm.video_completion_rate),
                    favorite_count: Number(dashboardForm.favorite_count),
                    share_count: Number(dashboardForm.share_count),
                    unfollow_count: Number(dashboardForm.unfollow_count),
                    profile_visit_count: Number(dashboardForm.profile_visit_count),
                    exposure_change: dashboardForm.exposure_change,
                    view_change: dashboardForm.view_change,
                    like_change: dashboardForm.like_change,
                    comment_change: dashboardForm.comment_change,
                    follower_change: dashboardForm.follower_change,
                    cover_click_change: dashboardForm.cover_click_change,
                    video_completion_change: dashboardForm.video_completion_change,
                    profile_visit_change: dashboardForm.profile_visit_change,
                    notes: dashboardForm.notes
                  }),
                  method: "POST"
                });
                setDashboardForm(emptyDashboardForm);
              })
            }
            onPublishChange={setPublishForm}
            onPublishSubmit={() =>
              runMutation(async () => {
                const draft = drafts.find((item) => item.id === publishForm.draft_id);
                if (!draft) {
                  throw new Error("请先选择草稿再记录发布结果。");
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
        {activePage === "设置" ? (
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
  publishTasks,
  riskLogs
}: {
  accounts: Account[];
  analyticsRecords: AnalyticsRecord[];
  drafts: Draft[];
  publishTasks: PublishTask[];
  riskLogs: RiskLog[];
}) {
  const pendingDrafts = drafts.filter((draft) => draft.review_status === "needs_review").length;
  return (
    <section className="dashboard-grid">
      <Metric label="账号" tone="green" value={String(accounts.length)} />
      <Metric label="待审核草稿" tone="amber" value={String(pendingDrafts)} />
      <Metric label="已排期任务" tone="blue" value={String(publishTasks.length)} />
      <Metric label="单篇数据" tone="green" value={String(analyticsRecords.length)} />
      <article className="panel wide">
        <div>
          <h2>运营准备状态</h2>
          <p>
            后端已连接账号、人设、草稿审核、合规排期和风险日志流程。
          </p>
        </div>
        <div className="checklist">
          <span>{riskLogs.length} 条风险日志可见</span>
          <span>{drafts.filter((draft) => draft.source === "ai").length} 条 AI 建议已保存</span>
          <span>人工发布边界已保护</span>
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
  onClearXhsSession,
  onCreate,
  onOpenXhsWorkbench
}: {
  accountName: string;
  accounts: Account[];
  isBusy: boolean;
  onAccountNameChange: (value: string) => void;
  onClearXhsSession: (account: Account) => void;
  onCreate: () => void;
  onOpenXhsWorkbench: (account: Account) => void;
}) {
  return (
    <section className="page-grid">
      <Panel title="创建账号">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate();
          }}
        >
          <label>
            账号名称
            <input
              value={accountName}
              onChange={(event) => onAccountNameChange(event.target.value)}
              placeholder="例如：合肥招主播兼职"
            />
          </label>
          {!accountName.trim() ? <p className="form-hint">先输入账号名称，按钮才会启用。</p> : null}
          <button className="primary-button" disabled={isBusy || !accountName.trim()} type="submit">
            {isBusy ? "正在添加..." : "添加账号"}
          </button>
        </form>
      </Panel>
      <Panel title="账号列表">
        <div className="record-stack">
          {accounts.length ? (
            accounts.map((account) => (
              <article className="record-card compact" key={account.id}>
                <div>
                  <h3>{account.display_name}</h3>
                  <p>健康分 {account.health_score}</p>
                </div>
                <div className="record-actions">
                  <span className={`badge ${badgeTone(account.status)}`}>{statusLabel(account.status)}</span>
                  <button
                    className="secondary-button"
                    onClick={() => onOpenXhsWorkbench(account)}
                    type="button"
                  >
                    打开小红书工作台
                  </button>
                  <button
                    className="quiet-button"
                    onClick={() => onClearXhsSession(account)}
                    type="button"
                  >
                    清除登录状态
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">暂无账号。</div>
          )}
        </div>
      </Panel>
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
    <Panel title="人设设置">
      <form
        className="form-grid two-column"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          账号
          <select value={selectedAccountId} onChange={(event) => onSelect(event.target.value)}>
            <option value="">选择账号</option>
            {accounts.map((account) => (
              <option key={account.account_id} value={account.account_id}>
                {account.display_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          语气风格
          <input
            value={form.tone}
            onChange={(event) => onChange({ ...form, tone: event.target.value })}
          />
        </label>
        <label>
          账号定位
          <textarea
            value={form.positioning}
            onChange={(event) => onChange({ ...form, positioning: event.target.value })}
          />
        </label>
        <label>
          内容方向
          <textarea
            value={form.content_direction}
            onChange={(event) => onChange({ ...form, content_direction: event.target.value })}
          />
        </label>
        <label>
          禁用词
          <input
            value={form.disabled_words}
            onChange={(event) => onChange({ ...form, disabled_words: event.target.value })}
            placeholder="绝对、永久"
          />
        </label>
        <label>
          发布频率
          <input
            value={form.publish_frequency}
            onChange={(event) => onChange({ ...form, publish_frequency: event.target.value })}
            placeholder="每周 3 篇"
          />
        </label>
        <button className="primary-button" disabled={isBusy || !selectedAccountId} type="submit">
          保存人设
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
      <Panel title="添加素材记录">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            文件名
            <input
              value={form.filename}
              onChange={(event) => onChange({ ...form, filename: event.target.value })}
              placeholder="cover.png"
            />
          </label>
          <label>
            内容类型
            <input
              value={form.content_type}
              onChange={(event) => onChange({ ...form, content_type: event.target.value })}
              placeholder="image/png"
            />
          </label>
          <label>
            预览图地址
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
              placeholder="可选，64 位校验值"
            />
          </label>
          <button className="primary-button" disabled={isBusy || !selectedAccountId || !form.filename} type="submit">
            保存素材
          </button>
        </form>
      </Panel>
      <Panel title="素材库">
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
                    <span className="badge amber">复用提醒</span>
                  ) : (
                    <span className="badge green">账号隔离</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">暂无素材记录。</div>
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
  form: DraftForm;
  isBusy: boolean;
  selectedAccountId: string;
  onChange: (value: DraftForm) => void;
  onCopy: (value: string) => void;
  onOpenCreator: () => void;
  onReview: (draftId: string, reviewStatus: string) => void;
  onSelect: (value: string) => void;
  onSubmitAi: () => void;
  onSubmitManual: () => void;
}) {
  return (
    <section className="page-grid">
      <Panel title="创建草稿">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitManual();
          }}
        >
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            标题
            <input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
          </label>
          <label>
            正文
            <textarea value={form.body} onChange={(event) => onChange({ ...form, body: event.target.value })} />
          </label>
          <label>
            标签
            <input
              value={form.tags}
              onChange={(event) => onChange({ ...form, tags: event.target.value })}
              placeholder="护肤, 夏季"
            />
          </label>
          <label>
            封面文案
            <input
              value={form.cover_text}
              onChange={(event) => onChange({ ...form, cover_text: event.target.value })}
            />
          </label>
          <button className="primary-button" disabled={isBusy || !selectedAccountId || !form.title} type="submit">
            保存手动草稿
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
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            GPT 主题
            <input
              value={form.topic}
              onChange={(event) => onChange({ ...form, topic: event.target.value })}
              placeholder="例如：合肥直播预告、夏季护肤清单"
            />
          </label>
          <label>
            生成数量
            <select value={form.count} onChange={(event) => onChange({ ...form, count: event.target.value })}>
              <option value="1">1 版</option>
              <option value="2">2 版</option>
              <option value="3">3 版</option>
              <option value="4">4 版</option>
              <option value="5">5 版</option>
            </select>
          </label>
          <label>
            额外要求
            <textarea
              value={form.extra_requirements}
              onChange={(event) => onChange({ ...form, extra_requirements: event.target.value })}
              placeholder="例如：一版偏转化，一版偏种草；标题更口语化"
            />
          </label>
          <button className="secondary-button" disabled={isBusy || !selectedAccountId || !form.topic} type="submit">
            生成 GPT 文案
          </button>
        </form>
      </Panel>
      <Panel title="草稿审核">
        <div className="record-stack">
          {drafts.length ? (
            drafts.map((draft) => (
              <article className="record-card" key={draft.id}>
                <div>
                  <h3>{draft.title}</h3>
                  <p>{draft.body}</p>
                  <small>{draft.tags.join(", ") || "无标签"} / {statusLabel(draft.source)}</small>
                </div>
                <div className="record-actions">
                  <span className={`badge ${badgeTone(draft.review_status)}`}>
                    {statusLabel(draft.review_status)}
                  </span>
                  <button className="quiet-button" onClick={() => onCopy(draft.title)} type="button">
                    复制标题
                  </button>
                  <button className="quiet-button" onClick={() => onCopy(draft.body)} type="button">
                    复制正文
                  </button>
                  <button className="quiet-button" onClick={() => onCopy(draft.tags.join(", "))} type="button">
                    复制标签
                  </button>
                  <button className="quiet-button" onClick={() => onCopy(draft.cover_text)} type="button">
                    复制封面
                  </button>
                  <button className="quiet-button" onClick={() => onReview(draft.id, "approved")} type="button">
                    通过
                  </button>
                  <button className="quiet-button" onClick={() => onReview(draft.id, "rejected")} type="button">
                    拒绝
                  </button>
                  <button className="secondary-button" onClick={onOpenCreator} type="button">
                    打开创作者中心
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">暂无草稿。</div>
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
      <Panel title="排期已通过草稿">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <label>
            已通过草稿
            <select value={form.draft_id} onChange={(event) => onChange({ ...form, draft_id: event.target.value })}>
              <option value="">选择草稿</option>
              {approvedDrafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            排期时间
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(event) => onChange({ ...form, scheduled_at: event.target.value })}
            />
          </label>
          <button className="primary-button" disabled={isBusy || !form.draft_id || !form.scheduled_at} type="submit">
            保存排期
          </button>
        </form>
      </Panel>
      <Panel title="排期队列">
        <div className="record-stack">
          {publishTasks.length ? (
            publishTasks.map((task) => (
              <article className="record-card compact" key={task.id}>
                <div>
                  <h3>{accountMap.get(task.account_id) || task.account_id}</h3>
                  <p>{formatDate(task.scheduled_at)}</p>
                </div>
                <span className={`badge ${badgeTone(task.status)}`}>{statusLabel(task.status)}</span>
              </article>
            ))
          ) : (
            <div className="empty-state">暂无排期。</div>
          )}
        </div>
      </Panel>
    </section>
  );
}

function CompliancePage({ riskLogs }: { riskLogs: RiskLog[] }) {
  return (
    <Panel title="合规风险日志">
      <div className="risk-grid">
        {riskLogs.length ? (
          riskLogs.map((risk) => (
            <article className="risk-card" key={risk.id}>
              <div>
                <span className={`badge ${badgeTone(risk.severity)}`}>{statusLabel(risk.severity)}</span>
                <h3>{risk.risk_type}</h3>
                <p>{risk.message}</p>
              </div>
              <small>
                {risk.account_id || "全局"} / {risk.related_entity_type || "记录"} / {formatDate(risk.created_at)}
              </small>
            </article>
          ))
        ) : (
          <div className="empty-state">暂无风险日志。</div>
        )}
      </div>
    </Panel>
  );
}

function PublishRecordsPage({
  accounts,
  dashboardAnalysis,
  dashboardForm,
  dashboardRecords,
  analyticsForm,
  analyticsRecords,
  drafts,
  isBusy,
  publishForm,
  publishLogs,
  selectedAccountId,
  onAnalyticsChange,
  onAnalyticsSubmit,
  onAnalyzeDashboard,
  onDashboardChange,
  onDashboardSubmit,
  onPublishChange,
  onPublishSubmit,
  onSelect
}: {
  accounts: Account[];
  dashboardAnalysis: AiDashboardAnalysis | null;
  dashboardForm: DashboardForm;
  dashboardRecords: DashboardRecord[];
  analyticsForm: AnalyticsForm;
  analyticsRecords: AnalyticsRecord[];
  drafts: Draft[];
  isBusy: boolean;
  publishForm: { draft_id: string; published_at: string; note_url: string };
  publishLogs: PublishLog[];
  selectedAccountId: string;
  onAnalyticsChange: (value: AnalyticsForm) => void;
  onAnalyticsSubmit: () => void;
  onAnalyzeDashboard: () => void;
  onDashboardChange: (value: DashboardForm) => void;
  onDashboardSubmit: () => void;
  onPublishChange: (value: { draft_id: string; published_at: string; note_url: string }) => void;
  onPublishSubmit: () => void;
  onSelect: (value: string) => void;
}) {
  const accountMap = new Map(accounts.map((account) => [account.account_id, account.display_name]));
  const selectedDrafts = drafts.filter((draft) => !selectedAccountId || draft.account_id === selectedAccountId);
  const selectedDashboardRecords = dashboardRecords.filter(
    (record) => !selectedAccountId || record.account_id === selectedAccountId
  );

  return (
    <section className="page-grid">
      <Panel title="创作中心数据总览">
        <form
          className="form-grid two-column"
          onSubmit={(event) => {
            event.preventDefault();
            onDashboardSubmit();
          }}
        >
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            统计周期
            <select
              value={dashboardForm.period_label}
              onChange={(event) => onDashboardChange({ ...dashboardForm, period_label: event.target.value })}
            >
              <option value="近7日">近7日</option>
              <option value="近30日">近30日</option>
              <option value="自定义">自定义</option>
            </select>
          </label>
          <label>
            开始日期
            <input
              type="date"
              value={dashboardForm.period_start}
              onChange={(event) => onDashboardChange({ ...dashboardForm, period_start: event.target.value })}
            />
          </label>
          <label>
            结束日期
            <input
              type="date"
              value={dashboardForm.period_end}
              onChange={(event) => onDashboardChange({ ...dashboardForm, period_end: event.target.value })}
            />
          </label>
          <NumberField form={dashboardForm} label="曝光数" name="exposure_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="观看数" name="view_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="点赞数" name="like_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="评论数" name="comment_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="净涨粉" name="net_follower_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="新增关注" name="new_follow_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="封面点击率 %" name="cover_click_rate" onChange={onDashboardChange} />
          <NumberField
            form={dashboardForm}
            label="视频完播率 %"
            name="video_completion_rate"
            onChange={onDashboardChange}
          />
          <NumberField form={dashboardForm} label="收藏数" name="favorite_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="分享数" name="share_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="取消关注" name="unfollow_count" onChange={onDashboardChange} />
          <NumberField form={dashboardForm} label="主页访客" name="profile_visit_count" onChange={onDashboardChange} />
          <TextField form={dashboardForm} label="曝光环比" name="exposure_change" onChange={onDashboardChange} />
          <TextField form={dashboardForm} label="观看环比" name="view_change" onChange={onDashboardChange} />
          <TextField form={dashboardForm} label="点赞环比" name="like_change" onChange={onDashboardChange} />
          <TextField form={dashboardForm} label="评论环比" name="comment_change" onChange={onDashboardChange} />
          <TextField form={dashboardForm} label="粉丝环比" name="follower_change" onChange={onDashboardChange} />
          <TextField form={dashboardForm} label="封面点击率环比" name="cover_click_change" onChange={onDashboardChange} />
          <TextField
            form={dashboardForm}
            label="完播率环比"
            name="video_completion_change"
            onChange={onDashboardChange}
          />
          <TextField form={dashboardForm} label="主页访客环比" name="profile_visit_change" onChange={onDashboardChange} />
          <label className="full-span">
            备注
            <textarea
              value={dashboardForm.notes}
              onChange={(event) => onDashboardChange({ ...dashboardForm, notes: event.target.value })}
              placeholder="例如：来自小红书创作中心截图手动录入，某篇笔记异常拉高曝光"
            />
          </label>
          <button
            className="primary-button"
            disabled={isBusy || !selectedAccountId || !dashboardForm.period_start || !dashboardForm.period_end}
            type="submit"
          >
            保存总览数据
          </button>
        </form>
      </Panel>
      <Panel title="AI 运营建议">
        <div className="record-stack">
          <button
            className="primary-button"
            disabled={isBusy || !selectedAccountId || !selectedDashboardRecords.length}
            onClick={onAnalyzeDashboard}
            type="button"
          >
            根据最新数据生成建议
          </button>
          {dashboardAnalysis ? (
            <article className="record-card analysis-card">
              <div>
                <h3>{dashboardAnalysis.summary}</h3>
                <InsightList title="问题判断" items={dashboardAnalysis.diagnosis} />
                <InsightList title="优化建议" items={dashboardAnalysis.recommendations} />
                <InsightList title="下一步动作" items={dashboardAnalysis.next_actions} />
                <InsightList title="选题方向" items={dashboardAnalysis.content_angles} />
              </div>
            </article>
          ) : (
            <div className="empty-state">录入创作中心数据后，可生成面向当前账号人设的 AI 建议。</div>
          )}
        </div>
      </Panel>
      <Panel title="人工发布结果">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onPublishSubmit();
          }}
        >
          <AccountSelect accounts={accounts} selectedAccountId={selectedAccountId} onSelect={onSelect} />
          <label>
            草稿
            <select
              value={publishForm.draft_id}
              onChange={(event) => onPublishChange({ ...publishForm, draft_id: event.target.value })}
            >
              <option value="">选择草稿</option>
              {selectedDrafts.map((draft) => (
                <option key={draft.id} value={draft.id}>
                  {draft.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            发布时间
            <input
              type="datetime-local"
              value={publishForm.published_at}
              onChange={(event) => onPublishChange({ ...publishForm, published_at: event.target.value })}
            />
          </label>
          <label>
            笔记链接
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
            保存发布记录
          </button>
        </form>
      </Panel>
      <Panel title="单篇笔记数据">
        <form
          className="form-grid two-column"
          onSubmit={(event) => {
            event.preventDefault();
            onAnalyticsSubmit();
          }}
        >
          <label>
            发布记录
            <select
              value={analyticsForm.publish_log_id}
              onChange={(event) =>
                onAnalyticsChange({ ...analyticsForm, publish_log_id: event.target.value })
              }
            >
              <option value="">选择记录</option>
              {publishLogs.map((log) => (
                <option key={log.id} value={log.id}>
                  {accountMap.get(log.account_id) || log.account_id} / {formatDate(log.published_at)}
                </option>
              ))}
            </select>
          </label>
          <label>
            记录时间
            <input
              type="datetime-local"
              value={analyticsForm.recorded_at}
              onChange={(event) => onAnalyticsChange({ ...analyticsForm, recorded_at: event.target.value })}
            />
          </label>
          <NumberField form={analyticsForm} label="浏览量" name="views" onChange={onAnalyticsChange} />
          <NumberField form={analyticsForm} label="点赞" name="likes" onChange={onAnalyticsChange} />
          <NumberField form={analyticsForm} label="收藏" name="favorites" onChange={onAnalyticsChange} />
          <NumberField form={analyticsForm} label="评论" name="comments" onChange={onAnalyticsChange} />
          <button
            className="primary-button"
            disabled={isBusy || !analyticsForm.publish_log_id || !analyticsForm.recorded_at}
            type="submit"
          >
            保存数据
          </button>
        </form>
      </Panel>
      <Panel title="发布记录">
        <div className="record-stack">
          {publishLogs.length ? (
            publishLogs.map((log) => (
              <article className="record-card compact" key={log.id}>
                <div>
                  <h3>{accountMap.get(log.account_id) || log.account_id}</h3>
                  <p>{formatDate(log.published_at)}</p>
                  {log.note_url ? (
                    <a href={log.note_url} rel="noreferrer" target="_blank">
                      打开笔记
                    </a>
                  ) : null}
                </div>
                <span className="badge green">人工</span>
              </article>
            ))
          ) : (
            <div className="empty-state">暂无发布记录。</div>
          )}
        </div>
      </Panel>
      <Panel title="创作中心总览记录">
        <div className="record-stack">
          {selectedDashboardRecords.length ? (
            selectedDashboardRecords.map((record) => (
              <article className="record-card compact" key={record.id}>
                <div>
                  <h3>
                    {record.period_label} / {record.exposure_count.toLocaleString()} 曝光 /{" "}
                    {record.view_count.toLocaleString()} 观看
                  </h3>
                  <p>
                    点赞 {record.like_count} / 评论 {record.comment_count} / 收藏 {record.favorite_count} / 分享{" "}
                    {record.share_count}
                  </p>
                  <small>
                    封面点击率 {record.cover_click_rate}% / 完播率 {record.video_completion_rate}% / 主页访客{" "}
                    {record.profile_visit_count}
                  </small>
                </div>
                <span className="badge blue">
                  {record.period_start} - {record.period_end}
                </span>
              </article>
            ))
          ) : (
            <div className="empty-state">暂无创作中心总览数据。</div>
          )}
        </div>
      </Panel>
      <Panel title="单篇数据记录">
        <div className="record-stack">
          {analyticsRecords.length ? (
            analyticsRecords.map((record) => (
              <article className="record-card compact" key={record.id}>
                <div>
                  <h3>{record.views.toLocaleString()} 浏览</h3>
                  <p>
                    {record.likes} 点赞 / {record.favorites} 收藏 / {record.comments} 评论
                  </p>
                </div>
                <span className="badge blue">{formatDate(record.recorded_at)}</span>
              </article>
            ))
          ) : (
            <div className="empty-state">暂无数据记录。</div>
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
  form: Record<string, string>;
  label: string;
  name: string;
  onChange: (value: any) => void;
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

function TextField({
  form,
  label,
  name,
  onChange
}: {
  form: Record<string, string>;
  label: string;
  name: string;
  onChange: (value: any) => void;
}) {
  return (
    <label>
      {label}
      <input
        value={form[name]}
        onChange={(event) => onChange({ ...form, [name]: event.target.value })}
        placeholder="-40%"
      />
    </label>
  );
}

function InsightList({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="insight-list">
      <strong>{title}</strong>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>暂无。</p>
      )}
    </div>
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
    <Panel title="本地桌面设置">
      <div className="form-grid">
        <label>
          后端地址
          <input value={apiBaseUrl} onChange={(event) => onApiBaseUrlChange(event.target.value)} />
        </label>
        <div className="settings-row">
          <div>
            <strong>后端状态</strong>
            <span>{health ? `${health.service}: ${health.status}` : "未连接"}</span>
          </div>
          <button className="secondary-button" onClick={onRefresh} type="button">
            刷新
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
      账号
      <select value={selectedAccountId} onChange={(event) => onSelect(event.target.value)}>
        <option value="">选择账号</option>
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
              <span className={`badge ${badgeTone(item.status)}`}>{statusLabel(item.status)}</span>
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
