import type { FrustumBounds } from "./frustumCuller";
import type { SpatialObject } from "./spatialIndex";

/**
 * Configuration for the layered render pipeline
 */
export interface PipelineConfig {
  enableFrustumCull: boolean;
  enableDepthSort: boolean;
  enableOcclusion: boolean;
  frustumMargin: number;
  occlusionCheckInterval: number;
}

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  enableFrustumCull: true,
  enableDepthSort: true,
  enableOcclusion: true,
  frustumMargin: 0.1,
  occlusionCheckInterval: 2
};

/**
 * Entity for render pipeline processing
 */
export interface PipelineEntity extends SpatialObject {
  type: string;
  depth?: number;
  visible?: boolean;
  data?: unknown;
}

/**
 * Render context passed to each pipeline stage
 */
export interface RenderContext {
  camera: {
    x: number;
    y: number;
    width: number;
    height: number;
    zoom: number;
  };
  playerPosition: {
    x: number;
    y: number;
  };
  frameCount: number;
}

/**
 * Individual render stage interface
 */
export interface RenderStage {
  name: string;
  enabled: boolean;
  process(entities: PipelineEntity[], context: RenderContext): PipelineEntity[];
  getLastTimingMs(): number;
  setEnabled(enabled: boolean): void;
}

/**
 * Result of pipeline processing
 */
export interface PipelineResult {
  finalEntities: PipelineEntity[];
  stageTimings: Map<string, number>;
  totalTimeMs: number;
  entitiesAtEachStage: Map<string, number>;
}

/**
 * Frustum culling stage
 */
export class FrustumCullStage implements RenderStage {
  name = "frustumCull";
  enabled = true;
  private lastTimingMs = 0;
  private margin: number;

  constructor(margin: number = 0.1) {
    this.margin = margin;
  }

  process(entities: PipelineEntity[], context: RenderContext): PipelineEntity[] {
    const startTime = performance.now();
    
    const frustumBounds = this.expandBounds({
      left: context.camera.x,
      right: context.camera.x + context.camera.width,
      top: context.camera.y,
      bottom: context.camera.y + context.camera.height
    });

    const visible = entities.filter(entity =>
      this.intersectsFrustum(entity, frustumBounds)
    );

    this.lastTimingMs = performance.now() - startTime;
    return visible;
  }

  getLastTimingMs(): number {
    return this.lastTimingMs;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private expandBounds(bounds: FrustumBounds): FrustumBounds {
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const marginX = width * this.margin;
    const marginY = height * this.margin;

    return {
      left: bounds.left - marginX,
      right: bounds.right + marginX,
      top: bounds.top - marginY,
      bottom: bounds.bottom + marginY
    };
  }

  private intersectsFrustum(entity: SpatialObject, bounds: FrustumBounds): boolean {
    return !(
      entity.x + entity.width < bounds.left ||
      entity.x > bounds.right ||
      entity.y + entity.height < bounds.top ||
      entity.y > bounds.bottom
    );
  }
}

/**
 * Depth sort stage
 */
export class DepthSortStage implements RenderStage {
  name = "depthSort";
  enabled = true;
  private lastTimingMs = 0;

  process(entities: PipelineEntity[], context: RenderContext): PipelineEntity[] {
    const startTime = performance.now();
    
    // Sort by Y position (higher Y = lower on screen = render on top)
    const sorted = [...entities].sort((a, b) => {
      const depthA = (a.y + (a.height ?? 0)) * 1000 + this.getTypePriority(a.type);
      const depthB = (b.y + (b.height ?? 0)) * 1000 + this.getTypePriority(b.type);
      return depthA - depthB;
    });

    this.lastTimingMs = performance.now() - startTime;
    return sorted;
  }

  getLastTimingMs(): number {
    return this.lastTimingMs;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private getTypePriority(type: string): number {
    const priorities: Record<string, number> = {
      terrain: 0,
      resource: 1,
      planted: 1,
      structure: 2,
      drop: 3,
      player: 4
    };
    return priorities[type] ?? 1;
  }
}

/**
 * Occlusion detection stage
 */
export class OcclusionStage implements RenderStage {
  name = "occlusion";
  enabled = true;
  private lastTimingMs = 0;
  private checkInterval: number;

  constructor(checkInterval: number = 2) {
    this.checkInterval = checkInterval;
  }

  process(entities: PipelineEntity[], context: RenderContext): PipelineEntity[] {
    const startTime = performance.now();
    
    // Only run occlusion check every N frames
    if (context.frameCount % this.checkInterval !== 0) {
      this.lastTimingMs = 0;
      return entities;
    }

    // Mark entities that occlude the player
    const playerX = context.playerPosition.x;
    const playerY = context.playerPosition.y;

    for (const entity of entities) {
      // Simple occlusion check: entity is in front of player
      entity.visible = !this.occludesPlayer(entity, playerX, playerY);
    }

    this.lastTimingMs = performance.now() - startTime;
    return entities;
  }

