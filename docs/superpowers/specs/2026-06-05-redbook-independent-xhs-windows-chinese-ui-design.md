# RedBook 独立小红书窗口与中文界面设计

## 目标

为 RedBook 增加合规的多账号小红书工作模式：每个 RedBook 账号都可以打开一个独立的小红书官方创作者中心窗口，使用单独的持久浏览器会话，避免不同账号的登录状态混在一起。同时，将桌面软件所有用户可见文字改为中文，方便实际运营人员使用。

## 合规边界

这个功能只支持人工登录和人工发布。

允许做：

- 在软件内打开小红书官方创作者中心或发布页面。
- 每个 RedBook 账号使用独立的 Electron 持久会话分区。
- 由操作员手动登录、手动完成验证码或官方验证、手动发布内容。
- 为每个账号保存正常浏览器会话数据，例如 Cookie、LocalStorage、缓存等。
- 提供手动按钮，用于清除某一个账号的小红书登录状态。
- 提供草稿标题、正文、标签、封面文案的复制按钮，方便人工粘贴。

不允许做：

- 自动登录。
- 自动发布。
- 自动点击、自动填表、自动采集、自动点赞、自动评论、自动收藏、自动私信。
- 代理切换、设备指纹伪装、绕过风控、群控操作。
- 在 RedBook 中读取或保存小红书账号密码。

## 产品行为

### 账号工作台窗口

在 `账号` 页面，每个账号卡片增加两个按钮：

- `打开小红书工作台`
- `清除登录状态`

点击 `打开小红书工作台` 后，软件为该账号打开一个独立的 Electron 窗口。窗口标题使用账号显示名，例如：

```text
小红书工作台 - 品牌账号A
```

窗口打开的官方地址为：

```text
https://creator.xiaohongshu.com/
```

如果该账号还没有登录，小红书官方页面会显示自己的登录界面，操作员手动登录。如果已经登录，只要小红书官方仍认可这个登录态，窗口会继续保持登录。

### 持久会话隔离

每个账号使用稳定的 Electron 会话分区：

```text
persist:redbook-xhs-{account_id}
```

这样可以实现：

- 账号 A 和账号 B 不共享小红书 Cookie 或 LocalStorage。
- 关闭账号工作台后，下次打开仍然复用同一个会话分区。
- 登录态由 Electron 的持久会话数据保存。
- RedBook 不控制小红书服务器端的登录有效期。

如果小红书官方主动让登录态失效，操作员需要重新手动登录。RedBook 不会尝试绕过这个要求。

### 清除登录状态

`清除登录状态` 只清除当前账号对应会话分区的数据，包括：

- Cookie
- 存储数据
- Electron session API 支持清理的缓存

它不能影响其他 RedBook 账号。

清除前需要弹出确认：

```text
确认清除该账号的小红书登录状态？清除后需要重新手动登录。
```

清除成功后显示：

```text
已清除该账号的小红书登录状态。
```

### 中文界面

桌面软件所有用户可见文字都改成中文，包括：

- 登录/注册页面。
- 左侧导航。
- 页面标题。
- 表单标签。
- 按钮。
- 空状态文案。
- 软件自己生成的状态标签。
- 软件自己生成的错误提示。
- 设置页面和后端健康状态文案。
- 合规检查和人工发布辅助文案。

后端枚举值和数据库字段可以继续使用英文保存，但桌面端展示时需要映射成中文。例如：

- `active` -> `启用`
- `needs_review` -> `待审核`
- `approved` -> `已通过`
- `rejected` -> `已拒绝`
- `scheduled` -> `已排期`
- `blocked` -> `已阻止`
- `warning` -> `提醒`
- `manual` -> `人工`

## 技术架构

### Electron 主进程

在 `apps/desktop/electron/main.ts` 中增加 IPC 处理：

- `openXhsWorkbench(accountId, displayName)`
- `clearXhsSession(accountId)`

小红书窗口由 Electron 主进程创建，因为只有主进程能创建带独立会话分区的 `BrowserWindow`。

打开窗口时：

- `webPreferences.partition` 使用 `persist:redbook-xhs-${safeAccountId}`。
- 保持 `contextIsolation: true`。
- 保持 `nodeIntegration: false`。
- 不给小红书页面注入自动化 preload。
- 只打开官方创作者中心地址。

清除登录状态时：

- 找到同一个账号对应的 session partition。
- 清除该 partition 的存储数据。
- 如果 Electron 支持，也清除该 partition 的缓存。
- 将成功或失败结果返回给前端。

### Electron Preload

通过安全桥接暴露最小能力：

```ts
window.redbook.openXhsWorkbench(accountId, displayName)
window.redbook.clearXhsSession(accountId)
window.redbook.notifyPublishDue(message)
```

不暴露任何浏览器自动化能力。

### React 前端

`账号` 页面在账号卡片中调用这些桥接方法。

前端负责：

- 显示中文按钮。
- 清除登录状态前弹出确认。
- 显示 IPC 返回的成功或错误提示。
- 保持现有账号 API 数据逻辑不变。

### 类型声明

增加全局类型声明，让 TypeScript 能检查桥接方法：

```ts
interface Window {
  redbook?: {
    openXhsWorkbench(accountId: string, displayName: string): Promise<void>;
    clearXhsSession(accountId: string): Promise<void>;
    notifyPublishDue(message: string): Promise<void>;
  };
}
```

## 数据流程

1. 操作员在 RedBook 中创建账号档案。
2. 操作员点击 `打开小红书工作台`。
3. 前端把账号 ID 和账号显示名发送给 Electron 主进程。
4. 主进程使用 `persist:redbook-xhs-{account_id}` 创建独立窗口。
5. 操作员在官方小红书页面手动登录。
6. Electron 保存该官方页面的正常浏览器会话数据。
7. 下次打开同一账号工作台时，复用同一个会话分区。
8. 如果小红书官方仍认可登录态，则保持登录；如果官方要求重新登录，操作员手动登录。

## 错误处理

- 如果当前不是桌面版 Electron 环境，显示：`当前环境不支持小红书独立窗口，请使用桌面版。`
- 如果账号 ID 缺失，禁用小红书工作台按钮。
- 如果 IPC 操作失败，在页面中显示温和的错误提示。
- 如果清除登录状态成功，显示：`已清除该账号的小红书登录状态。`
- 如果小红书官方让用户退出登录，RedBook 不把它当作软件错误；官方页面会提示操作员重新登录。

## 测试与验收

后端：

- 现有后端测试继续通过。

桌面端：

- TypeScript 检查通过。
- Vite 构建通过。
- Electron TypeScript 构建通过。
- Windows 打包命令通过。

人工验收：

- 创建两个不同的 RedBook 账号。
- 分别点击两个账号的 `打开小红书工作台`。
- 确认打开两个独立窗口。
- 在两个窗口中分别手动登录不同的小红书账号。
- 关闭两个窗口后重新打开。
- 在小红书官方仍认可登录态的情况下，确认两个窗口分别保持自己的登录状态。
- 清除其中一个账号的登录状态。
- 确认只有该账号需要重新登录，另一个账号不受影响。

## 范围

本次包含：

- 独立持久小红书窗口。
- 每个账号单独清除登录状态。
- 桌面软件中文化。
- 使用说明更新。

本次不包含：

- 小红书页面内自动化操作。
- 小红书数据采集或同步。
- 小红书密码保存。
- 代理、设备、指纹相关能力。
- 保证小红书服务器永远不让登录态失效。

