import { useMemo, useState } from 'react'
import { BookOpen, ExternalLink, X } from 'lucide-react'
import { GraphCanvas, type GraphLink, type GraphNode } from 'obi-graph'
import 'obi-graph/styles.css'
import { evidence } from '../data/evidence'

export default function KnowledgeGalaxy({ index }: { index: number }) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const paper = evidence[index]
  const { nodes, links } = useMemo(() => {
    const nodes: GraphNode[] = [
      { id: 'domain', label: paper.name, radius: 12, color: '#b7ddff', hub: true },
      { id: 'topic', label: paper.topic, radius: 8, color: '#a9a6ef', hub: true },
      { id: 'paper', label: '文献 01', radius: 7, color: '#fff0d5', hub: true },
      ...Array.from({ length: 14 }, (_, i) => ({ id: `decoration-${i}`, label: ' ', radius: 2 + i % 3, color: '#657ba8' })),
    ]
    const links: GraphLink[] = [
      { source: 'domain', target: 'topic' },
      { source: 'topic', target: 'paper' },
      ...Array.from({ length: 14 }, (_, i) => ({ source: i % 2 ? 'topic' : 'domain', target: `decoration-${i}`, color: '#52658b', width: 0.5 })),
    ]
    return { nodes, links }
  }, [paper])
  return <section className="knowledge-section" aria-label={`${paper.name}知识视图`}>
    <div className="knowledge-heading"><div><span className="section-index">KNOWLEDGE NETWORK</span><h3>文献知识网络</h3></div><span>预设关联 · 1 篇文献</span></div>
    <div className="galaxy graph-host">
      <GraphCanvas key={index} nodes={nodes} links={links} theme="dark"
        config={{ physics: { linkDistance: 75, charge: -180, warmupTicks: 80 }, camera: { fitPadding: 35 }, labels: { alwaysVisible: true, fontSize: 11 } }}
        onNodeHover={node => setHovered(node?.id ?? null)}
        onSelect={id => { if (id === 'paper') setExpanded(true) }} />
      {hovered === 'paper' && <div className="graph-tooltip" role="tooltip"><strong>{paper.title}</strong><span>{paper.authors} · {paper.year}</span><span>PMID {paper.pmid} · DOI {paper.doi}</span><span>{paper.summary}</span></div>}
      {hovered === 'topic' && <div className="graph-tooltip" role="tooltip"><strong>{paper.topic}</strong><span>关联当前领域的预设文献。</span></div>}
    </div>
    <p className="galaxy-caption">拖动节点或画布 · 滚轮缩放 · 连线为预设主题关联，小光点为视觉示意</p>
    <button className="knowledge-list-item" onClick={() => setExpanded(v => !v)}><BookOpen size={16}/><span><small>当前领域文献 · 点击查看</small><b>{paper.title}</b></span><span>↗</span></button>
    {expanded && <div className="knowledge-detail"><button className="knowledge-close" aria-label="关闭文献详情" onClick={() => setExpanded(false)}><X size={14}/></button><span className="section-index">文献详情 · 公开摘要</span><h4>{paper.title}</h4><p>{paper.authors} · {paper.year} · PMID {paper.pmid}</p>{paper.doi && <p>DOI {paper.doi}</p>}<p>{paper.summary}</p><p>{paper.limitation}</p><a href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`} target="_blank" rel="noreferrer">查看 PubMed 来源 <ExternalLink size={13}/></a></div>}
  </section>
}
