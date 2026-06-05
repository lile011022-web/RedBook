# RedBook 独立小红书窗口与中文界面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-account persistent Xiaohongshu official workbench windows and convert the desktop app UI to Chinese.

**Architecture:** Electron main process owns Xiaohongshu windows and account-specific persistent sessions. The preload exposes a tiny safe bridge to the React renderer. The renderer adds Chinese account actions, maps local statuses to Chinese labels, and keeps backend records unchanged.

**Tech Stack:** Electron, React, TypeScript, Vite, FastAPI, pytest, Electron Builder.

---

## File Structure

- `apps/desktop/electron/main.ts`: add account-safe session partition helpers, Xiaohongshu workbench window creation, and session clearing IPC handlers.
- `apps/desktop/electron/preload.ts`: expose `openXhsWorkbench`, `clearXhsSession`, and existing notification bridge under `window.redbook`.
- `apps/desktop/src/electron.d.ts`: declare the safe bridge types for TypeScript.
- `apps/desktop/src/App.tsx`: localize visible UI text to Chinese, add account card workbench buttons, call bridge methods, map display statuses to Chinese.
- `apps/desktop/src/api/client.ts`: localize user-facing network fallback messages if needed.
- `apps/desktop/src/styles.css`: reuse current Apple-inspired styles; add only small account action spacing if needed.
- `docs/user-guide.md`: update Chinese instructions for independent Xiaohongshu windows, persistent login expectations, and session clearing.

---

### Task 1: Electron Xiaohongshu Window Bridge

**Files:**
- Modify: `apps/desktop/electron/main.ts`
- Modify: `apps/desktop/electron/preload.ts`
- Create: `apps/desktop/src/electron.d.ts`

- [ ] **Step 1: Write a static failing check for required bridge APIs**

Run:

```powershell
if ((Get-Content -Raw apps\desktop\electron\main.ts) -notmatch 'openXhsWorkbench') { Write-Output 'FAIL: missing openXhsWorkbench IPC'; exit 1 }
if ((Get-Content -Raw apps\desktop\electron\main.ts) -notmatch 'clearXhsSession') { Write-Output 'FAIL: missing clearXhsSession IPC'; exit 1 }
if ((Get-Content -Raw apps\desktop\electron\preload.ts) -notmatch 'window.redbook') { Write-Output 'FAIL: missing redbook preload bridge'; exit 1 }
```

Expected: fails before implementation with missing IPC/bridge messages.

- [ ] **Step 2: Add Electron main process helpers and IPC handlers**

Implement in `apps/desktop/electron/main.ts`:

```ts
import { app, BrowserWindow, ipcMain, Notification, session } from "electron";

const XHS_CREATOR_URL = "https://creator.xiaohongshu.com/";
const xhsWindows = new Map<string, BrowserWindow>();

function safePartitionId(accountId: string) {
  return accountId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function xhsPartition(accountId: string) {
  return `persist:redbook-xhs-${safePartitionId(accountId)}`;
}

function openXhsWorkbench(accountId: string, displayName: string) {
  if (!accountId) {
    throw new Error("缺少账号 ID，无法打开小红书工作台。");
  }

  const existingWindow = xhsWindows.get(accountId);
  if (existingWindow && !existingWindow.isDestroyed()) {
    existingWindow.focus();
    return;
  }

  const workbenchWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    title: `小红书工作台 - ${displayName || accountId}`,
    backgroundColor: "#f5f5f7",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: xhsPartition(accountId)
    }
  });

  xhsWindows.set(accountId, workbenchWindow);
  workbenchWindow.on("closed", () => xhsWindows.delete(accountId));
  void workbenchWindow.loadURL(XHS_CREATOR_URL);
}

async function clearXhsSession(accountId: string) {
  if (!accountId) {
    throw new Error("缺少账号 ID，无法清除登录状态。");
  }

  const targetSession = session.fromPartition(xhsPartition(accountId));
  await targetSession.clearStorageData();
  await targetSession.clearCache();
}

ipcMain.handle("openXhsWorkbench", (_event, accountId: string, displayName: string) => {
  openXhsWorkbench(accountId, displayName);
});

ipcMain.handle("clearXhsSession", async (_event, accountId: string) => {
  await clearXhsSession(accountId);
});
```

- [ ] **Step 3: Expose a minimal preload bridge**

Update `apps/desktop/electron/preload.ts` so it exposes:

```ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("redbook", {
  clearXhsSession: (accountId: string) => ipcRenderer.invoke("clearXhsSession", accountId),
  notifyPublishDue: (message: string) => ipcRenderer.invoke("notifyPublishDue", message),
  openXhsWorkbench: (accountId: string, displayName: string) =>
    ipcRenderer.invoke("openXhsWorkbench", accountId, displayName)
});
```

