// Performance Overlay for Debug Display
// Visual debug overlay showing performance metrics in-game

import Phaser from "phaser";
import type { PerformanceMetrics } from "./performanceMonitor";

/**
 * Configuration options for PerformanceOverlay
 */
export interface PerformanceOverlayOptions {
  /** Phaser scene */
  scene: Phaser.Scene;
  /** X position (default: 10) */
  x?: number;
  /** Y position (default: 10) */
  y?: number;
  /** Width of overlay (default: 280) */
  width?: number;
  /** Initial visibility (default: false) */
  visible?: boolean;
}

/**
 * Visual debug overlay for performance metrics.
 *
 * Displays real-time performance data in a semi-transparent panel
 * positioned in the corner of the screen. Color-coded values help
 * quickly identify performance issues.
 *
 * Features:
 * - Semi-transparent background for readability
 * - Monospace font for aligned metrics
 * - Color coding: green (good), yellow (warning), red (critical)
 * - Toggle visibility with keyboard or API
 *
 * Display format:
 * ```
 * FPS: 60 | Frame: 8.2ms | Objects: 523
 * Render: 6.1ms | Occlusion: 0.05ms | Sort: 0.8ms
 * Memory: 45.2MB
 * ```
 */
export class PerformanceOverlay {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly textObjects: Map<string, Phaser.GameObjects.Text> = new Map();

  private readonly x: number;
  private readonly y: number;
  private readonly width: number;

  // Thresholds for color coding
  private readonly fpsGood = 58;
  private readonly fpsWarning = 55;
  private readonly frameTimeGood = 16;
  private readonly frameTimeWarning = 18;

  constructor(options: PerformanceOverlayOptions) {
    this.scene = options.scene;
    this.x = options.x ?? 10;
    this.y = options.y ?? 10;
    this.width = options.width ?? 280;

    // Create container
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setDepth(10000); // Always on top
    this.container.setVisible(options.visible ?? false);

    // Create semi-transparent background
    this.background = this.scene.add.rectangle(
      0,
      0,
      this.width,
      80,
      0x000000,
      0.75
    );
    this.background.setOrigin(0, 0);
    this.container.add(this.background);

    // Create text lines
    this.createTextLine("line1", 10, 8);
    this.createTextLine("line2", 10, 28);
    this.createTextLine("line3", 10, 48);
    this.createTextLine("line4", 10, 68);
  }

  /**
   * Update the overlay with current metrics
   * Call each frame from the scene's update loop
   */
  update(metrics: PerformanceMetrics | null): void {
    if (!metrics) {
      this.setLineText("line1", "No metrics available");
      this.setLineText("line2", "");
      this.setLineText("line3", "");
      this.setLineText("line4", "");
      return;
    }

    // Line 1: FPS, Frame Time, Object Count
    const fpsColor = this.getFpsColor(metrics.fps);
    const frameTimeColor = this.getFrameTimeColor(metrics.frameTimeMs);
    const line1 = `FPS: ${Math.round(metrics.fps)} | Frame: ${metrics.frameTimeMs.toFixed(1)}ms | Objects: ${metrics.visibleObjectCount}`;
    this.setLineText("line1", line1);

    // Line 2: Render breakdown
    const line2 = `Render: ${metrics.renderTimeMs.toFixed(1)}ms | Occlusion: ${metrics.occlusionTimeMs.toFixed(2)}ms | Sort: ${metrics.sortTimeMs.toFixed(1)}ms`;
    this.setLineText("line2", line2);

    // Line 3: Memory
    const memoryText = metrics.memoryMB > 0
      ? `Memory: ${metrics.memoryMB.toFixed(1)}MB`
      : "Memory: N/A";
    this.setLineText("line3", memoryText);

    // Line 4: Status indicator
    const isGood = metrics.fps >= this.fpsWarning && metrics.frameTimeMs <= this.frameTimeWarning;
    const statusColor = isGood ? "#00ff00" : metrics.fps >= this.fpsWarning ? "#ffff00" : "#ff0000";
    const statusText = isGood ? "● Performance Good" : "● Performance Warning";
    this.setLineText("line4", statusText, statusColor);
  }

  /**
   * Show the overlay
   */
  show(): void {
    this.container.setVisible(true);
  }

  /**
   * Hide the overlay
   */
  hide(): void {
    this.container.setVisible(false);
  }

  /**
   * Toggle overlay visibility
   */
  toggle(): void {
    this.container.setVisible(!this.container.visible);
  }

  /**
   * Check if overlay is currently visible
   */
  isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Set overlay position
   */
  setPosition(x: number, y: number): void {
    this.container.setPosition(x, y);
  }

  /**
   * Destroy the overlay and all associated game objects
   */
  destroy(): void {
    this.container.destroy();
    this.textObjects.clear();
  }

  private createTextLine(key: string, x: number, y: number): void {
    const text = this.scene.add.text(x, y, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#ffffff"
    });
    text.setOrigin(0, 0);
    this.container.add(text);
    this.textObjects.set(key, text);
  }

  private setLineText(key: string, content: string, color?: string): void {
    const text = this.textObjects.get(key);
    if (text) {
      text.setText(content);
      if (color) {
        text.setColor(color);
      }
    }
  }

  private getFpsColor(fps: number): string {
    if (fps >= this.fpsGood) return "#00ff00";
    if (fps >= this.fpsWarning) return "#ffff00";
    return "#ff0000";
  }

  private getFrameTimeColor(frameTimeMs: number): string {
    if (frameTimeMs <= this.frameTimeGood) return "#00ff00";
    if (frameTimeMs <= this.frameTimeWarning) return "#ffff00";
    return "#ff0000";
  }
}
