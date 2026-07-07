# Lark Bitable CLI for AI Bug Triage

`lark-bitable` 是一個 TypeScript CLI，用來讓人類開發者和 AI Agent
讀取你指定的 Lark/Feishu 多維表格，從 bug 表單中查詢、篩選、排序、挑選
待處理項目，並產出有證據邊界的第一份 research report。

這個工具的設計目標不是「只服務某一張表」，而是讓使用者先用
`configure` 設定目前專案要使用的 Lark Base/Bitable URL，再由 CLI 和 AI
基於同一份本機設定工作。

## 目錄

- [功能範圍](#功能範圍)
- [前置條件](#前置條件)
- [安裝 CLI](#安裝-cli)
- [本機儲存位置](#本機儲存位置)
- [Audit Log](#audit-log)
- [Lark Developer Console 設定](#lark-developer-console-設定)
  - [1. 建立或打開自建應用](#1-建立或打開自建應用)
  - [2. 設定 OAuth Redirect URL](#2-設定-oauth-redirect-url)
  - [3. 開通使用者身份權限](#3-開通使用者身份權限)
  - [4. 發布版本並等待審核](#4-發布版本並等待審核)
  - [5. 確認 app 可以讀取目標 Base](#5-確認-app-可以讀取目標-base)
- [多維表格準備](#多維表格準備)
- [Workflow Mode](#workflow-mode)
- [第一次設定 CLI](#第一次設定-cli)
- [登入 Lark](#登入-lark)
- [Dashboard](#dashboard)
- [安裝 AI Bootstrap Skill](#安裝-ai-bootstrap-skill)
- [驗證完整設定](#驗證完整設定)
- [讀取多維表格](#讀取多維表格)
- [寫入多維表格](#寫入多維表格)
- [Bug Triage 工作流](#bug-triage-工作流)
- [QA Verification 工作流](#qa-verification-工作流)
- [產出 Research Report](#產出-research-report)
- [Help](#help)
- [常見問題](#常見問題)
- [開發驗證](#開發驗證)

## 功能範圍

```text
lark-bitable

AI-facing Lark Bitable CLI for bug triage, QA verification,
evidence handling, and guarded single-record writes.

USAGE
  lark-bitable <command> [flags]
  lark-bitable <command> --json
  lark-bitable help [command]

GLOBAL OUTPUT
  Human-readable output by default.
  Structured JSON output with --json for AI agents and scripts.

SETUP AND AUTH COMMANDS
  configure [LARK_BASE_URL]
    Store the active Base/Bitable source for this repo.
    Parses appToken, tableId, and viewId from the Base URL.
    Stores Lark app id, app secret, OAuth redirect URI, domain,
    and workflow mode.
    It does not store bug field settings, owner fields, priority fields,
    or actionable status defaults.

  doctor [--install-skill]
    Check local CLI health and setup completeness.
    Reports CLI bin/version, config path, auth path, active mode,
    source configuration, Lark app configuration, and bootstrap skill
    install/staleness.
    With --install-skill, installs the shipped AI bootstrap skill to Codex
    and Claude Code project skill directories:
      .agents/skills/lark-bitable/SKILL.md
      .claude/skills/lark-bitable/SKILL.md

  valid [--workflow global|inspect|triage|research|verify|write|dashboard]
    Validate whether the current setup can safely run a workflow.
    Reports ready, partial, or blocked readiness with issues,
    evidence, active mode, remediation steps, and next safe command.
    For write, reports write-permission-not-probed because valid does not
    perform a committed write and cannot prove write permission
    non-destructively.

  dashboard [--port <n>] [--no-open]
    Start a local-only web dashboard on port 48731, or the next available
    incremented port when occupied.
    No dashboard/web login is required. Lark-backed pages still require
    normal Lark login.
    Includes live configure fixes, live Lark login/logout, audit log search,
    playground runs, research report browsing, table context, and
    Traditional Chinese/English UI language switching.

  lark --login [--scope <scope>]
    Start browser SSO/OAuth login using configured Lark app settings.
    Stores access token, refresh token, expiry, domain, scopes,
    account/app metadata in ~/.lark-bitable/auth.json.
    For committed writes, use:
      lark-bitable lark --login --scope="bitable:app"

  lark --logout
    Clear local Lark auth state.

READ COMMANDS
  schema [--json] [--sample-limit <n>]
    Inspect the active table schema.
    Default output lists field headers for humans.
    JSON output includes field names, field/UI types, options,
    sample non-empty counts, and observed values.

  list [--limit <n>] [--field <name>] [--owner <name>]
    List records from the active source.
    Supports field selection, owner criteria, and positive limit metadata.

  get [record-id]
    Read one stable record id.
    Returns full visible fields and extracted media references.
    Use this before treating any list/triage candidate as authoritative.

  filter --field <name> (--equals <value> | --contains <value>)
    Return records matching one field criterion.
    Supports owner criteria and positive limit metadata.

  search <query> [--field <name>] [--owner <name>] [--limit <n>]
    Search visible text-like fields.
    Can restrict search to selected fields.

MEDIA COMMANDS
  media download <file-token> --out <path> [--extra <extra>] [--range <range>]
    Download a Bitable image/attachment file token using the stored
    authenticated Lark access token.
    Uses Drive media API:
      GET /open-apis/drive/v1/medias/:file_token/download
    Reports output path, size, content type, content disposition,
    and verified media evidence.

DEVELOPER WORKFLOW
  triage [--owner <name>] [--limit <n>] [--actionable-status <value>]
    Select bug/task candidates by optional owner, optional exact status,
    inferred priority order, and limit. Stores selected record id and
    selection evidence for follow-up research or QA verification.

  research [--evidence type:reference:excerpt] [-o|--out <path>]
    Produce a first evidence-backed research report from the latest
    triage selection plus provided evidence.
    Always writes canonical JSON under ~/.lark-bitable/research/.
    -o/--out creates a symbolic link to that canonical JSON when safe.
    Separates observed facts, assumptions, repository findings,
    likely causes, recommended fixes, risks, next actions, and evidence.
    Does not replace repository analysis or media inspection.

QA WORKFLOW
  configure --mode QA
    Activate QA mode.

  verify [record-id] [--checks auto|none|unit|integration|e2e] [--out <path>]
    Verify a selected Bitable task in QA mode.
    Reads the full task record, extracts media references, discovers safe
    workspace checks, runs only supported checks, and reports executed checks,
    skipped checks, manual next steps, assumptions, risks, and evidence.
    Un-downloaded media references are listed but not treated as inspected facts.

WRITE COMMANDS
  write --op create --field "欄位=值"
  write --op create --fields-json '{"欄位":"值"}'
  write --op update --record-id <id> --field "欄位=值"
  write --op update --record-id <id> --fields-json '{"欄位":"值"}'

    Preview one create or update operation against the active table.
    Without --confirm, no table content is changed.
    Preview output includes source, operation metadata, before values,
    planned field changes, evidence, and next safe command.

  write ... --confirm [--client-token <token>]
    Commit the previewed single-record create/update.
    Requires write-capable user auth scope:
      bitable:app
    Attachment fields can include existing {"file_token":"..."} objects or
    local file paths. Preview validates local files but does not upload them;
    preview also reports attachmentPlan, requestedEffect, replacementPolicy,
    and willReplaceExisting for attachment/photo fields.
    --confirm uploads local files with Drive media upload_all, then writes the
    returned [{"file_token":"..."}] values to the attachment field.
    Confirmed replacement of existing attachment/photo values requires
    --attachment-mode replace; default preserve mode blocks accidental
    replacement before upload.
    Rejects unknown fields, empty field sets, duplicate fields,
    create with record id, update without record id, invalid values,
    missing write permission, missing local attachment files, and direct
    attachment uploads larger than 20MB.
    If final confirmation is uncertain, reports partial/unknown and asks
    the user to run get or inspect the table before retrying.

NOT SUPPORTED
  - Managing Lark Developer Console permissions, app version publishing,
    enterprise approval, or Base collaborator settings.
  - delete, batch write, upsert, schema mutation, view mutation,
    or permission management.
  - Chunked attachment upload for local files larger than 20MB.
    Upload those files separately with a chunked media flow, then write the
    returned Bitable/Drive file_token values.
  - Treating un-downloaded images or attachments as inspected evidence.
    Use media download first, then inspect the local file.
```

## 前置條件

本機需要：

- Node.js `>=22`
- pnpm
- 可以登入 Lark Developer Console 的帳號
- 一個 Lark 自建應用
- 一張你有權限讀取的 Lark Base/Bitable 多維表格

Lark 端需要：

- Lark app 的 `App ID`
- Lark app 的 `App Secret`
- Lark app 已設定 OAuth Redirect URL
- Lark app 已開通並發布 user identity 必要 API 權限
- 目標多維表格允許登入使用者讀取欄位與記錄
- 如果要使用 `write --confirm`，目標多維表格也要允許登入使用者新增或更新記錄

## 安裝 CLI

從 npm 安裝正式版本：

```bash
npm install --global lark-bitable
```

安裝後會提供 `lark-bitable` 指令：

```bash
lark-bitable help
```

如果只想臨時執行，也可以用：

```bash
npx lark-bitable help
```

從原始碼開發時，在此 repo 內安裝依賴並 build：

```bash
pnpm install
pnpm build
pnpm test
```

本機開發時可以直接 link 成系統命令：

```bash
pnpm link --global
```

確認命令存在：

```bash
which lark-bitable
lark-bitable help
```

如果之前已安裝舊版，先在 repo 裡重新 build，再重新 link：

```bash
pnpm build
pnpm link --global
hash -r
lark-bitable help
```

若 shell 還抓到舊路徑，先查目前命令來源：

```bash
which lark-bitable
ls -l "$(which lark-bitable)"
```

## 本機儲存位置

CLI 的設定和 auth 都放在同一個私有目錄，但檔案是平行存放，不是巢狀存放：

```text
~/.lark-bitable/
├── config.json
├── auth.json
├── logs/
│   ├── audit.json
│   └── audit-YYYY-MM-DD.json
└── research/
    └── {name}-{datetime}.json
```

也就是：

- 設定檔：`~/.lark-bitable/config.json`
- Auth 檔：`~/.lark-bitable/auth.json`
- Audit log：`~/.lark-bitable/logs/audit.json`
- Research report library：`~/.lark-bitable/research/`

如果你是用 `pnpm` 全域安裝，可能會看到
`~/.config/pnpm/lark-bitable`。那是 pnpm 產生的可執行檔 shim，用來啟動
`lark-bitable` 指令，不是 CLI 設定檔。實際設定檔只看
`~/.lark-bitable/config.json`，auth 只看 `~/.lark-bitable/auth.json`。

舊版如果留下舊 Conf 位置的設定檔，新版第一次讀取時會把它遷移成
`~/.lark-bitable/config.json`。Auth 固定使用 `~/.lark-bitable/auth.json`。

`config.json` 儲存：

- Lark Base/Bitable URL
- app token、table id、view id
- Lark app id
- Lark app secret
- OAuth redirect URI
- active workflow mode：`QA` 或 `Developer`
- 最近一次 triage 選擇

`auth.json` 儲存：

- access token
- refresh token
- token 過期時間
- domain
- scopes
- account/app metadata

不要把 `config.json` 或 `auth.json` 貼到 issue、聊天或 report 裡。裡面可能有
`appSecret`、`accessToken`、`refreshToken`。

## Audit Log

每次執行 `lark-bitable` command 都會寫入本機 audit log：

```text
~/.lark-bitable/logs/audit.json
```

`audit.json` 是目前日期的 active log。它不做 pretty format，也不是包成
`entries` 陣列；每一行就是一筆 compact JSON object，方便 append，也避免每次
command 都重寫整個檔案。

每筆 entry 會記錄 command 名稱、redacted argv、狀態、時間、duration、source、
auth 摘要、mode、issues、evidence summary、data snapshot，以及錯誤資訊。CLI
會用類似 logrotate 的方式管理生命週期：跨日寫入時，前一天的 active
`audit.json` 會 rotate 成 `audit-YYYY-MM-DD.json`；每次 append 會刪除超過 14
天保留範圍的 rotated audit 檔。保留範圍以日期計算，包含今天在內最近 14 天。

Audit log 只儲存 redacted 結構化摘要。常見 secret 會被遮蔽，包括 app secret、
access token、refresh token、authorization bearer、OAuth code、client token，以及
JSON snapshot 裡名稱像 token/secret/code/authorization 的欄位。

Audit log 目錄權限會設定為 `0700`，檔案權限會設定為 `0600`。如果 audit log
寫入失敗，原本的 CLI command 不會被擋下；CLI 只會在 stderr 顯示
`warning: audit log write failed ...`。如果既有 `audit.json` 不是合法的逐行 JSON
entry，且也不是舊版可遷移的 wrapped audit JSON，CLI 不會覆寫它，避免破壞可能需要人工檢查的檔案。

進階測試或 automation 可以用隱藏參數或環境變數改寫 audit log 位置：

```bash
lark-bitable list --json --audit-path /tmp/lark-bitable-audit.json
LARK_BITABLE_AUDIT_PATH=/tmp/lark-bitable-audit.json lark-bitable list --json
```

Dashboard 的 Audit Log 頁面會讀取 active `audit.json` 和 rotated
`audit-YYYY-MM-DD.json`，支援依 command、status、issue、文字與 evidence/error
狀態查詢。顯示前會再套用 redaction；malformed 或無法讀取的檔案會列為 skipped，
不會被當成成功的空結果。

## Lark Developer Console 設定

下面流程是在 Lark Developer Console 裡完成。Lark 後台的 UI 名稱可能會因語言或版本略有差異，但你需要完成的是這些實際設定。

### 1. 建立或打開自建應用

1. 打開 Lark Developer Console。
2. 進入你的企業或團隊。
3. 建立一個自建應用，或打開既有自建應用。
4. 記下 `App ID` 和 `App Secret`。

`App ID` 和 `App Secret` 不是你的個人帳密。它們用來讓 CLI 透過這個 Lark app 做 OAuth token exchange 和 token refresh。

### 2. 設定 OAuth Redirect URL

進入應用的安全設定頁，找到 OAuth redirect URL 相關設定，新增：

```text
http://127.0.0.1:14543/callback
```

注意：

- 這個 URL 必須和 CLI 使用的 redirect URI 完全一致。
- host、port、path 都要一致。
- `http://127.0.0.1:14543/callback` 和 `http://localhost:14543/callback` 不算同一個。
- 不要把 `/event?tab=callback` 的 event callback URL 當成 OAuth redirect URL。
- Event callback 是 Lark 事件推送設定；這個 CLI 登入使用的是 OAuth redirect URL。

### 3. 開通使用者身份權限

`configure` 只儲存 Base URL、Lark app 設定和 workflow mode；讀取 schema、
records、triage、verify、write 會使用 `lark-bitable lark --login` 取得的使用者
OAuth token。

`lark-bitable lark --login` 使用瀏覽器 SSO/OAuth 登入，登入後用 user access token 讀取多維表格記錄。

請加入 user identity 權限：

```text
bitable:app:readonly
```

如果你要使用 `write --confirm` 新增或更新記錄，也需要加入 Lark Developer
Console 中對應的 user identity 多維表格寫入權限。不同租戶或 Console 語系可能顯示為
「多維表格讀寫」或類似名稱；重點是該權限必須允許 record create/update，而不是只有
readonly。權限新增後同樣要發布新版並等待審核通過。

使用 write app 登入時，請明確要求讀寫 scope：

```bash
lark-bitable lark --login --scope="bitable:app"
```

如果你之前已經用 `bitable:app:readonly` 登入，既有 token 不會自動升權；請在 write
權限發布並審核通過後重新登入一次：

```bash
lark-bitable lark --logout --yes
lark-bitable lark --login --scope="bitable:app"
```

注意：`App ID` / `App Secret` 用於 OAuth token exchange 和 refresh，不代表
CLI 會在 configure 階段用 app 身份讀表或保存 bug 欄位設定。

如果登入時看到：

```text
目前應用程式權限不足
bitable:app:readonly
錯誤碼：20027
```

代表 OAuth 登入需要的 user identity 權限沒有正式生效。這通常不是 redirect URI 問題。

### 4. 發布版本並等待審核

新增或修改權限後，必須發布新的 app version。

如果 Lark 顯示該權限需要企業審核，必須等審核通過後才會生效。只在 Console 裡看到權限被選中，不代表 API 已經可以用了。

### 5. 確認 app 可以讀取目標 Base

即使權限已發布，目標多維表格本身仍然可能不允許登入使用者或這個 app 讀取。

請到目標 Base/Bitable 裡確認：

1. 你本人可以打開該 Base URL。
2. URL 裡有 `base/<appToken>`、`table=<tableId>`，通常也有 `view=<viewId>`。
3. 如果企業或 Base 有 app access / 協作者 / 應用權限控制，請把該 Lark app 加入可讀取範圍。

如果 CLI 回傳 Lark `403` 或 `91403 Forbidden`，常見原因是：

- app 權限沒有發布或審核未通過
- user identity 權限沒有發布或審核未通過
- 目標 Base 沒有授權登入使用者讀取，或 write 場景沒有授權新增/更新
- app id/app secret 填錯
- 使用了錯誤 tenant 或錯誤 Lark domain

## 多維表格準備

這個 CLI 不要求你的欄位固定叫某個名字，但 bug triage 至少需要能對應以下欄位：

- 問題標題欄位，例如 `問題名稱`、`標題`、`Title`
- 狀態欄位，例如 `当前状态`、`狀態`、`Status`
- 優先級欄位，例如 `优先级`、`優先級`、`Priority`

建議額外準備：

- 負責人欄位
- 復現步驟欄位
- 預期行為欄位
- 實際行為欄位
- 相關連結欄位
- 備註欄位

狀態值要和設定一致。舉例：

```text
待处理
待處理
处理中
已完成
```

`待处理` 和 `待處理` 對程式來說是不同字串。若表格資料是簡體 `待处理`，
`triage --actionable-status` 也要使用 `待处理`。

## Workflow Mode

CLI 有兩個 mode：

- `Developer`: 預設 mode。保留既有 bug list/search/filter/triage/get/research 流程，重點是找出可處理 bug、讀完整 bug 單、下載附件或圖片、再做 repo research。
- `QA`: 用於驗證任務。重點是選定任務後執行 `verify`，CLI 會讀完整任務、列出 media references、從目前 workspace 找可安全執行的檢查，並把已執行、未執行、風險、假設和下一步分開報告。

設定 mode：

```bash
lark-bitable configure --mode Developer
lark-bitable configure --mode QA
```

切換 mode 不會清掉 Base URL、Lark app 設定或最近一次 selection。

負責人篩選是單次查詢參數。若你的表格有常見負責人欄位，例如 `負責人`、
`负责人`、`處理人`、`处理人`、`owner` 或 `assignee`，可以在查詢時指定：

```bash
lark-bitable list --owner "openclaw"
```

如果沒有負責人欄位，可以不填。`list`、`search`、`filter`、`triage`、`verify`
在指定 `--owner` 但缺少 owner field 時不會中止，會回傳
`ownerCriteria.applied=false` 並說明 owner filter 沒有被套用。

## 第一次設定 CLI

建議人類使用者直接跑互動式設定：

```bash
lark-bitable configure
```

CLI 會依序要求：

1. 貼上 Lark Base/Bitable URL。
2. 輸入 Lark app id。
3. 輸入 Lark app secret。
4. 輸入 OAuth redirect URI，預設會是：

   ```text
   http://127.0.0.1:14543/callback
   ```

5. 選擇 workflow mode：`Developer` 或 `QA`。

`configure` 不會詢問或儲存 bug 欄位設定、owner 欄位、priority 欄位或
actionable status。需要查欄位與狀態值時，請在登入後執行
`lark-bitable schema --json`；需要狀態篩選時，對該次 `triage` 傳
`--actionable-status`。

如果你之前已設定過，互動式 prompt 會顯示既有值：

```text
Paste the Lark Base/Bitable URL [https://...]:
```

按 Enter 會沿用既有值；重新輸入會覆蓋。

AI Agent 或 script 可以改用明確參數：

```bash
lark-bitable configure "$LARK_BASE_URL" \
  --mode Developer \
  --lark-app-id "$LARK_APP_ID" \
  --lark-app-secret "$LARK_APP_SECRET" \
  --lark-redirect-uri "http://127.0.0.1:14543/callback" \
  --json
```

QA mode 的非互動式切換：

```bash
lark-bitable configure --mode QA --json
```

清除目前 Base 設定：

```bash
lark-bitable configure --clear
```

## 登入 Lark

設定完成後登入：

```bash
lark-bitable lark --login
```

如果目前配置的是可寫入的 Lark app，且你要執行 `write --confirm`，登入時要明確帶入
write scope：

```bash
lark-bitable lark --login --scope="bitable:app"
```

只用一般 `lark-bitable lark --login` 或曾經以 `bitable:app:readonly` 登入時，保存下來的
user token 可能仍然只有 readonly scope，會導致 committed write 仍然 403。

預設是 SSO 模式：

```bash
lark-bitable lark --login --auth-mode sso
```

CLI 會：

1. 讀取 `~/.lark-bitable/config.json` 裡的 app id、app secret、redirect URI。
2. 啟動本機 callback server。
3. 開啟瀏覽器到 Lark OAuth/SSO 授權頁。
4. 等待 Lark redirect 回：

   ```text
   http://127.0.0.1:14543/callback
   ```

5. 取得 callback code。
6. 用 app id/app secret 換 token。
7. 把登入狀態寫入：

   ```text
   ~/.lark-bitable/auth.json
   ```

如果你在無法開瀏覽器或無法 callback 的環境，也可以使用 authorization code 模式：

```bash
lark-bitable lark --login \
  --auth-mode code \
  --app-id "$LARK_APP_ID" \
  --code "<authorization-code>"
```

登出：

```bash
lark-bitable lark --logout
```

## 安裝 AI Bootstrap Skill

這個工具是給 AI Agent 使用的，所以需要安裝 bootstrap skill，讓 AI 知道應該先檢查設定、不能亂猜資料、report 必須引用證據。

在目前 repo 執行：

```bash
lark-bitable doctor --install-skill
```

預設會安裝到：

```text
.agents/skills/lark-bitable/SKILL.md
.claude/skills/lark-bitable/SKILL.md
```

`.agents/skills` 供 Codex 使用，`.claude/skills` 供 Claude Code 使用。若只想檢查或安裝單一 agent 的目錄，可用進階參數 `--skill-dir <dir>` 指定。

之後檢查：

```bash
lark-bitable doctor
```

`doctor` 會檢查：

- CLI 是否可用
- bootstrap skill 是否存在
- source 是否已設定
- auth 是否存在

## 驗證完整設定

完成 Lark Developer Console、Base、configure、login、skill install 後，跑：

```bash
lark-bitable valid
lark-bitable valid --workflow inspect
lark-bitable valid --workflow triage
lark-bitable valid --workflow research
lark-bitable valid --workflow verify
lark-bitable valid --workflow write
lark-bitable valid --workflow dashboard
```

狀態含義：

- `ready`: 所需前置條件都完成。
- `partial`: 本機設定存在，但 live access 或網路驗證不完整。
- `blocked`: 有必要設定缺失，命令不能安全執行。

`verify` workflow 只會在 active mode 是 `QA` 時 ready。`research` 是
Developer-oriented workflow；如果 active mode 是 `QA`，`valid --workflow research`
會給出 warning 並引導改用 `verify`。

`write` workflow 會另外檢查寫入前置條件。缺少 auth 或 source 會 blocked。
`valid --workflow write` 不會做破壞性 committed write，所以無法用 non-destructive
方式證明 write permission；在這種情況會回報 `partial` 和
`write-permission-not-probed`。這個 partial 只代表 `valid` 沒有 probe 寫入權限，
不會讓 `list`、`get`、`schema`、`triage`、`research`、`verify` 失效。

`dashboard` workflow 只檢查本機 dashboard 是否能啟動，以及 config/auth/audit/research
目錄是否足以顯示狀態。缺少 Lark auth 或 source 不會阻止 dashboard 啟動，但會讓
Lark-backed 頁面顯示 partial/blocked remediation。

如果看到 `blocked`，照輸出的 remediation 做。常見 remediation：

```bash
lark-bitable configure
lark-bitable lark --login
lark-bitable doctor --install-skill
lark-bitable triage
```

## Dashboard

啟動本機 dashboard：

```bash
lark-bitable dashboard
```

預設會綁定 `127.0.0.1:48731`。如果 `48731` 被佔用，會依序嘗試
`48732`、`48733`，直到找到可用 port。無法或不想自動開瀏覽器時：

```bash
lark-bitable dashboard --no-open --json
```

Dashboard 是本機 web UI，不需要 dashboard/web 帳密登入；這不代表跳過 Lark OAuth。
讀取或寫入 Lark-backed 資料仍需要用 `lark-bitable lark --login` 或 dashboard 的
Lark Login 頁面完成 Lark 授權。

當 dashboard service 正在執行時，CLI 指令和 dashboard 內的 action 會透過本機
WebSocket 把 redacted live activity 與 state invalidation 推到已連線的瀏覽器 tab。
Overview、Configuration、Lark Login、Audit Log、Playground、Research、Source Table
都會依受影響的 surface 即時 refresh，不需要手動 reload。

如果 dashboard 沒啟動、runtime session 已 stale、或本機 live channel 暫時不可達，
CLI 指令仍照常執行，不會因為 live update 失敗多印 warning，也不會改變指令本身的
status、issues、evidence 或 audit entry。

Dashboard v1 提供：

- Live Configure：直接修正 Base URL、Lark app 設定與 mode，儲存後即時重新跑 readiness。
- Live Lark Login：啟動 Lark OAuth URL、查詢登入 flow 狀態、登出本機 auth，不顯示 access token、refresh token、OAuth code 或 app secret。
- Audit Log：查詢 active/rotated audit entries，檢視 sanitized detail，並顯示 malformed/skipped files。
- Playground：從 UI 執行支援的 CLI workflow。`write` 預設保持 preview-first，除非明確確認，否則不提交 mutation。
- Research Library：瀏覽 `~/.lark-bitable/research/` 的 canonical JSON reports，保留 observed facts、assumptions、analysis、risks、next actions 與 evidence 分段。
- Table Context：顯示目前 source/mode/auth/readiness、field metadata、sampled values 和 recent records；缺少 auth/source 時顯示 blocked/partial remediation。
- Language Switcher：dashboard-owned UI 文字支援繁體中文與英文切換，偏好只存 browser web cache。Lark 欄位名、record values、audit snapshots、command output、檔案路徑和 research report 內容不會被翻譯。

Live update 行為補充：

- 連線中的 tab 會看到 `connected`、`stale`、`reconnecting`、`fallback` 狀態。
- 斷線後重新連回時，dashboard 會以現有 HTTP API 重新抓 authoritative state 做 catch-up，不會把錯過的事件偽裝成已 live-deliver。
- unsaved configuration draft、Audit/Research 的已選 detail、Playground 的 command/response tab/run history、Table 的 filter 與 active tab 會在 live refresh 時盡量保留。

## 讀取多維表格

先理解目前表格 schema：

```bash
lark-bitable schema
```

`schema` 預設只回傳：

- 欄位 headers（編號清單）

若需要完整資料，再加 `--json`：

```bash
lark-bitable schema --json
```

`schema --json` 會回傳：

- 欄位名稱
- 欄位 type / UI type
- 單選或多選選項
- 少量 sample records 中的非空統計與 observed values

當 AI Agent 不確定欄位名稱、狀態值、owner 欄位或表格語系時，必須先跑
`lark-bitable schema --json`，再決定 `filter`、`search`、`triage` 的參數。
不要用 `待處理` / `待处理` 或 `狀態` / `当前状态` 這類語系猜測代替 schema。

列出記錄：

```bash
lark-bitable list --limit 20
```

取得單筆記錄：

```bash
lark-bitable get <record-id>
```

下載多維表格圖片或附件素材：

```bash
lark-bitable media download <file-token> --out ./evidence/asset.bin
```

`media download` 使用 Lark 官方 Drive media 下載 API：

```text
GET /open-apis/drive/v1/medias/:file_token/download
```

這個請求會使用 `~/.lark-bitable/auth.json` 裡的 Lark access token
發送 `Authorization: Bearer <token>`。不要直接匿名打開從多維表格複製出來
的圖片或附件 URL，因為那可能拿到權限頁、redirect 或錯誤內容，而不是實際
檔案。

如果目標 Base 啟用了進階權限，Lark 可能要求 media `extra` 查詢參數。這時
使用：

```bash
lark-bitable media download <file-token> \
  --extra '<extra-from-lark-record-or-api>' \
  --out ./evidence/asset.bin
```

下載成功後，請先打開本機檔案確認內容，再把它當成 research report 的圖片
或附件證據。下載失敗時只能記錄失敗原因，不能描述未看到的圖片內容。

篩選：

```bash
lark-bitable filter --field "当前状态" --equals "待处理" --limit 20
```

搜尋：

```bash
lark-bitable search "login error" --limit 20
```

依負責人查詢：

```bash
lark-bitable list --owner "openclaw" --limit 10
lark-bitable search "群聊" --owner "openclaw" --limit 10
lark-bitable filter --field "当前状态" --equals "待处理" --owner "openclaw" --limit 10
```

所有查詢型命令的 `--limit` 都必須是正整數。limit 會在 owner、search/filter、
actionable status、priority sort 等條件之後才套用。

所有 record 讀取命令都需要：

- 已有 `~/.lark-bitable/config.json`
- 已有有效 `~/.lark-bitable/auth.json`
- Lark app 權限已生效
- 目標 Base 允許讀取

## 寫入多維表格

Committed write 需要 user access token 具備 write scope。若目前 app 已在 Lark Developer
Console 開通並發布 user identity 的多維表格讀寫權限，請先用以下方式登入：

```bash
lark-bitable lark --login --scope="bitable:app"
```

如果原本是 readonly token，請先重新登入；否則 `write --confirm` 仍會用舊 token
發出請求。

`write` 支援兩種單筆操作：

```bash
lark-bitable write --op create --field "標題=新增登入錯誤" --field "狀態=待處理"
lark-bitable write --op update --record-id recxxxx --field "狀態=處理中"
```

預設永遠是 preview，不會修改表格。preview 輸出會標示：

- `commitState=previewed`
- `confirmationStatus=not-written`
- 目標 source
- update 的 target record id 和 before values
- planned field changes
- 下一個可安全執行的 `--confirm` 指令

確認 preview 正確後，才加上 `--confirm`：

```bash
lark-bitable write --op create \
  --fields-json '{"標題":"新增登入錯誤","狀態":"待處理"}' \
  --client-token "manual-write-create-001" \
  --confirm \
  --json

lark-bitable write --op update \
  --record-id recxxxx \
  --fields-json '{"狀態":"處理中"}' \
  --confirm \
  --json
```

Attachment 欄位支援兩種值：

- 已有 token：`{"附件":[{"file_token":"boxcn..."}]}`。
- 本地檔案路徑：`{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}`。

更新既有 record 的 attachment/photo 欄位前，先跑：

```bash
lark-bitable get recxxxx --json
```

如果欄位已經有附件，預設安全寫法是把既有 `file_token` objects 和新本地檔案路徑放在
同一個 array 裡：

```bash
lark-bitable write --op update \
  --record-id recxxxx \
  --fields-json '{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}' \
  --json

lark-bitable write --op update \
  --record-id recxxxx \
  --fields-json '{"附件":[{"file_token":"boxcnexisting"},"./evidence/fixed.png"]}' \
  --confirm \
  --json
```

本地檔案在 preview 階段只會檢查路徑與大小，不會上傳。加上 `--confirm`
後，`write` 會先呼叫 Lark Drive media upload API：

```text
POST /open-apis/drive/v1/medias/upload_all
```

成功取得 `file_token` 後，才把 attachment 欄位轉成
`[{"file_token":"..."}]` 寫入記錄。圖片副檔名會用 `parent_type=bitable_image`，
其他檔案用 `parent_type=bitable_file`，`parent_node` 使用目前 Base 的
`app_token`。直接 upload 使用 Lark `upload_all`，單檔上限是 20MB。

追加附件時要先 `get <record-id>`，把既有 attachment 欄位裡的
`file_token` objects 和新的本地檔案路徑一起放入同一個 `--fields-json`。
只傳新檔案會用新陣列取代該欄位的既有附件；preview 會在 `attachmentPlan`
標出 `requestedEffect=replace`、`replacementPolicy=preserve`、
`willReplaceExisting=true`，confirmed write 預設會在 upload 前阻擋。這種情況下
`nextSafeCommands` 不會再給 `--confirm` 指令，而是引導先 `get`、保留既有
`file_token` 後重新 preview。只有使用者明確要求替換時，才加
`--attachment-mode replace`。

輸入規則：

- `--op create|update` 必填。
- `--op update` 必須有 `--record-id`。
- `--op create` 不能帶 `--record-id`。
- `--field "欄位=值"` 可重複；值若是合法 JSON scalar/object/array 會以 JSON 解析，否則當字串。
- `--fields-json` 必須是 JSON object。
- Attachment/photo 欄位中的本地檔案路徑必須指向存在的 regular file。
- `--attachment-mode preserve|replace` 控制 attachment/photo confirmed write 的替換保護；
  預設 `preserve` 會阻擋意外覆蓋既有附件。
- `attachmentPlan.requestedEffect` 描述這次 requested field 對附件欄位的效果；
  `attachmentPlan.replacementPolicy` 描述 CLI 目前的保護策略。舊欄位
  `attachmentPlan.mode` 保留為 `requestedEffect` 的相容別名。
- 同一個欄位不能同時在多個輸入裡重複出現。
- `--client-token` 只適用於 committed create。

安全邊界：

- 沒有 `--confirm` 一律不會呼叫 create/update。
- 沒有 `--confirm` 一律不會 upload 本地附件。
- confirmed write 若會覆蓋既有 attachment/photo，必須顯式帶 `--attachment-mode replace`。
- preview 若偵測到 `willReplaceExisting=true` 且 `replacementPolicy=preserve`，
  `nextSafeCommands` 不會輸出 confirm 指令；先保留既有 `file_token` 重新 preview。
- 如果 upload 成功但 record write 失敗，輸出會保留已取得的 `file_token`，並在
  `nextSafeCommands` 提供用 token 重試 Bitable write 的命令；不要重新上傳同一個檔案。
- 未知欄位、空 field set、missing source/auth、missing target record 會在 commit 前中止。
- Lark 權限或欄位值拒絕會輸出 `confirmationStatus=failed`，不會宣稱表格已修改。
- 如果寫入 response 已回來但最終狀態無法確認，輸出會是 `status=partial` 和
  `confirmationStatus=unknown`，並要求先 `get` 或人工檢查表格，不要直接重試造成重複資料。
- 這個版本不支援 delete、batch write、upsert、schema mutation、view mutation 或權限管理。

## Bug Triage 工作流

先確認 triage 能跑：

```bash
lark-bitable valid --workflow triage
```

開始挑選 bug：

```bash
lark-bitable triage
```

當使用者從候選清單選定一筆 bug 後，AI Agent 必須先執行：

```bash
lark-bitable get <record-id>
```

`triage` / `list` / `search` / `filter` 的結果只能當候選摘要，不能取代完整
bug 單。若完整 bug 單內有圖片、附件或其他 media token，必須先用
`lark-bitable media download` 透過登入 token 下載並檢查內容，再開始對當前
repo 做 root cause research。

`triage` 會：

1. 讀取目前 Base 的 records。
2. 從常見欄位名稱推斷 title、status、priority、owner。
3. 如果有傳 `--actionable-status`，只保留完全相等的狀態值。
4. 使用內建 priority order 排序。
5. 顯示候選 bug 給使用者選。
6. 把選到的 bug snapshot 存到 config，供 `research` 使用。

若你只想臨時覆蓋 actionable status：

```bash
lark-bitable triage --actionable-status "待处理"
```

如果只想看指定負責人的候選項：

```bash
lark-bitable triage --owner "openclaw" --limit 10
```

如果 triage 顯示沒有 actionable records，先看輸出中的
`observedStatusValues`，使用表格實際出現的狀態值明確傳入
`--actionable-status`。不要用繁簡或語意猜測狀態值。

## QA Verification 工作流

先切到 QA mode：

```bash
lark-bitable configure --mode QA
lark-bitable valid --workflow verify
```

選一筆任務：

```bash
lark-bitable triage --limit 10
```

驗證最近一次 triage selection：

```bash
lark-bitable verify --checks auto --out reports/qa-verification.md
```

或指定 record id：

```bash
lark-bitable verify <record-id> --checks auto --json
```

`verify` 會：

1. 確認 active mode 是 `QA`。
2. 讀取選定任務完整 record。
3. 抽取圖片與附件 media references。
4. 讀取目前 workspace 的 `package.json` 等可觀察證據，尋找可安全執行的檢查。
5. 略過不安全、破壞性、沒有證據支持或不符合 `--checks` 範圍的檢查。
6. 把 executed checks、skipped checks、manual next steps、assumptions、risks 和 evidence 分開輸出。

如果你只想先產出不執行測試的 QA report：

```bash
lark-bitable verify <record-id> --checks none --json
```

`verify` 不會自動判讀圖片內容。若輸出包含 `mediaReferences`，必須使用
`lark-bitable media download` 下載並人工或工具檢查本機檔案，才能把圖片或附件內容
寫成事實。

## 產出 Research Report

先跑 triage 選一個 bug，然後：

```bash
lark-bitable research
lark-bitable research -o reports/current-research.json
```

每次執行都會寫入 canonical JSON：

```text
~/.lark-bitable/research/{name}-{datetime}.json
```

`-o` / `--out` 不再寫出另一份 Markdown；它會在安全且檔案系統支援時建立一個 symbolic
link 指向 canonical JSON。若指定路徑已存在且不是指向該 canonical report 的 symlink，
CLI 會保留 canonical JSON，並在輸出中回報 link failure。

report 會分開寫：

- observed facts
- assumptions
- analysis
- likely causes
- recommended fixes
- risks
- next actions
- evidence

工具要求 factual claim 必須能回到以下證據來源：

- bug record
- repository file
- command output
- user input
- runtime observation

未確認的原因必須保留為 assumption 或 unconfirmed，不應寫成事實。

## Help

每個命令都有 help：

```bash
lark-bitable help
lark-bitable help configure
lark-bitable help lark
lark-bitable help valid
lark-bitable help dashboard
lark-bitable help list
lark-bitable help schema
lark-bitable help get
lark-bitable help filter
lark-bitable help search
lark-bitable help triage
lark-bitable help research
lark-bitable help verify
lark-bitable help write
lark-bitable help "media download"
lark-bitable help doctor
```

人類使用者應優先看 command-specific help。AI Agent 應優先用 `--json` 取得結構化輸出。

## 常見問題

### schema、list 或 valid 顯示 code=99991672

常見訊息：

```text
Access denied. One of the following scopes is required:
[bitable:app:readonly, bitable:app, base:field:read]
```

處理方式：

1. 到 Lark Developer Console > Permissions。
2. 新增 user identity `bitable:app:readonly`。
3. 如果會使用 write，或錯誤訊息明確列出 `bitable:app`，也新增對應的 user identity 寫入權限。
4. 發布新版。
5. 等企業審核通過。
6. 確認 Base 允許登入使用者讀取；write 場景也要確認登入使用者可新增或更新記錄。
7. 重新登入後再執行原命令：

   ```bash
   lark-bitable lark --logout --yes
   lark-bitable lark --login
   ```

### login 顯示錯誤碼 20027

如果 Lark browser login 顯示缺少：

```text
bitable:app:readonly
```

請新增 user identity `bitable:app:readonly`，發布新版並等待審核通過，再重新登入：

```bash
lark-bitable lark --login
```

### login redirect URI 不對

請確認 Lark Developer Console 的 OAuth Redirect URL 是：

```text
http://127.0.0.1:14543/callback
```

並確認 `configure` 裡填的一模一樣。

不要使用：

```text
https://open.larksuite.com/app/<app-id>/event?tab=callback
```

那是 event callback 設定頁，不是 OAuth redirect URL。

### list、valid 或 write 顯示 403 / 91403 Forbidden

請檢查：

- app 權限是否已發布並審核通過
- Base 是否允許登入使用者讀取
- user identity 是否開了 `bitable:app:readonly`
- 如果是 `write --confirm`，user identity 是否也有可新增/更新記錄的多維表格寫入權限
- 如果是 `write --confirm`，是否已用 `lark-bitable lark --login --scope="bitable:app"`
  重新取得 write scope token，而不是沿用 `bitable:app:readonly` token
- 使用的 Lark app 是否就是 configure 裡填的 app
- 登入的是不是同一個 tenant

### triage 找不到資料

請檢查 actionable status 是否和表格資料完全一致。

例如表格是：

```text
待处理
```

但這次傳入的是：

```text
待處理
```

這會篩不到資料。請使用表格裡實際存在的值：

```bash
lark-bitable triage --actionable-status "待处理"
```

### 不想保留本機登入狀態

登出：

```bash
lark-bitable lark --logout
```

如果要完全清掉 CLI 狀態：

```bash
rm -rf ~/.lark-bitable
```

這會刪除 app secret、Base 設定、auth token、最近 triage 選擇和本機 audit log。

## 開發驗證

本 repo 的基本驗證：

```bash
pnpm format:check
pnpm test
pnpm build
git diff --check
```

快速流程驗證：

```bash
pnpm quickstart:validate
```
