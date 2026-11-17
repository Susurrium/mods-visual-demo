import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowRight, BookOpen, ChevronDown, ChevronRight, CircleHelp, FileText, Pause, Play, RotateCcw, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cases, displayProbability, displayTime, domains, modsStatus, type DomainKey } from './data/model'
import RecordsDrawer, { emptyInput, type InputData } from './components/RecordsDrawer'
import RiskChart from './components/RiskChart'
const BodyScene = lazy(() => import('./components/BodyScene'))

const organRisks: Record<string, (number[][] | null)[]> = {
  'DEMO-001': [ [[0.12,0.18,0.25],[0.06,0.09,0.12],[0.05,0.08,0.10],[0.11,0.17,0.22],[0.04,0.06,0.09],[0.09,0.14,0.19]], [[0.19,0.26,0.33],[0.07,0.10,0.14],[0.06,0.09,0.12],[0.15,0.21,0.28],[0.05,0.08,0.11],[0.14,0.20,0.27]], [[0.32,0.41,0.48],[0.09,0.13,0.17],[0.08,0.12,0.16],[0.23,0.30,0.37],[0.06,0.10,0.14],[0.29,0.38,0.45]], null ],
  'DEMO-002': [ [[0.07,0.11,0.15],[0.04,0.07,0.10],[0.03,0.06,0.08],[0.06,0.09,0.13],[0.03,0.05,0.07],[0.05,0.08,0.11]], [[0.06,0.10,0.14],[0.04,0.07,0.09],[0.03,0.05,0.08],[0.05,0.09,0.12],[0.03,0.05,0.07],[0.05,0.08,0.11]], [[0.05,0.09,0.13],[0.03,0.06,0.09],[0.03,0.05,0.07],[0.05,0.08,0.11],[0.02,0.04,0.06],[0.04,0.07,0.10]], [[0.04,0.08,0.11],[0.03,0.05,0.08],[0.02,0.04,0.07],[0.04,0.07,0.10],[0.02,0.04,0.06],[0.04,0.06,0.09]] ],
  'DEMO-003': [null, null, null, null],
}
const labels = ['24', '48', '72']

