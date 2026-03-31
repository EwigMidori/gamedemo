import Phaser from "phaser";
import type {
  RuntimeCommandInput,
  RuntimePointerTile,
  RuntimeSessionState,
  StructureDef,
  OccludableEntity,
  FrustumBounds
} from "@gamedemo/engine-core";
import {
  ANCHOR_BOTTOM_CENTER,
  Pseudo3DDepthSorter,
  calculateDepth,
  calculateDepthBaseOffset,
  DEFAULT_DEPTH_BASE_OFFSET,
  worldX,
  worldY,
  classifyHeight,
  shouldOccludePlayer,
  OcclusionManager,
  FrustumCuller,
  LayeredRenderPipeline,
  LODManager,
  ObjectPool,
  ChunkManager,
  type LODLevel
} from "@gamedemo/engine-core";
import type { EntityType } from "@gamedemo/engine-core";
import { OcclusionAnimator } from "./occlusionAnimator";
import type { RuntimeSession } from "@gamedemo/engine-runtime";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { RuntimeContentIndex } from "./runtimeContentIndex";
import { StructureAutotileResolver } from "./structureAutotileResolver";
import { RuntimeTheme } from "./runtimeTheme";
import { ObliqueCamera, createCameraBoundsFromWorld } from "./camera";
import {
  createEntityShadow,
  updateShadowPosition,
  updateShadowDepth,
  destroyEntityShadow
} from "./entityShadow";
import type { EntityShadow } from "./entityShadow";
import type { VisualPackMetadata } from "@gamedemo/mod-api";
import { PerformanceMonitor } from "./performanceMonitor";

interface GameViewportOptions {
  contentIndex: RuntimeContentIndex;
  getSelectedTile?(): RuntimePointerTile | null;
  getSelectedTileMarker?(): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null;
  getCommandInput?(): Partial<RuntimeCommandInput>;
}

export class GameViewport {
  // Legacy Maps - maintained for backward compatibility during transition
  // Will be deprecated once pseudo-3D rendering is fully validated
  private readonly terrainSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly resourceSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly structureSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly dropSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly plantedSprites = new Map<string, Phaser.GameObjects.Image>();
  
  // Unified entity management for pseudo-3D rendering
  private readonly depthSorter = new Pseudo3DDepthSorter();
  private readonly entitySprites = new Map<string, OccludableEntity>();
  private readonly entityShadows = new Map<string, EntityShadow>();
  
  // Occlusion system
  private readonly occlusionManager: OcclusionManager;
  private readonly occlusionAnimator: OcclusionAnimator;
  private occlusionCheckInterval = 2; // Check every 2 frames
  private frameCount = 0;
  
  // Frustum culling for performance
  private readonly frustumCuller = new FrustumCuller(0.1); // 10% margin

  // Render pipeline and LOD management
  private readonly renderPipeline: LayeredRenderPipeline;
  private readonly lodManager: LODManager;

  // Object pools for efficient memory management
  private readonly spritePool: ObjectPool<Phaser.GameObjects.Image>;
  private readonly shadowPool: ObjectPool<Phaser.GameObjects.Ellipse>;

  // Chunk manager for large world streaming
  private readonly chunkManager: ChunkManager;

  // Entity visibility tracking for cleanup
  private entityOutOfViewFrames = new Map<string, number>();
  private readonly OUT_OF_VIEW_THRESHOLD = 120; // ~2 seconds at 60fps

  private readonly pathMarkers: Phaser.GameObjects.Rectangle[] = [];
  private readonly playerShadow: Phaser.GameObjects.Ellipse;
  private readonly playerSprite: Phaser.GameObjects.Sprite;
  private readonly cursorHighlight: Phaser.GameObjects.Rectangle;
  private readonly moveTargetMarker: Phaser.GameObjects.Container;
  private readonly structureAutotile = new StructureAutotileResolver();
  private readonly camera: ObliqueCamera;
  private lastFacingFrame = 0;
  private previousLogicalPosition: { x: number; y: number } | null = null;
  private depthBaseOffset = DEFAULT_DEPTH_BASE_OFFSET;

