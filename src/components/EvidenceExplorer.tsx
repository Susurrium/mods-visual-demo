import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GraphCanvas, type GraphLink, type GraphNode } from 'obi-graph'
import { BookOpen, Maximize2, X } from 'lucide-react'
import { displayTime, domains, type Snapshot } from '../data/model'
import 'obi-graph/styles.css'
import '../knowledge-explorer.css'
import '../literature.css'
import '../literature-preview.css'

type RecordData = { [key: string]: string | number | string[] | null | undefined }
type Paper = RecordData & { 文献编号: string; 题名: string; 领域: string[]; 证据卡编号: string[]; 分片: number }
type Card = RecordData & { 卡片编号: string; 文献编号: string; 领域: string[] }
type Data = { kind: string; domain?: number; paper?: Paper; card?: Card; description?: string }
type LinkData = { relation: string }
const names = ['呼吸', '凝血', '肝功能', '循环', '中枢神经', '肾功能', '综合']
const colors = ['#76c8ed', '#b696e5', '#e8a8c7', '#edb699', '#9eaaf4', '#82d7c5', '#c8c1ee']
const topics = ['氧合与肺损伤', '脓毒症相关凝血', '脓毒症相关肝损伤', '感染性休克与循环', '脓毒症相关脑病', '急性肾损伤', '多器官功能障碍']
const suggestedCards: Record<number, string> = { 0: 'M00361-3', 1: 'M15730-1', 2: 'M27337-1' }
const text = (v: unknown) => v === null || v === undefined || v === '' ? '未提供' : String(v)
const url = (name: string) => `${import.meta.env.BASE_URL}literature/${name}`
async function load<T>(name: string): Promise<T> {
  const response = await fetch(url(name))
  if (!response.ok) throw new Error(`无法读取 ${name}（${response.status}）`)
  return response.json() as Promise<T>
}

