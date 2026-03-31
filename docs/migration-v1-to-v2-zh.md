# 视觉包 v1 到 v2 迁移指南

**版本:** 1.0  
**最后更新:** 2026-04-01  
**适用对象:** 从视觉包 v1 升级到 v2 的模组作者

---

## 快速开始：5分钟升级

### 升级前 (v1)
```typescript
context.content.registerVisualPack({
  contentId: "my_mod:tree",
  renderHeight: 48
});
```

### 升级后 (v2)
```typescript
context.content.registerVisualPack({
  visualPackVersion: 2,  // ← 添加此项
  contentId: "my_mod:tree",
  renderHeight: 48,
  heightClassification: "tall",  // ← 添加此项
  footprint: { widthTiles: 1, depthTiles: 1 },  // ← 添加此项
  canOccludePlayer: true,  // ← 可选但推荐
  occlusionAlpha: 0.4  // ← 可选
});
```

**完成了！** 添加三个必填字段，两个可选字段以获得更好控制。

---

## 为什么要升级？

### v2 新功能

| 功能 | v1 | v2 |
|------|----|----|
| **高度分类** | 从 renderHeight 推断 | 显式控制 |
| **占地面积** | 固定为 1×1 | 可配置碰撞边界 |
| **遮挡控制** | 高物体自动处理 | 每个物体可覆盖 |
| **层级支持** | ❌ 不可用 | ✅ 多层物体 |
| **验证** | 运行时错误 | 清晰的模式验证 |

### 好处
1. **更好的视觉效果**：精确的高度分类驱动阴影和遮挡
2. **更多控制**：覆盖自动遮挡行为
3. **面向未来**：v2 是未来视觉功能的基础
4. **错误预防**：模式验证及早发现配置错误

---

## 字段详解

### 必填字段

#### `visualPackVersion`
```typescript
visualPackVersion: 2
```
必须恰好为 `2` 才能启用 v2 功能。没有此字段时，包被视为 v1。

---

#### `contentId`
```typescript
contentId: "my_mod:item_name"
```
此视觉包适用的命名空间 ID。格式：`namespace:item_name`。

**规则：**
- 必须与 `registerItem()`、`registerStructure()` 等中使用的内容 ID 匹配
- 区分大小写
- 不能包含空格

---

#### `renderHeight`
```typescript
renderHeight: 48  // 像素
```
总视觉高度（像素）。用于深度排序和阴影放置。

**约束：**
- 范围：0-128 像素
- 0 = 平坦（无阴影）
- 典型值：12（石头）、20（灌木）、48（树）、64+（建筑）

---

#### `heightClassification`
```typescript
heightClassification: "tall"  // "flat" | "low" | "medium" | "tall"
```
语义高度类别。驱动遮挡和阴影行为。

| 分类 | 高度范围 | 遮挡 | 阴影 |
|-----|---------|------|------|
| `flat` (平坦) | 0px | 从不 | 无 |
| `low` (低) | 1-16px | 从不 | 小 |
| `medium` (中) | 17-32px | 从不 | 中 |
| `tall` (高) | 33px+ | **是** | 大 |

**提示：** 高物体在玩家位于其后方时会自动淡出。

---

#### `footprint`
```typescript
footprint: {
  widthTiles: 1,   // X轴格数
  depthTiles: 1    // Y轴格数
}
```
以格为单位的碰撞占地面积。与视觉边界分开。

**用例：**
- 建筑：`{ widthTiles: 2, depthTiles: 2 }`
- 墙壁：`{ widthTiles: 1, depthTiles: 3 }`
- 单格物体：`{ widthTiles: 1, depthTiles: 1 }`

---

### 可选字段

#### `canOccludePlayer`
```typescript
canOccludePlayer: true  // 布尔值
```
当玩家位于物体后方时，该物体是否淡出。

**默认值：**
- `tall` 分类：`true`
- 其他分类：`false`

**覆盖用例：**
- 透明高物体（玻璃塔）：`false`
- 应该遮挡的矮物体（茂密灌木）：`true`

---

#### `occlusionAlpha`
```typescript
occlusionAlpha: 0.4  // 0.0 - 1.0
```
遮挡玩家时的目标透明度值。

**默认：** `0.4`（40% 可见）

**指南：**
- `0.3` = 大部分隐藏（密集物体）
- `0.4` = 平衡（默认，大多数物体）
- `0.5` = 仍然可见（半透明物体）
- `0.6+` = 几乎不淡出（玻璃、栅栏）

---

#### `layers`
```typescript
layers: [
  { id: "trunk", renderHeight: 20, frame: 0, canOcclude: false },
  { id: "canopy", renderHeight: 28, frame: 1, canOcclude: true }
]
```
将物体拆分为多个层级以实现每层遮挡。

**要求：**
- 各层高度之和必须等于 `renderHeight`
- 每层引用一个精灵帧
- 只有 `canOcclude: true` 的层级会淡出

**用例：** 树干保持不透明但树冠淡出的树。

---

## 示例配置

