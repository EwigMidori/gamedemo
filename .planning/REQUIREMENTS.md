# Requirements: Gamedemo 伪3D视觉改进 v1.2

**Version:** v1.2 (Scalability Fix)  
**Defined:** 2026-04-01  
**Problem:** 距离出生点越远，游戏越卡顿  
**Core Value:** 流畅的游戏体验不应该随探索距离而衰减

---

## v1.2 Scope

**关键问题：** 游戏遍历 `snapshot.resources` 和 `snapshot.placedStructures` 所有对象，随着世界扩展，数组不断增长，导致 O(n) 遍历时间线性增加。

**根本原因：**
1. 每次 `render()` 遍历全量资源数组
2. 远处资源/建筑没有被清理
3. 没有使用视锥剔除过滤远处对象
4. 世界 tiles 数组无限增长

**解决方案：**
- 为资源和建筑添加视锥剔除
- 清理远处不再可见的实体
- 优化世界 tiles 遍历
- 使用 SpatialIndex 加速查询

---

## Phase 6: Scalability & Distance Culling

### PERF-09: 资源视锥剔除

**Requirement:** 对 `snapshot.resources` 应用视锥剔除，只处理视野内的资源

**Acceptance Criteria:**
- [ ] 修改 `renderResources()` 使用视锥剔除
- [ ] 只遍历视野内 (+边距) 的资源
- [ ] 视野外资源跳过处理（不计算深度、不渲染）
- [ ] 性能：1000 资源遍历时间 < 1ms
- [ ] 树、石头等资源正确显示/隐藏

**Current Code Issue:**
```typescript
// 问题：遍历所有资源
for (const resource of snapshot.resources) {
  // 处理每个资源...
}
```

**Expected Fix:**
```typescript
// 修复：只遍历视野内的资源
const visibleResources = filterByFrustum(snapshot.resources, frustumBounds);
for (const resource of visibleResources) {
  // 处理可见资源...
}
```

---

### PERF-10: 建筑视锥剔除

**Requirement:** 对 `snapshot.placedStructures` 应用视锥剔除

**Acceptance Criteria:**
- [ ] 修改 `renderStructures()` 使用视锥剔除
- [ ] 只遍历视野内的建筑
- [ ] 墙壁、门、营火等建筑正确显示/隐藏
- [ ] 不破坏建筑的 autotile 计算

---

### PERF-11: 远处实体清理

**Requirement:** 清理远离玩家、不再可见的实体

**Acceptance Criteria:**
- [ ] 资源距离玩家 > 200 格且不可见时从 world 移除
- [ ] 建筑距离玩家 > 200 格时保留（建筑是永久的）
- [ ] 清理逻辑每 300 帧（5 秒）执行一次
- [ ] 避免频繁增删导致的性能抖动

**Technical Notes:**
- 使用 `snapshot.resources` 过滤，不要直接修改原数组
- 需要通知引擎状态变更
- 考虑保存游戏时的数据完整性

---

### PERF-12: 世界 Tiles 优化

**Requirement:** 优化 `world.tiles` 遍历，避免处理已渲染的 tiles

**Acceptance Criteria:**
- [ ] 使用 `renderedTerrainCount` 正确跳过已渲染 tiles
- [ ] 或只遍历玩家周围的 chunks
- [ ] 世界扩展时渲染时间不显著增加
- [ ] 内存使用稳定（无泄漏）

**Current Issue:**
```typescript
// 每次遍历所有未渲染的 tiles
for (let index = this.renderedTerrainCount; index < world.tiles.length; index++)
```

**Expected:**
- 新 tiles 只在世界扩展时添加
- 已渲染 tiles 不重复处理
- 遍历时间 O(new_tiles) 而非 O(all_tiles)

---

## Out of Scope (v1.2)

- 不修改生成算法
- 不改变游戏逻辑
- 不添加新功能
- 专注性能修复

---

## Success Criteria

1. 玩家走到距离出生点 500 格时，FPS 保持 60
2. 资源遍历时间 < 1ms（无论世界多大）
3. 内存使用稳定，不随距离持续增长
4. 所有现有功能正常工作

---

## Traceability

| Requirement | Phase | Priority | Status |
|-------------|-------|----------|--------|
| PERF-09 | Phase 6 | 🔴 Critical | ⏳ Pending |
| PERF-10 | Phase 6 | 🔴 Critical | ⏳ Pending |
| PERF-11 | Phase 6 | 🟡 High | ⏳ Pending |
| PERF-12 | Phase 6 | 🟡 High | ⏳ Pending |

**Total:** 4 requirements  
**v1.2 Scope:** 4/4

---

*Requirements for v1.2 defined: 2026-04-01*  
*Goal: Fix performance degradation at distance*
