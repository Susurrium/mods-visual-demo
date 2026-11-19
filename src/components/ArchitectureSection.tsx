import { useRef } from "react";
import { Info } from "lucide-react";
import { architectureLayers, phaseMappings } from "../data/architecture";
import { lockArchitectureEmbed } from "./architectureEmbed";

type Props = { variant: "landing" | "overlay" };

const EMBED_SRC = "architecture/mods-agent-architecture.html?embed=1&theme=light";

export default function ArchitectureSection({ variant }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const scrollToLayer = (id: string) => {
    const target = document.getElementById(`arch-layer-${id}`);
    if (!target) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <section className="arch-section" id="architecture" aria-label="系统架构">
      <div className="arch-heading">
        <span className="eyebrow">SYSTEM ARCHITECTURE</span>
        <h2>多智能体评估架构</h2>
        <p>
          面向脓毒症患者的首次 MODS 动态风险预测：数据沿 L0–L6
          七层流水线，经器官提案、审议、中心融合、多任务输出、把关与报告，得到校准风险与结构化报告。
        </p>
        <p className="arch-note">
          <Info size={14} />
          架构描述项目设计的系统，当前演示为预设流程，未实际运行这些智能体。
        </p>
      </div>
      {variant === "overlay" && (
        <div className="arch-mapping">
          <span className="section-index">演示阶段与架构层对应（示意）</span>
          {phaseMappings.map((row) => (
            <div className="arch-mapping-row" key={row.phase}>
              <b>{row.phase}</b>
              <span className="arch-mapping-layers">
                {row.layers.map((id) => (
                  <button key={id} onClick={() => scrollToLayer(id)}>
                    {id}
                  </button>
                ))}
              </span>
              <small>{row.note}</small>
            </div>
          ))}
        </div>
      )}
      <div className="archify-scroll">
        <div className="archify-frame">
          <iframe
            ref={frameRef}
            src={EMBED_SRC}
            title="L0–L6 多智能体架构图"
            loading="lazy"
            onLoad={() => {
              if (frameRef.current) lockArchitectureEmbed(frameRef.current);
            }}
          />
        </div>
        <p className="archify-hint archify-hint-narrow">左右滑动查看完整图形</p>
        <p className="archify-hint">点击节点可聚焦所在层，Esc 或点击空白处取消聚焦</p>
      </div>
      <div className="arch-layers">
        {architectureLayers.map((layer) => (
          <article className="arch-layer-card" id={`arch-layer-${layer.id}`} key={layer.id}>
            <header>
              <span className="arch-layer-id">{layer.id}</span>
              <h3>{layer.name}</h3>
            </header>
            <p className="arch-layer-summary">{layer.summary}</p>
            <ul className="arch-agents">
              {layer.agents.map((agent) => (
                <li key={agent.code}>
                  <div className="arch-agent-head">
                    <strong>
                      {agent.code} {agent.name}
                    </strong>
                    <span>{agent.type}</span>
                  </div>
                  <small>输入：{agent.input}</small>
                  <small>输出：{agent.output}</small>
                </li>
              ))}
            </ul>
            {layer.notes && (
              <ul className="arch-layer-notes">
                {layer.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
      <p className="arch-source">
        依据《一、总架构.md》与智能体名册绘制 · 图形由 Archify 生成（blueprint 风格 · 浅色 · 动态）
      </p>
    </section>
  );
}