### 简单平坦物体
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:floor_tile",
  renderHeight: 0,
  heightClassification: "flat",
  footprint: { widthTiles: 1, depthTiles: 1 }
}
```

### 低物体（石头）
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:stone",
  renderHeight: 12,
  heightClassification: "low",
  footprint: { widthTiles: 1, depthTiles: 1 }
}
```

### 中物体（灌木）
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:berry_bush",
  renderHeight: 20,
  heightClassification: "medium",
  footprint: { widthTiles: 1, depthTiles: 1 },
  canOccludePlayer: false  // 显式（与默认值相同）
}
```

### 高物体（树）
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:oak_tree",
  renderHeight: 48,
  heightClassification: "tall",
  footprint: { widthTiles: 1, depthTiles: 1 },
  canOccludePlayer: true,  // 显式（与默认值相同）
  occlusionAlpha: 0.4
}
```

### 分层物体（带树冠的树）
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:layered_tree",
  renderHeight: 48,
  heightClassification: "tall",
  footprint: { widthTiles: 1, depthTiles: 1 },
  layers: [
    { id: "trunk", renderHeight: 20, frame: 0, canOcclude: false },
    { id: "canopy", renderHeight: 28, frame: 1, canOcclude: true }
  ]
}
```

### 建筑（多格）
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:house",
  renderHeight: 64,
  heightClassification: "tall",
  footprint: { widthTiles: 2, depthTiles: 2 },
  canOccludePlayer: true,
  occlusionAlpha: 0.3  // 比树更密集
}
```

---

## 故障排除

### 错误："Missing visualPackVersion"（缺少 visualPackVersion）
```
Visual pack validation failed: Missing required field: visualPackVersion
```
**解决方案：** 在包中添加 `visualPackVersion: 2`。

---

### 错误："Invalid heightClassification"（无效的高度分类）
```
Invalid heightClassification: high. Must be one of: flat, low, medium, tall
```
**解决方案：** 使用有效值之一：`"flat"`、`"low"`、`"medium"`、`"tall"`。

---

### 错误："Render height below minimum"（渲染高度低于最小值）
```
Render height 8px is below minimum for tall classification (33px)
```
**解决方案：** 要么将 `renderHeight` 增加到 33+，要么将 `heightClassification` 更改为匹配高度。

---

### 错误："Layer sum doesn't match renderHeight"（层级总和与渲染高度不匹配）
```
Layer heights sum (40px) doesn't match renderHeight (48px)
```
**解决方案：** 调整各层高度使其总和恰好等于 `renderHeight`。

---

### 问题："Tall object not occluding"（高物体不遮挡）
**症状：** 玩家走到树后，树不淡出。

**原因：**
1. 缺少 `canOccludePlayer: true`
2. `heightClassification` 不是 `"tall"`

**解决方案：**
```typescript
{
  heightClassification: "tall",
  canOccludePlayer: true  // 即使对于高物体也需要
}
```

---

### 问题："Object occludes when it shouldn't"（物体在不应当时遮挡）
**症状：** 玩家走到栅栏后，栅栏淡出。

**解决方案：**
```typescript
{
  heightClassification: "medium",  // 不是 tall
  canOccludePlayer: false  // 显式禁用
}
```

---

## 向后兼容性

### v1 模组会坏掉吗？
**不会。** 引擎自动检测 v1 包（没有 `visualPackVersion` 字段）并：
1. 使用模式匹配推断高度分类
2. 为缺失的字段分配合理的默认值
3. 记录警告（不是错误）

### 迁移时间线
- **现在：** v1 模组无需更改即可工作
- **未来：** v2 功能（层级、精确遮挡）需要迁移
- **永远不会：** 不会移除 v1 支持

---

## API 参考

### TypeScript 接口

```typescript
interface VisualPackV2 {
  visualPackVersion: 2;
  contentId: string;
  renderHeight: number;
  heightClassification: "flat" | "low" | "medium" | "tall";
  footprint: {
    widthTiles: number;
    depthTiles: number;
  };
  canOccludePlayer?: boolean;
  occlusionAlpha?: number;
  layers?: VisualPackLayer[];
}

interface VisualPackLayer {
  id: string;
  renderHeight: number;
  frame: number;
  canOcclude?: boolean;
}
```

### 辅助函数

```typescript
import { 
  getVisualPackVersion,
  isVisualPackV2,
  validateVisualPack 
} from "@gamedemo/mod-api";

// 检查版本
const version = getVisualPackVersion(pack); // 1 | 2

// 类型守卫
if (isVisualPackV2(pack)) {
  // pack 是 VisualPackV2
}

// 验证
const warnings = validateVisualPack(pack);
// warnings: string[] 包含验证消息
```

---

## 获取帮助

- **文档：** 参见项目根目录中的 ARCHITECTURE.md
- **示例：** 查看 `mods/core-base/src/visualPacks.ts`
- **测试：** 运行 `pnpm test:mods:ci` 验证模组
- **问题：** 在项目问题跟踪器上报告

---

*祝模组制作愉快！*
