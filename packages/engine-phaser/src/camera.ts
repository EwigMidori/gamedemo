// Oblique Perspective Camera for Pseudo-3D Rendering
// Provides 45-degree oblique projection with world/screen coordinate transforms

import Phaser from "phaser";
import type { WorldCoord } from "@gamedemo/engine-core";

/** Classic oblique angle for pseudo-3D (45 degrees in degrees) */
export const PERSPECTIVE_ANGLE = 45;

/** Vertical compression factor (0.5 = classic oblique/isometric hybrid) */
export const PERSPECTIVE_SCALE_Y = 0.5;

/**
 * World bounds for camera constraint
 */
export interface CameraBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Configuration options for ObliqueCamera
 */
export interface ObliqueCameraConfig {
  /** Base zoom level (default: 2) */
  zoom?: number;
  /** Perspective angle in degrees (default: 45) */
  angle?: number;
  /** Vertical scale factor (default: 0.5) */
  scaleY?: number;
  /** Camera follow smoothing 0-1 (default: 0.14) */
  followLerp?: number;
  /** Offset from target in pixels (default: {x: 10, y: 0}) */
  followOffset?: { x: number; y: number };
}

/**
 * Oblique perspective camera for pseudo-3D rendering
 * 
 * Provides:
 * - 45-degree oblique projection for depth illusion
 * - World-to-screen and screen-to-world coordinate transforms
 * - Smooth camera following with configurable lerp
 * - World bounds to constrain camera movement
 * 
 * The oblique projection creates a 2.5D effect by rotating the view
 * 45 degrees and compressing the vertical axis. This is the classic
 * presentation used in games like Stardew Valley.
 */
export class ObliqueCamera {
  private readonly scene: Phaser.Scene;
  private readonly config: Required<ObliqueCameraConfig>;

  constructor(
    scene: Phaser.Scene,
    config: ObliqueCameraConfig = {}
  ) {
    this.scene = scene;
    this.config = {
      zoom: 2,
      angle: PERSPECTIVE_ANGLE,
      scaleY: PERSPECTIVE_SCALE_Y,
      followLerp: 0.14,
      followOffset: { x: 10, y: 0 },
      ...config
    };
  }

  /**
   * Apply oblique perspective to the main camera
   * Sets angle, zoom, bounds, and background
   */
  setup(bounds?: CameraBounds): void {
    const camera = this.scene.cameras.main;

    // Note: We don't rotate the camera angle - oblique projection is achieved
    // through art/assets, not camera rotation. This keeps tiles axis-aligned.
    camera.setZoom(this.config.zoom);

    if (bounds) {
      camera.setBounds(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );
    }

    camera.roundPixels = true;
  }

  /**
   * Start following a target game object
   * Uses smooth interpolation with configurable lerp factor
   */
  follow(target: Phaser.GameObjects.GameObject): void {
    this.scene.cameras.main.startFollow(
      target,
      true,  // roundPixels
      this.config.followLerp,
      this.config.followLerp
    );
    this.scene.cameras.main.setFollowOffset(
      this.config.followOffset.x,
      this.config.followOffset.y
    );
  }

  /**
   * Convert world position to screen position
   * Applies oblique perspective transformation
   */
  worldToScreen(world: WorldCoord): { x: number; y: number } {
    const camera = this.scene.cameras.main;
    const radians = (this.config.angle * Math.PI) / 180;

    const rotatedX = world.x * Math.cos(radians) - world.y * Math.sin(radians);
    const rotatedY = world.x * Math.sin(radians) + world.y * Math.cos(radians);

    return {
      x: (rotatedX - camera.scrollX) * camera.zoomX,
      y: (rotatedY * this.config.scaleY - camera.scrollY) * camera.zoomY
    };
  }

  /**
   * Convert screen position to world position
   * Inverse of worldToScreen transformation
   */
  screenToWorld(screenX: number, screenY: number): WorldCoord {
    const camera = this.scene.cameras.main;
    const radians = (this.config.angle * Math.PI) / 180;

    const worldX = screenX / camera.zoomX + camera.scrollX;
    const worldY = screenY / camera.zoomY + camera.scrollY;

    const cos = Math.cos(-radians);
    const sin = Math.sin(-radians);
    const finalX = worldX * cos - worldY * sin;
    const finalY = worldX * sin + worldY * cos;

    return {
      x: finalX as import("@gamedemo/engine-core").WorldX,
      y: finalY as import("@gamedemo/engine-core").WorldY
    };
  }

  /**
   * Get current camera world view rectangle
   */
  getWorldView(): Phaser.Geom.Rectangle {
    return this.scene.cameras.main.worldView;
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: string | number): void {
    this.scene.cameras.main.setBackgroundColor(color);
  }

  /**
   * Get the main Phaser camera for advanced operations
   */
  get phaserCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }
}

/**
 * Create camera bounds from world blueprint dimensions
 * Converts tile coordinates to pixel bounds
 */
export function createCameraBoundsFromWorld(
  originX: number,
  originY: number,
  width: number,
  height: number,
  tileSize: number
): CameraBounds {
  return {
    minX: originX * tileSize,
    minY: originY * tileSize,
    maxX: (originX + width) * tileSize,
    maxY: (originY + height) * tileSize
  };
}
