# 发动机集成与调整

## 当前效果

- 使用提供的 `../../v6 engine/v6_car_engine_with_engine_morethem.glb`，未覆盖原文件。
- 源文件为 379 nodes、260 meshes、14 materials、无内置动画。实际检查发现组装发动机和周围的拆开陈列件；只安装组装区域的 53 个物理父节点、121 个材质 mesh，隐藏其余 63 个陈列父节点。
- 保留 `Sketchfab_model → V6EN.fbx → RootNode` 和全部内部旋转、缩放。同一物理零件的材质子 mesh 一起移动。
- 展示名称为 **V6 Hybrid Engine**，说明注明模型仅展示通用 V6 机械部分。
- 按最新要求，播放顺序为：完整发动机 → 活塞与连杆运动 → 发动机闭合 → 整车复原和出发；不再追加第二次发动机展开。
- 六个活塞沿各自缸轴移动，连杆保持长度并摆动，曲轴同步转动。它是基于现有模型的运动学演示。
- 镀铬范围：原红色盖板、Plane.001、Plane.005、六个活塞，以及 Cube 父节点。Plane.006 和 Plane.010 两个长方形盖板为黑色镀铬。所有镀铬的线性基础亮度乘以 0.70；其他材质保持原样。
- Suspension、Halo、Monocoque、Engine Cover 和发动机的辅助线是平滑流线，大体跟随部件走向，并带流动光带和粒子。流线跟随部件父节点，不逐边描摹几何形状。

## 在哪里调整

### 安装、方向和缩放

`src/engine-config.js` 的 `engineInstallation`：

| 参数 | 当前值 | 用途 |
| --- | --- | --- |
| `position` | `[0, .26, -1.20]` | 车内安装位置 |
| `rotation` | `[0, Math.PI / 2, 0]` | 已按要求调转变速箱方向 |
| `scale` | `.62` | 整体等比缩放，动画中不改变 |
| `sourceAnchor` | `[1.29, .32714, .0205]` | 原始场景参考点，通常无需改动 |
| `extraction` | `[1.35, .9, -.05]` | 展示时整体移出发动机舱的位移 |
| `explosionScale` | `1` | 活塞展示时外部部件展开距离的统一倍率 |

车辆坐标为 +Y 向上、+Z 车头、+X 车辆左侧。安装只修改独立 wrapper。

### 零件、材质、运动与流线

- `src/engine-parts.json`：每个物理父节点的 ID、源名称、显示名称、初始位置/旋转/缩放、展开方向 `direction`、距离 `distance`、错峰参数 `start`。当前仅在活塞展示时打开外部零件以露出内部机构。
- `src/engine-materials.js`：`blackChromeParts`、`chromeParts` 控制镀铬范围；`chromeBrightness=.70` 控制亮度。改动只作用于运行时材质副本。
- `src/piston-motion.js`：六组活塞/连杆对应关系、基于原始缸轴和轴承距离的运动约束。
- `src/engine-config.js` 的 `engineSequence`：完整展示、活塞演示、闭合的时点和停留时长。
- `src/explainers.js`：五个阶段的流线控制点、流线高度、光带透明度及速度。悬架的初始杆件范围由 `src/surface-guides.js` 缓存识别，再生成宽松、平滑的流线。
- `src/chapters.js`：说明文字、导航名称、相机位置和目标。

## 修改文件

| 范围 | 文件 |
| --- | --- |
| 资产加载、安装及交互 | `src/Scene.jsx`, `src/rig.js`, `src/engine-rig.js`, `src/engine-config.js`, `src/engine-parts.json`, `src/engine-materials.js` |
| 活塞及统一播放状态 | `src/piston-motion.js`, `src/timeline.js`, `src/playback.js`, `src/scroll-controller.js`, `src/store.js` |
| 导航、文字及界面 | `src/App.jsx`, `src/chapters.js`, `src/study.css` |
| 平滑流线 | `src/explainers.js`, `src/surface-guides.js` |
| 原资产服务及构建打包 | `vite.config.js` |
| 模型检查工具 | `v6-lab.html`, `tools/v6-lab.js`, `tools/inspect-v6.mjs`, `tools/map-v6.mjs` |
| 检查 | `tests/engine.test.mjs`, `tests/engine-materials.test.mjs`, `tests/surface-guides.test.mjs`, `tests/timeline.test.mjs`, `tests/playback.test.mjs`, `tests/transport.test.mjs` |
| 记录 | `evidence/v6-source-audit.json`, `evidence/v6-verification.json`, 本说明及预览图片 |

## 验证

- `node --test tests/*.test.mjs`：47 项通过，覆盖刚体子 mesh 移动、V 缸轴、连杆长度、重复往返矩阵、源材质保护、镀铬范围和亮度、影片进度、播放中断、部件附属流线及资源释放。
- `node node_modules/vite/bin/vite.js build`：生产构建包含提供的 GLB，开发时直接只读服务原文件。
- 已实际运行浏览器预览并查看安装、完整发动机、活塞视图、子 mesh 选择高亮和相关部件流线。
- 模型结构和原始文件哈希记录见 `evidence/v6-source-audit.json` 与 `evidence/v6-verification.json`。

预览入口：`http://127.0.0.1:5173/`。独立模型检查页：`http://127.0.0.1:5173/v6-lab.html`，包含组装区域筛选、单零件查看和活塞运行/暂停。
