// Performance Monitor for Pseudo-3D Rendering
// Collects and reports performance metrics for the rendering system

/**
 * Performance metrics for a single frame
 */
export interface PerformanceMetrics {
  /** Frames per second */
  fps: number;
  /** Total frame time in milliseconds */
  frameTimeMs: number;
  /** Render pass time in milliseconds */
  renderTimeMs: number;
  /** Occlusion check time in milliseconds */
  occlusionTimeMs: number;
  /** Depth sort time in milliseconds */
  sortTimeMs: number;
  /** Number of visible objects */
  visibleObjectCount: number;
  /** Memory usage in MB (Chrome only) */
  memoryMB: number;
}

/**
 * Performance report with statistics over a time period
 */
export interface PerformanceReport {
  /** ISO timestamp when report was generated */
  timestamp: string;
  /** Duration of sampling in seconds */
  duration: number;
  /** Summary statistics */
  summary: {
    avgFps: number;
    minFps: number;
    p1Fps: number; // 1% low
    avgFrameTimeMs: number;
    maxFrameTimeMs: number;
  };
  /** Individual frame samples */
  samples: PerformanceMetrics[];
}

/**
 * Configuration options for PerformanceMonitor
 */
export interface PerformanceMonitorOptions {
  /** Maximum number of samples to keep (default: 1000) */
  maxSamples?: number;
  /** FPS warning threshold (default: 55) */
  fpsWarningThreshold?: number;
  /** Frame time warning threshold in ms (default: 18) */
  frameTimeWarningThreshold?: number;
  /** Enable warning logging (default: true) */
  enableWarnings?: boolean;
}

/**
 * Circular buffer for efficient sample storage
 */
class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private writeIndex = 0;
  private count = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.writeIndex] = item;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.writeIndex - this.count + i + this.capacity) % this.capacity;
      const item = this.buffer[index];
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.writeIndex = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }
}

/**
 * Monitors and reports performance metrics for the rendering system.
 *
 * Tracks FPS, frame times, render operation timing, and memory usage.
 * Provides warning logs when performance degrades and can generate
 * detailed performance reports for analysis.
 *
 * Features:
 * - Circular buffer for O(1) sample storage
 * - Automatic FPS calculation from frame times
 * - Memory tracking (Chrome only)
 * - Configurable warning thresholds
 * - Statistical analysis (avg, min, percentiles)
 */
export class PerformanceMonitor {
  private readonly options: Required<PerformanceMonitorOptions>;
  private readonly samples: CircularBuffer<PerformanceMetrics>;
  private lastFrameTime = 0;
  private lastWarningTime = 0;
  private readonly warningThrottleMs = 5000; // 5 seconds between warnings

  // Timing accumulators for operations within a frame
  private currentRenderTime = 0;
  private currentOcclusionTime = 0;
  private currentSortTime = 0;

  constructor(options: PerformanceMonitorOptions = {}) {
    this.options = {
      maxSamples: options.maxSamples ?? 1000,
      fpsWarningThreshold: options.fpsWarningThreshold ?? 55,
      frameTimeWarningThreshold: options.frameTimeWarningThreshold ?? 18,
      enableWarnings: options.enableWarnings ?? true
    };

    this.samples = new CircularBuffer<PerformanceMetrics>(this.options.maxSamples);
  }

  /**
   * Record metrics for a completed frame
   * Call at the end of each frame with total frame time
   */
  recordFrame(metrics: Partial<PerformanceMetrics>): void {
    const frameTimeMs = metrics.frameTimeMs ?? 0;
    const fps = frameTimeMs > 0 ? 1000 / frameTimeMs : 60;

    const sample: PerformanceMetrics = {
      fps,
      frameTimeMs,
      renderTimeMs: metrics.renderTimeMs ?? this.currentRenderTime,
      occlusionTimeMs: metrics.occlusionTimeMs ?? this.currentOcclusionTime,
      sortTimeMs: metrics.sortTimeMs ?? this.currentSortTime,
      visibleObjectCount: metrics.visibleObjectCount ?? 0,
      memoryMB: this.getCurrentMemoryMB()
    };

    this.samples.push(sample);

    // Reset accumulators
    this.currentRenderTime = 0;
    this.currentOcclusionTime = 0;
    this.currentSortTime = 0;

    // Check warning thresholds
    this.checkWarningThresholds(sample);
  }

