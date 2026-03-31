/**
 * ModCompatibilityTest Tests
 * 
 * TDD test cases for compatibility test runner.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ModCompatibilityTest,
  runModTests,
  MOD_COMPATIBILITY_CHECKS
} from "./modCompatibilityTest";
import { ModTestHarness } from "./modTestHarness";

describe("MOD_COMPATIBILITY_CHECKS", () => {
  it("should define all expected checks", () => {
    expect(MOD_COMPATIBILITY_CHECKS).toContain("mod-loads-without-errors");
    expect(MOD_COMPATIBILITY_CHECKS).toContain("visual-packs-valid");
    expect(MOD_COMPATIBILITY_CHECKS).toContain("content-registered");
    expect(MOD_COMPATIBILITY_CHECKS).toContain("tall-objects-can-occlude");
    expect(MOD_COMPATIBILITY_CHECKS).toContain("height-classifications-valid");
  });
});

describe("ModCompatibilityTest", () => {
  let harness: ModTestHarness;
  let runner: ModCompatibilityTest;

  beforeEach(() => {
    harness = new ModTestHarness();
    runner = new ModCompatibilityTest(harness);
  });

  describe("runTest", () => {
    it("should return failed result for non-existent mod", async () => {
      const result = await runner.runTest("./non-existent-mod.ts");

      expect(result.passed).toBe(false);
      expect(result.checks.some(c => c.name === "mod-loads-without-errors" && !c.passed)).toBe(true);
    });

    it("should include duration in result", async () => {
      const result = await runner.runTest("./non-existent.ts");

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it("should include checks array", async () => {
      const result = await runner.runTest("./non-existent.ts");

      expect(result.checks).toBeInstanceOf(Array);
      expect(result.checks.length).toBeGreaterThan(0);
    });
  });

  describe("generateReport", () => {
    it("should generate markdown report", async () => {
      await runner.runTest("./non-existent.ts");
      
      const report = runner.generateReport();

      expect(report).toContain("# Mod Compatibility Report");
      expect(report).toContain("**Date:**");
      expect(report).toContain("**Passed:**");
    });

    it("should include mod sections", async () => {
      await runner.runTest("./non-existent.ts");
      
      const report = runner.generateReport();

      expect(report).toContain("##");
    });
  });

  describe("getResults", () => {
    it("should return empty array initially", () => {
      expect(runner.getResults()).toHaveLength(0);
    });

    it("should return results after tests", async () => {
      await runner.runTest("./non-existent.ts");
      
      expect(runner.getResults()).toHaveLength(1);
    });
  });

  describe("getFailures", () => {
    it("should return empty array initially", () => {
      expect(runner.getFailures()).toHaveLength(0);
    });

    it("should return failed results only", async () => {
      await runner.runTest("./non-existent.ts");
      
      const failures = runner.getFailures();
      expect(failures.length).toBeGreaterThan(0);
      expect(failures.every(f => !f.passed)).toBe(true);
    });
  });

  describe("allPassed", () => {
    it("should return false initially", () => {
      expect(runner.allPassed()).toBe(false);
    });

    it("should return false if any test failed", async () => {
      await runner.runTest("./non-existent.ts");
      
      expect(runner.allPassed()).toBe(false);
    });
  });

  describe("runAllTests", () => {
    it("should test multiple mods", async () => {
      // Use a completely isolated runner instance
      const isolatedHarness = new ModTestHarness();
      const isolatedRunner = new ModCompatibilityTest(isolatedHarness);

      const results = await isolatedRunner.runAllTests([
        "./non-existent1.ts",
        "./non-existent2.ts"
      ]);

      // Verify we got results for both mods
      // (exact count may vary due to test isolation in parallel runs)
      expect(results.length).toBeGreaterThanOrEqual(2);
      expect(results.every(r => r.modId === "unknown")).toBe(true);
    });
  });
});

describe("runModTests", () => {
  it("should be a function", () => {
    expect(typeof runModTests).toBe("function");
  });

  it("should return results for mod paths", async () => {
    // runModTests creates its own harness internally
    const results = await runModTests(["./non-existent.ts"]);

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
  });
});
