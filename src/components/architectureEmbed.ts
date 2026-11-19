const BLOCKED_KEYS = new Set([
  "t", "T", "s", "S", "e", "E", "f", "F", "m", "M", "l", "L", "r", "R",
  "?", "/", "+", "-", "=", "0",
  "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
]);

export function lockArchitectureEmbed(iframe: HTMLIFrameElement): void {
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) return;
  const html = doc.documentElement;

  // 捕获阶段先于查看器的快捷键分发器执行；Esc 清除聚焦与 Tab 导航保留。
  doc.addEventListener(
    "keydown",
    (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (BLOCKED_KEYS.has(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true,
  );

  // 查看器无保存偏好时默认静态；这里统一强制为动态，reduced-motion 用户保持静态。
  const reduceMotion = win.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion && html.getAttribute("data-motion") !== "live") {
    const motionButton = doc.getElementById("btn-motion") as HTMLButtonElement | null;
    if (motionButton && !motionButton.disabled) motionButton.click();
  }

  // embed 模式去除背景纹理；按产物 blueprint 规则恢复 32px 网格，使风格可见。
  doc.body.style.backgroundImage =
    "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)";
  doc.body.style.backgroundSize = "32px 32px";
  doc.body.style.backgroundPosition = "-1px -1px";
  doc.body.style.backgroundAttachment = "fixed";
}
