import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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
  type AnnualCalculation,
  type DetailLevel,
  type FortuneRequest,
  type FortuneWorkerRequest,
  type FortuneWorkerResponse,
  type Gender,
  type NatalCalculation,
  type SavedProfile,
} from "@annual-fortune/core";
import {
  HOUR_BRANCHES,
  validateFortuneRequest,
} from "@annual-fortune/core/validation";
import thirdPartyLicenses from "./third-party-licenses.txt?raw";
import interpretationData from "./interpretations.json";
import { buildYearlyFortune, fortuneToMarkdown } from "./yearly-fortune";
import { normalizePalaceName, proseToTW, toTW } from "./zh";

type InterpretationEntry = { dimension: string; summary?: string; standard?: string; deep?: string };
const INTERPRETATIONS = interpretationData as {
  attribution: string[];
  palaces: Record<string, Record<string, InterpretationEntry[]>>;
};

const STORAGE_KEY = "annual-fortune.profiles.v1";
const YEAR = new Date().getFullYear();

interface PendingWorkerCall {
  resolve: (response: FortuneWorkerResponse) => void;
  reject: (error: Error) => void;
}

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
  const [natalCalculation, setNatalCalculation] = useState<NatalCalculation | null>(null);
  const [annualCalculation, setAnnualCalculation] = useState<AnnualCalculation | null>(null);
  const [selectedYear, setSelectedYear] = useState(YEAR);
  const [isCalculating, setIsCalculating] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileProfiles, setShowMobileProfiles] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const pendingWorkerCalls = useRef(new Map<number, PendingWorkerCall>());
  const nextWorkerCallId = useRef(1);
  const calculationSequence = useRef(0);
  const range = useMemo(
    () => Math.max(1, request.yearTo - request.yearFrom + 1),
    [request.yearFrom, request.yearTo],
  );
  const yearlyFortune = useMemo(
    () => (natalCalculation && annualCalculation ? buildYearlyFortune(natalCalculation, annualCalculation) : null),
    [natalCalculation, annualCalculation],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    let worker: Worker | null = null;
    let isDisposed = false;
    const rejectPendingCalls = (error: Error) => {
      for (const pending of pendingWorkerCalls.current.values()) pending.reject(error);
      pendingWorkerCalls.current.clear();
    };
    const attachWorker = (instance: Worker) => {
      if (isDisposed) {
        instance.terminate();
        return;
      }
      worker = instance;
      workerRef.current = instance;
      instance.onmessage = (event: MessageEvent<FortuneWorkerResponse>) => {
        const pending = pendingWorkerCalls.current.get(event.data.id);
        if (!pending) return;
        pendingWorkerCalls.current.delete(event.data.id);
        pending.resolve(event.data);
      };
      instance.onerror = (event) => {
        const error = new Error(event.message || "Chart worker failed.");
        rejectPendingCalls(error);
        workerRef.current = null;
        setWorkerStatus("failed");
        setErrors([`本機計算工作執行失敗：${error.message}`]);
      };
      instance.onmessageerror = () => {
        const error = new Error("Chart worker returned unreadable data.");
        rejectPendingCalls(error);
        workerRef.current = null;
        setWorkerStatus("failed");
        setErrors([`本機計算工作執行失敗：${error.message}`]);
      };
      setWorkerStatus("ready");
    };

    async function startWorker() {
      if (import.meta.env.MODE === "single") {
        const { default: InlineWorker } = await import("./fortune.worker.ts?worker&inline");
        attachWorker(new InlineWorker());
      } else {
        const { default: ExternalWorker } = await import("./fortune.worker.ts?worker");
        attachWorker(new ExternalWorker());
      }
    }

    void startWorker().catch((error: unknown) => {
      if (!isDisposed) {
        setWorkerStatus("failed");
        setErrors([`無法啟動本機計算引擎：${error instanceof Error ? error.message : "未知錯誤"}`]);
      }
    });

    return () => {
      isDisposed = true;
      calculationSequence.current += 1;
      worker?.terminate();
      workerRef.current = null;
      rejectPendingCalls(new Error("Chart worker stopped."));
    };
  }, []);

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
    calculationSequence.current += 1;
    setRequest((current) => ({ ...current, [key]: value }));
    setErrors([]);
    setNotice("");
    setReportRequest(null);
    setNatalCalculation(null);
    setAnnualCalculation(null);
    setIsCalculating(false);
  }

  function sendWorkerRequest(
    operation: "computeNatal",
    request: FortuneRequest,
  ): Promise<FortuneWorkerResponse>;
  function sendWorkerRequest(
    operation: "computeYear",
    request: FortuneRequest,
    year: number,
  ): Promise<FortuneWorkerResponse>;
  function sendWorkerRequest(
    operation: "computeNatal" | "computeYear",
    request: FortuneRequest,
    year?: number,
  ): Promise<FortuneWorkerResponse> {
    const worker = workerRef.current;
    if (!worker) return Promise.reject(new Error("The local chart worker is not available."));

    const id = nextWorkerCallId.current++;
    let message: FortuneWorkerRequest;
    if (operation === "computeNatal") {
      message = { id, operation, request };
    } else {
      if (year === undefined) return Promise.reject(new Error("A year is required for annual calculation."));
      message = { id, operation, request, year };
    }

    return new Promise((resolve, reject) => {
      pendingWorkerCalls.current.set(id, { resolve, reject });
      try {
        worker.postMessage(message);
      } catch (error) {
        pendingWorkerCalls.current.delete(id);
        reject(error instanceof Error ? error : new Error("Could not send the calculation request."));
      }
    });
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
    calculationSequence.current += 1;
    const { id, name: _name, createdAt: _createdAt, ...savedRequest } = profile;
    setRequest(savedRequest);
    setActiveProfileId(id);
    setReportRequest(null);
    setNatalCalculation(null);
    setAnnualCalculation(null);
    setIsCalculating(false);
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

  async function generateReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateFortuneRequest(request);
    if (request.gender === "unspecified") {
      validationErrors.push("請選擇性別，以計算依性別順逆排定的大限。");
    }
    setErrors(validationErrors);
    if (validationErrors.length) return;

    const sequence = ++calculationSequence.current;
    setIsCalculating(true);
    setNotice("");
    setReportRequest(null);
    setNatalCalculation(null);
    setAnnualCalculation(null);
    try {
      const natalResponse = await sendWorkerRequest("computeNatal", request);
      if (!natalResponse.success) throw new Error(natalResponse.error);
      if (natalResponse.operation !== "computeNatal") throw new Error("Unexpected natal calculation response.");

      const annualResponse = await sendWorkerRequest("computeYear", request, request.yearFrom);
      if (!annualResponse.success) throw new Error(annualResponse.error);
      if (annualResponse.operation !== "computeYear") throw new Error("Unexpected annual calculation response.");
      if (sequence !== calculationSequence.current) return;

      setNatalCalculation(natalResponse.result);
      setAnnualCalculation(annualResponse.result);
      setSelectedYear(request.yearFrom);
      setReportRequest({ ...request });
    } catch (error) {
      if (sequence === calculationSequence.current) {
        setErrors([`無法計算命盤：${error instanceof Error ? error.message : "未知錯誤"}`]);
      }
    } finally {
      if (sequence === calculationSequence.current) setIsCalculating(false);
    }
  }

  async function selectYear(year: number) {
    if (!reportRequest || isCalculating || year < reportRequest.yearFrom || year > reportRequest.yearTo) return;
    if (year === selectedYear) return;

    const sequence = ++calculationSequence.current;
    const previousYear = selectedYear;
    const previousAnnual = annualCalculation;
    setSelectedYear(year);
    setAnnualCalculation(null);
    setIsCalculating(true);
    setErrors([]);
    try {
      const response = await sendWorkerRequest("computeYear", reportRequest, year);
      if (!response.success) throw new Error(response.error);
      if (response.operation !== "computeYear") throw new Error("Unexpected annual calculation response.");
      if (sequence !== calculationSequence.current) return;
      setAnnualCalculation(response.result);
    } catch (error) {
      if (sequence === calculationSequence.current) {
        setSelectedYear(previousYear);
        setAnnualCalculation(previousAnnual);
        setErrors([`無法計算流年：${error instanceof Error ? error.message : "未知錯誤"}`]);
      }
    } finally {
      if (sequence === calculationSequence.current) setIsCalculating(false);
    }
  }

  function saveMarkdown(markdown: string, filename: string) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportReport() {
    if (!reportRequest || !natalCalculation || isCalculating) return;
    const sequence = ++calculationSequence.current;
    setIsCalculating(true);
    setErrors([]);
    try {
      const sections: string[] = [];
      for (let year = reportRequest.yearFrom; year <= reportRequest.yearTo; year += 1) {
        const response = await sendWorkerRequest("computeYear", reportRequest, year);
        if (!response.success) throw new Error(response.error);
        if (response.operation !== "computeYear") throw new Error("Unexpected annual calculation response.");
        const annual = response.result;
        const fortune = buildYearlyFortune(natalCalculation, annual);
        sections.push(
          "",
          `# ${year} 年流年（${toTW(annual.heavenlyStem)}${toTW(annual.earthlyBranch)}）`,
          "",
          ...annual.transformations.map(({ type, star }) => `- 化${toTW(type)}：${toTW(star)}`),
          "",
          ...fortuneToMarkdown(fortune, year, reportRequest.detailLevel),
        );
      }
      const markdown = [
        "# 流年運程報告",
        "",
        "> 本檔案含命盤結構與流年運程解讀，屬傳統命理的文化參考，非個人預言，也不構成醫療、財務或人生決策建議。出生資料只在本機計算。",
        "",
        `- 出生日期：${reportRequest.birthDate}`,
        `- 出生時間：${reportRequest.birthTime}`,
        `- 性別：${reportRequest.gender === "male" ? "男" : reportRequest.gender === "female" ? "女" : "不指定"}`,
        `- 出生地：${reportRequest.city}`,
        `- 流年範圍：${reportRequest.yearFrom}–${reportRequest.yearTo}`,
        `- 解讀深度：${detailLabels[reportRequest.detailLevel]}`,
        `- 排盤日期：${natalCalculation.chartDate}${natalCalculation.lateZishiAdjusted ? "（晚子時按次日換日）" : ""}`,
        `- 時辰：${natalCalculation.hourBranchName}時`,
        `- 真太陽時校正：未套用`,
        "",
        "## 本命盤十二宮",
        "",
        ...natalCalculation.chart.palaces.map((palace) => {
          const branch = HOUR_BRANCHES[palace.branch] ?? "—";
          const stars = palace.stars.map((star) => toTW(star.name)).join("、") || "無主星";
          return `- ${toTW(palace.name)}（${branch}）：${stars}`;
        }),
        ...sections,
      ].join("\n");
      if (sequence === calculationSequence.current) {
        saveMarkdown(markdown, `annual-fortune-${reportRequest.yearFrom}-${reportRequest.yearTo}.md`);
      }
    } catch (error) {
      if (sequence === calculationSequence.current) {
        setErrors([`無法匯出報告：${error instanceof Error ? error.message : "未知錯誤"}`]);
      }
    } finally {
      if (sequence === calculationSequence.current) setIsCalculating(false);
    }
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
              <p>輸入出生資料與報告範圍，查看你的流年運程與命盤。</p>
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
                  <small>目前用於記錄出生地；城市座標與真太陽時校正尚未接入</small>
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
                      calculationSequence.current += 1;
                      setRequest((current) => ({ ...current, yearFrom: YEAR, yearTo: YEAR + years - 1 }));
                      setReportRequest(null);
                      setNatalCalculation(null);
                      setAnnualCalculation(null);
                      setIsCalculating(false);
                      setErrors([]);
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
                    <option value="summary">精簡 — 年度總覽與四化</option>
                    <option value="standard">標準 — 年度概覽與各領域運程</option>
                    <option value="deep">深入 — 再加逐月運程</option>
                  </select>
                </label>
              </div>
              <div className="school-note"><BookOpen size={16} /><span>計算設定：<strong>《紫微斗數全書》</strong><small>使用參考引擎的固定預設；運程解讀依流年四化與宮位規則於本機組成。</small></span></div>
            </section>

            {isCalculating && <div className="notice" role="status">正在此裝置計算命盤與流年資料…</div>}
            {errors.length > 0 && <div className="error-box" role="alert">{errors.map((error) => <p key={error}>{error}</p>)}</div>}

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={saveProfile}><Plus size={17} />儲存命盤</button>
              <button type="submit" className="primary-button" disabled={isCalculating || workerStatus !== "ready"}>
                {isCalculating ? "計算中…" : workerStatus === "ready" ? "計算命盤" : workerStatus === "failed" ? "引擎無法啟動" : "引擎載入中…"}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>

          {reportRequest && natalCalculation && (
            <section className="result-card" aria-live="polite">
              <div className="result-topline"><span className="result-kicker">LOCAL CHART CALCULATION</span><span className="pending-pill">本機完成</span></div>
              <h2>命盤與流年運程</h2>
              <p className="result-intro">
                下方先以白話整理所選流年的運程（依流年四化與本命宮位推演），再附上本命宮位星曜的古籍與開源資料參考（涵蓋不完整，缺漏處不予補寫）。內容為傳統命理的文化參考，並非個人預言。此結果採出生地鐘錶時間，尚未校正夏令時或真太陽時。
              </p>
              <div className="request-summary">
                <span><CalendarDays size={16} />{reportRequest.yearFrom}{reportRequest.yearTo !== reportRequest.yearFrom && `–${reportRequest.yearTo}`} 年</span>
                <span><FileText size={16} />{toTW(natalCalculation.chart.wuxingJuName)}</span>
                <span><UserRound size={16} />{reportRequest.city}</span>
                <span>命宮：{HOUR_BRANCHES[natalCalculation.chart.mingGongBranch] ?? "—"}</span>
                <span>身宮：{HOUR_BRANCHES[natalCalculation.chart.shenGongBranch] ?? "—"}</span>
                <span>命主：{toTW(natalCalculation.chart.mingZhu ?? "—")} / 身主：{toTW(natalCalculation.chart.shenZhu ?? "—")}</span>
              </div>

              <div className="annual-section">
                <div className="annual-toolbar">
                  <button
                    type="button"
                    className="secondary-button year-button"
                    disabled={isCalculating || selectedYear <= reportRequest.yearFrom}
                    onClick={() => void selectYear(selectedYear - 1)}
                  >
                    上一年
                  </button>
                  <h3>{selectedYear} 年流年{annualCalculation && `・${toTW(annualCalculation.heavenlyStem)}${toTW(annualCalculation.earthlyBranch)}`}</h3>
                  <button
                    type="button"
                    className="secondary-button year-button"
                    disabled={isCalculating || selectedYear >= reportRequest.yearTo}
                    onClick={() => void selectYear(selectedYear + 1)}
                  >
                    下一年
                  </button>
                </div>
                {annualCalculation ? (
                  <>
                    <div className="transformation-list" aria-label="流年四化">
                      {annualCalculation.transformations.map(({ type, star }) => (
                        <span key={type}>化{toTW(type)}・{toTW(star)}</span>
                      ))}
                    </div>
                    {yearlyFortune && (
                      <div className="fortune-section">
                        <h3>{selectedYear} 年運程解讀</h3>
                        <p className="fortune-overview">{yearlyFortune.overview}</p>
                        {yearlyFortune.transformations.length > 0 && (
                          <>
                            <h4>今年的關鍵引動（流年四化）</h4>
                            <div className="fortune-grid">
                              {yearlyFortune.transformations.map((item) => (
                                <article className="fortune-card" key={item.title}>
                                  <strong>{item.title}</strong>
                                  <p>{item.text}</p>
                                </article>
                              ))}
                            </div>
                          </>
                        )}
                        {reportRequest.detailLevel !== "summary" && (
                          <>
                            <h4>各領域運程</h4>
                            <div className="fortune-grid">
                              {yearlyFortune.areas.map((item) => (
                                <article className={`fortune-card tone-${item.tone}`} key={item.area}>
                                  <div className="fortune-card-heading">
                                    <strong>{item.label}</strong>
                                    <span className="tone-pill">{item.toneLabel}</span>
                                  </div>
                                  <p>{item.text}</p>
                                </article>
                              ))}
                            </div>
                          </>
                        )}
                        {reportRequest.detailLevel === "deep" && (
                          <>
                            <h4>逐月運程（農曆）</h4>
                            <div className="fortune-grid">
                              {yearlyFortune.months.map((item) => (
                                <article className={`fortune-card tone-${item.tone}`} key={item.title}>
                                  <div className="fortune-card-heading">
                                    <strong>{item.title}</strong>
                                    <span className="tone-pill">{item.toneLabel}</span>
                                  </div>
                                  <small className="solar-range">{item.solarRange}</small>
                                  <p>{item.text}</p>
                                </article>
                              ))}
                            </div>
                          </>
                        )}
                        <small>
                          運程解讀由本機依「流年四化落入哪一宮」與本命宮位星曜特質規則組成，屬傳統命理的文化參考，非個人預言，也不構成醫療、財務或人生決策建議。
                        </small>
                      </div>
                    )}
                    <div className="palace-grid">
                      {natalCalculation.chart.palaces.map((palace) => {
                        const annualPalace = normalizePalaceName(annualCalculation.palaceNames[palace.branch] ?? "—");
                        const annualStars = (annualCalculation.annualStars[palace.branch] ?? []).map(toTW);
                        return (
                          <article className="palace-tile" key={palace.branch}>
                            <div className="palace-tile-heading">
                              <strong>{toTW(palace.name)}</strong>
                              <span>{HOUR_BRANCHES[palace.branch] ?? "—"}</span>
                            </div>
                            <small>流年：{annualPalace}</small>
                            <p>{palace.stars.map((star) => toTW(star.name)).join("、") || "無主星"}</p>
                            {annualStars.length > 0 && <small>流曜：{annualStars.join("、")}</small>}
                          </article>
                        );
                      })}
                    </div>
                    <p className="deity-summary">
                      流年神煞：歲前 {annualCalculation.annualDeities.suiqian12.map(toTW).join("、")}；
                      將前 {annualCalculation.annualDeities.jiangqian12.map(toTW).join("、")}
                    </p>
                  </>
                ) : (
                  <p className="result-intro" role="status">正在計算所選年份的流年資料…</p>
                )}
              </div>
              <details className="interpretation-section">
                <summary><h3>本命宮位星曜參考（古籍與開源資料，涵蓋不完整）</h3></summary>
                {natalCalculation.chart.palaces.map((palace) => {
                  const simplifiedName = palace.name.replace(/宮$|宫$/, "");
                  const majors = palace.stars.filter((star) => star.type === "major");
                  const items = majors.flatMap((star) =>
                    (INTERPRETATIONS.palaces[simplifiedName]?.[star.name] ?? []).map((entry) => ({ star: star.name, entry })),
                  );
                  return (
                    <article className="interpretation-item" key={palace.branch}>
                      <strong>{normalizePalaceName(palace.name)}宮：{majors.map((star) => toTW(star.name)).join("、") || "無主星"}</strong>
                      {items.length === 0
                        ? <p className="result-intro">此宮位暫無可用解讀。</p>
                        : items.map(({ star, entry }) => (
                            <p key={`${star}-${entry.dimension}`}>{toTW(star)}：{proseToTW(entry.standard ?? entry.summary ?? "")}</p>
                          ))}
                    </article>
                  );
                })}
                <small>{proseToTW(INTERPRETATIONS.attribution.join(" "))}</small>
              </details>
              <div className="export-actions">
                <button type="button" className="secondary-button export-button" onClick={() => void exportReport()} disabled={isCalculating}>
                  <ArrowDownToLine size={16} />匯出完整報告（Markdown，{reportRequest.yearFrom}–{reportRequest.yearTo} 年）
                </button>
                <button type="button" className="secondary-button export-button" onClick={() => window.print()}>
                  <FileText size={16} />列印／存成 PDF
                </button>
              </div>
            </section>
          )}

          <div className="bottom-info">
            <CircleHelp size={17} />
            <p>本工具提供文化與娛樂用途的參考，不構成醫療、財務或人生決策建議。六親相關內容應審慎看待。</p>
          </div>
          <details className="license-details">
            <summary>開源引擎與第三方授權</summary>
            <pre>{thirdPartyLicenses}</pre>
          </details>
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
