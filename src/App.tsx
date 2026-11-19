import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FileJson,
  MessageCircle,
  Network,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  cases,
  displayProbability,
  displayTime,
  domains,
  modsStatus,
  type DomainKey,
} from "./data/model";
import { evidence } from "./data/evidence";
import RiskChart from "./components/RiskChart";
import RecordsDrawer, {
  emptyInput,
  type InputData,
} from "./components/RecordsDrawer";
import KnowledgeGalaxy from "./components/EvidenceExplorer";
import ReportChat from "./components/ReportChat";
import ArchitectureSection from "./components/ArchitectureSection";
const BodyScene = lazy(() => import("./components/BodyScene"));

export const organRisks: Record<string, (number[][] | null)[]> = {
  "DEMO-001": [
    [
      [0.12, 0.18, 0.25],
      [0.06, 0.09, 0.12],
      [0.05, 0.08, 0.1],
      [0.11, 0.17, 0.22],
      [0.04, 0.06, 0.09],
      [0.09, 0.14, 0.19],
    ],
    [
      [0.19, 0.26, 0.33],
      [0.07, 0.1, 0.14],
      [0.06, 0.09, 0.12],
      [0.15, 0.21, 0.28],
      [0.05, 0.08, 0.11],
      [0.14, 0.2, 0.27],
    ],
    [
      [0.32, 0.41, 0.48],
      [0.09, 0.13, 0.17],
      [0.08, 0.12, 0.16],
      [0.23, 0.3, 0.37],
      [0.06, 0.1, 0.14],
      [0.29, 0.38, 0.45],
    ],
    null,
  ],
  "DEMO-002": Array.from({ length: 4 }, () => [
    [0.07, 0.11, 0.15],
    [0.04, 0.07, 0.1],
    [0.03, 0.06, 0.08],
    [0.06, 0.09, 0.13],
    [0.03, 0.05, 0.07],
    [0.05, 0.08, 0.11],
  ]),
  "DEMO-003": [null, null, null, null],
};
const phases = [
  "准备患者数据",
  "数值模型评估",
  ...domains.map((d) => `${d.label}专家`),
  "综合专家",
];
type Panel = "import" | "expert" | "chat" | null;

