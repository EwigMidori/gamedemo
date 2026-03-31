# Visual Pack v1 to v2 Migration Guide

**Version:** 1.0  
**Last Updated:** 2026-04-01  
**Applies to:** Mod authors upgrading from Visual Pack v1 to v2

---

## Quick Start: Upgrade in 5 Minutes

### Before (v1)
```typescript
context.content.registerVisualPack({
  contentId: "my_mod:tree",
  renderHeight: 48
});
```

### After (v2)
```typescript
context.content.registerVisualPack({
  visualPackVersion: 2,  // ← Add this
  contentId: "my_mod:tree",
  renderHeight: 48,
  heightClassification: "tall",  // ← Add this
  footprint: { widthTiles: 1, depthTiles: 1 },  // ← Add this
  canOccludePlayer: true,  // ← Optional but recommended
  occlusionAlpha: 0.4  // ← Optional
});
```

**That's it!** Three required fields added, two optional fields for better control.

---

## Why Upgrade?

### New Features in v2

| Feature | v1 | v2 |
|---------|----|----|
| **Height Classification** | Inferred from renderHeight | Explicit control |
| **Footprint** | Always 1×1 | Configurable collision bounds |
| **Occlusion Control** | Automatic for tall objects | Per-object override |
| **Layer Support** | ❌ Not available | ✅ Multi-layer objects |
| **Validation** | Runtime errors | Clear schema validation |

### Benefits
1. **Better Visuals**: Precise height classification drives shadows and occlusion
2. **More Control**: Override automatic occlusion behavior
3. **Future-Proof**: v2 is the foundation for upcoming visual features
4. **Error Prevention**: Schema validation catches misconfigurations early

---

## Field Reference

### Required Fields

#### `visualPackVersion`
```typescript
visualPackVersion: 2
```
Must be exactly `2` to enable v2 features. Without this field, the pack is treated as v1.

---

#### `contentId`
```typescript
contentId: "my_mod:item_name"
```
The namespace ID this visual pack applies to. Format: `namespace:item_name`.

**Rules:**
- Must match the content ID used in `registerItem()`, `registerStructure()`, etc.
- Case-sensitive
- Cannot contain spaces

---

#### `renderHeight`
```typescript
renderHeight: 48  // pixels
```
Total visual height in pixels. Used for depth sorting and shadow placement.

**Constraints:**
- Range: 0-128 pixels
- 0 = flat (no shadow)
- Typical values: 12 (rock), 20 (bush), 48 (tree), 64+ (building)

---

#### `heightClassification`
```typescript
heightClassification: "tall"  // "flat" | "low" | "medium" | "tall"
```
Semantic height category. Drives occlusion and shadow behavior.

| Classification | Height Range | Occlusion | Shadow |
|---------------|--------------|-----------|--------|
| `flat` | 0px | Never | None |
| `low` | 1-16px | Never | Small |
| `medium` | 17-32px | Never | Medium |
| `tall` | 33px+ | **Yes** | Large |

**Tip:** Tall objects automatically fade when the player is behind them.

---

#### `footprint`
```typescript
footprint: {
  widthTiles: 1,   // X-axis tiles
  depthTiles: 1    // Y-axis tiles
}
```
Collision footprint in tile units. Separate from visual bounds.

**Use Cases:**
- Buildings: `{ widthTiles: 2, depthTiles: 2 }`
- Walls: `{ widthTiles: 1, depthTiles: 3 }`
- Single-tile objects: `{ widthTiles: 1, depthTiles: 1 }`

---

### Optional Fields

#### `canOccludePlayer`
```typescript
canOccludePlayer: true  // boolean
```
Whether this object fades when the player is behind it.

**Defaults:**
- `tall` classification: `true`
- Other classifications: `false`

**Override Use Cases:**
- Transparent tall object (glass tower): `false`
- Short object that should occlude (dense bush): `true`

---

#### `occlusionAlpha`
```typescript
occlusionAlpha: 0.4  // 0.0 - 1.0
```
Target alpha value when occluding the player.

**Default:** `0.4` (40% visible)

**Guidelines:**
- `0.3` = Mostly hidden (dense objects)
- `0.4` = Balanced (default, most objects)
- `0.5` = Still visible (translucent objects)
- `0.6+` = Barely faded (glass, fences)

---

