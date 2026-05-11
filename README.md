# Lark Bitable CLI for AI Bug Triage

`lark-bitable` 是一個 TypeScript CLI，用來讓人類開發者和 AI Agent
讀取你指定的 Lark/Feishu 多維表格，從 bug 表單中查詢、篩選、排序、挑選
待處理項目，並產出有證據邊界的第一份 research report。

這個工具的設計目標不是「只服務某一張表」，而是讓使用者先用
`configure` 設定目前專案要使用的 Lark Base/Bitable URL，再由 CLI 和 AI
基於同一份本機設定工作。

## 功能範圍

- `configure`: 設定 Lark app、OAuth redirect URI、Base URL、workflow mode、bug 欄位對應、可選負責人欄位。
- `lark --login`: 使用 Lark SSO/OAuth 登入，取得可呼叫 API 的 token。
- `valid`: 檢查安裝、bootstrap skill、登入、Base 設定、欄位對應是否完成。
- `schema`: 預設只輸出欄位 headers；加上 `--json` 會輸出完整 schema、欄位型別、選項、mappings 與 sample 統計。
- `list`, `get`, `filter`, `search`: 讀取與查詢多維表格資料。
- `triage`: 依狀態和優先級挑出可處理 bug，讓使用者選擇要修的項目。
- `research`: 依已選 bug 和 repo 證據產出第一份分析報告。
- `verify`: QA mode 下讀取選定任務、探索 workspace 可安全執行的檢查，產出 QA verification report。
- `media download`: 使用登入 token 下載多維表格圖片或附件。
- `doctor --install-skill`: 安裝 AI Agent 可讀的 bootstrap skill。

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
- Lark app 已開通並發布 application identity 和 user identity 兩類必要 API 權限
- 目標多維表格允許這個應用讀取欄位與記錄

## 安裝 CLI

在此 repo 內安裝依賴並 build：

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

CLI 的設定和 auth 都放在同一個私有目錄：

```text
~/.lark-bitable/
├── config.json
└── auth.json
```

如果你是用 `pnpm` 全域安裝，可能會看到
`~/.config/pnpm/lark-bitable`。那是 pnpm 產生的可執行檔 shim，用來啟動
`lark-bitable` 指令，不是 CLI 設定檔。實際設定檔只看
`~/.lark-bitable/config.json`，auth 只看 `~/.lark-bitable/auth.json`。

舊版曾使用 `~/.lark-bitable-cli/`；新版第一次讀取時會把
`config.json` 和 `auth.json` 自動遷移到 `~/.lark-bitable/`。

`config.json` 儲存：

- Lark Base/Bitable URL
- app token、table id、view id
- Lark app id
- Lark app secret
- OAuth redirect URI
- 欄位對應，例如狀態、優先級、問題名稱
- actionable status，例如 `待处理`
- active workflow mode：`QA` 或 `Developer`
- mode-specific default owner（僅在你有設定 `--default-owner` 時）
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

## Lark Developer Console 設定

下面流程是在 Lark Developer Console 裡完成。Lark 後台的 UI 名稱可能會因語言或版本略有差異，但你需要完成的是這些實際設定。

### 1. 建立或打開自建應用

1. 打開 Lark Developer Console。
2. 進入你的企業或團隊。
3. 建立一個自建應用，或打開既有自建應用。
4. 記下 `App ID` 和 `App Secret`。

`App ID` 和 `App Secret` 不是你的個人帳密。它們用來讓 CLI 代表這個 Lark app 做 OAuth token exchange 和 application identity API 呼叫。

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

### 3. 開通應用身份權限

`lark-bitable configure` 需要用 app id/secret 去讀取多維表格欄位，讓人類可以用數字選欄位，而不是手打欄位名稱。

這一步使用的是 application identity，也就是 `tenant_access_token`。

請在 Lark Developer Console 的權限管理中加入 application identity 權限：

```text
base:field:read
```

