# RedBook Independent XHS Windows And Chinese UI Design

## Goal

Add a compliant multi-account Xiaohongshu working mode to RedBook: each RedBook account can open its own independent Xiaohongshu official creator window, keep a separate persistent browser session, and continue manual publishing work without mixing login states. Also localize the desktop app user-facing text into Chinese so operators can use it naturally.

## Compliance Boundary

The feature must support manual login and manual publishing only.

Allowed:

- Open the official Xiaohongshu creator/publishing page in an app-managed window.
- Use a separate persistent Electron session partition per RedBook account.
- Let the operator manually log in, solve any official verification, and publish manually.
- Keep cookies, local storage, cache, and other normal browser session data for that account partition.
- Provide a manual button to clear one account's local Xiaohongshu session.
- Copy draft title/body/tags/cover text for the operator to paste manually.

Not allowed:

- Automatic login.
- Automatic publishing.
- Automatic clicking, form filling, scraping, likes, comments, favorites, or private messages.
- Proxy switching, device fingerprint spoofing, risk-control bypass, or batch-control behavior.
- Reading or storing Xiaohongshu account passwords in RedBook.

## Product Behavior

### Account Workbench Window

On the `Accounts` page, each account card gets:

- `打开小红书工作台`
- `清除登录状态`

Clicking `打开小红书工作台` opens a separate Electron `BrowserWindow` for that account. The window title uses the account display name, for example:

```text
小红书工作台 - 品牌账号A
```

The window loads:

```text
https://creator.xiaohongshu.com/
```

If the operator is not logged in, Xiaohongshu shows its own login page. The operator logs in manually. If already logged in, the official page should remain logged in as long as Xiaohongshu accepts the saved session.

### Persistent Session Isolation

Each account gets a stable Electron session partition:

```text
persist:redbook-xhs-{account_id}
```

This means:

- Account A and Account B do not share Xiaohongshu cookies or local storage.
- Closing and reopening the account workbench reuses the same partition.
- Login state is kept by Electron's persistent session data.
- RedBook does not control Xiaohongshu's server-side session expiry.

If Xiaohongshu invalidates a session, the operator must log in manually again. RedBook must not attempt to bypass that requirement.

### Clearing Login State

`清除登录状态` clears browser storage for that account's partition only:

- cookies
- storage data
- cache where available through Electron session APIs

It must not affect other RedBook accounts.

The UI should ask for confirmation before clearing:

```text
确认清除该账号的小红书登录状态？清除后需要重新手动登录。
```

### Desktop App Chinese Localization

All visible RedBook desktop UI text should be converted to Chinese, including:

- Login/register screen.
- Navigation items.
- Page titles.
- Form labels.
- Buttons.
- Empty states.
- Status labels where locally generated.
- Error messages created by the desktop app.
- Settings and backend health copy.
- Compliance and publishing helper copy.

Backend enum/status values can remain stored as English internally, but the desktop display should map common values to Chinese labels. Examples:

- `active` -> `启用`
- `needs_review` -> `待审核`
- `approved` -> `已通过`
- `rejected` -> `已拒绝`
- `scheduled` -> `已排期`
- `blocked` -> `已阻止`
- `warning` -> `提醒`
- `manual` -> `人工`

## Architecture

### Electron Main Process

Add IPC handlers in `apps/desktop/electron/main.ts`:

- `openXhsWorkbench(accountId, displayName)`
- `clearXhsSession(accountId)`

The main process owns Xiaohongshu windows because it can create Electron `BrowserWindow` instances with account-specific sessions.

Window creation:

- Use `partition: persist:redbook-xhs-${safeAccountId}` in `webPreferences`.
- Use `contextIsolation: true`.
- Use `nodeIntegration: false`.
- Do not attach preload automation for the Xiaohongshu page.
- Open official creator URL only.

Session clearing:

- Resolve the same partition.
- Clear storage data for that partition.
- Clear cache if supported.
- Return success/failure to the renderer.

### Electron Preload

Expose a minimal safe bridge:

```ts
window.redbook.openXhsWorkbench(accountId, displayName)
window.redbook.clearXhsSession(accountId)
window.redbook.notifyPublishDue(message)
```

No browser automation methods are exposed.

### React Renderer

The `Accounts` page calls the bridge methods from account cards.

Renderer responsibilities:

- Show Chinese buttons.
- Ask confirmation before clearing session.
- Show success/error messages returned from IPC.
- Keep existing API-driven account records unchanged.

### Types

Add a global declaration for the bridge so TypeScript can type-check usage:

```ts
interface Window {
  redbook?: {
    openXhsWorkbench(accountId: string, displayName: string): Promise<void>;
    clearXhsSession(accountId: string): Promise<void>;
    notifyPublishDue(message: string): Promise<void>;
  };
}
```

## Data Flow

1. Operator creates RedBook account record.
2. Operator clicks `打开小红书工作台`.
3. Renderer sends account ID and display name to Electron main process.
4. Main process opens a BrowserWindow with partition `persist:redbook-xhs-{account_id}`.
5. Operator manually logs in on official Xiaohongshu page.
6. Electron persists the official page's normal browser session data.
7. Later, operator opens the same account workbench and reuses the same session unless Xiaohongshu invalidated it.

## Error Handling

- If the desktop app runs in a browser without Electron bridge, show: `当前环境不支持小红书独立窗口，请使用桌面版。`
- If account ID is missing, disable the workbench buttons.
- If the IPC operation fails, show a calm inline alert with the failure message.
- If session clearing succeeds, show: `已清除该账号的小红书登录状态。`
- If Xiaohongshu logs the user out, RedBook should not treat it as an app error; the official page will ask the operator to log in again.

## Testing And Verification

Backend:

- Existing backend tests should still pass.

Desktop:

- TypeScript build must pass.
- Vite build must pass.
- Electron TypeScript build must pass.
- Windows package command must pass.

Manual verification:

- Open two different RedBook accounts.
- Click `打开小红书工作台` for both.
- Confirm two independent windows open.
- Log in manually to different Xiaohongshu accounts.
- Close and reopen both windows.
- Confirm each window keeps its own session when Xiaohongshu still considers the session valid.
- Clear one account's session.
- Confirm only that account needs to log in again, while the other remains unchanged.

## Scope

In scope:

- Independent persistent Xiaohongshu windows.
- Per-account session clearing.
- Chinese desktop UI text.
- User guide update for the new workflow.

Out of scope:

- Browser automation inside Xiaohongshu.
- Scraping or syncing Xiaohongshu data.
- Password storage.
- Proxy/device/fingerprint features.
- Guaranteed permanent login if Xiaohongshu server invalidates the session.