#### `layers`
```typescript
layers: [
  { id: "trunk", renderHeight: 20, frame: 0, canOcclude: false },
  { id: "canopy", renderHeight: 28, frame: 1, canOcclude: true }
]
```
Split object into multiple layers for per-layer occlusion.

**Requirements:**
- Layer heights must sum to `renderHeight`
- Each layer references a sprite frame
- Only layers with `canOcclude: true` fade

**Use Case:** Trees where the trunk stays opaque but the canopy fades.

---

## Example Configurations

### Simple Flat Object
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:floor_tile",
  renderHeight: 0,
  heightClassification: "flat",
  footprint: { widthTiles: 1, depthTiles: 1 }
}
```

### Low Object (Rock)
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:stone",
  renderHeight: 12,
  heightClassification: "low",
  footprint: { widthTiles: 1, depthTiles: 1 }
}
```

### Medium Object (Bush)
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:berry_bush",
  renderHeight: 20,
  heightClassification: "medium",
  footprint: { widthTiles: 1, depthTiles: 1 },
  canOccludePlayer: false  // Explicit (same as default)
}
```

### Tall Object (Tree)
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:oak_tree",
  renderHeight: 48,
  heightClassification: "tall",
  footprint: { widthTiles: 1, depthTiles: 1 },
  canOccludePlayer: true,  // Explicit (same as default)
  occlusionAlpha: 0.4
}
```

### Layered Object (Tree with Canopy)
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

### Building (Multi-tile)
```typescript
{
  visualPackVersion: 2,
  contentId: "my_mod:house",
  renderHeight: 64,
  heightClassification: "tall",
  footprint: { widthTiles: 2, depthTiles: 2 },
  canOccludePlayer: true,
  occlusionAlpha: 0.3  // Denser than trees
}
```

---

## Troubleshooting

### Error: "Missing visualPackVersion"
```
Visual pack validation failed: Missing required field: visualPackVersion
```
**Solution:** Add `visualPackVersion: 2` to your pack.

---

### Error: "Invalid heightClassification"
```
Invalid heightClassification: high. Must be one of: flat, low, medium, tall
```
**Solution:** Use one of the valid values: `"flat"`, `"low"`, `"medium"`, `"tall"`.

---

### Error: "Render height below minimum"
```
Render height 8px is below minimum for tall classification (33px)
```
**Solution:** Either increase `renderHeight` to 33+, or change `heightClassification` to match the height.

---

### Error: "Layer sum doesn't match renderHeight"
```
Layer heights sum (40px) doesn't match renderHeight (48px)
```
**Solution:** Adjust layer heights to sum exactly to `renderHeight`.

---

### Issue: "Tall object not occluding"
**Symptoms:** Player walks behind tree, tree doesn't fade.

**Causes:**
1. Missing `canOccludePlayer: true`
2. `heightClassification` is not `"tall"`

**Solution:**
```typescript
{
  heightClassification: "tall",
  canOccludePlayer: true  // Required even for tall objects
}
```

---

### Issue: "Object occludes when it shouldn't"
**Symptoms:** Player walks behind fence, fence fades.

**Solution:**
```typescript
{
  heightClassification: "medium",  // Not tall
  canOccludePlayer: false  // Explicitly disable
}
```

---

## Backward Compatibility

### Will v1 mods break?
**No.** The engine automatically detects v1 packs (no `visualPackVersion` field) and:
1. Uses pattern matching to infer height classification
2. Assigns sensible defaults for missing fields
3. Logs a warning (not an error)

### Migration Timeline
- **Now:** v1 mods work unchanged
- **Future:** v2 features (layers, precise occlusion) require migration
- **Never:** v1 support will not be removed

---

## API Reference

### TypeScript Interfaces

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

### Helper Functions

```typescript
import { 
  getVisualPackVersion,
  isVisualPackV2,
  validateVisualPack 
} from "@gamedemo/mod-api";

// Check version
const version = getVisualPackVersion(pack); // 1 | 2

// Type guard
if (isVisualPackV2(pack)) {
  // pack is VisualPackV2
}

// Validate
const warnings = validateVisualPack(pack);
// warnings: string[] with validation messages
```

---

## Getting Help

- **Documentation:** See ARCHITECTURE.md in project root
- **Examples:** Check `mods/core-base/src/visualPacks.ts`
- **Tests:** Run `pnpm test:mods:ci` to verify your mods
- **Issues:** Report on project issue tracker

---

*Happy modding!*
