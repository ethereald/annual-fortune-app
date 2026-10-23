import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CloudOff,
  FileText,
  LayoutDashboard,
  Moon,
  Plus,
  Settings2,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
  Wifi,
} from "lucide-react";
import {
  type DetailLevel,
  type FortuneRequest,
  type Gender,
  type SavedProfile,
  validateFortuneRequest,
} from "@annual-fortune/core";

const STORAGE_KEY = "annual-fortune.profiles.v1";
const YEAR = new Date().getFullYear();

const initialRequest: FortuneRequest = {
  birthDate: "",
  birthTime: "12:00",
  gender: "unspecified",
  city: "",
  yearFrom: YEAR,
  yearTo: YEAR,
  detailLevel: "standard",
  schoolSetting: "quanshu",
};

const detailLabels: Record<DetailLevel, string> = {
  summary: "精簡",
  standard: "標準",
  deep: "深入",
};

function isSavedProfile(value: unknown): value is SavedProfile {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const profile = value as Record<string, unknown>;
  return typeof profile.id === "string"
    && typeof profile.name === "string"
    && typeof profile.createdAt === "string"
    && typeof profile.birthDate === "string"
    && typeof profile.birthTime === "string"
    && (profile.gender === "female" || profile.gender === "male" || profile.gender === "unspecified")
    && typeof profile.city === "string"
    && typeof profile.yearFrom === "number"
    && typeof profile.yearTo === "number"
    && (profile.detailLevel === "summary" || profile.detailLevel === "standard" || profile.detailLevel === "deep")
    && profile.schoolSetting === "quanshu";
}

function readProfiles(): { profiles: SavedProfile[]; notice: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profiles: [], notice: "" };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("Stored profiles are not a list.");
    if (!parsed.every(isSavedProfile)) throw new TypeError("Stored profile data is invalid.");
    return { profiles: parsed, notice: "" };
  } catch {
    return { profiles: [], notice: "無法讀取已儲存的命盤資料；請確認瀏覽器儲存權限。" };
  }
}