- [ ] **Step 4: Add renderer bridge types**

Create `apps/desktop/src/electron.d.ts`:

```ts
export {};

declare global {
  interface Window {
    redbook?: {
      clearXhsSession(accountId: string): Promise<void>;
      notifyPublishDue(message: string): Promise<void>;
      openXhsWorkbench(accountId: string, displayName: string): Promise<void>;
    };
  }
}
```

- [ ] **Step 5: Verify Task 1**

Run:

```powershell
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\typescript\bin\tsc' -p tsconfig.electron.json
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\typescript\bin\tsc' --noEmit
```

Expected: both commands exit 0.

---

### Task 2: Accounts Page Workbench Actions

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/styles.css`

- [ ] **Step 1: Write a static failing check for account actions**

Run:

```powershell
if ((Get-Content -Raw apps\desktop\src\App.tsx) -notmatch '打开小红书工作台') { Write-Output 'FAIL: missing workbench button'; exit 1 }
if ((Get-Content -Raw apps\desktop\src\App.tsx) -notmatch '清除登录状态') { Write-Output 'FAIL: missing clear-session button'; exit 1 }
```

Expected: fails before implementation.

- [ ] **Step 2: Add renderer action handlers**

Add handlers inside `App()`:

```ts
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
```

- [ ] **Step 3: Pass handlers to `AccountsPage`**

Extend `AccountsPage` props:

```ts
onClearXhsSession: (account: Account) => void;
onOpenXhsWorkbench: (account: Account) => void;
```

Pass from `App`:

```tsx
onClearXhsSession={clearAccountWorkbenchSession}
onOpenXhsWorkbench={openAccountWorkbench}
```

- [ ] **Step 4: Add account action buttons**

Inside each account card render:

```tsx
<div className="record-actions">
  <button className="secondary-button" onClick={() => onOpenXhsWorkbench(account)} type="button">
    打开小红书工作台
  </button>
  <button className="quiet-button" onClick={() => onClearXhsSession(account)} type="button">
    清除登录状态
  </button>
</div>
```

- [ ] **Step 5: Add compact spacing if needed**

In `apps/desktop/src/styles.css`, ensure `.record-actions` wraps:

```css
.record-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
```

- [ ] **Step 6: Verify Task 2**

Run:

```powershell
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\typescript\bin\tsc' --noEmit
```

Expected: exits 0.

---

### Task 3: Chinese UI Localization

**Files:**
- Modify: `apps/desktop/src/App.tsx`
- Modify: `apps/desktop/src/api/client.ts`

- [ ] **Step 1: Write a static failing check for remaining key English UI text**

Run:

```powershell
$content = Get-Content -Raw apps\desktop\src\App.tsx
$english = @('Dashboard','Accounts','Personas','Media','Drafts','Schedule','Compliance','Publish Records','Settings','Login','Register','Create account','No drafts yet.')
foreach ($item in $english) {
  if ($content -match [regex]::Escape($item)) { Write-Output "FAIL: English UI remains: $item"; exit 1 }
}
Write-Output 'PASS: key English UI text removed'
```

Expected: fails before localization.

- [ ] **Step 2: Replace navigation labels with Chinese page IDs**

Use:

```ts
const navItems = [
  "仪表盘",
  "账号",
  "人设",
  "素材",
  "草稿",
  "排期",
  "合规",
  "发布记录",
  "设置"
];
```

- [ ] **Step 3: Add status display helpers**

Add:

```ts
const statusLabels: Record<string, string> = {
  active: "启用",
  approved: "已通过",
  blocked: "已阻止",
  draft: "草稿",
  failed: "失败",
  manual: "人工",
  needs_review: "待审核",
  rejected: "已拒绝",
  reviewed: "已审核",
  scheduled: "已排期",
  warning: "提醒"
};

