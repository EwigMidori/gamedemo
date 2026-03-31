/**
 * ModCompatibilityTest - Compatibility test runner for mods
 * 
 * Runs automated tests against mods and generates reports.
 * 
 * @module mod-test-utils/modCompatibilityTest
 */

import type { ModTestHarness } from "./modTestHarness";
import type { VisualPackV2 } from "@gamedemo/mod-api";
import { validateVisualPack } from "@gamedemo/mod-api";

// =============================================================================
// Types
// =============================================================================

export interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface ModTestResult {
  modId: string;
  passed: boolean;
  checks: CheckResult[];
  errors: string[];
  duration: number;
}

export const MOD_COMPATIBILITY_CHECKS = [
  "mod-loads-without-errors",
  "visual-packs-valid",
  "content-registered",
  "tall-objects-can-occlude",
  "height-classifications-valid"
] as const;

export type ModCompatibilityCheck = typeof MOD_COMPATIBILITY_CHECKS[number];

// =============================================================================
// Test Runner
// =============================================================================

export class ModCompatibilityTest {
  private harness: ModTestHarness;
  private results: ModTestResult[] = [];

  constructor(harness: ModTestHarness) {
    this.harness = harness;
  }

  /**
   * Run compatibility test on a single mod.
   * 
   * @param modPath - Path to mod module
   * @param clearResults - Whether to clear previous results (default: true)
   * @returns Test result
   */
  async runTest(modPath: string, clearResults = true): Promise<ModTestResult> {
    const startTime = Date.now();
    const checks: CheckResult[] = [];
    const errors: string[] = [];
    let modId = "unknown";

    // Clear previous results for single test (unless running in batch)
    if (clearResults) {
      this.results = [];
    }

    // Check 1: Mod loads without errors
    try {
      await this.harness.loadMod(modPath);
      
      // Get mod ID from loaded mod
      const loadedIds = this.harness.getLoadedModIds();
      if (loadedIds.length > 0) {
        modId = loadedIds[loadedIds.length - 1];
      }

      checks.push({ name: "mod-loads-without-errors", passed: true });
    } catch (e) {
      const errorMsg = (e as Error).message;
      checks.push({
        name: "mod-loads-without-errors",
        passed: false,
        message: errorMsg
      });
      errors.push(`Load failed: ${errorMsg}`);

      const result: ModTestResult = {
        modId,
        passed: false,
        checks,
        errors,
        duration: Date.now() - startTime
      };
      this.results.push(result);
      return result;
    }

    // Check 2: All visual packs valid
    const visualPacks = this.harness.getVisualPacks();
    const invalidPacks = visualPacks.filter(vp => {
      const warnings = validateVisualPack(vp as VisualPackV2);
      return warnings.length > 0;
    });

    if (invalidPacks.length === 0) {
      checks.push({ name: "visual-packs-valid", passed: true });
    } else {
      const message = `${invalidPacks.length} invalid visual packs`;
      checks.push({
        name: "visual-packs-valid",
        passed: false,
        message
      });
      errors.push(message);
    }

    // Check 3: Content registered
    const content = this.harness.getRegisteredContent();
    const hasContent = 
      content.items.length > 0 || 
      content.structures.length > 0 ||
      content.resources.length > 0;
    
    checks.push({
      name: "content-registered",
      passed: hasContent,
      message: hasContent ? undefined : "No items, structures, or resources registered"
    });

    if (!hasContent) {
      errors.push("No content registered");
    }

    // Check 4: Tall objects have canOccludePlayer
    const tallPacks = visualPacks.filter(vp => vp.heightClassification === "tall");
    const nonOccludingTall = tallPacks.filter(vp => !vp.canOccludePlayer);
    
    if (nonOccludingTall.length === 0) {
      checks.push({ name: "tall-objects-can-occlude", passed: true });
    } else {
      const message = `${nonOccludingTall.length} tall objects don't occlude player`;
      checks.push({
        name: "tall-objects-can-occlude",
        passed: false,
        message
      });
      errors.push(message);
    }

    // Check 5: Height classifications are valid
    const validClassifications = ["flat", "low", "medium", "tall"] as const;
    const invalidClassifications = visualPacks.filter(
      vp => !validClassifications.includes(vp.heightClassification as typeof validClassifications[number])
    );

    if (invalidClassifications.length === 0) {
      checks.push({ name: "height-classifications-valid", passed: true });
    } else {
      const message = `${invalidClassifications.length} invalid height classifications`;
      checks.push({
        name: "height-classifications-valid",
        passed: false,
        message
      });
      errors.push(message);
    }

    const result: ModTestResult = {
      modId,
      passed: checks.every(c => c.passed),
      checks,
      errors,
      duration: Date.now() - startTime
    };

    this.results.push(result);
    return result;
  }

  /**
   * Run tests on multiple mods.
   * 
   * @param modPaths - Array of mod paths
   * @returns Array of test results
   */
  async runAllTests(modPaths: string[]): Promise<ModTestResult[]> {
    this.results = [];

    for (const path of modPaths) {
      // Create fresh harness for each mod to avoid interference
      const { ModTestHarness } = await import("./modTestHarness");
      this.harness = new ModTestHarness();

      const result = await this.runTest(path, false);
      this.results.push(result);
    }

    return this.results;
  }

  /**
   * Generate markdown compatibility report.
   * 
   * @returns Markdown report string
   */
  generateReport(): string {
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    let report = `# Mod Compatibility Report\n\n`;
    report += `**Date:** ${new Date().toISOString()}\n`;
    report += `**Passed:** ${passed}/${total}\n\n`;
    
    for (const result of this.results) {
      report += `## ${result.modId}\n`;
      report += `Status: ${result.passed ? "✅ PASS" : "❌ FAIL"}\n`;
      report += `Duration: ${result.duration}ms\n\n`;
      
      report += `### Checks\n`;
      for (const check of result.checks) {
        report += `- ${check.passed ? "✅" : "❌"} ${check.name}`;
        if (check.message) report += `: ${check.message}`;
        report += `\n`;
      }
      
      if (result.errors.length > 0) {
        report += `\n**Errors:**\n`;
        for (const error of result.errors) {
          report += `- ${error}\n`;
        }
      }
      
      report += `\n`;
    }
    
    return report;
  }

  /**
   * Get all results.
   * 
   * @returns Array of test results
   */
  getResults(): ModTestResult[] {
    return [...this.results];
  }

  /**
   * Get failed results only.
   * 
   * @returns Array of failed test results
   */
  getFailures(): ModTestResult[] {
    return this.results.filter(r => !r.passed);
  }

  /**
   * Check if all tests passed.
   * 
   * @returns True if all tests passed
   */
  allPassed(): boolean {
    return this.results.length > 0 && this.results.every(r => r.passed);
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Run mod compatibility tests and return results.
 * 
 * @param modPaths - Array of mod paths
 * @returns Test results
 */
export async function runModTests(modPaths: string[]): Promise<ModTestResult[]> {
  const { ModTestHarness } = await import("./modTestHarness");
  const harness = new ModTestHarness();
  const runner = new ModCompatibilityTest(harness);
  return runner.runAllTests(modPaths);
}
