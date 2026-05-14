import {
  DASHBOARD_LANGUAGE_STORAGE_KEY,
  dashboardLanguageCatalog,
} from "./i18n.js";

export function dashboardHtml(): string {
  return `<!doctype html>
<html lang="zh-TW">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lark Bitable Dashboard</title>
    <link rel="stylesheet" href="/assets/styles.css" />
  </head>
  <body id="lark-bitable-dashboard">
    <header class="hero">
      <div>
        <p class="eyebrow">local only · no dashboard login</p>
        <h1 data-i18n="appTitle">Lark Bitable Dashboard</h1>
        <p data-i18n="noWebLogin">本地 dashboard 不需要 web 登入。</p>
      </div>
      <label class="language">
        <span data-i18n="switchLanguage">語言</span>
        <select id="language-switcher" aria-label="Language">
          <option value="zh-TW">繁體中文</option>
          <option value="en">English</option>
        </select>
      </label>
    </header>
    <nav class="nav">
      <button data-page="overview" data-i18n="navOverview">總覽</button>
      <button data-page="config" data-i18n="navConfig">設定</button>
      <button data-page="auth" data-i18n="navAuth">Lark 登入</button>
      <button data-page="audit" data-i18n="navAudit">稽核紀錄</button>
      <button data-page="playground" data-i18n="navPlayground">Playground</button>
      <button data-page="research" data-i18n="navResearch">研究報告</button>
      <button data-page="table" data-i18n="navTable">資料表</button>
    </nav>
    <main class="grid">
      <section class="card" id="overview-panel"><h2 data-i18n="navOverview">總覽</h2><pre id="status-output">Loading...</pre></section>
      <section class="card" id="config-panel"><h2 data-i18n="navConfig">設定</h2><form id="config-form"><input name="sourceUrl" placeholder="Lark Base URL" /><input name="larkAppId" placeholder="Lark App ID" /><input name="larkAppSecret" placeholder="Lark App Secret" type="password" /><button data-i18n="saveConfig">儲存設定</button></form><pre id="config-output"></pre></section>
      <section class="card" id="auth-panel"><h2 data-i18n="navAuth">Lark 登入</h2><button id="auth-start">Start Lark Login</button><button id="auth-logout">Logout</button><pre id="auth-output"></pre></section>
      <section class="card" id="audit-panel"><h2 data-i18n="navAudit">稽核紀錄</h2><input id="audit-text" placeholder="search audit" /><button id="audit-load">Search</button><pre id="audit-output"></pre></section>
      <section class="card" id="playground-panel"><h2 data-i18n="navPlayground">Playground</h2><select id="playground-command"><option>valid</option><option>schema</option><option>list</option><option>research</option><option>write</option></select><button id="playground-run">Run</button><pre id="playground-output"></pre></section>
      <section class="card" id="research-panel"><h2 data-i18n="navResearch">研究報告</h2><button id="research-load">Load Reports</button><pre id="research-output"></pre></section>
      <section class="card" id="table-panel"><h2 data-i18n="navTable">資料表</h2><button id="table-load">Load Table Context</button><pre id="table-output"></pre></section>
    </main>
    <script src="/assets/app.js"></script>
  </body>
</html>`;
}

export function dashboardStyles(): string {
  return `:root{--ink:#17211c;--muted:#59665f;--paper:#fbf5e8;--line:#d7cbb4;--brand:#0b6b57;--accent:#e18b2d}
*{box-sizing:border-box}body{margin:0;font-family:Georgia,'Times New Roman',serif;color:var(--ink);background:radial-gradient(circle at top left,#fff7d6,transparent 34rem),linear-gradient(135deg,#f3efe4,#e0ebdf)}
.hero{display:flex;justify-content:space-between;gap:2rem;align-items:flex-start;padding:2rem clamp(1rem,4vw,4rem);border-bottom:1px solid var(--line)}
.eyebrow{text-transform:uppercase;letter-spacing:.16em;color:var(--brand);font-size:.78rem}.hero h1{font-size:clamp(2rem,5vw,4.8rem);line-height:.9;margin:.25rem 0}
.language,.card{background:rgba(255,255,255,.68);border:1px solid var(--line);box-shadow:0 18px 60px rgba(44,35,22,.11);border-radius:24px}
.language{padding:.9rem 1rem}.language select,input,select,button{font:inherit;border-radius:999px;border:1px solid var(--line);padding:.7rem 1rem}
button{background:var(--brand);color:white;cursor:pointer;border-color:transparent}button:hover{background:#094d40}.nav{display:flex;gap:.5rem;overflow:auto;padding:1rem clamp(1rem,4vw,4rem)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;padding:0 clamp(1rem,4vw,4rem) 3rem}.card{padding:1.2rem;min-height:14rem}
form{display:grid;gap:.75rem}pre{white-space:pre-wrap;word-break:break-word;background:#15231d;color:#d8ffeb;padding:1rem;border-radius:16px;max-height:22rem;overflow:auto}
@media(max-width:720px){.hero{display:block}.language{margin-top:1rem}.grid{grid-template-columns:1fr}}`;
}

export function dashboardAppScript(): string {
  const catalog = JSON.stringify(dashboardLanguageCatalog);
  return `const CATALOG=${catalog};
const STORAGE_KEY=${JSON.stringify(DASHBOARD_LANGUAGE_STORAGE_KEY)};
const $=(id)=>document.getElementById(id);
function resolveLang(value){if(value==='zh-TW'||value==='en')return value;return navigator.language&&navigator.language.toLowerCase().startsWith('en')?'en':'zh-TW'}
function applyLanguage(value){const lang=resolveLang(value);document.documentElement.lang=lang;for(const el of document.querySelectorAll('[data-i18n]')){const key=el.getAttribute('data-i18n');if(CATALOG[lang][key])el.textContent=CATALOG[lang][key]}$('language-switcher').value=lang;localStorage.setItem(STORAGE_KEY,lang)}
async function api(path,options){const response=await fetch(path,{...options,headers:{'content-type':'application/json',...(options&&options.headers||{})}});return await response.json()}
function dump(id,value){$(id).textContent=JSON.stringify(value,null,2)}
async function loadStatus(){dump('status-output',await api('/api/status'))}
$('language-switcher').addEventListener('change',(event)=>applyLanguage(event.target.value));
$('config-form').addEventListener('submit',async(event)=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target).entries());dump('config-output',await api('/api/config',{method:'POST',body:JSON.stringify(data)}));await loadStatus()});
$('auth-start').addEventListener('click',async()=>{const result=await api('/api/auth/login/start',{method:'POST',body:'{}'});dump('auth-output',result);const url=result&&result.data&&result.data.authorizationUrl;if(url)window.open(url,'_blank','noopener')});
$('auth-logout').addEventListener('click',async()=>dump('auth-output',await api('/api/auth/logout',{method:'POST',body:'{}'})));
$('audit-load').addEventListener('click',async()=>dump('audit-output',await api('/api/audit?text='+encodeURIComponent($('audit-text').value))));
$('playground-run').addEventListener('click',async()=>dump('playground-output',await api('/api/playground/run',{method:'POST',body:JSON.stringify({command:$('playground-command').value,parameters:{workflow:'dashboard'}})})));
$('research-load').addEventListener('click',async()=>dump('research-output',await api('/api/research')));
$('table-load').addEventListener('click',async()=>dump('table-output',await api('/api/table/schema')));
applyLanguage(localStorage.getItem(STORAGE_KEY));loadStatus().catch((error)=>dump('status-output',{status:'error',message:error.message}));`;
}
