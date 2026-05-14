# RUN-001 Subagent Dispatch

Each lane must use its own dashboard process, browser context, and state paths.

## Browser MCP Policy

- Browser-visible validation must use `mcp__chrome_devtools_isolated__`.
- Do not use shared `mcp__chrome_devtools__` from subagents.
- Do not install Playwright/Puppeteer or launch custom CDP fallback browsers for this run.
- If `mcp__chrome_devtools_isolated__` is unavailable in a lane, mark the lane's browser-dependent scenarios blocked with the exact MCP/tool error and stop browser work.
- Existing A1 through A6 partial artifacts from the earlier shared-profile attempt are preliminary. Rerun or reconcile them before marking any related task complete.

## A0-orchestrator

- Requested port: 48731
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/research

```bash
pnpm dev dashboard --no-open --json --port 48731 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A0-orchestrator/research"
```

## A1-shell

- Requested port: 48741
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/research

```bash
pnpm dev dashboard --no-open --json --port 48741 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A1-shell/research"
```

## A2-config

- Requested port: 48751
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/research

```bash
pnpm dev dashboard --no-open --json --port 48751 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A2-config/research"
```

## A3-auth

- Requested port: 48761
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/research

```bash
pnpm dev dashboard --no-open --json --port 48761 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A3-auth/research"
```

## A4-ops

- Requested port: 48771
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/research

```bash
pnpm dev dashboard --no-open --json --port 48771 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A4-ops/research"
```

## A5-data

- Requested port: 48781
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/research

```bash
pnpm dev dashboard --no-open --json --port 48781 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A5-data/research"
```

## A6-ui

- Requested port: 48791
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/research

```bash
pnpm dev dashboard --no-open --json --port 48791 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A6-ui/research"
```

## A7-i18n-security

- Requested port: 48801
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/research

```bash
pnpm dev dashboard --no-open --json --port 48801 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A7-i18n-security/research"
```

## A8-errors

- Requested port: 48811
- Config cwd: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/config
- Auth path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/auth.json
- Audit path: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/audit.json
- Research dir: /Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/research

```bash
pnpm dev dashboard --no-open --json --port 48811 --host 127.0.0.1 --config-cwd "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/config" --auth-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/auth.json" --audit-path "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/audit.json" --research-dir "/Users/openclaw/im-app/lark-bitable/.worktrees/005-dashboard-e2e-validation-run/.lark-bitable/dashboard-e2e/RUN-001/state/A8-errors/research"
```