如果要一次開齊、避免 configure 在讀取既有狀態值或記錄值時又遇到權限不足，也建議同時加入 application identity 的：

```text
bitable:app:readonly
```

這兩個不要理解成二選一。它們覆蓋的是不同讀取面：

- `base:field:read`：讓 configure 讀取欄位 metadata，顯示可選欄位。
- application identity `bitable:app:readonly`：讓 app 身份讀取多維表格資料；configure 在需要從既有記錄推導狀態值時會用到記錄讀取能力。

如果你只開 `base:field:read`，欄位選擇可能能跑，但 configure 需要讀取記錄值時仍可能失敗。如果你只開 application identity `bitable:app:readonly`，部分 Lark 權限策略下也可能能列欄位，但語義上缺少明確的欄位讀取授權。實務上建議 application identity 兩個都開。

### 4. 開通使用者身份權限

`lark-bitable lark --login` 使用瀏覽器 SSO/OAuth 登入，登入後用 user access token 讀取多維表格記錄。

請加入 user identity 權限：

```text
bitable:app:readonly
```

注意：這裡的 user identity `bitable:app:readonly` 和上一節的 application identity `bitable:app:readonly` 是不同授權上下文。名稱看起來一樣，但一個給 app/tenant token 用，一個給使用者 OAuth token 用。完整 CLI 流程需要兩類身份的權限都生效。

如果登入時看到：

```text
目前應用程式權限不足
bitable:app:readonly
錯誤碼：20027
```

代表 OAuth 登入需要的 user identity 權限沒有正式生效。這通常不是 redirect URI 問題。

### 5. 發布版本並等待審核

新增或修改權限後，必須發布新的 app version。

如果 Lark 顯示該權限需要企業審核，必須等審核通過後才會生效。只在 Console 裡看到權限被選中，不代表 API 已經可以用了。

### 6. 確認 app 可以讀取目標 Base

即使權限已發布，目標多維表格本身仍然可能不允許這個 app 讀取。

請到目標 Base/Bitable 裡確認：

1. 你本人可以打開該 Base URL。
2. URL 裡有 `base/<appToken>`、`table=<tableId>`，通常也有 `view=<viewId>`。
3. 如果企業或 Base 有 app access / 協作者 / 應用權限控制，請把該 Lark app 加入可讀取範圍。

如果 CLI 回傳 Lark `403` 或 `91403 Forbidden`，常見原因是：

- app 權限沒有發布或審核未通過
- application identity 權限和 user identity 權限只開了其中一種
- 目標 Base 沒有授權該 app 讀取
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

`待处理` 和 `待處理` 對程式來說是不同字串。若表格資料是簡體 `待处理`，`configure` 或 `triage --actionable-status` 也要使用 `待处理`。

## Workflow Mode

CLI 有兩個 mode：

- `Developer`: 預設 mode。保留既有 bug list/search/filter/triage/get/research 流程，重點是找出可處理 bug、讀完整 bug 單、下載附件或圖片、再做 repo research。
- `QA`: 用於驗證任務。重點是選定任務後執行 `verify`，CLI 會讀完整任務、列出 media references、從目前 workspace 找可安全執行的檢查，並把已執行、未執行、風險、假設和下一步分開報告。

設定 mode：

```bash
lark-bitable configure --mode Developer
lark-bitable configure --mode QA
```

切換 mode 不會清掉 Base URL、Lark app 設定、欄位對應或最近一次 selection。

負責人欄位是可選欄位。若你的表格有負責人欄位，可以在 configure 時指定：

```bash
lark-bitable configure --owner-field "負責人"
```

如果你真的需要 mode-specific default owner，再用參數設定：