  getLastTimingMs(): number {
    return this.lastTimingMs;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private occludesPlayer(entity: PipelineEntity, playerX: number, playerY: number): boolean {
    // Entity occludes player if it's in front (higher Y) and overlapping X
    const entityBottom = entity.y;
    const entityTop = entity.y - (entity.height ?? 0);
    const playerBottom = playerY;
    
    // Check if entity is in front of player
    const inFront = entityBottom > playerBottom - 16 && entityBottom < playerBottom + 16;
    const overlappingX = entity.x < playerX + 8 && entity.x + entity.width > playerX - 8;
    
    return inFront && overlappingX;
  }
}

/**
 * Layered render pipeline for efficient entity processing
 * 
 * Stages:
 * 1. Frustum Culling - Filter to visible objects only
 * 2. Depth Sort - Sort by Y for correct occlusion
 * 3. Occlusion - Mark objects occluding player
 * 4. Render - Final output (implicit, handled by caller)
 * 
 * Each stage filters/reduces the entity set for the next stage,
 * minimizing work in downstream processing.
 */
export class LayeredRenderPipeline {
  private stages: RenderStage[] = [];
  private config: PipelineConfig;
  private lastResult: PipelineResult | null = null;
  private timingHistory: number[] = [];
  private readonly maxTimingHistory = 60; // 1 second at 60fps

  constructor(config?: Partial<PipelineConfig>) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.initializeStages();
  }

  /**
   * Process entities through all enabled pipeline stages
   */
  process(entities: PipelineEntity[], context: RenderContext): PipelineResult {
    const totalStartTime = performance.now();
    const stageTimings = new Map<string, number>();
    const entitiesAtEachStage = new Map<string, number>();

    let currentEntities = entities;
    entitiesAtEachStage.set("input", currentEntities.length);

    // Run each enabled stage
    for (const stage of this.stages) {
      if (stage.enabled && this.isStageEnabled(stage.name)) {
        currentEntities = stage.process(currentEntities, context);
        stageTimings.set(stage.name, stage.getLastTimingMs());
        entitiesAtEachStage.set(stage.name, currentEntities.length);
      }
    }

    const totalTimeMs = performance.now() - totalStartTime;
    
    // Track timing history for averaging
    this.timingHistory.push(totalTimeMs);
    if (this.timingHistory.length > this.maxTimingHistory) {
      this.timingHistory.shift();
    }

    this.lastResult = {
      finalEntities: currentEntities,
      stageTimings,
      totalTimeMs,
      entitiesAtEachStage
    };

    return this.lastResult;
  }

  /**
   * Add a custom stage to the pipeline
   */
  addStage(stage: RenderStage): void {
    this.stages.push(stage);
  }

  /**
   * Remove a stage by name
   */
  removeStage(name: string): void {
    this.stages = this.stages.filter(s => s.name !== name);
  }

  /**
   * Get a stage by name
   */
  getStage(name: string): RenderStage | undefined {
    return this.stages.find(s => s.name === name);
  }

  /**
   * Update pipeline configuration
   */
  setConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
    this.updateStagesFromConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Get the last processing result
   */
  getLastResult(): PipelineResult | null {
    return this.lastResult;
  }

  /**
   * Get average processing time over recent frames
   */
  getAverageTimeMs(samples: number = 60): number {
    if (this.timingHistory.length === 0) return 0;
    const recent = this.timingHistory.slice(-samples);
    return recent.reduce((a, b) => a + b, 0) / recent.length;
  }

  /**
   * Get all stage names
   */
  getStageNames(): string[] {
    return this.stages.map(s => s.name);
  }

  /**
   * Reset timing history
   */
  resetTimingHistory(): void {
    this.timingHistory = [];
  }

  private initializeStages(): void {
    // Stage 1: Frustum Culling
    this.stages.push(new FrustumCullStage(this.config.frustumMargin));

    // Stage 2: Depth Sort
    this.stages.push(new DepthSortStage());

    // Stage 3: Occlusion
    this.stages.push(new OcclusionStage(this.config.occlusionCheckInterval));
  }

  private updateStagesFromConfig(): void {
    for (const stage of this.stages) {
      stage.setEnabled(this.isStageEnabled(stage.name));
    }
  }

  private isStageEnabled(name: string): boolean {
    switch (name) {
      case "frustumCull": return this.config.enableFrustumCull;
      case "depthSort": return this.config.enableDepthSort;
      case "occlusion": return this.config.enableOcclusion;
      default: return true;
    }
  }
}
