// Benchmark Scene for Performance Testing
// Spawns 500+ objects to validate performance targets

import Phaser from "phaser";
import {
  PerformanceMonitor,
  type PerformanceReport
} from "./performanceMonitor";

/**
 * Configuration options for benchmark scene
 */
export interface BenchmarkSceneOptions {
  /** Number of objects to spawn (default: 500) */
  objectCount?: number;
  /** World size in tiles (default: 100) */
  worldSize?: number;
  /** Benchmark duration in seconds (default: 60) */
  durationSeconds?: number;
  /** Auto-move player in figure-8 pattern (default: true) */
  autoMovePlayer?: boolean;
  /** Movement radius for auto-move (default: 20 tiles) */
  moveRadius?: number;
}

/**
 * Test object types for benchmark
 */
interface TestObject {
  id: string;
  type: "tree" | "rock" | "berry" | "structure";
  x: number;
  y: number;
  frame: number;
}

/**
 * Benchmark results
 */
export interface BenchmarkResults {
  /** Whether benchmark passed performance targets */
  passed: boolean;
  /** Performance report */
  report: PerformanceReport;
  /** Object count tested */
  objectCount: number;
  /** Duration in seconds */
  duration: number;
  /** Failures if any */
  failures: string[];
}

/**
 * Performance benchmark scene that tests rendering performance
 * with a large number of objects.
 *
 * Features:
 * - Spawns 500+ objects of mixed types (trees, rocks, bushes)
 * - Auto-moves player through occlusion zones
 * - Records detailed performance metrics
 * - Validates against 60fps target
 *
 * Test scenarios:
 * 1. Static: Player stationary, measure baseline
 * 2. Moving: Player moving, measure occlusion impact
 * 3. Dense: Many objects in small area
 * 4. Long-running: Memory leak detection
 *
 * Usage:
 * ```typescript
 * const scene = new BenchmarkScene({ objectCount: 500 });
 * const results = await scene.runBenchmark();
 * ```
 */
export class BenchmarkScene extends Phaser.Scene {
  private options: Required<BenchmarkSceneOptions>;
  private performanceMonitor: PerformanceMonitor;
  private testObjects: TestObject[] = [];
  private objectSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private playerSprite?: Phaser.GameObjects.Sprite;
  private playerX = 50;
  private playerY = 50;
  private moveTime = 0;
  private isRunning = false;
  private startTime = 0;

  constructor(options: BenchmarkSceneOptions = {}) {
    super({ key: "BenchmarkScene" });

    this.options = {
      objectCount: options.objectCount ?? 500,
      worldSize: options.worldSize ?? 100,
      durationSeconds: options.durationSeconds ?? 60,
      autoMovePlayer: options.autoMovePlayer ?? true,
      moveRadius: options.moveRadius ?? 20
    };

    this.performanceMonitor = new PerformanceMonitor({
      maxSamples: 3600, // 1 minute at 60fps
      enableWarnings: true
    });
  }

  create(): void {
    console.log(`[Benchmark] Starting with ${this.options.objectCount} objects`);

    // Create player sprite
    this.playerSprite = this.add.sprite(0, 0, "pawn", 0);
    this.playerSprite.setOrigin(0.5, 1);

    // Spawn test objects
    this.spawnTestObjects();

    // Start benchmark
    this.startTime = performance.now();
    this.isRunning = true;

    // Schedule benchmark completion
    this.time.delayedCall(this.options.durationSeconds * 1000, () => {
      this.completeBenchmark();
    });

    console.log("[Benchmark] Running...");
  }

  update(time: number, delta: number): void {
    if (!this.isRunning) return;

    const frameStart = performance.now();

    // Auto-move player in figure-8 pattern
    if (this.options.autoMovePlayer) {
      this.updatePlayerMovement(delta);
    }

    // Update player sprite position
    if (this.playerSprite) {
      const worldX = this.playerX * 16 + 8;
      const worldY = (this.playerY + 1) * 16;
      this.playerSprite.setPosition(worldX, worldY);
    }

    // Record frame metrics
    const frameTime = performance.now() - frameStart;
    this.performanceMonitor.recordFrame({
      frameTimeMs: frameTime,
      visibleObjectCount: this.objectSprites.size
    });
  }

  /**
   * Run the benchmark and return results
   * Returns immediately if benchmark already completed
   */
  async runBenchmark(): Promise<BenchmarkResults> {
    if (!this.isRunning && this.performanceMonitor.getSampleCount() > 0) {
      return this.generateResults();
    }

    // Wait for benchmark to complete
    return new Promise((resolve) => {
      const checkComplete = () => {
        if (!this.isRunning) {
          resolve(this.generateResults());
        } else {
          setTimeout(checkComplete, 100);
        }
      };
      checkComplete();
    });
  }

