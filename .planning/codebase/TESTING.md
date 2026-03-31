# Testing Patterns

**Analysis Date:** 2026-03-31

## Testing Overview

**No Unit Testing Framework:**
- No Jest, Vitest, or similar unit test framework configured
- No `*.test.ts` or `*.spec.ts` files found in codebase
- Testing focus is on visual regression and manual QA

## Visual Comparison Testing

**Primary Tool:** Playwright + Pixelmatch

**Location:** `tools/visual-compare/runComparison.mjs`

**Purpose:** Compare visual output between original prototype and rewrite implementations

### How Visual Comparison Works

**Dependencies:**
- `@playwright/test` ^1.58.2 - Browser automation
- `pixelmatch` ^7.1.0 - Image diffing
- `pngjs` ^7.0.0 - PNG manipulation

**Script Command:**
```bash
pnpm compare:visual
```

**Process:**
1. Launches two Vite dev servers:
   - Original: `http://127.0.0.1:4173` (root directory)
   - Rewrite: `http://127.0.0.1:4174` (host-web package)

2. Captures canvas screenshots using Playwright:
   - Viewport: 1280x768
   - Waits for network idle
   - 2.5 second settle time before capture

3. Compares images using pixelmatch:
   - Threshold: 0.18 (18% color difference threshold)
   - Generates diff image highlighting changes

4. Outputs report to `artifacts/visual-comparison/initial/`:
   - `original.png` - Screenshot from original implementation
   - `rewrite.png` - Screenshot from rewrite implementation
   - `diff.png` - Visual diff highlighting differences
   - `report.json` - JSON metrics

### Visual Comparison Report Format

```json
{
  "originalPath": ".../original.png",
  "rewritePath": ".../rewrite.png",
  "diffPath": ".../diff.png",
  "originalSize": { "width": 1280, "height": 768 },
  "rewriteSize": { "width": 1280, "height": 768 },
  "comparedSize": { "width": 1280, "height": 768 },
  "mismatchPixels": 1234,
  "mismatchRatio": 0.001253
}
```

### DevServer Helper Class

```typescript
class DevServer {
  constructor(
    name: string,
    command: string,
    args: string[],
    readyText: string,
    cwd: string
  )
  
  async start(): Promise<void>  // Waits for readyText in stdout
  async stop(): Promise<void>   // SIGTERM, then SIGKILL after 2s
}
```

### VisualComparisonRunner Class

```typescript
class VisualComparisonRunner {
  constructor()
  
  async run(): Promise<void>           // Main orchestration
  async captureCanvas(browser, url, name): Promise<string>
  async createDiff(original, rewrite): Promise<Report>
  cropPng(image, width, height): PNG   // Normalize image sizes
}
```

## Manual Testing Approach

**Runtime Validation:**
- Game features tested through actual gameplay
- Error logging to `#boot-log` element
- Debug mode via `?debug` URL parameter

**Error Capture:**
```typescript
window.addEventListener('error', (event) => {
  const message = event.error instanceof Error 
    ? `${event.error.name}: ${event.error.message}` 
    : String(event.message);
  log(`[error] ${message}`, true);
});
```

## Testing Gaps

**Missing Test Coverage:**
- No unit tests for domain logic
- No integration tests for mod interactions
- No automated gameplay testing
- No performance benchmarks
- No CI/CD pipeline with automated testing

**Recommended Additions:**
1. Vitest for unit testing domain logic
2. Playwright E2E for critical user flows
3. Performance tests for frame rate stability
4. Mod compatibility tests

## CI/CD Testing

**No CI/CD Configured:**
- No `.github/workflows` directory
- No automated test runs on PR
- Visual comparison requires manual execution

## Testing Best Practices (Observed)

**Visual Testing:**
- Clear localStorage/sessionStorage before capture
- Consistent viewport dimensions
- Network idle wait for asset loading
- Settle time for animations to complete

**Error Handling in Tests:**
```typescript
runner.run().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
```

## Test Artifacts

**Output Location:** `artifacts/visual-comparison/initial/`

**Gitignore Status:**
- Artifacts directory should be gitignored (check `.gitignore`)
- Reports are generated per-run, not committed

## Running Tests

**Visual Comparison:**
```bash
# Full comparison (requires both implementations running)
pnpm compare:visual

# Development server (manual testing)
pnpm dev

# Production preview
pnpm preview
```

---

*Testing analysis: 2026-03-31*
