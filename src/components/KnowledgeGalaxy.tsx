import { useEffect, useState } from 'react'
import { BookOpen, ExternalLink, X } from 'lucide-react'
import { evidence } from '../data/evidence'

export default function KnowledgeGalaxy({ index }: { index: number }) {
  const [preview, setPreview] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const paper = evidence[index]
  useEffect(() => { setPreview(false); setExpanded(false) }, [index])
  return <section className="knowledge-section" aria-label={`${paper.name}知识视图`}>
    <div className="knowledge-heading"><div><span className="section-index">KNOWLEDGE GALAXY</span><h3>文献知识网络</h3></div><span>模拟检索 · 1 篇文献</span></div>
    <div className="galaxy" aria-label={`${paper.name}知识网络`}>
      <div className="galaxy-orbit orbit-a" aria-hidden="true"/><div className="galaxy-orbit orbit-b" aria-hidden="true"/><div className="galaxy-orbit orbit-c" aria-hidden="true"/>
      {Array.from({length:24},(_,i)=><i key={i} aria-hidden="true" className="galaxy-star" style={{left:`${8+(i*37)%84}%`,top:`${8+(i*53)%78}%`,animationDelay:`${(i%5)*-.8}s`}}/>)}
      <div className="galaxy-core"><span>知识视图</span><strong>{paper.name}</strong></div>
      <button className="galaxy-paper" aria-label={`查看文献 ${paper.title}`} aria-describedby={preview?'paper-tooltip':undefined} onMouseEnter={()=>setPreview(true)} onMouseLeave={()=>setPreview(false)} onFocus={()=>setPreview(true)} onBlur={()=>setPreview(false)} onClick={()=>setExpanded(true)}><span/><small>文献 01</small></button>
      {preview&&<div className="galaxy-tooltip" id="paper-tooltip" role="tooltip"><strong>{paper.title}</strong><span>{paper.authors} · {paper.year}</span><span>{paper.topic}</span><small>PMID {paper.pmid}</small></div>}
    </div>
    <p className="galaxy-caption">光点与连线为视觉示意 · 节点对应可核查文献</p>
    <button className="knowledge-list-item" onClick={()=>setExpanded(v=>!v)}><BookOpen size={16}/><span><small>当前领域文献 · 点击查看</small><b>{paper.title}</b></span><span>↗</span></button>
    {expanded&&<div className="knowledge-detail"><button className="knowledge-close" aria-label="关闭文献详情" onClick={()=>setExpanded(false)}><X size={14}/></button><span className="section-index">文献详情 · 公开摘要</span><h4>{paper.title}</h4><p>{paper.authors} · {paper.year} · PMID {paper.pmid}</p>{paper.doi&&<p>DOI {paper.doi}</p>}<p>{paper.summary}</p><p>{paper.limitation}</p><a href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`} target="_blank" rel="noreferrer">查看 PubMed 来源 <ExternalLink size={13}/></a></div>}
  </section>
}
