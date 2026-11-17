import { describe, expect, it } from 'vitest'
import { cases, displayProbability, domains, modsStatus } from './model'

describe('演示数据一致性', () => {
  it('每个病例包含六个功能域和三个预测窗口', () => {
    expect(cases).toHaveLength(3)
    for (const patient of cases) for (const snapshot of patient.snapshots) {
      expect(snapshot.scores).toHaveLength(domains.length)
      expect(snapshot.values).toHaveLength(domains.length)
      expect(snapshot.risks).toHaveLength(3)
      for (const risk of snapshot.risks) if (risk !== null) expect(risk).toBeGreaterThanOrEqual(0)
      for (const risk of snapshot.risks) if (risk !== null) expect(risk).toBeLessThanOrEqual(1)
    }
  })
  it('首次达到 MODS 后没有首次事件风险', () => {
    for (const patient of cases) {
      let occurred = false
      for (const snapshot of patient.snapshots) {
        occurred ||= modsStatus(snapshot.scores) === '已满足'
        if (occurred) expect(snapshot.risks).toEqual([null, null, null])
      }
    }
  })
  it('区分未知状态、已满足状态和真实零概率', () => {
    expect(modsStatus([null, 0, 0, 0, 0, 0])).toBe('无法判定')
    expect(modsStatus([2, 2, null, null, null, null])).toBe('已满足')
    expect(displayProbability(0)).toBe('0%')
    expect(displayProbability(null)).toBe('—')
  })
})