function App() {
  const [request, setRequest] = useState<FortuneRequest>(initialRequest);
  const [initialProfileLoad] = useState(readProfiles);
  const [profiles, setProfiles] = useState<SavedProfile[]>(initialProfileLoad.profiles);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState(initialProfileLoad.notice);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDark, setIsDark] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [reportRequest, setReportRequest] = useState<FortuneRequest | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileProfiles, setShowMobileProfiles] = useState(false);
  const range = useMemo(
    () => Math.max(1, request.yearTo - request.yearFrom + 1),
    [request.yearFrom, request.yearTo],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    const install = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", install);
    if ("storage" in navigator && navigator.storage.persist) {
      void navigator.storage.persist();
    }
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", install);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch {
      setNotice("無法儲存至此裝置。請檢查瀏覽器儲存空間或隱私設定。");
    }
  }, [profiles]);

  function update<K extends keyof FortuneRequest>(key: K, value: FortuneRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
    setErrors([]);
    setNotice("");
  }

  function saveProfile() {
    const validationErrors = validateFortuneRequest(request);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    const name = window.prompt("為這份本機資料命名", "我的命盤");
    if (name === null) return;
    const cleanName = name.trim();
    if (!cleanName) {
      setNotice("名稱不能空白。");
      return;
    }
    const profile: SavedProfile = {
      ...request,
      id: crypto.randomUUID(),
      name: cleanName,
      createdAt: new Date().toISOString(),
    };
    setProfiles((current) => [profile, ...current]);
    setActiveProfileId(profile.id);
    setNotice("資料已保存在此裝置。");
  }

  function loadProfile(profile: SavedProfile) {
    const { id, name: _name, createdAt: _createdAt, ...savedRequest } = profile;
    setRequest(savedRequest);
    setActiveProfileId(id);
    setReportRequest(null);
    setErrors([]);
    setShowMobileProfiles(false);
    setNotice(`${profile.name} 已載入。`);
  }

  function deleteAllProfiles() {
    if (!window.confirm("確定刪除此裝置上儲存的所有命盤資料？此操作無法復原。")) return;
    setProfiles([]);
    setActiveProfileId(null);
    setNotice("已刪除此裝置上的所有命盤資料。");
  }

  function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateFortuneRequest(request);
    setErrors(validationErrors);
    if (validationErrors.length) return;
    setReportRequest({ ...request });
    setNotice("");
  }

  function downloadRequest() {
    if (!reportRequest) return;
    const markdown = [
      "# 流年報告請求",
      "",
      "> 此檔案記錄報告設定，不是命理分析。計算引擎與經授權的解讀資料尚未接入。",
      "",
      `- 出生日期：${reportRequest.birthDate}`,
      `- 出生時間：${reportRequest.birthTime}`,
      `- 性別：${reportRequest.gender}`,
      `- 出生地：${reportRequest.city}`,
      `- 流年範圍：${reportRequest.yearFrom}–${reportRequest.yearTo}`,
      `- 詳細程度：${detailLabels[reportRequest.detailLevel]}`,
      `- 流派設定：紫微斗數全書`,
      "",
      "## 隱私",
      "",
      "此檔案由本機產生。出生資料不會傳送至伺服器。",
    ].join("\n");
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `annual-fortune-request-${reportRequest.yearFrom}-${reportRequest.yearTo}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="流年首頁">
          <span className="brand-mark">流</span>
          <span><strong>流年</strong><small>ANNUAL FORTUNE</small></span>
        </a>
        <div className="side-label">工作台</div>
        <button className="nav-item active"><LayoutDashboard size={18} /> 新增報告</button>
        <div className="side-heading">
          <span className="side-label">本機命盤</span>
          <span className="count">{profiles.length}</span>
        </div>
        <div className="profile-list">
          {profiles.length === 0 ? (
            <p className="empty-profiles">儲存的命盤會顯示在這裡</p>
          ) : profiles.map((profile) => (
            <button
              className={`profile-link ${activeProfileId === profile.id ? "selected" : ""}`}
              key={profile.id}
              onClick={() => loadProfile(profile)}
            >
              <UserRound size={16} />
              <span>{profile.name}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setShowSettings((current) => !current)}>
            <Settings2 size={18} /> 設定
          </button>
          {showSettings && (
            <div className="settings-panel">
              <p>顯示模式</p>
              <button className="setting-toggle" onClick={() => setIsDark((current) => !current)}>
                {isDark ? <Moon size={16} /> : <Sun size={16} />}
                {isDark ? "深色" : "淺色"}
                <ChevronDown size={14} />
              </button>
              <button className="delete-all" onClick={deleteAllProfiles}>
                <Trash2 size={15} /> 刪除全部命盤
              </button>
            </div>
          )}
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <span><strong>資料只留在本機</strong><small>不會上傳出生資料</small></span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">工作台 <span>/</span> 新增報告</div>
          <div className="top-actions">
            <span className={`offline-status ${isOnline ? "online" : ""}`}>
              {isOnline ? <Wifi size={15} /> : <CloudOff size={15} />}
              {isOnline ? "線上" : "目前離線"}
            </span>
            {installPrompt && <button className="install-button" onClick={installApp}>安裝 App</button>}
            <button className="icon-button theme-button" aria-label="切換深淺色" onClick={() => setIsDark((current) => !current)}>
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-intro">
            <div>
              <div className="eyebrow">YOUR YEAR, IN PERSPECTIVE</div>
              <h1>建立流年報告</h1>
              <p>輸入出生資料與報告範圍，開始整理你的年度命盤。</p>
            </div>
            <div className="year-stamp"><span>流年</span><strong>{YEAR}</strong></div>
          </section>

          {!isOnline && (
            <div className="offline-banner"><CloudOff size={17} /> 已離線。已載入的應用程式仍可使用，資料只儲存在此裝置。</div>
          )}
          {notice && <div className="notice" role="status"><Check size={16} />{notice}</div>}

          <form onSubmit={generateReport}>
            <section className="form-card">
              <div className="card-heading">
                <div className="section-icon"><UserRound size={19} /></div>
                <div><h2>出生資料</h2><p>只用於本機計算，不會傳送到網路</p></div>
                <span className="step">01</span>
              </div>
              <div className="form-grid birth-grid">
                <label className="field">
                  <span>出生日期 <b>*</b></span>
                  <div className="input-wrap"><CalendarDays size={17} /><input type="date" value={request.birthDate} onChange={(event) => update("birthDate", event.target.value)} required /></div>
                </label>
                <label className="field">
                  <span>出生時間 <b>*</b></span>
                  <input type="time" value={request.birthTime} onChange={(event) => update("birthTime", event.target.value)} required />
                  <small>請使用出生地當地時間</small>
                </label>
                <label className="field">
                  <span>性別</span>
                  <select value={request.gender} onChange={(event) => update("gender", event.target.value as Gender)}>
                    <option value="unspecified">不指定</option>
                    <option value="female">女</option>
                    <option value="male">男</option>
                  </select>
                </label>
                <label className="field">
                  <span>出生城市或地區 <b>*</b></span>
                  <input type="text" placeholder="例如：台北市" value={request.city} onChange={(event) => update("city", event.target.value)} required />
                  <small>供真太陽時校正使用，城市搜尋稍後接入</small>
                </label>
              </div>
            </section>

            <section className="form-card report-options">
              <div className="card-heading">
                <div className="section-icon gold"><FileText size={19} /></div>
                <div><h2>報告設定</h2><p>自訂流年範圍與內容深度</p></div>
                <span className="step">02</span>
              </div>
              <div className="range-presets" aria-label="快速選擇年份範圍">
                {[1, 5, 10].map((years) => (
                  <button
                    className={range === years ? "preset selected" : "preset"}
                    key={years}
                    onClick={(event) => {
                      event.preventDefault();
                      setRequest((current) => ({ ...current, yearFrom: YEAR, yearTo: YEAR + years - 1 }));
                    }}
                    type="button"
                  >
                    {years === 1 ? "單一年份" : `${years} 年`}
                  </button>
                ))}
                <span className="range-hint">或自訂年份</span>
              </div>
              <div className="form-grid options-grid">
                <label className="field">
                  <span>起始年份</span>
                  <input type="number" min="1" max="9999" value={request.yearFrom} onChange={(event) => update("yearFrom", Number(event.target.value))} required />
                </label>
                <div className="range-dash">—</div>
                <label className="field">
                  <span>結束年份</span>
                  <input type="number" min="1" max="9999" value={request.yearTo} onChange={(event) => update("yearTo", Number(event.target.value))} required />
                </label>
                <label className="field detail-field">
                  <span>解讀深度</span>
                  <select value={request.detailLevel} onChange={(event) => update("detailLevel", event.target.value as DetailLevel)}>
                    <option value="summary">精簡 — 年度重點</option>
                    <option value="standard">標準 — 完整年度概覽</option>
                    <option value="deep">深入 — 詳細分項解讀</option>
                  </select>
                </label>
              </div>
              <div className="school-note"><BookOpen size={16} /><span>計算設定：<strong>《紫微斗數全書》</strong><small>目前固定此設定，以確保解讀資料一致。</small></span></div>
            </section>

            {errors.length > 0 && <div className="error-box" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={saveProfile}><Plus size={17} />儲存命盤</button>
              <button type="submit" className="primary-button">建立報告請求<ArrowRight size={17} /></button>
            </div>
          </form>

          {reportRequest && (
            <section className="result-card" aria-live="polite">
              <div className="result-topline"><span className="result-kicker">REPORT WORKSPACE</span><span className="pending-pill">引擎待接入</span></div>
              <h2>報告設定已準備就緒</h2>
              <p className="result-intro">目前工作區沒有紫微斗數計算引擎或授權解讀資料，因此不會生成虛構命盤結果。</p>
              <div className="request-summary">
                <span><CalendarDays size={16} />{reportRequest.yearFrom}{reportRequest.yearTo !== reportRequest.yearFrom && `–${reportRequest.yearTo}`} 年</span>
                <span><FileText size={16} />{detailLabels[reportRequest.detailLevel]}解讀</span>
                <span><UserRound size={16} />{reportRequest.city}</span>
              </div>
              <button type="button" className="secondary-button export-button" onClick={downloadRequest}><ArrowDownToLine size={16} />匯出設定摘要（Markdown）</button>
            </section>
          )}

          <div className="bottom-info">
            <CircleHelp size={17} />
            <p>本工具提供文化與娛樂用途的參考，不構成醫療、財務或人生決策建議。六親相關內容應審慎看待。</p>
          </div>
        </div>
        <nav className="mobile-nav" aria-label="主要導覽">
          <button className="active"><LayoutDashboard size={18} /><span>報告</span></button>
          <button onClick={() => setShowMobileProfiles(true)}><UserRound size={18} /><span>命盤</span></button>
          <button onClick={() => setShowSettings((current) => !current)}><Settings2 size={18} /><span>設定</span></button>
        </nav>
        {showMobileProfiles && (
          <div className="sheet-backdrop" onClick={() => setShowMobileProfiles(false)}>
            <section className="mobile-profile-sheet" aria-label="本機命盤" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-heading"><h2>本機命盤</h2><button className="sheet-close" onClick={() => setShowMobileProfiles(false)}>關閉</button></div>
              {profiles.length === 0
                ? <p className="empty-profiles">尚未儲存命盤。填寫資料後，點選「儲存命盤」。</p>
                : profiles.map((profile) => (
                    <button className="profile-link" key={profile.id} onClick={() => loadProfile(profile)}>
                      <UserRound size={16} /><span>{profile.name}</span>
                    </button>
                  ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

export default App;
