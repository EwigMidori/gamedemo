# Gamedemo 伪3D视觉改进项目

## What This Is

一个基于 mod 的 2D 生存建造游戏引擎项目，当前使用 Phaser 3 渲染系统。本项目目标是在现有引擎基础上增量改进视觉架构，实现类似星露谷物语的伪3D效果——斜视角、高度层次和动态遮挡处理。

## Core Value

视觉呈现必须让玩家清晰感知空间层次和物体遮挡关系，营造沉浸式的2.5D游戏体验。

## Requirements

### Validated

- ✓ **Mod-first 架构** — 游戏由 mods 组合而成，非单一应用加插件 — existing
- ✓ **命令管道系统** — 四阶段交互：原始输入 → 意图上下文 → 解析命令 → 命令执行 — existing
- ✓ **世界对象交互** — 专门的 `RuntimeWorldObjectDescriptor` + `Provider` + `Interaction` 三层架构 — existing
- ✓ **运行时组装** — 启动序列：发现 → 验证清单 → 构建依赖图 → 拓扑排序 → 安装 mods — existing
- ✓ **内容命名空间** — 所有内容ID使用 `mod:id` 格式（如 `core:wood`）— existing
- ✓ **Phaser 3 渲染桥接** — `packages/engine-phaser` 提供渲染层实现 — existing
- ✓ **保存系统** — `GameSaveEnvelope` 结构，host 拥有信封，mods 拥有载荷 — existing
- ✓ **容器不可变性** — 启动后注册表冻结，无全局可变状态 — existing

### Active

- [ ] **VIS-01**: 斜视角瓷砖渲染 — 45度俯视，地图格子呈现前后层次感
- [ ] **VIS-02**: 物体高度属性系统 — 树木、建筑等可配置渲染高度
- [ ] **VIS-03**: 深度排序渲染 — 基于物体高度和位置的正确遮挡关系
- [ ] **VIS-04**: 动态遮挡处理 — 玩家在物体后方时，物体变半透明或显示轮廓
- [ ] **VIS-05**: Visual Pack 扩展 — 伪3D效果可通过 visual packs 自定义

### Out of Scope

- **真实3D渲染** — 使用 WebGL 3D 或 Three.js 等真正的3D引擎，保持2D Phaser 基础以简化 mod 开发和兼容性
- **光照系统** — 动态光影、阴影投射等复杂光照效果，保持简单精灵渲染
- **全视角旋转** — 玩家不能旋转视角，固定斜视角以减少美术资源需求
- **垂直地形** — 多层高度地形（悬崖、地下室等），保持单层地图以简化游戏逻辑

## Context

**现有渲染系统：**
当前渲染位于 `packages/engine-phaser/src/gameViewport.ts`，使用简单2D正交视角。物体按类型分批渲染（地形 → 资源 → 建筑 → 掉落物 → 玩家），未考虑空间深度关系。

**RFC-0016 背景：**
项目已有"Pseudo-3D 2D Visual Architecture"设计讨论，目标为星露谷物语式呈现（非真3D）。该RFC定义了四层架构：Phaser 基元 → 引擎场景图 → 内容元数据 → Visual Packs。

**技术债务：**
- `gameViewport.ts` 有中文注释和生产环境 console 日志
- 渲染循环每帧遍历所有实体，O(n) 复杂度
- 无空间索引或视锥剔除

**Visual Pack 现状：**
现有 Visual Pack 系统支持 gameplay + visual packs 独立替换。本次改进应扩展此系统以支持伪3D配置。

## Constraints

- **Tech Stack**: Phaser 3 渲染层，保持与现有 `@gamedemo/engine-phaser` 兼容
- **Mod Compatibility**: 不能破坏现有 mod API，改进应通过扩展 registry 实现
- **File Size**: 遵循 RFC-0007，单文件不超过500行，需拆分复杂逻辑
- **Naming Convention**: 使用 PascalCase 类文件（如 `Pseudo3DRenderer.ts`）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 增量改进而非重写 | 现有架构成熟，mod 生态已建立，全面重写风险高 | — Pending |
| 支持 Visual Pack 配置 | 保持 mod 自定义能力，让不同 visual styles 共存 | — Pending |
| 基于高度排序而非 Z-index | 更直观表达空间关系，易于 mod 作者理解 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-31 after initialization*
