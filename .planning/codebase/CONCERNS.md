# Codebase Concerns

**Analysis Date:** 2025-03-31

## Tech Debt

### Large Files with High Complexity

**MainScene.ts (1066 lines)**
- File: `src/game/scenes/MainScene.ts`
- Issue: God class with 100+ state properties mixing rendering, game logic, input handling, and UI
- Impact: Difficult to test, maintain, and extend
- Fix approach: Refactor into smaller focused classes (PlayerController, InventoryManager, RenderManager, etc.)

**commandActions.ts (540 lines)**
- File: `src/game/scenes/commandActions.ts`
- Issue: Monolithic action handler with many responsibilities
- Impact: Changes to one action type risk breaking others
- Fix approach: Split into domain-specific action modules

**gameViewport.ts (457 lines)**
- File: `packages/engine-phaser/src/gameViewport.ts`
- Issue: Mixed rendering logic with debug code in production
- Impact: Console spam in production builds, performance overhead
- Fix approach: Remove or conditionalize debug console statements

### Missing Type Safety

**Implicit `any` usage**
- Files: `src/game/scenes/hud/HudPanel.ts` (line 48)
- Issue: `// eslint-disable-next-line @typescript-eslint/no-unused-vars` suppresses valid warnings
- Impact: Type errors may go unnoticed
- Fix approach: Properly type or remove unused parameters

**No strict null checks enforcement**
- Many locations use `!` non-null assertions without validation
- Impact: Runtime null reference errors

### Console Statements in Production Code

**Debug logging left in production**
- File: `packages/engine-phaser/src/gameViewport.ts` (lines 201-211)
- Issue: Chinese-language debug console.group/error/log statements for structure rendering
- Impact: Console pollution, potential performance impact, mixed language output
- Fix approach: Wrap in `process.env.NODE_ENV !== 'production'` checks or use a proper logger

**Warning in autotile resolver**
- File: `packages/engine-phaser/src/structureAutotileResolver.ts` (line 16)
- Issue: console.warn for invalid autotileFrameBase
- Impact: May flood console with warnings
- Fix approach: Debounce warnings or validate at mod load time

## Security Considerations

### XSS Risk via innerHTML

**Multiple locations using innerHTML with dynamic content:**
- `apps/host-web/src/hostShell.ts` (lines 111, 243, 279)
- `apps/host-web/src/sessionViewRenderer.ts` (lines 30, 63, 82, 100)
- `src/main.ts` (line 11)
- `src/counter.ts` (line 5)

**Risk**: If any user input flows into these templates, XSS vulnerability exists
**Current mitigation**: Content appears to be internally controlled
**Recommendations**: Use DOM APIs instead of innerHTML, or sanitize inputs with DOMPurify

### External Mod Loading Security

**Dynamic imports of external URLs**
- File: `packages/mod-loader/src/index.ts` (line 123)
- Code: `await import(/* @vite-ignore */ trimmed)`
- Issue: No URL validation, CSP bypass risk, arbitrary code execution
- Impact: Malicious mods can execute arbitrary JavaScript
- Current mitigation: None (developer tool only)
- Recommendations: 
  - Implement mod signature verification
  - Add CSP headers restricting script sources
  - Sandbox mod execution
  - Validate URLs against allowlist

### LocalStorage Data Exposure

**Save data stored unencrypted**
- Files: `src/game/scenes/saveLoad.ts`, `apps/host-web/src/sessionController.ts`
- Issue: Game saves, mod configurations stored in plaintext localStorage
- Impact: Save data tampering, potential PII exposure
- Current mitigation: None
- Recommendations: Add integrity checks (HMAC), encrypt sensitive data

### Random ID Generation

**Non-cryptographic random for IDs**
- Files: Multiple locations use `Math.random()` for entity IDs
- `src/game/scenes/MainScene.ts` (lines 941, 974)
- `src/game/scenes/commandActions.ts` (line 98)
- `mods/core-inventory/src/actions.ts` (line 57)
- `mods/core-gathering/src/gatheringDomain.ts` (line 181)
- `mods/core-building/src/breakingDomain.ts` (line 77)
- Issue: ID collision possible, predictable IDs
- Impact: Data corruption, potential security issues if IDs used for authorization
- Fix approach: Use `crypto.randomUUID()` or sequential IDs with proper collision handling

## Performance Bottlenecks

### Inefficient Rendering

**Per-frame object iteration in gameViewport.ts**
- File: `packages/engine-phaser/src/gameViewport.ts`
- Issue: Multiple `for...of` loops over all resources/structures/drops every frame
- Impact: O(n) complexity per entity type per frame
- Improvement path: Implement spatial indexing (quadtree), culling