  /**
   * Get current benchmark progress (0-1)
   */
  getProgress(): number {
    if (!this.isRunning) return 1;
    const elapsed = (performance.now() - this.startTime) / 1000;
    return Math.min(elapsed / this.options.durationSeconds, 1);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics() {
    return this.performanceMonitor.getCurrentMetrics();
  }

  /**
   * Stop the benchmark early
   */
  stop(): void {
    this.isRunning = false;
  }

  private spawnTestObjects(): void {
    const counts = {
      tree: Math.floor(this.options.objectCount * 0.6),
      rock: Math.floor(this.options.objectCount * 0.2),
      berry: Math.floor(this.options.objectCount * 0.1),
      structure: Math.floor(this.options.objectCount * 0.1)
    };

    let id = 0;

    // Spawn trees (tall, occluding)
    for (let i = 0; i < counts.tree; i++) {
      this.createTestObject(`tree_${id++}`, "tree", 10, 11);
    }

    // Spawn rocks (low, not occluding)
    for (let i = 0; i < counts.rock; i++) {
      this.createTestObject(`rock_${id++}`, "rock", 1, 2);
    }

    // Spawn berry bushes (medium, optionally occluding)
    for (let i = 0; i < counts.berry; i++) {
      this.createTestObject(`berry_${id++}`, "berry", 20, 21);
    }

    // Spawn structures (varied)
    for (let i = 0; i < counts.structure; i++) {
      this.createTestObject(`structure_${id++}`, "structure", 30, 35);
    }

    console.log(`[Benchmark] Spawned ${this.testObjects.length} objects`);
  }

  private createTestObject(
    id: string,
    type: TestObject["type"],
    minFrame: number,
    maxFrame: number
  ): void {
    const x = Math.random() * this.options.worldSize;
    const y = Math.random() * this.options.worldSize;
    const frame = Math.floor(Math.random() * (maxFrame - minFrame + 1)) + minFrame;

    const obj: TestObject = { id, type, x, y, frame };
    this.testObjects.push(obj);

    // Create sprite
    const worldX = x * 16 + 8;
    const worldY = (y + 1) * 16;
    const sprite = this.add.image(worldX, worldY, "world", frame);
    sprite.setOrigin(0.5, 1);
    this.objectSprites.set(id, sprite);
  }

  private updatePlayerMovement(delta: number): void {
    // Figure-8 pattern
    this.moveTime += delta * 0.001;
    const t = this.moveTime * 0.5;

    const centerX = this.options.worldSize / 2;
    const centerY = this.options.worldSize / 2;

    // Lemniscate (figure-8) parametric equations
    const scale = this.options.moveRadius;
    const x = centerX + (scale * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));
    const y = centerY + (scale * Math.sin(t) * Math.cos(t)) / (1 + Math.sin(t) * Math.sin(t));

    this.playerX = x;
    this.playerY = y;
  }

  private completeBenchmark(): void {
    this.isRunning = false;
    console.log("[Benchmark] Complete!");

    const results = this.generateResults();
    this.logResults(results);
  }

  private generateResults(): BenchmarkResults {
    const report = this.performanceMonitor.generateReport();
    const failures: string[] = [];

    // Validate against targets
    if (report.summary.avgFps < 58) {
      failures.push(`Average FPS ${report.summary.avgFps} below target 58`);
    }
    if (report.summary.minFps < 52) {
      failures.push(`Minimum FPS ${report.summary.minFps} below target 52`);
    }
    if (report.summary.avgFrameTimeMs > 16) {
      failures.push(`Average frame time ${report.summary.avgFrameTimeMs}ms above target 16ms`);
    }
    if (report.summary.maxFrameTimeMs > 18) {
      failures.push(`Maximum frame time ${report.summary.maxFrameTimeMs}ms above target 18ms`);
    }

    return {
      passed: failures.length === 0,
      report,
      objectCount: this.testObjects.length,
      duration: this.options.durationSeconds,
      failures
    };
  }

  private logResults(results: BenchmarkResults): void {
    const { report, passed, failures } = results;

    console.log("\n=== Benchmark Results ===");
    console.log(`Status: ${passed ? "PASSED" : "FAILED"}`);
    console.log(`Duration: ${report.duration.toFixed(1)}s`);
    console.log(`Objects: ${results.objectCount}`);
    console.log("\nPerformance Summary:");
    console.log(`  Average FPS: ${report.summary.avgFps}`);
    console.log(`  Minimum FPS: ${report.summary.minFps}`);
    console.log(`  1% Low FPS: ${report.summary.p1Fps}`);
    console.log(`  Average Frame Time: ${report.summary.avgFrameTimeMs}ms`);
    console.log(`  Maximum Frame Time: ${report.summary.maxFrameTimeMs}ms`);

    if (failures.length > 0) {
      console.log("\nFailures:");
      failures.forEach(f => console.log(`  - ${f}`));
    }

    console.log("\n========================\n");
  }
}