function statusLabel(status: string) {
  return statusLabels[status] || status;
}
```

Replace visible status rendering like `{draft.review_status}` with `{statusLabel(draft.review_status)}` while preserving raw values for API requests.

- [ ] **Step 4: Localize auth and shell copy**

Replace visible text with Chinese equivalents:

```text
Phase 5 workspace -> RedBook 工作台
Sign in to operate manual publishing workflows. -> 登录后开始人工发布工作流
Connect to the FastAPI backend... -> 连接 RedBook 后端，审核草稿，并只排期人工确认的内容。
API base URL -> 后端地址
Email -> 邮箱
Password -> 密码
Login -> 登录
Register -> 注册
Create account -> 创建账号
Working... -> 处理中...
Logout -> 退出登录
Backend health -> 后端状态
Not reachable -> 未连接
Refresh -> 刷新
```

- [ ] **Step 5: Localize page forms, buttons, and empty states**

Convert all user-facing English labels in account, persona, media, draft, schedule, compliance, publish records, analytics, and settings sections. Keep API field names unchanged in request bodies.

Examples:

```text
Create Account -> 创建账号
Display name -> 账号名称
Save persona -> 保存人设
Create manual draft -> 创建手动草稿
Generate AI Draft -> 生成 AI 草稿
Copy title -> 复制标题
Open creator -> 打开创作者中心
No drafts yet. -> 暂无草稿。
No scheduled tasks. -> 暂无排期。
```

- [ ] **Step 6: Localize client fallback errors**

In `apps/desktop/src/api/client.ts`, change fallback text:

```ts
return `${response.status} ${response.statusText}`;
```

to:

```ts
return `${response.status} ${response.statusText || "请求失败"}`;
```

Keep server-provided Chinese or English detail messages as-is.

- [ ] **Step 7: Verify Task 3**

Run the static check from Step 1 again, then:

```powershell
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\typescript\bin\tsc' --noEmit
```

Expected: static check passes; TypeScript exits 0.

---

### Task 4: User Guide Update

**Files:**
- Modify: `docs/user-guide.md`

- [ ] **Step 1: Write a static failing check for workbench documentation**

Run:

```powershell
if ((Get-Content -Raw docs\user-guide.md) -notmatch '打开小红书工作台') { Write-Output 'FAIL: missing workbench guide'; exit 1 }
if ((Get-Content -Raw docs\user-guide.md) -notmatch '清除登录状态') { Write-Output 'FAIL: missing session clearing guide'; exit 1 }
```

Expected: fails before documentation update.

- [ ] **Step 2: Add a section after account creation workflow**

Add:

```md
## 多账号小红书独立窗口

每个 RedBook 账号都可以打开自己的小红书官方工作台窗口。窗口使用独立持久会话，因此账号 A 和账号 B 的登录状态不会混在一起。

使用方式：

1. 进入 `账号` 页面。
2. 为每个账号创建 RedBook 账号档案。
3. 点击某个账号卡片上的 `打开小红书工作台`。
4. 在打开的小红书官方页面中手动登录。
5. 关闭窗口后，下次从同一个账号打开，会继续使用该账号的本地登录态。

如果小红书官方要求重新登录，需要按官方页面提示手动登录。RedBook 不会自动登录，也不会绕过官方验证。

如果要换号或清掉本地登录态，点击 `清除登录状态`。该操作只影响当前账号，不影响其他账号。
```

- [ ] **Step 3: Verify Task 4**

Run the static check from Step 1 again.

Expected: passes.

---

### Task 5: Full Verification, Packaging, And Sync

**Files:**
- Modified files from prior tasks.

- [ ] **Step 1: Run backend tests**

Run:

```powershell
python -m pytest -q
```

in `apps/api`.

Expected: `23 passed` with only known dependency warning if present.

- [ ] **Step 2: Run desktop checks**

Run:

```powershell
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\typescript\bin\tsc' --noEmit
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\vite\bin\vite.js' build
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\typescript\bin\tsc' -p tsconfig.electron.json
```

Expected: all exit 0.

- [ ] **Step 3: Run Windows package**

Run:

```powershell
& 'C:\Users\yvete\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\yvete\Documents\RedBook\node_modules\electron-builder\cli.js' --win
```

Expected: creates ignored installer under `apps/desktop/release`.

- [ ] **Step 4: Review safe changes**

Run:

```powershell
git status --short --ignored
git diff --check
rg -n "sk-[A-Za-z0-9]|password\s*=|JWT_SECRET=|S3_SECRET_ACCESS_KEY=" apps docs README.md .env.example
```

Expected: only intended source/docs changes are tracked; generated artifacts remain ignored; no real secrets are found.

- [ ] **Step 5: Commit and push**

Run:

```powershell
git add apps/desktop/electron/main.ts apps/desktop/electron/preload.ts apps/desktop/src/electron.d.ts apps/desktop/src/App.tsx apps/desktop/src/api/client.ts apps/desktop/src/styles.css docs/user-guide.md
git commit -m "Update: add independent XHS windows and Chinese UI"
git push
```

Expected: commit and push succeed on `codex/redbook-phase-0`.

## Self-Review

- Spec coverage: Covers independent Xiaohongshu windows, persistent per-account sessions, session clearing, Chinese UI, and user guide updates.
- Placeholder scan: No `TBD`, `TODO`, or ambiguous implementation-only steps remain.
- Type consistency: Bridge names are consistently `openXhsWorkbench`, `clearXhsSession`, and `notifyPublishDue`.
- Compliance boundary: Plan opens official pages and persists normal sessions only; no automatic login, publishing, scraping, proxy, device spoofing, or risk-control bypass is included.