export default function EvidenceExplorer({ index, snapshot, caseId, request, onRequestHandled }: { index: number; snapshot: Snapshot; caseId: string; request?: number; onRequestHandled?: () => void }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'network' | 'catalog'>('network')
  const [papers, setPapers] = useState<Paper[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [error, setError] = useState('')
  const [domain, setDomain] = useState(index)
  const [selected, setSelected] = useState(`domain-${index}`)
  const [hover, setHover] = useState<GraphNode<Data> | null>(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [year, setYear] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [detail, setDetail] = useState<RecordData | null>(null)
  const [catalogPaper, setCatalogPaper] = useState<Paper | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [reset, setReset] = useState(0)
  const [summary, setSummary] = useState<{ domains: { papers: number; cards: number }[] } | null>(null)
  const [followEvidence, setFollowEvidence] = useState(false)
  const detailRequest = useRef(0)
  useEffect(() => { load<typeof summary>('summary.json').then(setSummary).catch(e => setError(String(e))) }, [])
  useEffect(() => {
    if (!request) return
    setDomain(index); setSelected(`domain-${index}`); setMode('network'); setOpen(true); setFollowEvidence(true); setCollapsed(false)
    onRequestHandled?.()
  }, [request, index, onRequestHandled])
  useEffect(() => {
    if (!open || papers.length) return
    Promise.all([load<Paper[]>('index.json'), load<Card[]>('cards.json')]).then(([p, c]) => { setPapers(p); setCards(c) }).catch(e => setError(String(e)))
  }, [open, papers.length])
  useEffect(() => { setPage(0) }, [query, domain, type, year, status])
  useEffect(() => {
    if (!followEvidence || !papers.length) return
    const card = cards.find(c => c.卡片编号 === suggestedCards[index]) ?? cards.find(c => c.领域.includes(names[index]))
    if (card) setSelected(`card-${card.卡片编号}`)
    else setMode('catalog')
    setFollowEvidence(false)
  }, [followEvidence, papers, cards, index])
  const featured = useMemo(() => papers.filter(p => p.证据卡编号.length), [papers])
  const preview = useMemo(() => {
    const nodes: GraphNode<Data>[] = [{ id: 'center', label: names[index], x: 0, y: 0, color: colors[index], radius: 9, hub: true, data: { kind: '功能域' } }]
    const links: GraphLink<LinkData>[] = []
    ;[0, 1, 2, 3, 4, 5, 6, 7].forEach(i => {
      const angle = i * Math.PI / 4
      nodes.push({ id: `preview-${i}`, label: '', x: Math.cos(angle) * (38 + i * 3), y: Math.sin(angle) * (38 + i * 3), color: i % 2 ? '#f5d4b4' : '#b696e5', radius: i % 3 ? 3 : 5, data: { kind: '预览' } })
      links.push({ source: 'center', target: `preview-${i}`, color: '#a9c5e266', width: .7 })
      if (i > 0) links.push({ source: `preview-${i - 1}`, target: `preview-${i}`, color: '#7993c644', width: .5 })
    })
    return { nodes, links }
  }, [index])
  const graph = useMemo(() => {
    const nodes: GraphNode<Data>[] = []
    const links: GraphLink<LinkData>[] = []
    const add = (source: string, target: string, relation: string) => links.push({ source, target, distance: 65, color: '#859dc366', width: .8, data: { relation } })
    names.forEach((name, i) => {
      const angle = i * Math.PI * 2 / 7
      nodes.push({ id: `domain-${i}`, label: name, x: Math.cos(angle) * 220, y: Math.sin(angle) * 180, color: colors[i], radius: 10, hub: true, data: { kind: '功能域', domain: i } })
      nodes.push({ id: `topic-${i}`, label: topics[i], x: Math.cos(angle) * 260, y: Math.sin(angle) * 210, color: '#b696e5', radius: 6, data: { kind: '医学主题', domain: i, description: '演示用的领域主题，用于组织该领域题录。' } })
      add(`domain-${i}`, `topic-${i}`, '演示主题归类')
      if (i < 6) {
        nodes.push({ id: `metric-${i}`, label: domains[i].metric, x: Math.cos(angle) * 180, y: Math.sin(angle) * 150, color: '#96e1dc', radius: 4, data: { kind: '患者指标', domain: i } })
        add(`domain-${i}`, `metric-${i}`, '领域演示指标')
      }
    })
    const graphPapers = catalogPaper && !featured.some(p => p.文献编号 === catalogPaper.文献编号) ? [...featured, catalogPaper] : featured
    graphPapers.forEach((p, i) => {
      const domainIndices = p.领域.map(d => names.indexOf(d)).filter(d => d >= 0)
      const primary = domainIndices[0] ?? 6
      const a = primary * Math.PI * 2 / 7
      nodes.push({ id: `paper-${p.文献编号}`, label: `${text(p.第一作者)} · ${text(p.年份)}`, x: Math.cos(a) * 220 + (i % 5) * 14, y: Math.sin(a) * 180 + (i % 4) * 14, color: '#f5d4b4', radius: 5, data: { kind: '文献', domain: primary, paper: p } })
      domainIndices.forEach(d => add(`domain-${d}`, `paper-${p.文献编号}`, '题录主题归属'))
      domainIndices.forEach(d => add(`topic-${d}`, `paper-${p.文献编号}`, '按领域的演示关联'))
      if (selected === `paper-${p.文献编号}` || p.证据卡编号.includes(selected.replace('card-', ''))) {
        cards.filter(c => c.文献编号 === p.文献编号).forEach((c, j) => {
          nodes.push({ id: `card-${c.卡片编号}`, label: c.卡片编号, x: Math.cos(a) * 220 + j * 15, y: Math.sin(a) * 180 + 45, color: '#e3a4c7', radius: 4, data: { kind: '证据卡', domain: primary, card: c, paper: p } })
          add(`paper-${p.文献编号}`, `card-${c.卡片编号}`, '文献包含证据卡')
        })
      }
    })
    return { nodes, links }
  }, [featured, cards, selected, catalogPaper])
  const current = graph.nodes.find(n => n.id === selected)
  const select = (id: string) => { detailRequest.current++; setSelected(id); setDetail(null); setCatalogPaper(null); setCollapsed(false) }
  const selectDomain = (i: number) => { setDomain(i); setType(''); setYear(''); setStatus(''); select(`domain-${i}`) }
  const selectPaper = (paper: Paper) => {
    select(`paper-${paper.文献编号}`)
    setCatalogPaper(paper)
    const requestId = detailRequest.current
    load<RecordData[]>(`papers-${paper.分片}.json`).then(rows => {
      const found = rows.find(row => row.文献编号 === paper.文献编号)
      if (!found) throw new Error(`未找到文献 ${paper.文献编号}`)
      if (detailRequest.current === requestId) setDetail(found)
    }).catch(e => { if (detailRequest.current === requestId) setError(String(e)) })
  }
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return papers.filter(p => p.领域.includes(names[domain]) && (!q || [p.题名, p.第一作者, p.DOI, p.PMID, p.文献编号].some(x => String(x ?? '').toLowerCase().includes(q))) && (!type || p.研究类型 === type) && (!year || String(p.年份) === year) && (!status || p.核对状态 === status))
  }, [papers, domain, query, type, year, status])
  const options = (field: string) => [...new Set(papers.filter(p => p.领域.includes(names[domain])).map(p => String(p[field] ?? '')).filter(Boolean))].sort()
  const related = graph.links.filter(l => l.source === selected || l.target === selected).map(l => ({ relation: l.data?.relation, node: graph.nodes.find(n => n.id === (l.source === selected ? l.target : l.source)) })).filter(x => x.node)
  const currentPaper = current?.data?.paper ?? catalogPaper ?? undefined
  const currentCard = current?.data?.card
  const launch = (next: 'network' | 'catalog') => { setDomain(index); setSelected(`domain-${index}`); setMode(next); setOpen(true); setCollapsed(window.matchMedia('(max-width: 760px)').matches) }
  return <section className="knowledge-section"><div className="knowledge-heading"><div><span className="section-index">EVIDENCE NETWORK</span><h3>文献证据知识网络</h3></div><span>真实题录与证据卡</span></div>
    <button className="literature-entry" onClick={() => launch('network')}><div className="literature-preview-graph" aria-hidden="true"><GraphCanvas nodes={preview.nodes} links={preview.links} theme="dark" config={{ controls: false, interaction: { dragNodes: false, pan: false, zoom: false }, camera: { fitPadding: 20 } }}/></div><span>探索医学证据的关联</span><strong>{names[index]} · 知识网络</strong><small>{summary ? `${summary.domains[index].papers.toLocaleString()} 篇题录 · ${summary.domains[index].cards} 张证据卡` : '领域 / 文献 / 证据卡 / 原文出处'}</small><Maximize2 size={18}/></button>
    <button className="knowledge-list-item" onClick={() => launch('catalog')}><BookOpen size={16}/><span><small>检索题录与证据</small><b>查看文献目录</b></span><span>↗</span></button>
    {open && createPortal(<div className="explorer" role="dialog" aria-modal="true" aria-label="文献证据知识网络">
      <header className="explorer-header"><div><small>VITALIS / EVIDENCE NETWORK</small><h2>探索文献证据</h2></div><span className="explorer-context">{caseId} · {displayTime(snapshot.time)} · 演示数据</span><button className="explorer-close" onClick={() => setOpen(false)} aria-label="关闭知识网络"><X size={20}/></button></header>
      <nav className="explorer-domains" aria-label="图谱领域">{names.map((name, i) => <button key={name} className={domain === i ? 'active' : ''} onClick={() => selectDomain(i)}>{name}</button>)}<button className={mode === 'network' ? 'active' : ''} onClick={() => setMode('network')}>知识网络</button><button className={mode === 'catalog' ? 'active' : ''} onClick={() => setMode('catalog')}>文献目录</button></nav>
      {error && <div role="alert" className="literature-error">{error}</div>}
      {!papers.length && !error && <div className="literature-loading">正在加载文献目录…</div>}
      {!!papers.length && <div className="explorer-layout"><div className="explorer-stage">
        {mode === 'network' ? <><div className="explorer-graph"><GraphCanvas key={reset} nodes={graph.nodes} links={graph.links} theme="dark" selectedId={selected} config={{ physics: { charge: -130, centerStrength: .02, linkStrength: .22, velocityDecay: .32, warmupTicks: 100 }, labels: { hubLabelsAlways: true, zoomThreshold: 1.2 }, camera: { fitPadding: 65, autoFitSelection: true } }} onSelect={id => { if (!id) return; const p = graph.nodes.find(n => n.id === id)?.data?.paper; if (p && id.startsWith('paper-')) selectPaper(p); else select(id) }} onNodeHover={setHover}/></div><div className="explorer-caption"><span>RESEARCH EVIDENCE</span><strong>从领域探索真实研究</strong><small>{featured.length} 篇关联证据卡的文献 · {cards.length} 张证据卡</small><button className="literature-reset" onClick={() => setReset(n => n + 1)}>重置视图</button></div><div className="explorer-key"><span>领域</span><span>患者指标</span><span>文献</span><span>证据卡</span></div>{hover && <div className="literature-hover"><small>{hover.data?.kind}</small><strong>{hover.data?.paper?.题名 ?? hover.label}</strong><span>{hover.data?.paper ? `${text(hover.data.paper.第一作者)} · ${text(hover.data.paper.年份)}` : ''}</span></div>}</> : <div className="literature-catalog"><div className="literature-catalog-heading"><span>RESEARCH CATALOGUE</span><h3>{names[domain]}文献目录</h3><p>共 {filtered.length.toLocaleString()} 条匹配题录；多领域文献可重复归入不同领域。</p></div><input aria-label="搜索文献" placeholder="搜索题名、作者、DOI、PMID 或文献编号" value={query} onChange={e => setQuery(e.target.value)}/><div className="literature-filters">{[[type, setType, '研究类型'], [year, setYear, '年份'], [status, setStatus, '核对状态']].map(([value, setter, field]) => <select key={field as string} aria-label={field as string} value={value as string} onChange={e => (setter as (s: string) => void)(e.target.value)}><option value="">全部{field as string}</option>{options(field as string).map(o => <option key={o}>{o}</option>)}</select>)}</div><div className="literature-results">{filtered.slice(page * 30, page * 30 + 30).map(p => <button key={p.文献编号} onClick={() => selectPaper(p)}><small>{text(p.年份)} · {text(p.研究类型)} · {p.证据卡编号.length ? `${p.证据卡编号.length} 张证据卡` : '暂无证据卡'}</small><strong>{p.题名}</strong><span>{text(p.第一作者)} · {text(p.期刊)} · {text(p.核对状态)}</span></button>)}</div><div className="literature-pages"><button disabled={!page} onClick={() => setPage(page - 1)}>上一页</button><span>第 {page + 1} 页</span><button disabled={(page + 1) * 30 >= filtered.length} onClick={() => setPage(page + 1)}>下一页</button></div></div>}
      </div><aside className={`explorer-detail ${collapsed ? 'collapsed' : ''}`}><button className="explorer-collapse" onClick={() => setCollapsed(v => !v)}>{collapsed ? '展开详情' : '收起详情'}</button><div className="explorer-detail-content"><small className="explorer-overline">{current?.data?.kind ?? '文献详情'} / EVIDENCE</small><h3>{currentCard ? text(currentCard.能回答的问题) : currentPaper?.题名 ?? current?.label ?? names[domain]}</h3>
      {currentCard ? <>{[['主要结果', '主要结论及关键数字'], ['研究人群', '研究人群'], ['原文摘录', '原文短摘录'], ['原文出处', '原文出处'], ['信息来源', '信息来源'], ['核对状态', '核对状态'], ['适用条件和局限', '适用条件和局限']].map(([label, key]) => <div key={key}><h4>{label}</h4><p>{text(currentCard[key])}</p></div>)}</> : currentPaper ? <><p>{text(currentPaper.第一作者)} · {text(currentPaper.年份)} · {text(currentPaper.期刊)}</p><p>{text(currentPaper.研究类型)} · {text(currentPaper.核对状态)}</p><p>DOI: {text(currentPaper.DOI)}<br/>PMID: {text(currentPaper.PMID)}</p>{currentPaper.DOI && <a href={`https://doi.org/${encodeURI(String(currentPaper.DOI))}`} target="_blank" rel="noreferrer">查看 DOI 来源 ↗</a>}{currentPaper.PMID && <p><a href={`https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(String(currentPaper.PMID))}/`} target="_blank" rel="noreferrer">查看 PubMed 来源 ↗</a></p>}{detail ? ['摘要', '研究人群', '样本量', '结局定义', '观察或预测时间', '主要结果', '局限性', '来源数据库'].map(k => <div key={k}><h4>{k}</h4><p>{text(detail[k])}</p></div>) : <p>正在加载完整题录…</p>}<h4>关联证据卡</h4><div className="explorer-related">{cards.filter(c => c.文献编号 === currentPaper.文献编号).map(c => <button key={c.卡片编号} onClick={() => { setMode('network'); select(`card-${c.卡片编号}`) }}>{c.卡片编号} · {text(c.能回答的问题)}</button>)}{!currentPaper.证据卡编号.length && <p>暂无证据卡</p>}</div></> : current?.data?.kind === '患者指标' && current.data.domain !== undefined ? <><span className="explorer-metric">{snapshot.values[current.data.domain]}</span><p>{caseId} · {displayTime(snapshot.time)} · 演示指标</p></> : <><p>题录 {papers.filter(p => p.领域.includes(names[domain])).length.toLocaleString()} 条 · 证据卡 {cards.filter(c => c.领域.includes(names[domain])).length} 张</p><p>题录主题归属来自原始主题字段；证据卡保留原有核对状态与使用限制。</p></>}
      {mode === 'network' && <><h4>关联节点 · {related.length}</h4><div className="explorer-related">{related.map(({node, relation}) => <button key={node!.id} onClick={() => node!.data?.paper && node!.data.kind === '文献' ? selectPaper(node!.data.paper) : select(node!.id)}><small>{relation} · {node!.data?.kind}</small>{node!.label}</button>)}</div><details className="explorer-index"><summary>浏览网络节点</summary><div>{graph.nodes.map(n => <button key={n.id} onClick={() => n.data?.paper && n.data.kind === '文献' ? selectPaper(n.data.paper) : select(n.id)}>{n.data?.kind} · {n.label}</button>)}</div></details></>}
      {mode === 'catalog' && currentPaper && <button className="literature-reset" onClick={() => setMode('network')}>在知识网络中查看</button>}
      <p className="explorer-note">题录预筛状态不代表文献已完成复核；医学主题及其与文献的连接用于演示，领域归属与证据卡关联来自工作簿。</p></div></aside></div>}
    </div>, document.body)}
  </section>
}