  // Performance monitoring
  private performanceMonitor?: PerformanceMonitor;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: RuntimeSession,
    private readonly options: GameViewportOptions,
    performanceMonitor?: PerformanceMonitor
  ) {
    this.camera = new ObliqueCamera(scene);
    this.performanceMonitor = performanceMonitor;

    // Initialize occlusion system
    this.occlusionManager = new OcclusionManager({
      checkInterval: this.occlusionCheckInterval,
      targetAlpha: 0.4,
      fadeDurationMs: 250,
      debug: false
    });
    this.occlusionAnimator = new OcclusionAnimator(scene, {
      fadeDurationMs: 250,
      targetAlpha: 0.4
    });

    // Initialize render pipeline with frustum culling enabled
    this.renderPipeline = new LayeredRenderPipeline({
      enableFrustumCull: true,
      enableDepthSort: true,
      enableOcclusion: true,
      frustumMargin: 0.1,
      occlusionCheckInterval: 2
    });

    // Initialize LOD manager
    this.lodManager = new LODManager({
      nearThreshold: 200,
      mediumThreshold: 500,
      transitionHysteresis: 20
    });

    // Initialize object pools for maximum view (zoom 0.5x)
    // Max ~2500 objects (50x50) at max zoom, + buffer for smooth performance
    this.spritePool = new ObjectPool<Phaser.GameObjects.Image>({
      initialSize: 400,
      minSize: 200,
      maxSize: 3000,
      factory: () => this.scene.add.image(0, 0, RuntimeAssetLibrary.worldKey, 0).setVisible(false),
      reset: (sprite) => {
        sprite.setVisible(false);
        sprite.setPosition(0, 0);
        sprite.clearTint();
        sprite.setAlpha(1);
        sprite.setScale(1);
      },
      onExpand: (newSize) => {
        console.log(`[ObjectPool] Sprite pool expanded to ${newSize}`);
      }
    });

    this.shadowPool = new ObjectPool<Phaser.GameObjects.Ellipse>({
      initialSize: 200,
      minSize: 100,
      maxSize: 2500,
      factory: () => this.scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.4).setVisible(false),
      reset: (shadow) => {
        shadow.setVisible(false);
        shadow.setPosition(0, 0);
        shadow.setAlpha(0.4);
      }
    });

    // Initialize chunk manager
    this.chunkManager = new ChunkManager({
      chunkSize: 64,
      loadRadius: 2,
      unloadDistance: 8
    });

    // Initial depth values will be overridden in renderPlayer based on world bounds
    // Start invisible until first renderPlayer call to avoid showing at (0,0)
    this.playerShadow = this.scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.4).setVisible(false);
    this.playerSprite = this.scene.add
      .sprite(0, 0, RuntimeAssetLibrary.pawnKey, 0)
      .setOrigin(ANCHOR_BOTTOM_CENTER.x, ANCHOR_BOTTOM_CENTER.y)
      .setScale(1.15)
      .setTint(0xf6e7c8)
      .setVisible(false);
    this.cursorHighlight = this.scene.add.rectangle(0, 0, 16, 16)
      .setStrokeStyle(1, 0xf6f2d7)
      .setVisible(false);
    const ring = this.scene.add.circle(0, 0, 4).setStrokeStyle(2, 0xf3c96b, 1);
    const dot = this.scene.add.circle(0, 0, 1.5, 0xf3c96b, 1);
    this.moveTargetMarker = this.scene.add.container(0, 0, [ring, dot]).setDepth(9).setVisible(false);
  }

  /**
   * Get visual pack metadata for a content ID.
   * Uses pattern-based fallback for now until VisualPackRegistry is available.
   */
  private getVisualPack(contentId: string): VisualPackMetadata {
    // Pattern-based fallback defaults
    if (contentId.includes("tree")) {
      return {
        contentId,
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        canOccludePlayer: true,
        occlusionAlpha: 0.4
      };
    }
    
    if (contentId.includes("rock")) {
      return {
        contentId,
        renderHeight: 12,
        heightClassification: "low",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };
    }
    
    // Default fallback
    return {
      contentId,
      renderHeight: 0,
      heightClassification: "flat",
      footprint: { widthTiles: 1, depthTiles: 1 }
    };
  }

  /**
   * Get a sprite from the pool or create new.
   */
  private acquireSprite(): Phaser.GameObjects.Image {
    return this.spritePool.acquire();
  }

  /**
   * Return sprite to pool for reuse.
   */
  private releaseSprite(sprite: Phaser.GameObjects.Image): void {
    this.spritePool.release(sprite);
  }

  /**
   * Acquire a shadow from the pool.
   */
  private acquireShadow(): Phaser.GameObjects.Ellipse {
    return this.shadowPool.acquire();
  }

  /**
   * Release a shadow back to the pool.
   */
  private releaseShadow(shadow: Phaser.GameObjects.Ellipse): void {
    this.shadowPool.release(shadow);
  }

  /**
   * Register a world entity for pseudo-3D rendering.
   */
  private registerEntity(
    id: string,
    type: EntityType,
    x: number,
    y: number,
    contentId: string,
    frame: number,
    tint?: number
  ): OccludableEntity {
    const visualPack = this.getVisualPack(contentId);
    const entityX = x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5;
    // Position object bottom at tile bottom, renderHeight extends upward only
    const entityY = (y + 1) * RuntimeAssetLibrary.tileSize;

    // Acquire or create sprite
    const sprite = this.acquireSprite()
      .setOrigin(ANCHOR_BOTTOM_CENTER.x, ANCHOR_BOTTOM_CENTER.y)
      .setPosition(entityX, entityY)
      .setFrame(frame)
      .setTint(tint ?? RuntimeTheme.objectTint)
      .setVisible(true); // Ensure sprite is visible when registered

    // Calculate initial depth with dynamic base offset
    const depth = calculateDepth(entityY, visualPack.renderHeight, type, {
      baseOffset: this.depthBaseOffset
    });
    sprite.setDepth(depth);

    // Determine height classification and occlusion
    const heightClassification = visualPack.heightClassification ?? classifyHeight(visualPack.renderHeight);
    const canOccludePlayer = shouldOccludePlayer(heightClassification, visualPack.canOccludePlayer);

    // Create occludable entity record
    const entity: OccludableEntity = {
      id,
      type,
      x: worldX(entityX),
      y: worldY(entityY),
      sprite,
      lastCalculatedDepth: depth,
      needsDepthUpdate: false,
      contentId,
      renderHeight: visualPack.renderHeight,
      canOccludePlayer,
      heightClassification,
      footprint: visualPack.footprint ?? { widthTiles: 1, depthTiles: 1 },
      occlusionAlpha: visualPack.occlusionAlpha
    };

    // Register with depth sorter
    this.depthSorter.register(entity);
    this.entitySprites.set(id, entity);

    // Create shadow for non-flat objects
    if (heightClassification !== "flat") {
      const shadow = createEntityShadow(
        this.scene,
        heightClassification,
        depth
      );
      if (shadow) {
        updateShadowPosition(shadow, entityX, entityY);
        shadow.sprite.setVisible(true); // Ensure shadow is visible when created
        this.entityShadows.set(id, shadow);
      }
    }

    return entity;
  }

  /**
   * Unregister and clean up an entity.
   */
  private unregisterEntity(id: string): void {
    const entity = this.entitySprites.get(id);
    if (!entity) {
      return;
    }

    // Release sprite to pool
    const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
    if (sprite) {
      this.releaseSprite(sprite);
    }

    // Release shadow to pool instead of destroying
    const shadow = this.entityShadows.get(id);
    if (shadow) {
      this.releaseShadow(shadow.sprite);
      this.entityShadows.delete(id);
    }

    // Unregister from depth sorter
    this.depthSorter.unregister(id);
    this.entitySprites.delete(id);
  }

  /**
   * Update entity position and depth.
   */
  private updateEntity(
    id: string,
    x: number,
    y: number,
    frame?: number,
    tint?: number
  ): void {
    const entity = this.entitySprites.get(id);
    if (!entity) {
      return;
    }

    const entityX = x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5;
    const entityY = (y + 1) * RuntimeAssetLibrary.tileSize;

    // Update position and ensure visibility
    entity.x = worldX(entityX);
    entity.y = worldY(entityY);
    const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
    sprite?.setPosition(entityX, entityY);
    // Ensure sprite is visible when entity comes back into view
    if (sprite && !sprite.visible) {
      sprite.setVisible(true);
    }

    // Update frame/tint if provided
    if (frame !== undefined) {
      sprite?.setFrame(frame);
    }
    if (tint !== undefined) {
      sprite?.setTint(tint);
    }

    // Mark for depth recalculation
    entity.needsDepthUpdate = true;
    this.depthSorter.markDirty(id);

    // Update shadow position and ensure visibility
    const shadow = this.entityShadows.get(id);
    if (shadow) {
      updateShadowPosition(shadow, entityX, entityY);
      // Ensure shadow is visible when entity comes back into view
      if (!shadow.sprite.visible) {
        shadow.sprite.setVisible(true);
      }
    }
  }

  /**
   * Apply LOD settings to an entity based on distance to camera.
   * Updates shadow visibility, animation state, and scale.
   */
  private applyLODToEntity(id: string, lod: LODLevel): void {
    const entity = this.entitySprites.get(id);
    if (!entity) return;

    const settings = this.lodManager.getSettingsForLOD(lod);
    const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
    const shadow = this.entityShadows.get(id);

    // Apply shadow visibility based on LOD
    if (shadow) {
      shadow.sprite.setVisible(settings.shadowEnabled && sprite?.visible === true);
    }

    // Apply scale based on LOD
    if (sprite) {
      const baseScale = 1.0;
      sprite.setScale(baseScale * settings.scale);

      // Apply alpha based on LOD
      if (!settings.alphaEnabled) {
        sprite.setAlpha(1.0); // Full opacity when alpha disabled
      }
    }
  }

  /**
   * Get LOD for entity at given world position.
   * Calculates distance from camera center.
   */
  private getLODForEntityAt(entityX: number, entityY: number, entityId: string): LODLevel {
    const camera = this.scene.cameras.main;
    const cameraCenterX = camera.worldView.x + camera.worldView.width / 2;
    const cameraCenterY = camera.worldView.y + camera.worldView.height / 2;

    return this.lodManager.getLODForEntity(
      entityX,
      entityY,
      cameraCenterX,
      cameraCenterY,
      entityId
    );
  }

  create(): void {
    const world = this.session.snapshot().world;
    this.createAnimations();

    // Calculate depth base offset based on world bounds to ensure all depths are positive
    const minWorldYPixels = world.originY * RuntimeAssetLibrary.tileSize;
    this.depthBaseOffset = calculateDepthBaseOffset(minWorldYPixels);
    this.depthSorter.setBaseOffset(this.depthBaseOffset);

    // Remove camera bounds to allow free movement
    // Camera will always follow player without world boundary constraints
    this.camera.setup();
    this.camera.follow(this.playerSprite);
    this.camera.setBackgroundColor(RuntimeTheme.background);

    this.renderTerrain();
    this.render();
  }

  render(): void {
    const snapshot = this.session.snapshot();

    // Update chunk loading based on player position
    const playerTileX = snapshot.player.x;
    const playerTileY = snapshot.player.y;
    const chunkResult = this.chunkManager.update(playerTileX, playerTileY);

    // Log chunk activity periodically (every 60 frames)
    if (this.frameCount % 60 === 0 && (chunkResult.loaded.length > 0 || chunkResult.unloaded.length > 0)) {
      console.log('[ChunkManager]', {
        loaded: chunkResult.loaded.length,
        unloaded: chunkResult.unloaded.length,
        loadedChunks: this.chunkManager.getStats().loadedCount
      });
    }

    // Legacy terrain rendering (terrain is static, doesn't need depth sorting)
    this.renderTerrain();

    // Calculate frustum bounds once for all renderers
    const frustumBounds = this.calculateFrustumBounds();

    // Unified pseudo-3D rendering for dynamic entities
    this.renderEntitiesUnified(snapshot, frustumBounds);

    // Legacy rendering (still active during transition)
    // TODO: Remove once pseudo-3D rendering is validated
    this.renderResources(snapshot, frustumBounds);
    this.renderPlantedResources(snapshot, frustumBounds);
    this.renderStructures(snapshot, frustumBounds);
    this.renderDrops(snapshot, frustumBounds);

    // UI overlays
    this.renderMovePath(snapshot);
    this.renderMoveTarget(snapshot);
    this.renderCursor();
    this.renderPlayer(snapshot);
  }

  /**
   * Unified pseudo-3D entity rendering.
   * Uses depth sorter for correct occlusion.
   * Integrates frustum culling for performance.
   */
  private renderEntitiesUnified(snapshot: RuntimeSessionState, frustumBounds: FrustumBounds): void {
    const renderStart = performance.now();
    const visibleIds = new Set<string>();
    const tileSize = RuntimeAssetLibrary.tileSize;

    // Process resources with frustum culling
    for (const resource of snapshot.resources) {
      if (resource.depleted) {
        // Hide depleted resources
        const entity = this.entitySprites.get(resource.id);
        if (entity) {
          const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
          sprite?.setVisible(false);
          const shadow = this.entityShadows.get(resource.id);
          shadow?.sprite.setVisible(false);
        }
        continue;
      }

      // Frustum culling: check if resource is visible
      const entityX = resource.x * tileSize + tileSize * 0.5;
      const entityY = (resource.y + 1) * tileSize;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const entity = this.entitySprites.get(resource.id);
        if (entity) {
          const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
          sprite?.setVisible(false);
          const shadow = this.entityShadows.get(resource.id);
          shadow?.sprite.setVisible(false);
        }
        continue;
      }

      visibleIds.add(resource.id);

      const resourceDef = this.options.contentIndex.resource(resource.resourceId);
      const frame = resourceDef?.frame ?? RuntimeTheme.resourceFrame(resource.resourceId);

      if (this.entitySprites.has(resource.id)) {
        // Update existing entity
        this.updateEntity(resource.id, resource.x, resource.y, frame);
      } else {
        // Register new entity
        this.registerEntity(
          resource.id,
          "resource",
          resource.x,
          resource.y,
          resource.resourceId,
          frame
        );
      }

      // Apply LOD settings based on distance to camera
      const lod = this.getLODForEntityAt(entityX, entityY, resource.id);
      this.applyLODToEntity(resource.id, lod);
    }

    // Process planted resources with frustum culling
    for (const planted of snapshot.plantedResources ?? []) {
      const entityX = planted.x * tileSize + tileSize * 0.5;
      const entityY = (planted.y + 1) * tileSize;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const entity = this.entitySprites.get(planted.id);
        if (entity) {
          const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
          sprite?.setVisible(false);
          const shadow = this.entityShadows.get(planted.id);
          shadow?.sprite.setVisible(false);
        }
        continue;
      }

      visibleIds.add(planted.id);
      const frame = this.resolveSaplingFrame(planted.growAt - snapshot.timeSeconds);

      if (this.entitySprites.has(planted.id)) {
        this.updateEntity(planted.id, planted.x, planted.y, frame, 0xbfa57f);
      } else {
        this.registerEntity(
          planted.id,
          "planted",
          planted.x,
          planted.y,
          "resource:sapling",
          frame,
          0xbfa57f
        );
      }

      // Apply LOD settings
      const lod = this.getLODForEntityAt(entityX, entityY, planted.id);
      this.applyLODToEntity(planted.id, lod);
    }

    // Process structures with frustum culling
    for (const structure of snapshot.placedStructures) {
      const entityX = structure.x * tileSize + tileSize * 0.5;
      const entityY = (structure.y + 1) * tileSize;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const entity = this.entitySprites.get(structure.id);
        if (entity) {
          const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
          sprite?.setVisible(false);
          const shadow = this.entityShadows.get(structure.id);
          shadow?.sprite.setVisible(false);
        }
        continue;
      }

      visibleIds.add(structure.id);

      const definition = this.options.contentIndex.structure(structure.structureId);
      const frame = this.structureAutotile.resolveFrame(
        structure,
        definition,
        snapshot.placedStructures
      )
        ?? (structure.isOpen ? definition?.openFrame : null)
        ?? definition?.frame
        ?? RuntimeTheme.structureFrameFor(structure.structureId);

      if (this.entitySprites.has(structure.id)) {
        this.updateEntity(structure.id, structure.x, structure.y, frame);
      } else {
        this.registerEntity(
          structure.id,
          "structure",
          structure.x,
          structure.y,
          structure.structureId,
          frame
        );
      }

      // Apply LOD settings
      const lod = this.getLODForEntityAt(entityX, entityY, structure.id);
      this.applyLODToEntity(structure.id, lod);
    }

    // Process drops with frustum culling
    for (const drop of snapshot.droppedItems ?? []) {
      const entityX = drop.x * tileSize + tileSize * 0.5;
      const entityY = (drop.y + 1) * tileSize;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const entity = this.entitySprites.get(drop.id);
        if (entity) {
          const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
          sprite?.setVisible(false);
          const shadow = this.entityShadows.get(drop.id);
          shadow?.sprite.setVisible(false);
        }
        continue;
      }

      visibleIds.add(drop.id);
      const bob = Math.sin((snapshot.timeSeconds - drop.spawnedAt) * 4.2) * 2;
      const frame = RuntimeTheme.itemFrameFor(drop.itemId);

      if (this.entitySprites.has(drop.id)) {
        this.updateEntity(drop.id, drop.x, drop.y, frame);
        // Add bob offset to Y position
        const entity = this.entitySprites.get(drop.id)!;
        const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
        sprite?.setY(entity.y + bob - 4);
      } else {
        this.registerEntity(
          drop.id,
          "drop",
          drop.x,
          drop.y,
          drop.itemId,
          frame
        );
      }

      // Apply LOD settings
      const lod = this.getLODForEntityAt(entityX, entityY, drop.id);
      this.applyLODToEntity(drop.id, lod);
    }

    // Update depths for all dirty entities
    const sortStart = performance.now();
    this.depthSorter.update();
    this.performanceMonitor?.recordSortTime(performance.now() - sortStart);

    // Apply calculated depths to sprites and shadows
    for (const entity of this.depthSorter.getAll()) {
      const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
      if (sprite) {
        sprite.setDepth(entity.lastCalculatedDepth ?? 0);
      }

      const shadow = this.entityShadows.get(entity.id);
      if (shadow && entity.lastCalculatedDepth !== undefined) {
        updateShadowDepth(shadow, entity.lastCalculatedDepth);
      }
    }

    // Perform occlusion check every N frames
    this.frameCount++;
    if (this.frameCount % this.occlusionCheckInterval === 0) {
      const occlusionStart = performance.now();
      const playerX = snapshot.player.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5;
      const playerY = (snapshot.player.y + 1) * RuntimeAssetLibrary.tileSize;

      const occlusionResult = this.occlusionManager.checkOcclusion(
        worldX(playerX),
        worldY(playerY),
        this.entitySprites
      );
      this.performanceMonitor?.recordOcclusionTime(performance.now() - occlusionStart);

      // Apply alpha animations based on occlusion state
      this.occlusionAnimator.updateOcclusionState(occlusionResult.occludedEntities, this.entitySprites);
    }

    // Hide entities that are no longer visible and cleanup after threshold
    for (const [id, entity] of this.entitySprites) {
      if (!visibleIds.has(id)) {
        const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
        sprite?.setVisible(false);
        const shadow = this.entityShadows.get(id);
        shadow?.sprite.setVisible(false);
        
        // Track how long entity has been out of view
        const frames = (this.entityOutOfViewFrames.get(id) ?? 0) + 1;
        this.entityOutOfViewFrames.set(id, frames);
        
        // Unregister entity after threshold to return sprites to pool
        if (frames > this.OUT_OF_VIEW_THRESHOLD) {
          this.unregisterEntity(id);
          this.entityOutOfViewFrames.delete(id);
        }
      } else {
        // Entity is visible, reset counter
        this.entityOutOfViewFrames.delete(id);
      }
    }

    // Record render timing
    const renderTime = performance.now() - renderStart;
    this.performanceMonitor?.recordRenderTime(renderTime);
  }

  getObjects(): Phaser.GameObjects.GameObject[] {
    return [
      ...this.terrainSprites.values(),
      ...this.resourceSprites.values(),
      ...this.structureSprites.values(),
      ...this.dropSprites.values(),
      ...this.plantedSprites.values(),
      ...this.pathMarkers,
      this.playerShadow,
      this.playerSprite,
      this.cursorHighlight,
      this.moveTargetMarker
    ];
  }

  /**
   * Get performance metrics from the viewport
   */
  getPerformanceMetrics() {
    const base = this.performanceMonitor?.getCurrentMetrics() ?? null;
    const pipelineResult = this.renderPipeline.getLastResult();
    const spriteStats = this.spritePool.getStats();
    const shadowStats = this.shadowPool.getStats();
    const chunkStats = this.chunkManager.getStats();

    return {
      ...base,
      pipeline: pipelineResult ? {
        totalTimeMs: pipelineResult.totalTimeMs,
        stageTimings: Object.fromEntries(pipelineResult.stageTimings),
        entitiesAtEachStage: Object.fromEntries(pipelineResult.entitiesAtEachStage)
      } : null,
      lod: this.lodManager.getStats(),
      pools: {
        sprites: {
          hitRate: Math.round(spriteStats.hitRate * 100) / 100,
          inUse: spriteStats.inUse,
          available: spriteStats.available,
          total: spriteStats.totalAllocated,
          expansions: spriteStats.expansionCount
        },
        shadows: {
          hitRate: Math.round(shadowStats.hitRate * 100) / 100,
          inUse: shadowStats.inUse,
          available: shadowStats.available,
          total: shadowStats.totalAllocated,
          expansions: shadowStats.expansionCount
        }
      },
      chunks: {
        loaded: chunkStats.loadedCount,
        loading: chunkStats.loadingCount,
        queue: chunkStats.queueLength,
        memoryMB: Math.round(chunkStats.totalMemoryEstimate / 1024 / 1024 * 100) / 100
      }
    };
  }

  /**
   * Set the performance monitor for timing instrumentation
   */
  setPerformanceMonitor(monitor: PerformanceMonitor): void {
    this.performanceMonitor = monitor;
  }

  private renderTerrain(): void {
    const snapshot = this.session.snapshot();
    const world = snapshot.world;
    const playerX = snapshot.player.x;
    const playerY = snapshot.player.y;

    // Camera bounds removed to allow free movement
    // this.scene.cameras.main.setBounds(...)

    // PERF-12: Cleanup distant terrain sprites every 60 frames (~1 second)
    if (this.frameCount % 60 === 0) {
      this.cleanupDistantTerrainSprites(playerX, playerY);
    }

    // Calculate view bounds for terrain rendering (must cover entire screen)
    const viewRadius = 40; // tiles - must be large enough to cover screen at all zoom levels
    const minX = Math.floor(playerX - viewRadius);
    const maxX = Math.ceil(playerX + viewRadius);
    const minY = Math.floor(playerY - viewRadius);
    const maxY = Math.ceil(playerY + viewRadius);

    // Track how many sprites we created this frame
    let createdCount = 0;

    // Iterate through world tiles and render those within view that don't have sprites
    for (const tile of world.tiles) {
      // Skip tiles outside view bounds
      if (tile.x < minX || tile.x > maxX || tile.y < minY || tile.y > maxY) {
        continue;
      }

      const key = `${tile.x},${tile.y}`;

      // Skip if sprite already exists
      if (this.terrainSprites.has(key)) {
        continue;
      }

      // Create sprite for this tile
      const terrain = this.options.contentIndex.terrain(tile.terrainId);
      const terrainDepth = this.depthBaseOffset - 1000000 + tile.y;
      const sprite = this.scene.add.image(
        tile.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        tile.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        RuntimeAssetLibrary.worldKey,
        terrain?.frame ?? RuntimeTheme.terrainFrame(tile.terrainId)
      )
        .setDepth(terrainDepth)
        .setTint(terrain?.tint ?? RuntimeTheme.terrainTint(tile.terrainId));
      this.terrainSprites.set(key, sprite);
      createdCount++;
    }

    // Log if we created many sprites (indicates player returned to previously cleaned area)
    if (createdCount > 100 && this.frameCount % 60 === 0) {
      console.log(`[GameViewport] Created ${createdCount} terrain sprites (returned to cleaned area)`);
    }
  }

  /**
   * Cleanup terrain sprites that are far from the player.
   * PERF-12: World tiles optimization - prevent unbounded memory growth.
   * Note: 50 tiles is ~2.5x the view frustum radius (20 tiles), enough buffer
   * to avoid flickering while keeping memory usage bounded.
   */
  private cleanupDistantTerrainSprites(playerX: number, playerY: number): void {
    const cleanupDistance = 50; // tiles - 2.5x view frustum radius
    const cleanupDistanceSq = cleanupDistance * cleanupDistance;
    const tileSize = RuntimeAssetLibrary.tileSize;

    for (const [key, sprite] of this.terrainSprites.entries()) {
      // Parse tile coordinates from key "x,y"
      const [tileXStr, tileYStr] = key.split(',');
      const tileX = parseInt(tileXStr ?? '0', 10);
      const tileY = parseInt(tileYStr ?? '0', 10);

      // Calculate squared distance to player
      const dx = tileX - playerX;
      const dy = tileY - playerY;
      const distanceSq = dx * dx + dy * dy;

      // Remove sprite if beyond cleanup distance
      if (distanceSq > cleanupDistanceSq) {
        sprite.destroy();
        this.terrainSprites.delete(key);
      }
    }
  }

  private renderResources(snapshot: RuntimeSessionState, frustumBounds: FrustumBounds): void {
    const visibleIds = new Set<string>();
    const tileSize = RuntimeAssetLibrary.tileSize;

    for (const resource of snapshot.resources) {
      // Early frustum culling check - skip if not visible
      const entityX = resource.x * tileSize + tileSize * 0.5;
      const entityY = (resource.y + 1) * tileSize;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const sprite = this.resourceSprites.get(resource.id);
        if (sprite) sprite.setVisible(false);
        continue;
      }

      const isRespawningTree = resource.depleted &&
        resource.resourceId === "resource:tree" &&
        resource.respawnAt !== null &&
        resource.respawnAt !== undefined &&
        resource.respawnAt > snapshot.timeSeconds;
      if (resource.depleted && !isRespawningTree) {
        continue;
      }

      visibleIds.add(resource.id);
      const worldY = (resource.y + 1) * tileSize;
      const resourceDepth = calculateDepth(worldY, 0, "resource", {
        baseOffset: this.depthBaseOffset
      });
      let sprite = this.resourceSprites.get(resource.id);
      if (!sprite) {
        sprite = this.scene.add.image(
          resource.x * tileSize + tileSize * 0.5,
          (resource.y + 1) * tileSize,
          RuntimeAssetLibrary.worldKey,
          0
        )
          .setDepth(resourceDepth)
          .setOrigin(ANCHOR_BOTTOM_CENTER.x, ANCHOR_BOTTOM_CENTER.y)
          .setVisible(false);
      }
      const resourceDef = this.options.contentIndex.resource(resource.resourceId);
      const frame = isRespawningTree
        ? this.resolveRespawningTreeFrame(resource.respawnAt ?? snapshot.timeSeconds, snapshot.timeSeconds)
        : resourceDef?.frame ?? RuntimeTheme.resourceFrame(resource.resourceId);
      sprite
        .setVisible(true)
        .setPosition(
          resource.x * tileSize + tileSize * 0.5,
          (resource.y + 1) * tileSize
        )
        .setFrame(frame)
        .setTint(isRespawningTree ? 0xbfa57f : RuntimeTheme.objectTint);
      this.resourceSprites.set(resource.id, sprite);
    }
    for (const [id, sprite] of this.resourceSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderPlantedResources(snapshot: RuntimeSessionState, frustumBounds: FrustumBounds): void {
    const visibleIds = new Set<string>();
    const tileSize = RuntimeAssetLibrary.tileSize;

    for (const planted of snapshot.plantedResources ?? []) {
      // Early frustum culling check - skip if not visible
      const entityX = planted.x * tileSize + tileSize * 0.5;
      const entityY = (planted.y + 1) * tileSize;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const sprite = this.plantedSprites.get(planted.id);
        if (sprite) sprite.setVisible(false);
        continue;
      }

      visibleIds.add(planted.id);
      const worldY = (planted.y + 1) * tileSize;
      const plantedDepth = calculateDepth(worldY, 0, "planted", {
        baseOffset: this.depthBaseOffset
      });
      let sprite = this.plantedSprites.get(planted.id);
      if (!sprite) {
        // Create at correct position immediately to avoid showing at (0,0)
        sprite = this.scene.add.image(
          planted.x * tileSize + tileSize * 0.5,
          (planted.y + 1) * tileSize,
          RuntimeAssetLibrary.worldKey,
          32
        )
          .setDepth(plantedDepth)
          .setOrigin(ANCHOR_BOTTOM_CENTER.x, ANCHOR_BOTTOM_CENTER.y)
          .setVisible(false); // Start invisible
      }
      sprite
        .setVisible(true)
        .setPosition(
          planted.x * tileSize + tileSize * 0.5,
          (planted.y + 1) * tileSize
        )
        .setFrame(this.resolveSaplingFrame(planted.growAt - snapshot.timeSeconds))
        .setTint(0xbfa57f);
      this.plantedSprites.set(planted.id, sprite);
    }
    for (const [id, sprite] of this.plantedSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderStructures(snapshot: RuntimeSessionState, frustumBounds: FrustumBounds): void {
    const idCounts = new Map<string, number>();
    for (const structure of snapshot.placedStructures) {
      const count = idCounts.get(structure.id) || 0;
      idCounts.set(structure.id, count + 1);

      if (count > 0) {
        console.warn(`[GameViewport] Duplicate structure ID detected: ${structure.id} at (${structure.x}, ${structure.y})`);
      }
    }

    const visibleIds = new Set<string>();
    const tileSize = RuntimeAssetLibrary.tileSize;

    for (const structure of snapshot.placedStructures) {
      // Early frustum culling check - skip if not visible
      const entityX = structure.x * tileSize + tileSize * 0.5;
      const entityY = (structure.y + 1) * tileSize;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const sprite = this.structureSprites.get(structure.id);
        if (sprite) sprite.setVisible(false);
        continue;
      }

      visibleIds.add(structure.id);
      const worldY = (structure.y + 1) * tileSize;
      const structureDepth = calculateDepth(worldY, 0, "structure", {
        baseOffset: this.depthBaseOffset
      });
      let sprite = this.structureSprites.get(structure.id);
      if (!sprite) {
        sprite = this.scene.add.image(
          structure.x * tileSize + tileSize * 0.5,
          (structure.y + 1) * tileSize,
          RuntimeAssetLibrary.worldKey,
          0
        )
          .setDepth(structureDepth)
          .setOrigin(ANCHOR_BOTTOM_CENTER.x, ANCHOR_BOTTOM_CENTER.y)
          .setVisible(false);
      }
      const definition = this.options.contentIndex.structure(structure.structureId);
      const stage = definition?.growableStages?.length && structure.growth !== null && structure.growth !== undefined
        ? this.resolveGrowthStage(definition, structure.growth)
        : null;
      const autotileFrame = this.structureAutotile.resolveFrame(
        structure,
        definition,
        snapshot.placedStructures
      );
      const frame = autotileFrame
        ?? (structure.isOpen ? definition?.openFrame : null)
        ?? stage?.frame
        ?? definition?.frame
        ?? RuntimeTheme.structureFrameFor(structure.structureId);
      const tint = stage?.tint ?? RuntimeTheme.structureTintFor(structure.structureId);
      sprite
        .setVisible(true)
        .setPosition(
          structure.x * tileSize + tileSize * 0.5,
          (structure.y + 1) * tileSize
        )
        .setFrame(frame)
        .setTint(tint);
      this.structureSprites.set(structure.id, sprite);
    }
    for (const [id, sprite] of this.structureSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderDrops(snapshot: RuntimeSessionState, frustumBounds: FrustumBounds): void {
    const visibleIds = new Set<string>();
    const tileSize = RuntimeAssetLibrary.tileSize;

    for (const drop of snapshot.droppedItems ?? []) {
      // Early frustum culling check - skip if not visible
      const entityX = drop.x * tileSize + tileSize * 0.5;
      const entityY = (drop.y + 1) * tileSize - 4;
      if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
        // Hide if was previously visible
        const sprite = this.dropSprites.get(drop.id);
        if (sprite) sprite.setVisible(false);
        continue;
      }

      visibleIds.add(drop.id);
      const worldY = (drop.y + 1) * tileSize;
      const dropDepth = calculateDepth(worldY, 0, "drop", {
        baseOffset: this.depthBaseOffset
      });
      let sprite = this.dropSprites.get(drop.id);
      if (!sprite) {
        const bob = Math.sin((snapshot.timeSeconds - drop.spawnedAt) * 4.2) * 2;
        sprite = this.scene.add.image(
          drop.x * tileSize + tileSize * 0.5,
          (drop.y + 1) * tileSize - 4 + bob,
          RuntimeAssetLibrary.uiKey,
          0
        )
          .setDepth(dropDepth)
          .setOrigin(ANCHOR_BOTTOM_CENTER.x, ANCHOR_BOTTOM_CENTER.y)
          .setVisible(false);
      }
      const bob = Math.sin((snapshot.timeSeconds - drop.spawnedAt) * 4.2) * 2;
      sprite
        .setVisible(true)
        .setPosition(
          drop.x * tileSize + tileSize * 0.5,
          (drop.y + 1) * tileSize - 4 + bob
        )
        .setFrame(RuntimeTheme.itemFrameFor(drop.itemId));
      this.dropSprites.set(drop.id, sprite);
    }
    for (const [id, sprite] of this.dropSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderPlayer(snapshot: RuntimeSessionState): void {
    const position = this.resolveRenderedPlayerPosition(snapshot);
    const worldX = position.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5;
    const worldY = (position.y + 1) * RuntimeAssetLibrary.tileSize;
    const frame = this.resolveFacingFrame(snapshot);
    
    // Calculate dynamic depth for player using Y+height algorithm
    // Player has renderHeight of 16 (low classification)
    const playerDepth = calculateDepth(worldY, 16, "player", {
      baseOffset: this.depthBaseOffset
    });
    this.playerSprite.setDepth(playerDepth);
    
    // Position shadow at player base (ellipse origin is center, so worldY puts center at base)
    this.playerShadow.setPosition(worldX, worldY);
    this.playerShadow.setDepth(playerDepth - 1); // Shadow below player
    this.playerShadow.setVisible(true); // Ensure visible after first position update
    
    this.playerSprite.setPosition(worldX, worldY);
    this.playerSprite.setVisible(true); // Ensure visible after first position update
    if (snapshot.player.motion) {
      this.playerSprite.anims.play(this.animationKeyForFrame(frame), true);
    } else {
      this.playerSprite.anims.stop();
      this.playerSprite.setFrame(frame);
    }
    this.previousLogicalPosition = { x: snapshot.player.x, y: snapshot.player.y };
  }

  private resolveRenderedPlayerPosition(snapshot: RuntimeSessionState): { x: number; y: number } {
    return { x: snapshot.player.x, y: snapshot.player.y };
  }

  private resolveFacingFrame(snapshot: RuntimeSessionState): number {
    const motion = snapshot.player.motion;
    if (motion) {
      const deltaX = motion.toX - motion.fromX;
      const deltaY = motion.toY - motion.fromY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.lastFacingFrame = deltaX < 0 ? 2 : 4;
      } else if (deltaY !== 0) {
        this.lastFacingFrame = deltaY < 0 ? 6 : 0;
      }
      return this.lastFacingFrame;
    }
    if (!this.previousLogicalPosition) {
      this.lastFacingFrame = 0;
      return this.lastFacingFrame;
    }
    const deltaX = snapshot.player.x - this.previousLogicalPosition.x;
    const deltaY = snapshot.player.y - this.previousLogicalPosition.y;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.lastFacingFrame = deltaX < 0 ? 2 : 4;
    } else if (deltaY !== 0) {
      this.lastFacingFrame = deltaY < 0 ? 6 : 0;
    }
    return this.lastFacingFrame;
  }

  private renderCursor(): void {
    const selectedTile = this.options.getSelectedTile?.() ?? null;
    if (!selectedTile) {
      this.cursorHighlight.setVisible(false);
      return;
    }
    const style = this.options.getSelectedTileMarker?.() ?? {
      strokeColor: 0xf3ead8,
      fillColor: 0xffffff,
      fillAlpha: 0.08
    };
    this.cursorHighlight
      .setVisible(true)
      .setPosition(
        selectedTile.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        selectedTile.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
      )
      .setStrokeStyle(1, style.strokeColor, 1)
      .setFillStyle(style.fillColor, style.fillAlpha);
  }

  private renderMoveTarget(snapshot: RuntimeSessionState): void {
    const moveTarget = snapshot.player.moveTarget;
    if (!moveTarget) {
      this.moveTargetMarker.setVisible(false);
      return;
    }
    this.moveTargetMarker
      .setVisible(true)
      .setPosition(
        moveTarget.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        moveTarget.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
      );
  }

  private renderMovePath(snapshot: RuntimeSessionState): void {
    const path = snapshot.player.movePath ?? [];
    while (this.pathMarkers.length < path.length) {
      this.pathMarkers.push(
        this.scene.add.rectangle(0, 0, 4, 4, 0xf3c96b, 0.68).setDepth(8)
      );
    }
    for (let index = 0; index < this.pathMarkers.length; index += 1) {
      const marker = this.pathMarkers[index];
      const step = path[index];
      if (!step) {
        marker.setVisible(false);
        continue;
      }
      marker
        .setVisible(true)
        .setPosition(
          step.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          step.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
        );
    }
  }

  private resolveGrowthStage(definition: StructureDef, growth: number) {
    const stages = [...(definition.growableStages ?? [])].sort((left, right) => left.minProgress - right.minProgress);
    let selected = stages[0];
    for (const stage of stages) {
      if (growth >= stage.minProgress) {
        selected = stage;
      }
    }
    return selected;
  }

  private resolveRespawningTreeFrame(respawnAt: number, now: number): number {
    const remaining = Math.max(0, respawnAt - now);
    return this.resolveSaplingFrame(remaining);
  }

  private resolveSaplingFrame(remainingSeconds: number): number {
    if (remainingSeconds > 80) {
      return 27;
    }
    if (remainingSeconds > 35) {
      return 28;
    }
    return 29;
  }

  private isTileVisible(tileX: number, tileY: number, marginTiles: number): boolean {
    const bounds = this.scene.cameras.main.worldView;
    const tileSize = RuntimeAssetLibrary.tileSize;
    const worldX = tileX * tileSize + tileSize * 0.5;
    const worldY = tileY * tileSize + tileSize * 0.5;
    const margin = marginTiles * tileSize;
    return worldX >= bounds.left - margin &&
      worldX <= bounds.right + margin &&
      worldY >= bounds.top - margin &&
      worldY <= bounds.bottom + margin;
  }

  /**
   * Calculate frustum bounds for culling.
   * Used by both unified and legacy renderers.
   */
  private calculateFrustumBounds(): FrustumBounds {
    const camera = this.scene.cameras.main;
    const centerX = camera.worldView.x + camera.worldView.width / 2;
    const centerY = camera.worldView.y + camera.worldView.height / 2;
    const viewRadius = 20 * RuntimeAssetLibrary.tileSize; // 20 tiles radius

    return {
      left: centerX - viewRadius,
      right: centerX + viewRadius,
      top: centerY - viewRadius,
      bottom: centerY + viewRadius
    };
  }

  private createAnimations(): void {
    const animations = [
      { key: "runtime-walk-down", start: 0, end: 1 },
      { key: "runtime-walk-left", start: 2, end: 3 },
      { key: "runtime-walk-right", start: 4, end: 5 },
      { key: "runtime-walk-up", start: 6, end: 7 }
    ];
    for (const animation of animations) {
      if (this.scene.anims.exists(animation.key)) {
        continue;
      }
      this.scene.anims.create({
        key: animation.key,
        frames: this.scene.anims.generateFrameNumbers(RuntimeAssetLibrary.pawnKey, {
          start: animation.start,
          end: animation.end
        }),
        frameRate: 6,
        repeat: -1
      });
    }
  }

  private animationKeyForFrame(frame: number): string {
    if (frame === 2) {
      return "runtime-walk-left";
    }
    if (frame === 4) {
      return "runtime-walk-right";
    }
    if (frame === 6) {
      return "runtime-walk-up";
    }
    return "runtime-walk-down";
  }
}
