import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, ExternalLink, Maximize2, X } from 'lucide-react'
import { GraphCanvas, type GraphConfig } from 'obi-graph'
import 'obi-graph/styles.css'
import { knowledgeNodes, knowledgeLinks, papers, type KnowledgeNode, type KnowledgeLink } from '../data/knowledge'
import { domains, displayTime, type Snapshot } from '../data/model'
import '../knowledge-explorer.css'

const config: GraphConfig<KnowledgeNode, KnowledgeLink> = {
  physics: { charge: -130, centerStrength: .02, linkStrength: .22, velocityDecay: .32, warmupTicks: 100 },
  nodes: { dimOpacity: .12 }, labels: { hubLabelsAlways: true, zoomThreshold: 1.2, fadeRange: .35, fontSize: 11 },
  camera: { fitPadding: 65, autoFitSelection: true, maxZoom: 1.3 },
}
const kindNames = { domain: '功能域', topic: '医学主题', metric: '患者指标', paper: '文献', author: '作者' }
type Props = { index: number; snapshot: Snapshot; caseId: string }

export default function KnowledgeGalaxy({ index, snapshot, caseId }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(`domain-${index}`)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const current = knowledgeNodes.find(n => n.id === selected) ?? knowledgeNodes[index]
  const hover = knowledgeNodes.find(n => n.id === hovered)
  const connected = useMemo(() => knowledgeLinks.filter(l => l.source === selected || l.target === selected).map(l => ({ id: l.source === selected ? l.target : l.source, relation: l.data!.relation })).map(l => ({ ...l, node: knowledgeNodes.find(n => n.id === l.id)! })), [selected])
  const previewNodes = useMemo(() => knowledgeNodes.filter(n => n.data?.domain === index), [index])
  const previewIds = useMemo(() => new Set(previewNodes.map(n => n.id)), [previewNodes])
  const previewLinks = useMemo(() => knowledgeLinks.filter(l => previewIds.has(l.source) && previewIds.has(l.target)), [previewIds])
  const openExplorer = () => { setSelected(`domain-${index}`); setHovered(null); setOpen(true); setCollapsed(window.matchMedia('(max-width: 760px)').matches) }
  const paper = papers[index]
  const currentPaper = current.data?.paperIndex === undefined ? undefined : papers[current.data.paperIndex]
  const select = (id: string) => { setSelected(id); setCollapsed(false) }
  return <section className="knowledge-section" aria-label={`${paper.name}知识视图`}>
    <div className="knowledge-heading"><div><span className="section-index">KNOWLEDGE NETWORK</span><h3>文献知识网络</h3></div><span>预设知识关联</span></div>
    <button className="knowledge-preview" onClick={openExplorer} aria-label={`探索${paper.name}知识网络`}>
      <div className="galaxy graph-host"><GraphCanvas nodes={previewNodes} links={previewLinks} theme="dark" config={{ ...config, controls: false, interaction: { dragNodes: false, pan: false, zoom: false }, camera: { fitPadding: 30 } }}/></div>
      <span><Maximize2 size={15}/> 探索知识网络 <b>↗</b></span>
    </button>
    <p className="galaxy-caption">领域 · 患者指标 · 医学主题 · 文献</p>
    <button className="knowledge-list-item" onClick={() => setExpanded(v => !v)}><BookOpen size={16}/><span><small>当前领域文献 · 点击查看</small><b>{paper.title}</b></span><span>↗</span></button>
    {expanded && <div className="knowledge-detail"><h4>{paper.title}</h4><p>{paper.authors} · {paper.year} · {paper.journal}</p><p>{paper.summary}</p><a href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`} target="_blank" rel="noreferrer">查看 PubMed 来源 <ExternalLink size={13}/></a></div>}
    {open && createPortal(<div className="explorer" role="dialog" aria-modal="true" aria-label="文献知识网络">
      <header className="explorer-header"><div><small>VITALIS / KNOWLEDGE NETWORK</small><h2>探索文献知识网络</h2></div><span className="explorer-context">{caseId} · {displayTime(snapshot.time)} · 演示数据</span><button className="explorer-close" onClick={() => setOpen(false)} aria-label="关闭知识网络"><X size={20}/></button></header>
      <nav className="explorer-domains" aria-label="图谱领域">{papers.slice(0, 7).map((p, i) => <button key={p.name} className={current.data?.domain === i ? 'active' : ''} onClick={() => select(`domain-${i}`)}>{p.name}</button>)}</nav>
      <div className="explorer-layout"><div className="explorer-stage" onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); setPointer({ x: e.clientX - r.left, y: e.clientY - r.top }) }}>
        <div className="explorer-graph"><GraphCanvas nodes={knowledgeNodes} links={knowledgeLinks} config={config} theme="dark" selectedId={selected} onSelect={id => { if (id) select(id) }} onNodeHover={node => setHovered(node?.id ?? null)} /></div>
        <div className="explorer-caption"><span>知识网络</span><strong>发现器官之间的关联</strong><small>{knowledgeNodes.length} 个节点 · 预设主题关联</small></div>
        <div className="explorer-key"><span>领域</span><span>主题</span><span>指标</span><span>文献</span></div>
        {hover && <div className="explorer-tooltip" role="tooltip" style={{ left: `min(${pointer.x + 16}px, calc(100% - 250px))`, top: `min(${pointer.y + 16}px, calc(100% - 130px))` }}><small>{kindNames[hover.data!.kind]}</small><strong>{hover.data?.kind === 'paper' && hover.data.paperIndex !== undefined ? papers[hover.data.paperIndex].title : hover.label}</strong>{hover.data?.kind === 'paper' && hover.data.paperIndex !== undefined && <span>{papers[hover.data.paperIndex].authors} · {papers[hover.data.paperIndex].year}<br/>PMID {papers[hover.data.paperIndex].pmid} · DOI {papers[hover.data.paperIndex].doi}<br/>{papers[hover.data.paperIndex].summary}</span>}</div>}
      </div><aside className={`explorer-detail ${collapsed ? 'collapsed' : ''}`}>
        <button className="explorer-collapse" onClick={() => setCollapsed(v => !v)}>{collapsed ? '展开详情' : '收起详情'}</button>
        <div className="explorer-detail-content"><small className="explorer-overline">{kindNames[current.data!.kind]} / KNOWLEDGE</small><h3>{current.data?.kind === 'paper' ? currentPaper?.title : current.label}</h3>
        {currentPaper ? <><p>{currentPaper.authors} · {currentPaper.year}</p><p>{currentPaper.journal}</p><p>PMID {currentPaper.pmid}<br/>DOI {currentPaper.doi}</p><h4>文献要点</h4><p>{currentPaper.summary}</p><p>{currentPaper.limitation}</p><a href={`https://pubmed.ncbi.nlm.nih.gov/${currentPaper.pmid}/`} target="_blank" rel="noreferrer">查看 PubMed 来源 <ExternalLink size={14}/></a></> : current.data?.metricIndex !== undefined ? <><span className="explorer-metric">{snapshot.values[current.data.metricIndex]}</span><p>{caseId} · {displayTime(snapshot.time)} · 演示指标</p><p>{domains[current.data.metricIndex].copy}</p></> : <p>{current.data?.description}</p>}
        <h4>关联节点 <span>{connected.length}</span></h4><div className="explorer-related">{connected.map(item => <button key={item.id} onClick={() => select(item.id)}><small>{item.relation} · {kindNames[item.node.data!.kind]}</small><span>{item.node.label}</span></button>)}</div>
        <details className="explorer-index"><summary>浏览全部节点（键盘可访问）</summary><div>{knowledgeNodes.map(n => <button key={n.id} onClick={() => select(n.id)}>{kindNames[n.data!.kind]} · {n.label}</button>)}</div></details>
        <p className="explorer-note">连线表示预设归属或主题关联；节点大小不代表模型权重。</p></div>
      </aside></div>
    </div>, document.body)}
  </section>
}
