# Coding Conventions

**Analysis Date:** 2026-03-31

## Language & TypeScript Configuration

**TypeScript Version:** ~5.9.3

**Compiler Options (from `tsconfig.base.json`):**
- Target: ES2023
- Module: ESNext with bundler resolution
- Strict mode: Enabled with additional strict flags
- Key flags:
  - `noUnusedLocals: true` - Unused variables cause errors
  - `noUnusedParameters: true` - Unused parameters cause errors
  - `verbatimModuleSyntax: true` - Enforces `type` imports
  - `noFallthroughCasesInSwitch: true` - Exhaustive switch checking
  - `erasableSyntaxOnly: true` - No TypeScript-specific runtime features

## Naming Conventions

**Files:**
- PascalCase for class files: `HudManager.ts`, `MainScene.ts`, `TileRenderer.ts`
- camelCase for module files: `commandTypes.ts`, `inputManager.ts`, `vanillaCommands.ts`
- Barrel files: `index.ts` for public API exports

**Types & Interfaces:**
- PascalCase for all type definitions: `GameCommand`, `CommandContext`, `RuntimeSystem`
- Use descriptive names that indicate purpose: `RuntimeCommandTrigger`, `InventorySlotDescriptor`

**Variables & Functions:**
- camelCase for variables and functions: `playerX`, `worldTime`, `getHeldItemId()`
- Boolean variables use descriptive prefixes: `breakHoldActive`, `handcraftOpen`

**Constants:**
- UPPER_SNAKE_CASE for primitive constants: `TILE_SIZE`, `DAY_LENGTH`, `SAVE_KEY`
- PascalCase for constant objects that group functionality: `GatheringActions`, `CraftingResolvers`

**Mod Naming:**
- Format: `{namespace}:{feature}` - e.g., `core:player`, `core:gathering`, `core:crafting`
- Package names: `@gamedemo/mod-{namespace}-{feature}`

## Code Style

**No Linting Tools Configured:**
- No ESLint, Prettier, or Biome configuration detected
- Code style relies on TypeScript strict mode and developer discipline

**Import Organization:**
```typescript
// 1. External dependencies (alphabetical)
import Phaser from 'phaser';

// 2. Workspace dependencies (alphabetical)
import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";

// 3. Internal modules (relative, alphabetical)
import { GatheringActions } from "./actions";
import { GatheringDomain } from "./gatheringDomain";
```

**Type Imports:**
- Use explicit `type` keyword for type-only imports: `import type { GameModModule }`
- Required by `verbatimModuleSyntax: true`

**Module Exports:**
- Prefer `export const` objects with methods over standalone functions
- Example from `actions.ts`:
```typescript
export const GatheringActions = {
  gatherNearest,
  plantSelectedItem,
  breakResource
};
```
- Use barrel files (`index.ts`) for public API

## Architecture Patterns

**Object-Oriented Design:**
- Prefer classes for stateful objects: `HudManager`, `TileRenderer`
- Use explicit property declarations with `!` for late initialization:
```typescript
private tileRenderer!: TileRenderer;
private hud!: Hud;
```

**Rust-Like Module Design:**
- Group related functions in exported constant objects
- Keep data structures and behavior in same bounded module
- Example: `GatheringDomain`, `CraftingDomain`

**No Exported Global Functions (RFC-0007):**
- ❌ Avoid: `export function foo() {}`
- ✅ Use: `export const FooModule = { foo() {} }`
- ✅ Use: `export class FooService { foo() {} }`

**File Size Constraint (RFC-0007):**
- Hard limit: 500 lines per source file
- Split by responsibility when approaching limit
- Keep public API narrow in entry file

## Type Patterns

**Discriminated Unions:**
```typescript
export type GameCommandId =
  | 'break-target'
  | 'gather'
  | 'place-structure'
  | 'plant-item';
```

**Interface Naming:**
- Use suffixes for clarity: `Context`, `State`, `Def`, `Descriptor`
- Examples: `CommandContext`, `RuntimeSessionState`, `ItemDef`, `RuntimeInventorySlotDescriptor`

**Type Aliases for Primitives:**
```typescript
export type ItemId = string;
export type StructureType = string;
export type RecipeId = string;
```

## Error Handling

**RuntimeAction Results:**
```typescript
return {
  ok: false,
  message: "No gatherable resource adjacent to the player."
};
```

**Type Guards:**
```typescript
const reason = event.reason instanceof Error 
  ? `${event.reason.name}: ${event.reason.message}` 
  : String(event.reason);
```

## Comments & Documentation

**Minimal Comments:**
- Code is generally self-documenting through naming
- Use section dividers for organization:
```typescript
// ── Private helpers ────────────────────────────
```

**JSDoc:**
- Not extensively used
- Prefer descriptive naming over comments

## Module Structure

**Monorepo Organization:**
```
apps/           # Applications (host-web)
packages/       # Core engine packages
mods/           # Gameplay modules
```

**Package Exports:**
```json
{
  "exports": {
    ".": "./src/index.ts"
  }
}
```

**Vite Aliases:**
- Workspace packages use `@gamedemo/` prefix
- Mapped in `apps/host-web/vite.config.ts`

## Strictness Rules

**Compiler Enforced:**
- All variables must be used
- All function parameters must be used
- Exhaustive switch statements
- No unchecked side-effect imports

**Convention Enforced:**
- No loose utility functions
- No oversized files (>500 lines)
- Explicit ownership of data and behavior

---

*Convention analysis: 2026-03-31*
