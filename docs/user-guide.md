# RedBook Compliance Ops 使用说明

RedBook Compliance Ops 是一个小红书内容团队的合规人工运营工作台。它帮助你管理账号、人设、草稿、素材、人工发布记录和基础数据录入，但不提供自动登录、自动发布、群控、代理切换、设备伪装、刷赞、刷评、私信自动化等能力。

## 1. 启动前准备

### 后端服务

桌面软件需要连接本机后端 API。默认地址是：

```text
http://127.0.0.1:8010
```

在项目目录启动后端：

```powershell
cd apps/api
python -m uvicorn app.main:app --reload --port 8010
```

确认后端是否正确：

```powershell
Invoke-RestMethod http://127.0.0.1:8010/health
```

正确结果应包含：

```json
{"status":"ok","service":"redbook-api"}
```

如果 `service` 不是 `redbook-api`，说明当前端口被其他项目占用了。建议使用本说明中的 `8010` 端口启动 RedBook 后端。

### 桌面软件

免安装试用版：

```text
apps/desktop/release/win-unpacked/RedBook Compliance Ops.exe
```

安装包：

```text
apps/desktop/release/RedBook Compliance Ops Setup 0.1.0.exe
```

如果 Windows 提示未知发布者，选择“更多信息”再选择“仍要运行”。这是因为当前安装包还没有代码签名证书。

## 2. 注册与登录

1. 打开软件。
2. API base URL 保持 `http://127.0.0.1:8010`。
3. 首次使用选择 `Register`，输入邮箱和密码，点击 `Create account`。
4. 已注册用户选择 `Login`，点击 `Login`。

默认输入框里的 `operator@example.com` 和 `password123` 只是示例，可以改成你自己的邮箱和密码。

## 3. 推荐使用流程

### Step 1: Accounts

创建小红书账号档案。这里记录的是运营档案，不会登录小红书。

填写：

- Display name：账号显示名
- Status：账号状态
- Health score：账号健康分，可用于人工判断风险

### Step 2: Personas

选择账号后维护人设。

填写：

- Positioning：账号定位
- Content direction：内容方向
- Tone：语气风格
- Disabled words：禁用词，用英文逗号分隔
- Publish frequency：发布频率

这些信息会用于草稿合规检查和 AI 草稿提示。

### Step 3: Media

录入素材元数据。

填写：

- Filename：素材文件名
- Content type：例如 `image/png`
- Preview URL：图片预览地址
- SHA256：可选，用于识别复用素材

如果填写了可访问的图片 URL，页面会显示图片预览。

### Step 4: Drafts

创建或生成草稿。

手动草稿：

- 选择账号
- 填写标题、正文、标签、封面文字
- 保存后可审核

AI 草稿：

- 先配置 OpenAI API Key
- 输入 Topic
- 生成后默认是 `needs_review`
- 必须人工点击 `Approve` 后才能排期

页面里的复制按钮只复制标题、正文、标签或封面文字，不会自动发布。

### Step 5: Schedule

只对已审核通过的草稿进行人工排期记录。

注意：

- 未审核 AI 草稿不能排期
- 多账号同一分钟冲突会被阻止
- 这里只是记录排期，不会自动打开平台或自动发布

### Step 6: Publish Records

人工在小红书发布完成后，回到软件记录发布结果。

填写：

- Draft：对应草稿
- Published time：实际发布时间
- Note URL：小红书笔记链接

### Step 7: Analytics Entry

手动录入数据表现。

填写：

- Views：浏览量
- Likes：点赞
- Favorites：收藏
- Comments：评论
- Recorded time：数据记录时间

### Step 8: Compliance

查看风险日志，例如：

- 未审核草稿尝试排期
- 多账号同一分钟排期冲突
- 文案相似度或禁用词提醒

## 4. 常见问题

### 报错：Not Found

通常是 API base URL 指向的端口上运行的不是 RedBook 后端。

处理方法：

1. 在 `apps/api` 目录用 `8010` 端口重新启动 RedBook 后端：

```powershell
python -m uvicorn app.main:app --reload --port 8010
```

3. 再打开软件登录。

### 白屏

请使用最新打包版本。旧版本曾经因为本地资源路径问题导致白屏，已修复。

### 登录失败

如果是首次使用，请先切换到 `Register` 创建账号。已经注册过的邮箱再次注册会失败，请切回 `Login`。

### 后端连接不上

检查：

- 后端是否启动
- API base URL 是否是 `http://127.0.0.1:8010`
- API base URL 指向的端口是否被其他程序占用
- `/health` 是否返回 `service: "redbook-api"`

## 5. 合规边界

本软件只支持人工运营辅助：

- 人工创建账号档案
- 人工维护人设
- AI 辅助草稿建议
- 人工审核
- 人工复制内容
- 人工发布后记录结果
- 人工录入数据

本软件不支持，也不应扩展为：

- 自动登录小红书
- 自动发布
- 群控
- 代理池或 IP 切换
- 设备指纹伪装
- 自动点赞、评论、收藏、私信
- 绕过平台风控
