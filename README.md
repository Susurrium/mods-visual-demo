# VITALIS · MODS 交互演示

使用三维人体、虚构病例和预设结果展示脓毒症至 MODS 的风险评估流程。网页在浏览器内运行，所有风险、评分和判断内容均为演示数据。

## 本地运行

需要 Node.js 22 或更高版本。

```sh
npm ci
npm run dev
```

在浏览器打开命令输出的地址。生产构建与检查：

```sh
npm test
npm run build
npm run preview
```

## 数据与交互

`src/data/cases.json` 保存三个虚构病例与历史快照；`src/data/model.ts` 维护功能域信息。概率以 0–1 表示。记录抽屉可以编辑和导入交接格式的 JSON。修改或导入后，预设风险被隐藏；“恢复病例”重新加载演示快照。

文献目录与证据卡由项目提供的《证据卡与题录总表_复核用版.xlsx》转换，静态数据存放于 `public/literature/`。图谱中的领域归属及文献与证据卡关联来自工作簿；医学主题与主题连线为演示归类。核对状态和适用限制保留在详情中。病例、风险结果和问答为预设演示，文献内容不参与模型计算。

更新工作簿后，将工作簿放在本项目的上级目录，使用安装了 `openpyxl` 的 Python 运行 `python scripts/build_literature.py`。转换会检查编号和证据卡关联，生成题录分片、检索索引和 `report.json`；重复 DOI 会作为待核查候选保留，不自动合并。原文文件与本机文件路径不包含在网页数据中。

## 系统架构图

落地页架构区与应用内"系统架构"视图嵌入 `public/architecture/mods-agent-architecture.html`。该文件是 Archify 生成的独立产物，以 `?embed=1&theme=light` 嵌入，风格固定为 blueprint、浅色、动态；图形源候选位于本项目上级目录 `.archify/architecture-mods-agent-pipeline-20261119-185426/candidate.json`，内容依据《一、总架构.md》与智能体名册。

架构变更后，更新候选文件并在上级目录重新生成（重复运行需使用新的 `--out-dir`）：

```sh
node <archify 安装路径>/bin/archify.mjs finalize architecture .archify/architecture-mods-agent-pipeline-20261119-185426/candidate.json .archify/architecture-mods-agent-pipeline-20261119-185426/mods-agent-architecture.html --quality showcase --out-dir .archify/architecture-mods-agent-pipeline-20261119-185426/review-<n> --json
```

将产物复制到 `public/architecture/mods-agent-architecture.html`，并同步更新 `src/data/architecture.ts` 的层卡片文字。不要手工修改生成的 HTML；嵌入锁定逻辑（快捷键屏蔽、动效强制、蓝图网格恢复）位于 `src/components/architectureEmbed.ts`，查看器升级时核对其中的快捷键清单。

## GitHub Pages

将本目录作为 Git 仓库根目录，推送至 GitHub 的 `main` 分支。在仓库 Settings → Pages 中选择 GitHub Actions，工作流会构建并发布 `dist`。Vite 使用相对资源路径，支持项目网站子路径。

## 三维模型及许可

人体模型来自 [Open Anatomy 3D](https://github.com/MervinR07/open-anatomy-3d)。代码采用 MIT，模型采用 CC BY 4.0；完整来源、署名与许可见 `public/licenses/`。本项目调整了模型材质和展示方式。

Anatomy: BodyParts3D © The Database Center for Life Science (CC BY 4.0); female organs: Human Reference Atlas 3D Reference Organs, HuBMAP (CC BY 4.0); female body: MakeHuman (CC0). Modified by open-anatomy-3d, CC BY 4.0.
