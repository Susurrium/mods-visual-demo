export type ArchitectureAgent = {
  code: string;
  name: string;
  type: string;
  input: string;
  output: string;
};

export type ArchitectureLayer = {
  id: string;
  name: string;
  summary: string;
  agents: ArchitectureAgent[];
  notes?: string[];
};

export const architectureLayers: ArchitectureLayer[] = [
  {
    id: "L0",
    name: "数据与时间安全",
    summary: "队列数据经滚动 Landmark 表征，由三个哨兵完成时间与标签安全约束。",
    agents: [
      { code: "S1", name: "时间泄漏哨兵", type: "规则", input: "全部输入的时间戳", output: "通过/拦截、拦截原因" },
      { code: "S2", name: "数据质量审计", type: "规则 + 统计", input: "原始值、单位、测量时间", output: "逐变量质量分、陈旧/异常/疑似复制前值标记" },
      { code: "S3", name: "治疗语境", type: "规则 + LLM", input: "升压药、通气、RRT、镇静、输血", output: "已执行/计划中区分、子分失真标记（如镇静下 GCS）" },
    ],
  },
  {
    id: "L1",
    name: "器官提案",
    summary: "六器官智能体基于医学知识库提出修正风险，形成统一器官输出包。",
    agents: [
      { code: "O1–O6", name: "六器官智能体", type: "LLM + 映射表", input: "器官受累头 logit、本器官变量与趋势、全身背景、器官知识库", output: "修正风险、Δ 分解、证据编号、当前状态" },
    ],
    notes: [
      "六器官：呼吸、凝血、肝脏、循环、中枢神经、肾脏",
      "统一器官输出包：原字段 + Δ 分解 + 证据编号 + 可用性掩码",
    ],
  },
  {
    id: "L2",
    name: "审议",
    summary: "证据核验、可信度质疑与漏报质疑经一轮反驳后，裁决证据权重与补偿项。",
    agents: [
      { code: "R1", name: "证据核验", type: "检索 + LLM", input: "证据编号、证据卡", output: "出处真实性；人群、终点、预测窗是否匹配；全文还是摘要、S/A 级" },
      { code: "R2", name: "可信度质疑专家", type: "LLM", input: "器官提案、R1 结果、S2/S3 标记", output: "逐条质疑（Q1–Q9），附严重度" },
      { code: "R3", name: "漏报质疑专家", type: "LLM + 统计", input: "掩码为 0 的器官、轨迹、级联头", output: "可能被低估的风险清单" },
      { code: "R4", name: "审议裁决器", type: "规则表", input: "R1–R3 的结果和器官智能体的反驳", output: "w_k ∈ [0,1]、Δ_miss ≥ 0、审议记录" },
    ],
    notes: ["R2 可信度质疑专家与器官智能体进行一轮反驳"],
  },
  {
    id: "L3",
    name: "中心融合",
    summary: "结构化六器官序列经预训练 LLM 编码器得到共享患者表示，F1/F2 旁路提供先验。",
    agents: [
      { code: "F1", name: "器官相依与级联", type: "统计", input: "六器官风险、级联头、治疗语境", output: "器官对的条件风险、共病通路、先后顺序" },
      { code: "F2", name: "Sepsis-3→MODS 文献先验", type: "检索 + 映射", input: "文献库", output: "器官组合与先后顺序的先验" },
    ],
    notes: [
      "编码器：结构化六器官序列（含审议字段）→ 共享患者表示",
      "F1/F2 旁路直接进入 H2 总协调",
    ],
  },
  {
    id: "L4",
    name: "多任务输出头",
    summary: "四个输出头经跨头一致性审查后，由总协调融合直接头与定义合成两路结果。",
    agents: [
      { code: "H1", name: "跨头一致性审查", type: "规则", input: "四个输出头", output: "约束违例、两路分歧" },
      { code: "H2", name: "ICU/MODS 总协调", type: "统计", input: "主任务头、定义合成、F1、F2", output: "p_MODS_raw" },
    ],
    notes: ["四头：主任务 MODS 风险、器官受累、器官轨迹、时间顺序与级联"],
  },
  {
    id: "L5",
    name: "把关",
    summary: "G1 概率校准后，稳定性、分布漂移与输出门控逐级把关，给出四级输出等级。",
    agents: [
      { code: "G2", name: "稳定性压力测试", type: "程序", input: "当前样本", output: "扰动下的 p_MODS 波动幅度" },
      { code: "G3", name: "分布漂移与外部效度", type: "统计", input: "当前样本与 MIMIC 训练分布", output: "距离分、通道降级标记（如人民医院脑通道）" },
      { code: "G4", name: "输出门控与弃权裁决", type: "规则", input: "H1、G1–G3、R4", output: "四级输出等级" },
    ],
    notes: ["把关链：G1 概率校准 → G2 稳定性 → G3 漂移 → G4 门控"],
  },
  {
    id: "L6",
    name: "报告",
    summary: "只读结构化字段生成临床报告，经忠实性审计与临床复核后输出。",
    agents: [
      { code: "P1", name: "报告生成", type: "LLM", input: "只读结构化字段", output: "临床报告文本" },
      { code: "P2", name: "忠实性审计", type: "规则 + LLM", input: "报告与结构化字段", output: "逐句映射，不能映射的句子拦截" },
      { code: "P3", name: "临床复核与报警", type: "规则", input: "p_MODS、等级、历史报警", output: "报警、不应期、复核清单" },
    ],
    notes: ["最终输出：校准风险预测与结构化报告"],
  },
];

export type PhaseMapping = {
  phase: string;
  layers: string[];
  note: string;
};

export const phaseMappings: PhaseMapping[] = [
  { phase: "准备患者数据", layers: ["L0"], note: "队列与数据角色、滚动 Landmark 表征、时间与标签安全约束" },
  { phase: "数值模型评估", layers: ["L3", "L4"], note: "编码器与四个输出头产生器官受累 logit 与初步风险" },
  { phase: "六功能域专家", layers: ["L1", "L2"], note: "各功能域的器官提案与审议（O1–O6、R1–R4）" },
  { phase: "综合专家", layers: ["L4", "L5", "L6"], note: "H1/H2 协调、四级把关与报告生成" },
];
