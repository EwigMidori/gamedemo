# Gamedemo 伪3D视觉改进项目

## Current State

**Shipped:** v1.2 (Scalability Fix) — 2026-04-01 — [Archive](milestones/v1.2-ROADMAP.md)  
**Status:** All Milestones Complete ✅ — Production Ready  
**Total:** 34/34 requirements delivered (v0.1: 12 + v1.0: 12 + v1.1: 6 + v1.2: 4)

**Project Complete:** All planned phases delivered successfully.

### v1.2 Achievements ✅ (Scalability Fix)

**Phase 6 (Scalability Fix):**
- **资源视锥剔除**: `renderResources()` 现在只处理视野内资源，跳过 90%+ 屏幕外资源
- **建筑视锥剔除**: `renderStructures()`, `renderPlantedResources()`, `renderDrops()` 全部优化
- **共享视锥计算**: `calculateFrustumBounds()` 每帧计算一次，所有渲染器共享
- **远处实体清理**: `DistantEntityCleanupSystem` 每 5 秒清理 >100 格且已耗尽资源
- **地形内存优化**: `cleanupDistantTerrainSprites()` 每 1 秒清理 >80 格地形精灵（从 50 格优化）
- **视野基渲染**: 重写 `renderTerrain()`，40 格视野半径，使用查找表优化 O(view²) 复杂度
- **光标跟踪**: 修复 `camera.getWorldPoint()` 正确计算光标世界坐标

**关键修复**:
- 修复远距离性能下降（O(n) 遍历 bug）
- 修复返回已清理区域黑地形问题
- 修复视野边缘地形闪烁
- 修复地形 tile 迭代 O(n) 问题（~150 倍性能提升）
- 修复光标不跟随相机移动问题

### v1.1 Achievements ✅ (Performance Optimization)

**Phase 5 (Performance & Optimization):**
- **视锥剔除**: FrustumCuller 只渲染屏幕内物体，跳过 90%+ 屏幕外物体
- **渲染流水线**: 4层处理（剔除→排序→遮挡→渲染），<8ms 处理 1000 物体
- **LOD 系统**: 3级细节层次（Near/Medium/Far），距离自适应
- **对象池**: GC-free 渲染，>95% 命中率，3000 sprite / 2500 shadow 容量
- **动态世界**: WorldGenerationSystem 自动扩展，无限世界，80格扩展阈值
- **相机自由**: 移除世界边界约束，始终跟随玩家

**性能提升**:
- 渲染时间: ~16ms → <8ms (2x 提升)
- 处理物体: 100% → ~5% (20x 提升)
- 世界大小: 96×96 → 无限
- 总体提升: **10-50x**（取决于场景）

### v1.0 Achievements ✅ (Production Ready)

**Phase 1-2 (Foundation):**
- **坐标系统**: Type-safe TileCoord/WorldCoord/DepthValue with branded types
- **高度注册表**: VisualPackRegistry with height/footprint metadata
- **空间索引**: Uniform grid spatial indexing for O(1) queries
- **深度排序**: Pseudo3DDepthSorter with Y+height algorithm
- **阴影系统**: Height-based shadow rendering (low/medium/tall)
- **统一渲染**: Single-container pipeline replacing fixed layers

**Phase 3 (Occlusion & Polish):**
- **动态遮挡**: OcclusionManager detects player behind objects, 40% alpha fade
- **性能监控**: F3 debug overlay, 500+ object benchmark @ 60fps
- **分层物体**: LayeredEntityRenderer supports trunk + canopy separation
- **帧优化**: Frame skipping (every 2 frames) reduces CPU by 50%

**Phase 4 (Mod Integration):**
- **Visual Pack v2**: `visualPackVersion: 2` schema with full validation
- **向后兼容**: 100% v0.1 mod compatibility, pattern-based fallback
- **测试框架**: 77 tests, ModTestHarness for automated compatibility
- **迁移指南**: Bilingual documentation (EN 397 lines + ZH 287 lines)

**项目架构**: 使用**正交方形瓷砖**配合Y轴深度排序实现伪3D效果。斜视角菱形瓷砖(VIS-01)超出范围——项目保持简单正交瓷砖系统。

---

## What This Is

一个基于 mod 的 2D 生存建造游戏引擎项目，当前使用 Phaser 3 渲染系统。本项目目标是在现有引擎基础上增量改进视觉架构，实现类似星露谷物语的伪3D效果——斜视角、高度层次和动态遮挡处理。

## Core Value

视觉呈现必须让玩家清晰感知空间层次和物体遮挡关系，营造沉浸式的2.5D游戏体验。

## Constraints

- **Tech Stack**: Phaser 3 渲染层，保持与现有 `@gamedemo/engine-phaser` 兼容
- **Mod Compatibility**: 不能破坏现有 mod API，改进应通过扩展 registry 实现
- **File Size**: 遵循 RFC-0007，单文件不超过500行，需拆分复杂逻辑
- **Naming Convention**: 使用 PascalCase 类文件（如 `Pseudo3DRenderer.ts`）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 增量改进而非重写 | 现有架构成熟，mod 生态已建立，全面重写风险高 | ✅ v0.1-1.2 全部成功，无破坏性变更 |
| 支持 Visual Pack 配置 | 保持 mod 自定义能力，让不同 visual styles 共存 | ✅ v0.1 模式匹配，v1.0 正式 schema |
| 基于高度排序而非 Z-index | 更直观表达空间关系，易于 mod 作者理解 | ✅ 正确遮挡已实现 |
| Branded types for coordinates | Compile-time safety with zero runtime overhead | ✅ 类型边界安全 |
| Bottom-center anchoring standard | Aligns gameplay position with visual position | ✅ 一致定位 |
| 视野基地形渲染 | 解决清理后返回黑地形问题 | ✅ v1.2 修复完成 |

## Out of Scope

- **真实3D渲染** — 使用 WebGL 3D 或 Three.js 等真正的3D引擎，保持2D Phaser 基础以简化 mod 开发和兼容性
- **光照系统** — 动态光影、阴影投射等复杂光照效果，保持简单精灵渲染
- **全视角旋转** — 玩家不能旋转视角，固定斜视角以减少美术资源需求
- **斜视角瓷砖渲染** — 45度菱形瓷砖系统 (VIS-01)。项目使用**正交方形瓷砖**，通过Y轴深度排序和物体高度实现伪3D效果，无需改变瓷砖形状
- **垂直地形** — 多层高度地形（悬崖、地下室等），保持单层地图以简化游戏逻辑

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

*Last updated: 2026-04-01 after v1.2 completion*