**Unnecessary cloneWorldBlueprint calls**
- File: `packages/engine-runtime/src/runtimeSessionFactory.ts` (lines 67-86)
- Issue: Deep cloning world tiles on every session snapshot
- Impact: Memory pressure, GC pauses
- Improvement path: Use immutable data structures or copy-on-write

### No Frame Rate Limiting

**Game loop without max delta cap**
- File: `apps/host-web/src/main.ts` (line 43)
- Code: `const deltaSeconds = Math.min(0.05, Math.max(0, (frameTime - lastFrameTime) / 1000))`
- Issue: While there's a cap, background tab accumulation could cause issues
- Improvement path: Consider fixed timestep physics updates

## Fragile Areas

### Save System Compatibility

**Manual serialization/deserialization**
- File: `src/game/scenes/saveLoad.ts`
- Issue: Hand-written migration code for backward compatibility (lines 100-106)
- Impact: Easy to break save compatibility
- Why fragile: Manual field mapping, no schema validation
- Safe modification: Add comprehensive save migration tests before changes

### Mod Dependency Resolution

**Circular dependency detection**
- File: `packages/mod-loader/src/index.ts` (lines 71-95)
- Issue: Runtime circular dependency check may fail with complex graphs
- Impact: Stack overflow or infinite loops
- Safe modification: Add iteration limits, test with intentionally circular deps

### State Cloning Performance

**Deep clone of entire session state**
- File: `packages/engine-runtime/src/runtimeSessionFactory.ts` (lines 88-115)
- Issue: Every snapshot clones all arrays and objects
- Impact: Performance degrades with world size
- Test coverage: No tests for large world performance

## Missing Critical Features

### No Automated Testing

**Zero test coverage detected**
- No `.test.ts` or `.spec.ts` files found
- Impact: Regressions likely, refactoring dangerous
- Risk: High - changes may break game without detection
- Priority: High

### No Error Boundaries

**No global error handling**
- File: `apps/host-web/src/main.ts`
- Issue: Only boot failures are caught (line 158-161)
- Impact: Runtime errors crash the game
- Priority: Medium

### No Input Validation

**External mod URLs not validated**
- File: `apps/host-web/src/main.ts` (lines 34-37)
- Issue: Raw user input passed to mod loader
- Impact: Invalid URLs, potential injection
- Priority: Medium

## Code Quality Issues

### Mixed Languages in Codebase

**Chinese comments in production code**
- File: `packages/engine-phaser/src/gameViewport.ts` (lines 201-211)
- Comments like "发现重复的 Structure ID" (found duplicate structure ID)
- Issue: Inconsistent language reduces maintainability
- Fix approach: Standardize on English for all comments

### Magic Numbers Throughout

**Hardcoded constants scattered in code**
- Examples: Zoom levels (2), tile sizes (16), animation frame rates (6)
- Files: `src/game/scenes/MainScene.ts`, `packages/engine-phaser/src/gameViewport.ts`
- Impact: Difficult to tune game feel, inconsistent behavior
- Fix approach: Centralize in configuration objects

### No Linting Configuration

**No ESLint configuration found**
- No `.eslintrc*`, `eslint.config.*` files
- Impact: Inconsistent code style, potential bugs uncaught
- Fix approach: Add ESLint config with TypeScript rules

## Dependency Risks

### Phaser 3 Dependency

**Game engine tightly coupled to Phaser**
- All rendering code in `packages/engine-phaser` depends on Phaser
- Risk: Major version upgrades may require significant refactoring
- Mitigation: Package structure isolates the dependency

### Mod API Versioning

**Hardcoded API version check**
- File: `packages/engine-runtime/src/runtimeAssembly.ts` (lines 344-348)
- Issue: Strict version equality required (`!== MOD_API_VERSION`)
- Impact: Minor updates break all existing mods
- Recommendation: Support semver ranges for backward compatibility

## Recommendations Summary

1. **Immediate (High Priority)**
   - Add test coverage (at least smoke tests)
   - Remove or conditionalize production console statements
   - Add input validation for external mod URLs

2. **Short-term (Medium Priority)**
   - Implement ESLint configuration
   - Add error boundaries
   - Replace Math.random() for ID generation
   - Standardize on English comments

3. **Long-term (Lower Priority)**
   - Refactor MainScene.ts into smaller classes
   - Add mod sandboxing/signature verification
   - Implement spatial indexing for rendering
   - Add save data encryption

---

*Concerns audit: 2025-03-31*
