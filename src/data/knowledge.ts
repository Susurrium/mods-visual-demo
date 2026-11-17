import { evidence } from './evidence'
import { domains } from './model'
import type { GraphLink, GraphNode } from 'obi-graph'

export type KnowledgeKind = 'domain' | 'topic' | 'metric' | 'paper' | 'author'
export type KnowledgeNode = { kind: KnowledgeKind; domain: number; description: string; paperIndex?: number; metricIndex?: number }
export type KnowledgeLink = { relation: string }
export const journals = ['Critical Care Nursing Quarterly', 'Anesthesia & Analgesia', 'Molecular Medicine', 'Intensive Care Medicine', 'International Journal of Biological Sciences', 'Nature Reviews Nephrology', 'JAMA']
export const papers = [
  ...evidence.map((paper, i) => ({ ...paper, journal: journals[i] })),
  { name: '综合', topic: '脓毒症与感染性休克管理', title: 'Surviving sepsis campaign: international guidelines for management of sepsis and septic shock 2021', authors: 'Evans L, et al.', year: '2021', pmid: '34599691', doi: '10.1007/s00134-021-06506-y', journal: 'Intensive Care Medicine', summary: '国际指南讨论脓毒症与感染性休克的识别及管理。', limitation: '指南为临床背景资料，不验证演示概率。' },
  { name: '综合', topic: '脓毒症集束化管理', title: 'The Surviving Sepsis Campaign Bundle: 2018 Update', authors: 'Levy MM, et al.', year: '2018', pmid: '29767636', doi: '10.1097/CCM.0000000000003119', journal: 'Critical Care Medicine', summary: '介绍脓毒症集束化管理建议的更新。', limitation: '用于展示历史文献，不替代当前临床指南。' },
]
const topics = [
  ['低氧血症', '急性呼吸窘迫综合征', '肺部感染'],
  ['凝血异常', '凝血酶生成', '纤溶抑制'],
  ['肝功能障碍', '宿主免疫反应', '肝脏代谢'],
  ['感染性休克', '血流动力学支持', '血管活性药'],
  ['脓毒症相关脑病', '认知功能障碍', '神经功能评估'],
  ['急性肾损伤', '微循环功能障碍', '炎症反应'],
  ['器官功能障碍', 'SOFA 评分', '脓毒症定义'],
]
const colors = ['#76c8ed', '#b696e5', '#e8a8c7', '#edb699', '#9eaaf4', '#82d7c5', '#c8c1ee']
export const knowledgeNodes: GraphNode<KnowledgeNode>[] = []
export const knowledgeLinks: GraphLink<KnowledgeLink>[] = []
const addLink = (source: string, target: string, relation: string, distance = 65) => knowledgeLinks.push({ source, target, distance, data: { relation }, color: '#839bc455', width: .7 })
for (let i = 0; i < 7; i++) {
  const angle = i * Math.PI * 2 / 7 - Math.PI / 2
  const x = Math.cos(angle) * 230, y = Math.sin(angle) * 180
  const domain = `domain-${i}`, paper = `paper-${i}`
  knowledgeNodes.push({ id: domain, label: evidence[i].name, x, y, color: colors[i], radius: 10, hub: true, data: { kind: 'domain', domain: i, description: `${evidence[i].name}领域的预设知识关联。` } })
  knowledgeNodes.push({ id: paper, label: `${evidence[i].authors.split(',')[0]} · ${evidence[i].year}`, x: x + 38, y: y + 35, color: '#f5d4b4', radius: 5, data: { kind: 'paper', domain: i, paperIndex: i, description: evidence[i].summary } })
  addLink(domain, paper, '领域相关文献', 55)
  topics[i].forEach((topic, j) => {
    const id = `topic-${i}-${j}`
    knowledgeNodes.push({ id, label: topic, x: x + Math.cos(j * 2.1) * 55, y: y + Math.sin(j * 2.1) * 55, color: colors[i], radius: 5, hub: j === 0, data: { kind: 'topic', domain: i, description: `与${evidence[i].name}相关的预设医学主题。` } })
    addLink(domain, id, '领域主题', 50)
    addLink(id, paper, '领域文献的主题关联', 52)
  })
  const author = `author-${i}`
  knowledgeNodes.push({ id: author, label: evidence[i].authors, x: x + 65, y: y - 40, color: '#a7b3d7', radius: 3, data: { kind: 'author', domain: i, paperIndex: i, description: '文献作者。' } })
  addLink(author, paper, '文献作者', 40)
  if (i < 6) {
    const metric = `metric-${i}`
    knowledgeNodes.push({ id: metric, label: domains[i].metric, x: x - 45, y: y + 40, color: '#96e1dc', radius: 4, data: { kind: 'metric', domain: i, metricIndex: i, description: '演示病例中的领域指标。' } })
    addLink(domain, metric, '领域演示指标', 48)
  }
}
for (let i = 7; i < papers.length; i++) {
  knowledgeNodes.push({ id: `paper-${i}`, label: `${papers[i].authors.split(',')[0]} · ${papers[i].year}`, x: 15 + (i - 7) * 35, y: 30, color: '#f5d4b4', radius: 5, data: { kind: 'paper', domain: 6, paperIndex: i, description: papers[i].summary } })
  addLink('domain-6', `paper-${i}`, '领域相关文献', 70)
  addLink('topic-6-0', `paper-${i}`, '脓毒症管理相关文献', 80)
}
// 领域之间的连线表示研究主题的人工归类。
;[0, 1, 2, 3, 4, 5].forEach(i => addLink(`domain-${i}`, 'topic-6-0', '器官功能领域', 145))
addLink('topic-5-2', 'topic-2-1', '炎症与宿主反应相关主题', 120)
addLink('topic-3-0', 'domain-6', '感染性休克相关主题', 120)
