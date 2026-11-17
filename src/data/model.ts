import rawCases from './cases.json'

export type DomainKey = 'respiratory' | 'coagulation' | 'liver' | 'cardiovascular' | 'cns' | 'renal'
export type Snapshot = { time: string; scores: (number | null)[]; risks: (number | null)[]; values: string[] }
export type DemoCase = { id: string; encounter: string; label: string; age: number; sex: string; description: string; snapshots: Snapshot[] }
export const cases: DemoCase[] = rawCases
export const domains: { key: DomainKey; label: string; en: string; metric: string; structures: string[]; position: [number, number, number]; copy: string }[] = [
  { key: 'respiratory', label: '呼吸', en: 'RESPIRATORY', metric: '血氧饱和度', structures: ['lung_l', 'lung_r'], position: [0, 1.29, 0], copy: '血氧饱和度与呼吸支持信息共同反映当前氧合状态。' },
  { key: 'coagulation', label: '凝血', en: 'COAGULATION', metric: '血小板', structures: [], position: [0.20, 1.12, 0], copy: '血小板及凝血检查为凝血功能评估提供信息。' },
  { key: 'liver', label: '肝功能', en: 'HEPATIC', metric: '总胆红素', structures: ['liver'], position: [-0.09, 1.08, 0], copy: '总胆红素是肝功能 SOFA 分项的相关指标。' },
  { key: 'cardiovascular', label: '循环', en: 'CARDIOVASCULAR', metric: '平均动脉压', structures: ['heart'], position: [0.02, 1.27, 0], copy: '血压及血管活性药使用情况可用于观察循环状态。' },
  { key: 'cns', label: '中枢神经', en: 'NEUROLOGICAL', metric: 'GCS 总分', structures: ['brain'], position: [0, 1.67, 0], copy: 'GCS 与评估背景共同用于理解神经状态。' },
  { key: 'renal', label: '肾功能', en: 'RENAL', metric: '肌酐', structures: ['kidney_l', 'kidney_r'], position: [0, 1.02, 0], copy: '肌酐水平及变化是本研究肾功能评分的依据。' },
]
export function modsStatus(scores: (number | null)[]) {
  if (scores.filter(s => s !== null && s >= 2).length >= 2) return '已满足'
  if (scores.some(s => s === null)) return '无法判定'
  return '尚未满足'
}
export function displayTime(time: string) { return time.slice(11, 16) }
export function displayProbability(value: number | null) { return value === null ? '—' : `${Math.round(value * 100)}%` }