```bash
lark-bitable configure --default-owner "openclaw"
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

5. CLI 用 app id/secret 嘗試讀取表格欄位。
6. 如果讀取成功，CLI 會用編號讓你選：

   ```text
   1. 当前状态
   2. 优先级
   3. 问题名称
   ```

7. 你只需要輸入數字，不需要手打欄位名稱。
8. CLI 會讓你選 actionable status，例如 `待处理`。
9. 互動式 configure 不會再詢問 default owner；只有你明確傳 `--default-owner` 才會更新。

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
  --status-field "当前状态" \
  --priority-field "优先级" \
  --title-field "问题名称" \
  --owner-field "负责人" \
  --actionable-status "待处理" \
  --json
```

QA mode 的非互動式切換：

```bash
lark-bitable configure --mode QA --json
```

QA mode 也可以設定預設負責人；如果你不需要負責人篩選，可以省略：

```bash
lark-bitable configure --mode QA --owner-field "负责人" --default-owner "qa-user" --json
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
.agents/skills/lark-bitable-cli/SKILL.md
```

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
```

狀態含義：

- `ready`: 所需前置條件都完成。
- `partial`: 本機設定存在，但 live access 或網路驗證不完整。
- `blocked`: 有必要設定缺失，命令不能安全執行。

`verify` workflow 只會在 active mode 是 `QA` 時 ready。`research` 是
Developer-oriented workflow；如果 active mode 是 `QA`，`valid --workflow research`
會給出 warning 並引導改用 `verify`。

如果看到 `blocked`，照輸出的 remediation 做。常見 remediation：

```bash
lark-bitable configure
lark-bitable lark --login
lark-bitable doctor --install-skill
lark-bitable triage
```

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
- 目前 configure 的欄位 mapping，例如 status、priority、title、owner
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
2. 使用 configure 裡的 status field。
3. 只保留 actionable status，例如 `待处理`。
4. 使用 priority field 和 priority order 排序。
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
`observedStatusValues`，使用表格實際出現的狀態值重新 configure 或明確傳入
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
lark-bitable research --out reports/selected-bug-research.md
```

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
lark-bitable help list
lark-bitable help schema
lark-bitable help get
lark-bitable help filter
lark-bitable help search
lark-bitable help triage
lark-bitable help research
lark-bitable help verify
lark-bitable help "media download"
lark-bitable help doctor
```

人類使用者應優先看 command-specific help。AI Agent 應優先用 `--json` 取得結構化輸出。

## 常見問題

### configure 顯示 field-discovery-required

代表互動式 configure 無法讀取欄位，因此不能提供數字選欄位。

請檢查：

- app id/app secret 是否正確
- application identity 是否有 `base:field:read`
- application identity 是否也有 `bitable:app:readonly`
- 權限是否已發布
- 企業審核是否已通過
- 目標 Base 是否授權 app 讀取

### configure 顯示 code=99991672

常見訊息：

```text
Access denied. One of the following scopes is required:
[bitable:app:readonly, bitable:app, base:field:read]
```

處理方式：

1. 到 Lark Developer Console > Permissions。
2. 新增 application identity `base:field:read`。
3. 同時新增 application identity `bitable:app:readonly`，避免 configure 後續讀取既有記錄值時再次缺權限。
4. 發布新版。
5. 等企業審核通過。
6. 確認 Base 允許 app 讀取。
7. 重新執行：

   ```bash
   lark-bitable configure
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

### list 或 valid 顯示 403 / 91403 Forbidden

請檢查：

- app 權限是否已發布並審核通過
- Base 是否允許 app 讀取
- application identity 是否同時開了 `base:field:read` 和 `bitable:app:readonly`
- user identity 是否開了 `bitable:app:readonly`
- 使用的 Lark app 是否就是 configure 裡填的 app
- 登入的是不是同一個 tenant

### triage 找不到資料

請檢查 actionable status 是否和表格資料完全一致。

例如表格是：

```text
待处理
```

但 configure 是：

```text
待處理
```

這會篩不到資料。重新 configure，或臨時指定：

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

這會刪除 app secret、Base 設定、auth token、最近 triage 選擇。

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
