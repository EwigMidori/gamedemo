# Requirements: Gamedemo 伪3D视觉改进 v1.1

**Version:** v1.1 (Performance)  
**Defined:** 2026-04-01  
**Core Value:** 视觉呈现必须让玩家清晰感知空间层次和物体遮挡关系，营造沉浸式的2.5D游戏体验

---

## v1.1 Scope

v1.1 基于 v1.0 已完成的生产级伪3D系统，实现**视锥剔除和渲染优化**，让游戏能支持更大世界和更低配置设备。

**v1.0 已交付（基础）：**
- ✅ 类型安全坐标系统
- ✅ VisualPackRegistry v2
- ✅ Pseudo3DDepthSorter
- ✅ 统一渲染管道
- ✅ 动态遮挡系统
- ✅ 77个测试

**v1.1 新增：**
- 视锥剔除（Frustum Culling）
- 渲染循环深度优化
- LOD（细节层次）系统
- 大场景支持（1000×1000）

---

## Phase 5: Performance & Optimization

### PERF-03: 视锥剔除核心

**Requirement:** 实现视锥剔除系统，只渲染屏幕内的物体

**Acceptance Criteria:**
- [ ] `FrustumCuller` 类存在，计算屏幕视锥范围
- [ ] 每帧只处理屏幕内 (+10% 边距) 的物体
- [ ] 屏幕外物体完全跳过（不计算深度、不更新、不渲染）
- [ ] 正确性：屏幕内物体 100% 渲染，不漏掉
- [ ] 性能：剔除检查 < 0.05ms
- [ ] 支持动态视锥更新（相机移动、缩放）

**Technical Notes:**
- 视锥 = 相机位置 + 屏幕宽高 + 缩放比例
- 边距 10% 防止物体突然出现在屏幕边缘
- 与 SpatialIndex 结合使用（先空间查询，再视锥筛选）

---

### PERF-04: 渲染循环重构

**Requirement:** 重构渲染循环，将视锥剔除、深度排序、遮挡检测分层

**Acceptance Criteria:**
- [ ] 渲染流水线：视锥剔除 → 深度排序 → 遮挡检测 → 渲染
- [ ] 每层只处理上层输出的物体列表
- [ ] 避免重复计算（位置、深度等缓存）
- [ ] 性能：1000 物体场景 < 8ms 渲染时间
- [ ] 可配置：每层的开关（调试用途）

**Current Flow (v1.0):**
```
所有物体 → 深度排序 → 遮挡检测 → 渲染
(10000个)   (10000个)   (10000个)  (500个可见)
```

**Optimized Flow (v1.1):**
```
所有物体 → 视锥剔除 → 深度排序 → 遮挡检测 → 渲染
(10000个)   (500个)     (500个)    (500个)   (500个)
```

---

### PERF-05: LOD（细节层次）系统

**Requirement:** 远距离物体简化渲染，近距离完整渲染

**Acceptance Criteria:**
- [ ] `LODManager` 类，根据距离选择细节级别
- [ ] 3 个 LOD 级别：Near (完整), Medium (简化), Far (占位符)
- [ ] 距离阈值可配置（如：Near < 200px, Medium 200-500px, Far > 500px）
- [ ] Medium 级别：移除阴影、简化动画
- [ ] Far 级别：只渲染 1×1 像素占位符或跳过
- [ ] 平滑过渡：LOD 切换无闪烁

**LOD 规则示例:**
```
Distance < 200px:   完整渲染（阴影、动画、特效）
Distance 200-500px: 简化渲染（无阴影、静态）
Distance > 500px:   占位符（半透明方块或跳过）
```

---

### PERF-06: 对象池优化

**Requirement:** 优化对象池系统，减少内存分配和垃圾回收

**Acceptance Criteria:**
- [ ] 扩展 spritePool 支持更多对象类型（阴影、特效粒子）
- [ ] 预分配策略：游戏启动时预分配常用对象
- [ ] 动态扩容：池耗尽时自动扩容（记录扩容事件）
- [ ] 对象生命周期追踪：检测内存泄漏
- [ ] 性能：对象获取 < 0.01ms，零 GC 压力

**Metrics:**
- 池命中率 > 95%
- 扩容次数 < 10 次/游戏会话
- 内存使用稳定（无持续增长）

---

### PERF-07: 大场景支持

**Requirement:** 支持 1000×1000 地图（100万格子）流畅运行

**Acceptance Criteria:**
- [ ] 1000×1000 地图加载不卡顿（< 2秒）
- [ ] 玩家移动流畅，无卡顿（60fps）
- [ ] 内存使用 < 500MB（包含地图数据）
- [ ] 地图分块加载：只加载玩家周围的区块
- [ ] 区块卸载：远离玩家的区块从内存释放

**Chunking Strategy:**
```
加载范围：玩家周围 5×5 区块（每个区块 64×64 格子）
预加载：移动方向上的额外 2 个区块
卸载：距离玩家 > 8 个区块时释放
```

---

### PERF-08: 性能基准验证

**Requirement:** 全面性能测试，验证 v1.1 优化效果

**Acceptance Criteria:**
- [ ] Benchmark 场景：1000×1000 地图，随机 5000 个物体
- [ ] 目标：60fps 在以下配置：
  - 高端：RTX 3060, 60fps ✅
  - 中端：GTX 1050, 60fps ✅
  - 低端：集成显卡, 30fps ✅
- [ ] 性能对比报告：v1.0 vs v1.1
- [ ] 内存分析：无泄漏，稳定曲线
- [ ] 测试报告包含：FPS 分布、帧时间、内存占用

**Test Scenarios:**
1. 静态场景：玩家不动，观察 FPS 稳定性
2. 移动场景：玩家快速移动，测试区块加载
3. 密集场景：1000 物体同屏，压力测试
4. 长时间运行：1 小时连续游戏，内存检测

---

## Out of Scope (v1.1)

延续 PROJECT.md 的约束：

- ❌ 真实3D渲染 (WebGL/Three.js)
- ❌ 光照系统
- ❌ 全视角旋转
- ❌ 斜视角/菱形瓷砖渲染
- ❌ 垂直地形（多层地图）
- ❌ 多线程渲染（Web Workers）
- ❌ GPU 计算（WebGL compute shaders）

---

## Traceability

| Requirement | Phase | Priority | Status |
|-------------|-------|----------|--------|
| PERF-03 | Phase 5 | 🔴 Critical | ⏳ Pending |
| PERF-04 | Phase 5 | 🔴 Critical | ⏳ Pending |
| PERF-05 | Phase 5 | 🟡 High | ⏳ Pending |
| PERF-06 | Phase 5 | 🟢 Medium | ⏳ Pending |
| PERF-07 | Phase 5 | 🔴 Critical | ⏳ Pending |
| PERF-08 | Phase 5 | 🟡 High | ⏳ Pending |

**Total:** 6 requirements  
**v1.1 Scope:** 6/6 (100%)

---

## Success Criteria Summary

**Phase 5 完成时：**
1. 视锥剔除系统运行，只渲染屏幕内物体
2. 渲染流水线分层，1000 物体 < 8ms
3. LOD 系统根据距离简化远距离物体
4. 对象池优化，零 GC 压力
5. 1000×1000 地图流畅运行（60fps）
6. 性能基准验证通过（高中低端配置）

---

*Requirements for v1.1 defined: 2026-04-01*  
*Based on: v1.0 production foundation (12 requirements delivered)*