  /**
   * Record render pass timing
   * Call after the main render pass completes
   */
  recordRenderTime(durationMs: number): void {
    this.currentRenderTime = durationMs;
  }

  /**
   * Record occlusion check timing
   * Call after occlusion detection completes
   */
  recordOcclusionTime(durationMs: number): void {
    this.currentOcclusionTime = durationMs;
  }

  /**
   * Record depth sort timing
   * Call after depth sorting completes
   */
  recordSortTime(durationMs: number): void {
    this.currentSortTime = durationMs;
  }

  /**
   * Get the most recent metrics sample
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    const all = this.samples.toArray();
    return all.length > 0 ? all[all.length - 1] : null;
  }

  /**
   * Generate a performance report from collected samples
   */
  generateReport(): PerformanceReport {
    const samples = this.samples.toArray();

    if (samples.length === 0) {
      return {
        timestamp: new Date().toISOString(),
        duration: 0,
        summary: {
          avgFps: 0,
          minFps: 0,
          p1Fps: 0,
          avgFrameTimeMs: 0,
          maxFrameTimeMs: 0
        },
        samples: []
      };
    }

    // Calculate statistics
    const fpsValues = samples.map(s => s.fps);
    const frameTimeValues = samples.map(s => s.frameTimeMs);

    const avgFps = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    const minFps = Math.min(...fpsValues);
    const avgFrameTimeMs = frameTimeValues.reduce((a, b) => a + b, 0) / frameTimeValues.length;
    const maxFrameTimeMs = Math.max(...frameTimeValues);

    // Calculate 1% low (1st percentile)
    const sortedFps = [...fpsValues].sort((a, b) => a - b);
    const p1Index = Math.floor(sortedFps.length * 0.01);
    const p1Fps = sortedFps[p1Index] ?? sortedFps[0] ?? 0;

    // Calculate duration from first to last sample
    const duration = samples.length > 1
      ? (samples[samples.length - 1]!.frameTimeMs * samples.length) / 1000
      : 0;

    return {
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        avgFps: Math.round(avgFps * 10) / 10,
        minFps: Math.round(minFps * 10) / 10,
        p1Fps: Math.round(p1Fps * 10) / 10,
        avgFrameTimeMs: Math.round(avgFrameTimeMs * 100) / 100,
        maxFrameTimeMs: Math.round(maxFrameTimeMs * 100) / 100
      },
      samples
    };
  }

  /**
   * Export report as JSON string
   */
  exportToJSON(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Clear all collected samples
   */
  clear(): void {
    this.samples.clear();
    this.lastFrameTime = 0;
  }

  /**
   * Get the number of collected samples
   */
  getSampleCount(): number {
    return this.samples.size;
  }

  /**
   * Check if performance is within targets
   */
  isPerformanceGood(): boolean {
    const metrics = this.getCurrentMetrics();
    if (!metrics) return true;
    return metrics.fps >= this.options.fpsWarningThreshold &&
           metrics.frameTimeMs <= this.options.frameTimeWarningThreshold;
  }

  private checkWarningThresholds(metrics: PerformanceMetrics): void {
    if (!this.options.enableWarnings) return;

    const now = performance.now();
    if (now - this.lastWarningTime < this.warningThrottleMs) return;

    if (metrics.fps < this.options.fpsWarningThreshold) {
      console.warn(
        `[Performance] Low FPS: ${metrics.fps.toFixed(1)} (threshold: ${this.options.fpsWarningThreshold})`
      );
      this.lastWarningTime = now;
    } else if (metrics.frameTimeMs > this.options.frameTimeWarningThreshold) {
      console.warn(
        `[Performance] High frame time: ${metrics.frameTimeMs.toFixed(2)}ms (threshold: ${this.options.frameTimeWarningThreshold}ms)`
      );
      this.lastWarningTime = now;
    }
  }

  private getCurrentMemoryMB(): number {
    // Chrome only - performance.memory is non-standard
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    if (memory?.usedJSHeapSize) {
      return Math.round(memory.usedJSHeapSize / (1024 * 1024) * 10) / 10;
    }
    return 0;
  }
}