export default function App() {
  const [welcome, setWelcome] = useState(true);
  const [reportCollapsed, setReportCollapsed] = useState(false);
  const [caseIndex, setCaseIndex] = useState(0),
    [timeIndex, setTimeIndex] = useState(2),
    [horizon, setHorizon] = useState(0);
  const [imported, setImported] = useState(false),
    [file, setFile] = useState(false),
    [importStep, setImportStep] = useState(-1);
  const [analysis, setAnalysis] = useState(-1),
    [paused, setPaused] = useState(false),
    [playing, setPlaying] = useState(false);
  const [panel, setPanel] = useState<Panel>(null),
    [expert, setExpert] = useState(0),
    [report, setReport] = useState(false);
  const [evidenceRequest, setEvidenceRequest] = useState<{ domain: number; id: number } | null>(null);
  const [selected, setSelected] = useState<DomainKey | null>(null),
    [reset, setReset] = useState(0),
    [records, setRecords] = useState(false);
  const [editRecords, setEditRecords] = useState(false),
    [dirty, setDirty] = useState(false);
  const [recordData, setRecordData] = useState<InputData>(() =>
    emptyInput(cases[0].id, cases[0].encounter),
  );
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<{ q: string; a: string; ref: number }[]>(
      [],
    ),
    [notice, setNotice] = useState("");
  const [architecture, setArchitecture] = useState(false),
    [archFromReport, setArchFromReport] = useState(false),
    [landingScrolled, setLandingScrolled] = useState(false);
  const landingRef = useRef<HTMLDivElement>(null);
  const openArchitecture = (fromReport: boolean) => {
    setArchFromReport(fromReport);
    setArchitecture(true);
  };
  const scrollLandingTo = (target: "architecture" | "top") => {
    const container = landingRef.current;
    if (!container) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
    if (target === "top") container.scrollTo({ top: 0, behavior });
    else container.querySelector("#architecture")?.scrollIntoView({ behavior, block: "start" });
  };
  const patient = cases[caseIndex],
    snapshot = patient.snapshots[timeIndex],
    status = modsStatus(snapshot.scores),
    hours = [24, 48, 72][horizon];
  const done = analysis >= phases.length && !dirty,
    eligible = patient.id !== "DEMO-003" && status !== "已满足",
    risk = done && eligible ? snapshot.risks[horizon] : null;
  const domainRisk = (i: number) =>
    eligible
      ? (organRisks[patient.id][timeIndex]?.[i]?.[horizon] ?? null)
      : null;
  const currentEvidence = evidence[expert];
  useEffect(() => {
    if (panel !== "import" || importStep < 0 || importStep >= 4) return;
    const id = window.setTimeout(() => setImportStep((v) => v + 1), 500);
    return () => clearTimeout(id);
  }, [panel, importStep]);
  useEffect(() => {
    if (importStep === 4) setDirty(false);
  }, [importStep]);
  useEffect(() => {
    if (analysis < 0 || done || paused) return;
    const id = window.setTimeout(() => setAnalysis((v) => v + 1), 700);
    return () => clearTimeout(id);
  }, [analysis, done, paused]);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(
      () =>
        setTimeIndex((v) => {
          if (v >= patient.snapshots.length - 1) {
            setPlaying(false);
            return v;
          }
          return v + 1;
        }),
      1800,
    );
    return () => clearInterval(id);
  }, [playing, patient.snapshots.length]);
  useEffect(() => {
    setMessages((previous) => {
      if (previous.length) setNotice("评估上下文已更新，请重新选择问题。");
      return [];
    });
    setInput("");
  }, [caseIndex, timeIndex, horizon]);
  const switchCase = (i: number) => {
    setCaseIndex(i);
    setTimeIndex(2);
    setHorizon(0);
    setImported(false);
    setDirty(false);
    setRecordData(emptyInput(cases[i].id, cases[i].encounter));
    setFile(false);
    setImportStep(-1);
    setAnalysis(-1);
    setPlaying(false);
    setSelected(null);
    setReport(false);
    setPanel(null);
  };
  const openExpert = (i: number) => {
    setReportCollapsed(false);
    setExpert(i);
    setSelected(i < 6 ? domains[i].key : null);
    setPanel("expert");
  };
  const openEvidence = (i: number) => {
    openExpert(i);
    setEvidenceRequest({ domain: i, id: Date.now() });
  };
  const questions = [
    "为什么整体风险值得关注？",
    "呼吸功能的判断依据是什么？",
    "肾功能发生了什么变化？",
    "哪些器官之间可能存在关联？",
    "报告使用了哪些文献？",
    "哪些信息还需要复核？",
    "为什么 13:00 没有首次 MODS 风险？",
  ];
  const answers = [
    `${displayTime(snapshot.time)} 当前 MODS 状态：${status}。${eligible ? `未来 ${hours} 小时整体风险为 ${displayProbability(snapshot.risks[horizon])}（演示值）。` : status === "已满足" ? "首次事件预测不适用。" : "资料不足，无法提供风险。"}呼吸指标 ${snapshot.values[0]}，肌酐 ${snapshot.values[5]}。`,
    `${displayTime(snapshot.time)} 血氧饱和度 ${snapshot.values[0]}，呼吸 SOFA ${snapshot.scores[0] ?? "无法评估"}。文献讨论脓毒症相关肺部并发症，需要结合完整氧合资料。`,
    `肌酐从 01:00 的 ${patient.snapshots[0].values[5]} 变化至 ${displayTime(snapshot.time)} 的 ${snapshot.values[5]}。当前肾 SOFA ${snapshot.scores[5] ?? "无法评估"}。`,
    "多个功能域可能共同变化，具体器官间关系与患者原因需结合临床资料复核。",
    `本报告展示 ${evidence.length} 个知识视图，分别覆盖六个功能域和综合分析。`,
    patient.id === "DEMO-003"
      ? "氧合、肝功能及神经评估资料不完整，需要复核。"
      : "建议核对测量时间、氧合情况、肌酐变化及循环支持。",
    patient.id === "DEMO-001"
      ? "13:00 呼吸和肾 SOFA 分项均为 2，已满足研究终点，首次事件预测不适用。"
      : "该问题对应 DEMO-001，请切换到风险变化病例查看。",
  ];
  const send = (q: string) => {
    const i = questions.indexOf(q.trim());
    if (i < 0) {
      setNotice("请选择推荐问题，或输入完全一致的问题。");
      return;
    }
    setMessages((m) => [
      ...m,
      { q: questions[i], a: answers[i], ref: [6, 0, 5, 6, 6, 6, 6][i] },
    ]);
    setInput("");
    setNotice("");
  };
  return (
    <main className={`app-shell in-app ${panel === 'expert' && !report ? 'expert-mode' : ''} ${!imported ? 'awaiting-import' : ''}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Activity size={17} />
          </span>
          <span>
            VITALIS<small> · MODS</small>
          </span>
        </div>
        <div className="top-actions">
          <span className="demo-label">
            <span />
            演示模式
          </span>
          <label className="top-case">
            <span className="sr-only">选择病例</span>
            <select
              value={caseIndex}
              onChange={(e) => switchCase(Number(e.target.value))}
            >
              {cases.map((p, i) => (
                <option key={p.id} value={i}>
                  {p.id} · {p.label}
                </option>
              ))}
            </select>
          </label>
          <span className="top-context">
            {patient.encounter} · {displayTime(snapshot.time)}
          </span>
          <button className="quiet-button" onClick={() => openArchitecture(false)}>
            <Network size={15} /> 系统架构
          </button>
          {imported && <button className="quiet-button" onClick={() => setPanel("import")}>
            <FileJson size={15} /> 导入数据
          </button>}
        </div>
      </header>
      <div className="scene-background">
        <div className="scene-ring ring-one" />
        <div className="scene-ring ring-two" />
        <div className="scene-glow" />
        <Suspense
          fallback={<div className="scene-loading">正在准备三维场景…</div>}
        >
          <BodyScene
            selected={selected}
            onSelect={(k) => {
              const i = domains.findIndex((d) => d.key === k);
              if (done) openExpert(i);
            }}
            scores={done ? snapshot.scores : Array(6).fill(null)}
            sex={patient.sex}
            reset={reset}
            panelOpen={panel === "expert" && !report}
          />
        </Suspense>
      </div>
      <div className="workspace">
        {imported && <section className="left-panel glass-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PATIENT OVERVIEW</span>
              <h2>患者评估</h2>
            </div>
            <span className="sample-tag">虚构病例</span>
          </div>
          <div className="patient-meta">
            <div>
              <span>病例 / 住院</span>
              <b>
                {patient.id} / {patient.encounter}
              </b>
            </div>
            <div>
              <span>年龄 / 性别</span>
              <b>
                {patient.age} 岁 / {patient.sex}
              </b>
            </div>
          </div>
          <div className="panel-divider" />
          <div className="risk-heading">
            <span>首次 MODS 风险</span>
            {done && (
              <button className="text-link" onClick={() => openExpert(6)}>
                查看依据 <ArrowRight size={13} />
              </button>
            )}
          </div>
          <p className="risk-subtitle">
            从 {displayTime(snapshot.time)} 起未来 {hours} 小时内
          </p>
          <div className="risk-number">
            {displayProbability(risk)}
            <span>{risk === null ? "" : "预测概率"}</span>
          </div>
          <div className="risk-note">
            {!imported
              ? "等待导入数据"
              : !done
                ? "等待评估结果"
                : !eligible
                  ? status === "已满足"
                    ? "首次事件预测不适用"
                    : "数据不足，无法评估"
                  : "演示概率 · 非模型推理结果"}
          </div>
          <div className="tabs horizon-tabs">
            {[24, 48, 72].map((h, i) => (
              <button
                key={h}
                className={horizon === i ? "active" : ""}
                onClick={() => setHorizon(i)}
              >
                {h} 小时
              </button>
            ))}
          </div>
          <div className="chart-label">
            <span>风险历史</span>
            <span>同一预测窗口</span>
          </div>
          {done ? (
            <RiskChart
              snapshots={patient.snapshots}
              horizon={horizon}
              index={timeIndex}
            />
          ) : (
            <div className="chart-empty">评估完成后显示历史趋势</div>
          )}
          <div className="status-row">
            <span>当前 MODS 状态</span>
            <b>{done ? status : "等待评估"}</b>
          </div>
          <div className="status-row">
            <span>数据情况</span>
            <button
              className="inline-action"
              onClick={() => setPanel("import")}
            >
              {!imported
                ? "等待导入"
                : patient.id === "DEMO-003"
                  ? "部分记录缺失"
                  : "查看已导入记录"}{" "}
              <ChevronRight size={14} />
            </button>
          </div>
        </section>}
        <section className="body-area" aria-label="三维人体交互">
          <div className="body-title">
            <span className="eyebrow">ORGAN INSIGHT</span>
            <h2>
              从全身，
              <br />
              <em>看见变化。</em>
            </h2>
            <p>
              {done ? "选择功能域，查看判断依据" : "导入演示数据以开始评估"}
            </p>
          </div>
          <div className="body-tools">
            {selected && (
              <button
                onClick={() => {
                  setSelected(null);
                  setReset((v) => v + 1);
                }}
              >
                <RotateCcw size={13} /> 返回全身
              </button>
            )}
          </div>
          {done && <div className="organ-nav">
            {domains.map((d, i) => (
              <button
                key={d.key}
                className={`${selected === d.key ? "active" : ""} ${done && snapshot.scores[i] !== null && snapshot.scores[i]! >= 2 ? "alert" : ""}`}
                onClick={() => done && openExpert(i)}
              >
                <span className="organ-indicator" />
                {d.label}
              </button>
            ))}
          </div>}
          {!imported && <div className="import-callout"><span>选择病例后开始</span><h3>{patient.label}</h3><p>导入预设记录，探索患者的器官状态与风险变化。</p><button className="main-primary" onClick={() => setPanel('import')}><FileJson size={16}/> 导入演示数据 <ArrowRight size={16}/></button></div>}
          <div className="body-hint">拖动旋转 · 滚动缩放 · 点击功能域</div>
        </section>
        {imported && <section className="right-panel glass-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ASSESSMENT</span>
              <h2>{done ? "综合评估" : "评估进程"}</h2>
            </div>
            <span className="sample-tag">
              {done ? "已完成" : analysis >= 0 ? "分析中" : "演示"}
            </span>
          </div>
          {!imported ? (
            <div className="main-intro">
              <div className="main-intro-icon">
                <FileJson size={23} />
              </div>
              <h3>从患者数据开始</h3>
              <p>导入预设病例，查看从数据检查到综合报告的过程。</p>
              <button
                className="main-primary"
                onClick={() => setPanel("import")}
              >
                导入演示数据 <ArrowRight size={15} />
              </button>
            </div>
          ) : analysis < 0 ? (
            <div className="main-intro">
              <div className="main-intro-icon">
                <Check size={23} />
              </div>
              <h3>数据准备完成</h3>
              <p>
                当前时刻 {displayTime(snapshot.time)}，
                {patient.id === "DEMO-003"
                  ? "部分记录缺失，可查看数据情况。"
                  : "预设记录已准备。"}
              </p>
              <button
                className="main-primary"
                onClick={() => {
                  setAnalysis(0);
                  setPaused(false);
                }}
              >
                开始评估 <ArrowRight size={15} />
              </button>
            </div>
          ) : !done ? (
            <>
              <p className="overview-copy">数值模型与七个专家正在依次分析</p>
              <div className="compact-progress">
                {phases.map((p, i) => (
                  <button
                    key={p}
                    className={
                      analysis > i ? "done" : analysis === i ? "running" : ""
                    }
                    onClick={() => i >= 2 && analysis > i && openExpert(i - 2)}
                  >
                    <span>
                      {analysis > i ? (
                        <Check size={12} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <b>{p}</b>
                    <small>
                      {analysis > i
                        ? "已完成"
                        : analysis === i
                          ? paused
                            ? "已暂停"
                            : "进行中"
                          : "等待中"}
                    </small>
                  </button>
                ))}
              </div>
              <div className="process-controls">
                <button onClick={() => setPaused(!paused)}>
                  {paused ? <Play size={13} /> : <Pause size={13} />}{" "}
                  {paused ? "继续" : "暂停"}
                </button>
                <button onClick={() => setAnalysis(phases.length)}>
                  跳过至完成
                </button>
              </div>
              <button className="text-link arch-progress-link" onClick={() => openArchitecture(false)}>
                <Network size={13} /> 查看完整系统架构
              </button>
            </>
          ) : (
            <>
              <p className="overview-copy">
                {patient.id === "DEMO-003"
                  ? "部分数据缺失，请查看复核事项"
                  : status === "已满足"
                    ? "当前已满足 MODS 条件"
                    : "关注器官功能变化"}
              </p>
              <div className="focus-summary">
                <span>主要关注</span>
                <h3>
                  {patient.id === "DEMO-003"
                    ? "数据完整性"
                    : patient.id === "DEMO-001"
                      ? "呼吸与肾功能"
                      : "持续观察"}
                </h3>
                <p>
                  {patient.id === "DEMO-001"
                    ? `血氧 ${snapshot.values[0]} · 肌酐 ${snapshot.values[5]}`
                    : "结合当前记录与各功能域状态理解结果。"}
                </p>
              </div>
              <div className="compact-organs">
                {domains.map((d, i) => (
                  <button key={d.key} onClick={() => openExpert(i)}>
                    <span>{d.label}</span>
                    <b>
                      {snapshot.scores[i] === null
                        ? "未知"
                        : `${snapshot.scores[i]} 分`}
                    </b>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
              <button className="main-secondary" onClick={() => openExpert(6)}>
                <Sparkles size={15} /> 综合专家与文献 <ChevronRight size={14} />
              </button>
              <button className="main-primary" onClick={() => setReport(true)}>
                查看完整报告 <ArrowRight size={15} />
              </button>
              <button
                className="main-secondary"
                onClick={() => {
                  setReport(true);
                  setPanel(null);
                }}
              >
                <MessageCircle size={15} /> 询问报告
              </button>
              <button
                className="text-link replay"
                onClick={() => {
                  setAnalysis(0);
                  setPaused(false);
                }}
              >
                <RotateCcw size={13} /> 重播分析
              </button>
              <button className="text-link arch-progress-link" onClick={() => openArchitecture(false)}>
                <Network size={13} /> 查看完整系统架构
              </button>
            </>
          )}
        </section>}
        {imported && <section className="timeline glass-panel">
          <div className="timeline-intro">
            <span className="eyebrow">PATIENT TIMELINE</span>
            <strong>随时间观察变化</strong>
            <span>2026 年 11 月 16 日</span>
          </div>
          <button
            className="play-button"
            disabled={!done}
            onClick={() => {
              if (timeIndex === 3) setTimeIndex(0);
              setPlaying(!playing);
            }}
            aria-label={playing ? "暂停" : "播放"}
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="timeline-track">
            <div className="track-line" />
            <div
              className="track-fill"
              style={{ width: `${(timeIndex / 3) * 100}%` }}
            />
            {patient.snapshots.map((s, i) => (
              <button
                key={s.time}
                className={`time-point ${timeIndex === i ? "current" : ""}`}
                onClick={() => {
                  setTimeIndex(i);
                  setPlaying(false);
                }}
              >
                <span />
                <b>{displayTime(s.time)}</b>
              </button>
            ))}
          </div>
          <div className="timeline-current">
            <span>当前观察时点</span>
            <strong>{displayTime(snapshot.time)}</strong>
          </div>
        </section>}
        {imported && <div className="workspace-footer">
          <span>虚构患者 · 预设结果 · 研究展示</span>
          <button
            onClick={() => {
              setImported(false);
              setFile(false);
              setImportStep(-1);
              setAnalysis(-1);
              setPanel("import");
            }}
          >
            <RotateCcw size={13} /> 重新演示
          </button>
        </div>}
      </div>
      {welcome && (
        <div
          className="welcome-screen landing-scroll"
          ref={landingRef}
          onScroll={(e) => setLandingScrolled(e.currentTarget.scrollTop > e.currentTarget.clientHeight * 0.5)}
        >
          <section className="landing-hero">
            <div className="welcome-copy">
              <span className="welcome-brand"><Activity size={20}/> VITALIS · MODS</span>
              <h1>从全身，<br/><em>看见变化。</em></h1>
              <p>脓毒症多器官功能障碍风险评估与知识探索</p>
              <p className="landing-position">面向脓毒症患者的首次 MODS 动态风险预测 · 24 / 48 / 72 小时窗口</p>
              <button className="welcome-button" onClick={() => setWelcome(false)}>进入演示 <ArrowRight size={17}/></button>
              <small>演示模式 · 使用虚构病例与预设结果</small>
            </div>
            <button className="landing-scroll-hint" onClick={() => scrollLandingTo("architecture")}>
              <ChevronDown size={15} /> 向下滚动 · 了解系统架构
            </button>
          </section>
          <div className="landing-body">
            <ArchitectureSection variant="landing" />
            <footer className="landing-footer">
              <button onClick={() => scrollLandingTo("top")}><ChevronUp size={13} /> 回到顶部</button>
              <span>VITALIS · MODS 交互演示</span>
            </footer>
          </div>
          {landingScrolled && (
            <button className="landing-enter-float" onClick={() => setWelcome(false)}>
              进入演示 <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
      {report && (
        <div className="report-overlay">
          <div className="report-top">
            <button onClick={() => setReport(false)}>
              <ArrowLeft size={16} /> 返回评估
            </button>
            <span>
              {patient.id} · {patient.encounter} · {displayTime(snapshot.time)}{" "}
              · 演示报告
            </span>
            <a className="report-chat-jump" href="#report-chat">跳至问答</a>
          </div>
          <div className="report-columns"><div className="report-content">
            <span className="eyebrow">ASSESSMENT REPORT</span>
            <h1>综合评估报告</h1>
            <p>患者评估 · 2026 年 11 月 16 日 {displayTime(snapshot.time)}</p>
            <div className="report-layout">
              <div className="report-main">
                <div className="report-hero journey-card">
                  <div>
                    <span className="journey-eyebrow">首次 MODS 风险</span>
                    <div className="report-number">
                      {displayProbability(risk)}
                      <small>
                        {eligible
                          ? `未来 ${hours} 小时 · 演示概率`
                          : status === "已满足"
                            ? "首次事件预测不适用"
                            : "数据不足"}
                      </small>
                    </div>
                    <div className="window-buttons">
                      {[24, 48, 72].map((h, i) => (
                        <button
                          className={i === horizon ? "active" : ""}
                          key={h}
                          onClick={() => setHorizon(i)}
                        >
                          {h} 小时
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="report-hero-side">
                    <span>当前 MODS 状态</span>
                    <strong>{status}</strong>
                    <span>主要关注</span>
                    <strong>
                      {patient.id === "DEMO-003"
                        ? "数据完整性"
                        : patient.id === "DEMO-001"
                          ? "呼吸 · 肾功能"
                          : "持续观察"}
                    </strong>
                  </div>
                </div>
                <div className="journey-card report-section">
                  <h2>六功能域摘要</h2>
                  <div className="report-organ-grid">
                    {domains.map((d, i) => (
                      <button key={d.key} onClick={() => openExpert(i)}>
                        <span>
                          {d.label}
                          <ChevronRight size={14} />
                        </span>
                        <strong>
                          {snapshot.scores[i] === null
                            ? "未知"
                            : `${snapshot.scores[i]} 分`}
                        </strong>
                        <small>
                          {d.metric} · {snapshot.values[i]}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="journey-card report-section">
                  <h2>综合分析与复核</h2>
                  <p>
                    {patient.id === "DEMO-003"
                      ? "部分资料缺失，需补充记录并核查评估背景。"
                      : "结合呼吸、循环、肾功能等多域变化和文献解释，器官间具体关系需人工复核。"}
                  </p>
                  <div className="review-note">
                    <Sparkles size={16} />{" "}
                    复核测量时间、氧合情况、肌酐变化和循环支持记录。
                  </div>
                  <button
                    className="journey-link"
                    onClick={() => openExpert(6)}
                  >
                    查看综合专家依据 <ArrowRight size={14} />
                  </button>
                  <button
                    className="journey-link"
                    onClick={() => openArchitecture(true)}
                  >
                    分析方法与系统架构 <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              <div className="report-side">
                <div className="journey-card report-section">
                  <h2>风险随时间变化</h2>
                  <p>未来 {hours} 小时 · 已有演示时点</p>
                  <RiskChart
                    snapshots={patient.snapshots}
                    horizon={horizon}
                    index={timeIndex}
                  />
                  <div className="report-times">
                    {patient.snapshots.map((s, i) => (
                      <button
                        key={s.time}
                        className={i === timeIndex ? "active" : ""}
                        onClick={() => setTimeIndex(i)}
                      >
                        {displayTime(s.time)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="journey-card report-section">
                  <h2>七个知识视图</h2>
                  <div className="report-evidence">
                    {evidence.map((e, i) => (
                      <button key={e.name} onClick={() => openEvidence(i)}>
                        <BookOpen size={14} />
                        {e.name}知识视图 <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div><ReportChat caseId={patient.id} time={displayTime(snapshot.time)} hours={hours} questions={questions} messages={messages} input={input} notice={notice} setInput={setInput} send={send} openExpert={openEvidence} /></div>
        </div>
      )}
      {architecture && (
        <div className="report-overlay architecture-overlay">
          <div className="report-top">
            <button onClick={() => setArchitecture(false)}>
              <ArrowLeft size={16} /> {archFromReport ? "返回报告" : "返回评估"}
            </button>
            <span>VITALIS · MODS · 系统架构</span>
          </div>
          <div className="architecture-overlay-content">
            <ArchitectureSection variant="overlay" />
          </div>
        </div>
      )}
      {editRecords && (
        <RecordsDrawer
          data={recordData}
          onChange={(v) => {
            setRecordData(v);
            setDirty(true);
            setImported(false);
            setImportStep(-1);
            setAnalysis(-1);
            setReport(false);
          }}
          close={() => setEditRecords(false)}
        />
      )}
      {panel && (
        <div className={`drawer-shade ${panel === "expert" && !report ? "expert-shade" : ""}`} onClick={() => setPanel(null)}>
          {panel === 'expert' && !report && <nav className="expert-domain-nav" aria-label="切换功能域" onClick={e => e.stopPropagation()}>{evidence.map((item, i) => <button key={item.name} className={expert === i ? 'active' : ''} onClick={() => openExpert(i)}>{item.name}</button>)}</nav>}
          <aside
            key={panel === 'expert' ? expert : panel}
            className={`drawer unified-drawer ${reportCollapsed ? 'collapsed' : ''}`}
            onClick={(e) => e.stopPropagation()}
          >
            {panel === 'expert' && !report && <button className="mobile-report-toggle" onClick={() => setReportCollapsed(v => !v)}>{reportCollapsed ? '展开报告' : '收起报告'}</button>}
            <div className="drawer-head">
              <div>
                <span className="eyebrow">
                  {panel === "import"
                    ? "PATIENT DATA"
                    : panel === "expert"
                      ? "EXPERT EVIDENCE"
                      : "ASK THE REPORT"}
                </span>
                <h2>
                  {panel === "import"
                    ? "导入演示数据"
                    : panel === "expert"
                      ? `${currentEvidence.name}分析`
                      : "询问报告"}
                </h2>
                <p>
                  {patient.id} · {displayTime(snapshot.time)} · 演示模式
                </p>
              </div>
              <button
                className="icon-button"
                onClick={() => setPanel(null)}
                aria-label="关闭"
              >
                <X size={19} />
              </button>
            </div>
            {panel === "import" && (
              <>
                <div className="import-box">
                  <FileJson size={28} />
                  <h3>
                    {file
                      ? `${patient.id}_临床记录.json`
                      : "选择病例对应的演示文件"}
                  </h3>
                  <p>包含虚构患者信息与历史记录</p>
                  <button
                    className="main-secondary"
                    onClick={() => {
                      setFile(true);
                      setImportStep(-1);
                      setImported(false);
                      setAnalysis(-1);
                    }}
                  >
                    选择演示文件
                  </button>
                  {file && (
                    <button
                      className="main-primary"
                      disabled={importStep >= 0 && importStep < 4}
                      onClick={() => setImportStep(0)}
                    >
                      {importStep >= 4 ? "重新导入" : "导入并解析"}{" "}
                      <ArrowRight size={14} />
                    </button>
                  )}
                </div>
                <div className="check-list">
                  {[
                    "读取演示文件",
                    "识别患者与记录",
                    "整理历史时间序列",
                    "检查数据完整性",
                  ].map((x, i) => (
                    <div
                      key={x}
                      className={
                        importStep > i
                          ? "done"
                          : importStep === i
                            ? "running"
                            : ""
                      }
                    >
                      <span>
                        {importStep > i ? <Check size={13} /> : i + 1}
                      </span>
                      <b>{x}</b>
                      <small>
                        {importStep > i
                          ? "已完成"
                          : importStep === i
                            ? "进行中"
                            : "等待中"}
                      </small>
                    </div>
                  ))}
                </div>
                {importStep >= 4 && (
                  <div className="import-summary">
                    <div>
                      <span>患者 / 住院</span>
                      <b>
                        {patient.id} / {patient.encounter}
                      </b>
                    </div>
                    <div>
                      <span>历史范围</span>
                      <b>01:00 — 13:00</b>
                    </div>
                    <div>
                      <span>数据情况</span>
                      <b>
                        {patient.id === "DEMO-003"
                          ? "部分资料缺失"
                          : "预设记录已准备"}
                      </b>
                    </div>
                    <button
                      className="journey-link"
                      onClick={() => setRecords(!records)}
                    >
                      {records ? "收起记录" : "查看识别记录"}{" "}
                      <ChevronRight size={14} />
                    </button>
                    {records && (
                      <div className="record-preview">
                        {domains.map((d, i) => (
                          <div key={d.key}>
                            <span>{d.metric}</span>
                            <strong>{snapshot.values[i]}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    <label className="time-select">
                      预测时刻
                      <select
                        value={timeIndex}
                        onChange={(e) => setTimeIndex(Number(e.target.value))}
                      >
                        {patient.snapshots.map((s, i) => (
                          <option key={s.time} value={i}>
                            {displayTime(s.time)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="main-primary"
                      onClick={() => {
                        setImported(true);
                        setAnalysis(-1);
                        setPanel(null);
                      }}
                    >
                      完成并返回评估 <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </>
            )}
            {panel === "import" && (
              <button
                className="main-secondary"
                onClick={() => {
                  setPanel(null);
                  setEditRecords(true);
                }}
              >
                编辑临床记录
              </button>
            )}
            {panel === "expert" && (
              <>
                {report && <div className="expert-tabs">{evidence.map((e, i) => <button key={e.name} className={expert === i ? 'active' : ''} onClick={() => openExpert(i)}>{e.name}</button>)}</div>}
                <section className="expert-conclusion">
                  <span className="section-index">关键结论 · 演示分析</span>
                  <h3>{expert === 6 ? `当前 MODS 状态：${status}` : snapshot.scores[expert] === null ? '资料不足，暂无法评估' : `${domains[expert].label} SOFA 分项 ${snapshot.scores[expert]} 分`}</h3>
                  <p>{expert === 6 ? '结合六个功能域的状态与文献背景，综合查看当前患者。' : `${domains[expert].metric}为 ${snapshot.values[expert]}，需结合患者完整资料复核。`}</p>
                </section>
                <section className="evidence-section expert-metrics">
                  <span className="section-index">01 / 患者事实与当前状态</span>
                  <p>{expert === 6 ? `当前 MODS 状态：${status}。` : `${domains[expert].metric}：${snapshot.values[expert]}；SOFA ${snapshot.scores[expert] === null ? "无法评估" : `${snapshot.scores[expert]} 分`}。`} 记录时刻 {displayTime(snapshot.time)}。</p>
                  {expert === 5 && <p>01:00 肌酐 {patient.snapshots[0].values[5]} → {displayTime(snapshot.time)} {snapshot.values[5]}</p>}
                </section>
                <section className="evidence-section">
                  <span className="section-index">02 / 数值模型结果</span>
                  <h3>
                    未来 {hours} 小时风险：
                    {displayProbability(
                      expert === 6 ? risk : domainRisk(expert),
                    )}
                  </h3>
                  <p>
                    演示概率由预设数值模型结果提供，专家结合患者资料进行解释。
                  </p>
                </section>
                <section className="evidence-section"><span className="section-index">03 / 专家解释与复核</span><p>{currentEvidence.summary} {currentEvidence.limitation}</p></section>
                <KnowledgeGalaxy index={expert} snapshot={snapshot} caseId={patient.id} request={evidenceRequest?.domain === expert ? evidenceRequest.id : undefined} onRequestHandled={() => setEvidenceRequest(null)} />
              </>
            )}
            {panel === "chat" && (
              <>
                <p className="chat-disclaimer">预设问答 · 基于当前报告情景</p>
                <div className="drawer-questions">
                  {questions.map((q) => (
                    <button key={q} onClick={() => send(q)}>
                      {q}
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
                <div className="drawer-messages">
                  {messages.map((m, i) => (
                    <div key={`${m.q}-${i}`}>
                      <div className="user-message">{m.q}</div>
                      <div className="assistant-message">
                        <p>{m.a}</p>
                        <button
                          className="citation-button"
                          onClick={() => openExpert(m.ref)}
                        >
                          <BookOpen size={13} /> 查看{evidence[m.ref].name}依据
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chat-input">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send(input);
                    }}
                    placeholder="输入或选择预设问题"
                  />
                  <button onClick={() => send(input)} aria-label="发送问题">
                    <Send size={16} />
                  </button>
                </div>
                {notice && <p className="chat-notice">{notice}</p>}
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