function App() {
  const [entered, setEntered] = useState(false)
  const [caseIndex, setCaseIndex] = useState(0)
  const [timeIndex, setTimeIndex] = useState(2)
  const [horizon, setHorizon] = useState(0)
  const [selected, setSelected] = useState<DomainKey | null>(null)
  const [hovered, setHovered] = useState<DomainKey | null>(null)
  const [playing, setPlaying] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [evidence, setEvidence] = useState(false)
  const [about, setAbout] = useState(false)
  const [analysisStep, setAnalysisStep] = useState(-1)
  const [cameraReset, setCameraReset] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [records, setRecords] = useState<InputData>(() => emptyInput(cases[0].id, cases[0].encounter))
  const current = cases[caseIndex]
  const snapshot = current.snapshots[timeIndex]
  const selectedIndex = domains.findIndex(d => d.key === selected)
  const activeIndex = selectedIndex < 0 ? 0 : selectedIndex
  const active = domains[activeIndex]
  const score = snapshot.scores[activeIndex]
  const domainRisk = organRisks[current.id][timeIndex]?.[activeIndex]?.[horizon] ?? null
  const status = modsStatus(snapshot.scores)
  const isEligible = current.id !== 'DEMO-003' && status !== '已满足'
  const risk = dirty || !isEligible ? null : snapshot.risks[horizon]

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setTimeIndex(value => { if (value >= current.snapshots.length - 1) { setPlaying(false); return value } return value + 1 }), 1900)
    return () => window.clearInterval(timer)
  }, [playing, current.snapshots.length])
  useEffect(() => {
    if (analysisStep < 0) return
    if (analysisStep >= 3) { const end = window.setTimeout(() => setAnalysisStep(-1), 650); return () => window.clearTimeout(end) }
    const next = window.setTimeout(() => setAnalysisStep(value => value + 1), 650)
    return () => window.clearTimeout(next)
  }, [analysisStep])
  const sampleRecords = (index: number, t: number): InputData => {
    const patient = cases[index]; const s = patient.snapshots[t]
    const codes = ['spo2', 'platelet', 'bilirubin_total', 'mean_bp', 'gcs', 'creatinine']
    const units = ['%', '10^9/L', 'mg/dL', 'mmHg', 'score', 'mg/dL']
    return { ...emptyInput(patient.id, patient.encounter), demographics: { admission_age: patient.age, gender: patient.sex === '女' ? 'F' : 'M' }, observations: s.values.flatMap((v, i) => {
      const number = Number.parseFloat(v)
      return Number.isFinite(number) && i !== 4 ? [{ record_id: `sample-${patient.id}-${t}-${i}`, code: codes[i], value: number, unit: units[i], measured_at: s.time, available_at: s.time, source: 'demo' }] : []
    }) }
  }
  useEffect(() => { if (!dirty) setRecords(sampleRecords(caseIndex, timeIndex)) }, [caseIndex, timeIndex, dirty])
  const changeCase = (index: number) => { setCaseIndex(index); setTimeIndex(2); setPlaying(false); setSelected(null); setDirty(false); setRecords(sampleRecords(index, 2)); setCameraReset(x => x + 1) }
  const changeTime = (index: number) => { setTimeIndex(index) }
  const restore = () => { setDirty(false); setRecords(sampleRecords(caseIndex, timeIndex)); setPlaying(false) }
  const start = () => { setEntered(true); setRecords(sampleRecords(0, 2)) }
  const shownScore = dirty ? null : score
  const label = dirty ? '输入已变更' : score === null ? '无法评估' : score >= 2 ? '达到异常阈值' : '低于异常阈值'
  const statusText = dirty ? '输入已变更' : status
  const riskReason = dirty ? '输入已变更，请恢复演示病例' : status === '已满足' ? '首次事件预测不适用' : !isEligible ? '数据不足，无法评估' : ''
  const focused = selected ?? hovered
  const headline = useMemo(() => dirty ? '当前输入未计算' : status === '已满足' ? '已满足 MODS 条件' : status === '无法判定' ? '资料不足，等待评估' : '关注器官功能变化', [dirty, status])

  return <main className={`app-shell ${entered ? 'in-app' : 'is-landing'}`}>
    <div className="ambient ambient-one"/><div className="ambient ambient-two"/><div className="ambient ambient-three"/>
    <header className="topbar"><button className="brand" onClick={() => { setEntered(false); setSelected(null); setPlaying(false) }} aria-label="返回首页"><span className="brand-mark"><Activity size={17}/></span><span>VITALIS<small> · MODS</small></span></button><div className="top-actions"><span className="demo-label"><span/>演示模式</span>{entered && <><button className="quiet-button" onClick={() => setDrawer(true)}><FileText size={15}/> 临床记录</button><button className="quiet-button" onClick={restore}><RotateCcw size={14}/> 恢复病例</button></>}<button className="icon-button" onClick={() => setAbout(true)} aria-label="关于与来源"><CircleHelp size={19}/></button></div></header>
    <div className="scene-background"><div className="scene-ring ring-one"/><div className="scene-ring ring-two"/><div className="scene-glow"/><Suspense fallback={<div className="scene-loading">正在准备三维场景…</div>}><BodyScene selected={selected} onSelect={key => { setSelected(key); setEvidence(false) }} scores={dirty ? Array(6).fill(null) : snapshot.scores} sex={current.sex} reset={cameraReset}/></Suspense></div>

    {!entered ? <motion.section className="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="landing-copy"><div className="landing-rule"/><p className="landing-kicker">INTELLIGENT ORGAN INSIGHT</p><h1>看见变化，<br/><em>更早一步。</em></h1><p className="landing-description">脓毒症患者多器官功能障碍<br/>动态风险预测交互演示</p><button className="primary landing-cta" onClick={start}>进入演示 <ArrowRight size={17}/></button><p className="landing-foot">虚构病例与预设结果 · 用于研究展示</p></div><div className="landing-side"><span>01 / 06</span><strong>从全身，到每个器官。</strong><p>探索生命体征背后的关联与变化。</p></div><div className="landing-bottom">SEPSIS → MODS <span> · </span> INTERACTIVE EXPERIENCE</div></motion.section> : <motion.div className="workspace" initial={{opacity:0}} animate={{opacity:1}}>
      <section className="left-panel glass-panel"><div className="panel-heading"><div><span className="eyebrow">PATIENT OVERVIEW</span><h2>患者概览</h2></div><span className="sample-tag">虚构病例</span></div>
        <label className="case-picker"><span>当前病例</span><select value={caseIndex} onChange={e => changeCase(Number(e.target.value))}>{cases.map((item, i) => <option value={i} key={item.id}>{item.id} · {item.label}</option>)}</select><ChevronDown size={15}/></label>
        <div className="patient-meta"><div><span>住院编号</span><b>{dirty ? records.encounter_id : current.encounter}</b></div><div><span>年龄 / 性别</span><b>{dirty ? `${records.demographics?.admission_age ?? '未知'} 岁 / ${{ F: '女', M: '男', UNKNOWN: '未知' }[records.demographics?.gender ?? 'UNKNOWN']}` : `${current.age} 岁 / ${current.sex}`}</b></div></div>
        <div className="panel-divider"/>
        <div className="risk-heading"><span>首次 MODS 风险</span><button className="text-link" onClick={() => setEvidence(true)}>查看依据 <ArrowRight size={13}/></button></div><p className="risk-subtitle">从 {displayTime(snapshot.time)} 起未来 {labels[horizon]} 小时内</p>
        <div className="risk-number">{displayProbability(risk)}<span>{risk === null ? '' : '预测概率'}</span></div><div className="risk-note">{riskReason || '演示概率 · 非模型推理结果'}</div>
        <div className="tabs horizon-tabs">{labels.map((h, i) => <button className={horizon === i ? 'active' : ''} key={h} onClick={() => setHorizon(i)}>{h} 小时</button>)}</div>
        <div className="chart-label"><span>风险历史</span><span>同一预测窗口</span></div>{dirty ? <div className="chart-empty">输入已更改，历史结果暂不可用</div> : <RiskChart snapshots={current.snapshots} horizon={horizon} index={timeIndex}/>}<div className="status-row"><span>当前 MODS 状态</span><b className={status === '已满足' && !dirty ? 'warm' : ''}><span className="status-dot"/>{statusText}</b></div><div className="status-row"><span>数据情况</span><button className="inline-action" onClick={() => setDrawer(true)}>{dirty ? '查看当前输入' : current.id === 'DEMO-003' ? '部分记录缺失' : '查看记录'} <ChevronRight size={14}/></button></div>
      </section>

      <section className="body-area" aria-label="三维人体交互"><div className="body-title"><span className="eyebrow">ORGAN INSIGHT</span><h2>探索身体，<br/><em>理解风险。</em></h2><p>选择功能域，查看患者的变化</p></div><div className="body-tools"><span><span className="legend-dot"/> 当前功能域状态</span>{selected && <button onClick={() => {setSelected(null);setCameraReset(v => v+1)}}><RotateCcw size={13}/> 返回全身</button>}</div><div className="organ-nav">{domains.map((domain, i) => <button key={domain.key} onMouseEnter={() => setHovered(domain.key)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(domain.key)} onBlur={() => setHovered(null)} className={`${focused === domain.key ? 'active' : ''} ${!dirty && snapshot.scores[i] !== null && snapshot.scores[i]! >= 2 ? 'alert' : ''}`} onClick={() => setSelected(domain.key)}><span className="organ-indicator"/>{domain.label}</button>)}</div><div className="body-hint">拖动旋转 · 滚动缩放 · 点击器官探索</div></section>

      <section className="right-panel glass-panel"><div className="panel-heading"><div><span className="eyebrow">{selected ? active.en : 'ORGAN STATUS'}</span><h2>{selected ? active.label : '六功能域状态'}</h2></div>{selected && <button className="icon-button small" onClick={() => {setSelected(null); setCameraReset(x => x + 1)}} aria-label="返回器官概览"><X size={16}/></button>}</div><AnimatePresence mode="wait">{!selected ? <motion.div key="overview" initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}}><p className="overview-copy">{headline}</p><div className="organ-list">{domains.map((domain, i) => {const s = snapshot.scores[i]; return <button key={domain.key} className="organ-row" onClick={() => setSelected(domain.key)}><span className={`organ-orb ${!dirty && s !== null && s >= 2 ? 'orb-warm' : ''}`}>{String(i + 1).padStart(2,'0')}</span><span><b>{domain.label}</b><small>{dirty ? '输入已变更' : s === null ? '无法评估' : s >= 2 ? '达到异常阈值' : '低于异常阈值'}</small></span><span className="organ-score">{dirty || s === null ? '—' : `${s} 分`}</span><ChevronRight size={15}/></button>})}</div><div className="overview-foot"><Sparkles size={16}/><span>选择器官，探索相关指标与证据。</span></div></motion.div> : <motion.div key={active.key} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><p className="domain-desc">{active.copy}</p><div className="domain-state"><div><span>当前 SOFA 分项</span><strong>{shownScore === null ? '—' : shownScore}<small>{shownScore === null ? '' : ' / 4'}</small></strong></div><div className={`state-pill ${shownScore !== null && shownScore >= 2 ? 'danger' : ''}`}><span/>{label}</div></div><div className="detail-block"><span className="detail-label">关键临床指标</span><div className="metric-value">{dirty ? '—' : snapshot.values[activeIndex]}</div><p>{active.metric} · {displayTime(snapshot.time)} 记录</p></div><div className="detail-block"><span className="detail-label">未来 {labels[horizon]} 小时风险</span><div className="metric-value">{dirty || !isEligible ? '—' : displayProbability(domainRisk)}</div><p>{dirty ? '输入已变更' : !isEligible ? riskReason : '演示概率 · 非模型推理结果'}</p></div><div className="detail-block"><span className="detail-label">指标时间序列</span><div className="metric-history">{current.snapshots.map((s, i) => <button key={s.time} className={timeIndex === i ? 'current' : ''} onClick={() => changeTime(i)}><b>{displayTime(s.time)}</b><span>{dirty ? '—' : s.values[activeIndex]}</span></button>)}</div></div><button className="evidence-button" onClick={() => setEvidence(true)}><BookOpen size={16}/> 查看判断依据与文献 <ArrowRight size={15}/></button></motion.div>}</AnimatePresence></section>
      <section className="timeline glass-panel"><div className="timeline-intro"><span className="eyebrow">PATIENT TIMELINE</span><strong>随时间观察变化</strong><span>2026 年 11 月 16 日</span></div><button className="play-button" onClick={() => { if (timeIndex === current.snapshots.length-1) changeTime(0); setPlaying(p => !p) }} aria-label={playing ? '暂停' : '播放'}>{playing ? <Pause size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}</button><div className="timeline-track"><div className="track-line"/><div className="track-fill" style={{width:`${timeIndex/(current.snapshots.length-1)*100}%`}}/>{current.snapshots.map((s,i) => <button className={`time-point ${i === timeIndex ? 'current' : ''} ${i < timeIndex ? 'past' : ''}`} key={s.time} onClick={() => {setPlaying(false); changeTime(i)}}><span/><b>{displayTime(s.time)}</b></button>)}</div><div className="timeline-current"><span>当前观察时点</span><strong>{displayTime(snapshot.time)}</strong></div></section>
      <div className="workspace-footer"><span>◌ 本页面所有患者数据与概率均为演示</span><button onClick={() => setAnalysisStep(0)} disabled={dirty}><Sparkles size={13}/> 播放分析流程</button></div>
    </motion.div>}
    <AnimatePresence>{analysisStep >= 0 && <motion.div className="analysis-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><div className="analysis-card"><span className="analysis-spinner"/><span className="eyebrow">DEMONSTRATION</span><h2>正在播放分析流程</h2>{['整理患者记录','查看六功能域状态','汇总预设演示结果'].map((step,i) => <div className={`analysis-step ${analysisStep >= i ? 'on' : ''}`} key={step}><span>{analysisStep > i ? '✓' : `0${i+1}`}</span>{step}</div>)}<p>展示预设流程与结果</p></div></motion.div>}</AnimatePresence>
    {drawer && <RecordsDrawer data={records} onChange={data => {setRecords(data);setDirty(true);setPlaying(false)}} close={() => setDrawer(false)}/>}
    {evidence && <div className="drawer-shade" onClick={() => setEvidence(false)}><aside className="drawer evidence-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">EXPLANATION & EVIDENCE</span><h2>理解这次评估</h2><p>{selected ? active.label : '整体风险'} · 演示病例</p></div><button className="icon-button" onClick={() => setEvidence(false)} aria-label="关闭"><X size={19}/></button></div><section className="evidence-section"><span className="section-index">01 / PATIENT DATA</span><h3>患者数据事实</h3><p>{dirty ? '输入已变更，预设解释不再对应当前记录。' : selected ? `${displayTime(snapshot.time)} 的${active.metric}记录为 ${snapshot.values[activeIndex]}。` : `${displayTime(snapshot.time)} 当前 MODS 状态：${status}。`}</p></section><section className="evidence-section"><span className="section-index">02 / MODEL INSIGHT</span><h3>模型判断依据</h3><div className="demo-basis">{dirty ? '当前输入暂无模型结果。' : '演示说明：系统可在接入真实模型归因后展示贡献因素与方向。'}</div></section><section className="evidence-section"><span className="section-index">03 / MEDICAL CONTEXT</span><h3>医学知识与文献</h3><p>Sepsis-3 共识使用 SOFA 评分描述感染相关器官功能障碍。此处文献用于展示背景知识，具体病例与风险数值均为虚构。</p><a className="paper-card" href="https://pubmed.ncbi.nlm.nih.gov/26903338/" target="_blank" rel="noreferrer"><span>JAMA · 2016 <ArrowDownRight size={15}/></span><b>The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3)</b><small>PMID 26903338 · DOI 10.1001/jama.2016.0287</small></a><p className="paper-note">原文：定义与临床标准部分。该文献不验证此演示病例或其预测结果。</p></section></aside></div>}
    {about && <div className="drawer-shade" onClick={() => setAbout(false)}><aside className="drawer about-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><span className="eyebrow">ABOUT THE EXPERIENCE</span><h2>关于与来源</h2></div><button className="icon-button" onClick={() => setAbout(false)} aria-label="关闭"><X size={19}/></button></div><p>VITALIS 是脓毒症至 MODS 风险预测项目的交互展示。所有病例、评分及预测概率为虚构演示数据。</p><h3>三维人体资源</h3><p>Anatomy: BodyParts3D © The Database Center for Life Science (CC BY 4.0); female organs: Human Reference Atlas 3D Reference Organs, HuBMAP (CC BY 4.0); female body: MakeHuman (CC0). Modified by open-anatomy-3d, CC BY 4.0. 本项目调整了模型材质与展示方式。</p><div className="about-links"><a href="https://github.com/MervinR07/open-anatomy-3d" target="_blank" rel="noreferrer">Open Anatomy 3D <ArrowRight size={14}/></a><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0 <ArrowRight size={14}/></a><a href={`${import.meta.env.BASE_URL}licenses/ATTRIBUTION.md`} target="_blank">完整署名 <ArrowRight size={14}/></a></div></aside></div>}
  </main>
}
export default App
