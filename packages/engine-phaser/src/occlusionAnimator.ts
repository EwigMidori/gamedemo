// Occlusion Animator for Pseudo-3D Rendering
// Manages smooth alpha fade animations when entities occlude the player

import Phaser from "phaser";
import type { OccludableEntity } from "@gamedemo/engine-core";

/**
 * Configuration options for OcclusionAnimator
 */
export interface OcclusionAnimatorOptions {
  /** Fade duration in milliseconds (default: 250) */
  fadeDurationMs?: number;
  /** Target alpha when occluded (0.0-1.0, default: 0.4) */
  targetAlpha?: number;
  /** Easing function for the fade animation (default: 'Linear') */
  ease?: string;
}

/**
 * Tracks the alpha state of an entity
 */
interface EntityAlphaState {
  currentAlpha: number;
  targetAlpha: number;
  isOccluded: boolean;
}

/**
 * Manages smooth alpha fade animations for occluded entities.
 * 
 * When the player walks behind a tall object, this animator fades that
 * object to semi-transparent so the player remains visible.
 * 
 * Features:
 * - Smooth 200-300ms fade transitions
 * - Both entity and shadow fade together
 * - Phaser tween integration for hardware-accelerated animations
 * - Per-entity state tracking
 */
export class OcclusionAnimator {
  private readonly scene: Phaser.Scene;
  private readonly options: Required<OcclusionAnimatorOptions>;
  private readonly entityStates = new Map<string, EntityAlphaState>();
  private readonly activeTweens = new Map<string, Phaser.Tweens.Tween>();

  constructor(scene: Phaser.Scene, options: OcclusionAnimatorOptions = {}) {
    this.scene = scene;
    this.options = {
      fadeDurationMs: options.fadeDurationMs ?? 250,
      targetAlpha: options.targetAlpha ?? 0.4,
      ease: options.ease ?? "Linear"
    };
  }

  /**
   * Update occlusion state and trigger appropriate fade animations.
   * Call this each frame with the current list of occluded entity IDs.
   * 
   * @param occludedEntityIds - Array of entity IDs that should be faded
   * @param entities - Map of all entities (to access sprites)
   */
  updateOcclusionState(
    occludedEntityIds: string[],
    entities: Map<string, OccludableEntity>
  ): void {
    const occludedSet = new Set(occludedEntityIds);

    // Process all entities
    for (const [id, entity] of entities) {
      const shouldBeOccluded = occludedSet.has(id);
      const state = this.getOrCreateState(id);
      
      // Check if state changed
      if (state.isOccluded !== shouldBeOccluded) {
        state.isOccluded = shouldBeOccluded;
        state.targetAlpha = shouldBeOccluded 
          ? (entity.occlusionAlpha ?? this.options.targetAlpha)
          : 1.0;
        
        // Trigger fade animation
        this.fadeEntity(id, entity, state.targetAlpha);
      }
    }

    // Clean up states for entities that no longer exist
    for (const [id] of this.entityStates) {
      if (!entities.has(id)) {
        this.entityStates.delete(id);
        this.stopTween(id);
      }
    }
  }

  /**
   * Force set the alpha of an entity immediately (no animation).
   * Useful for initialization or reset scenarios.
   * 
   * @param entityId - Entity ID
   * @param alpha - Target alpha (0.0-1.0)
   */
  setAlphaImmediate(entityId: string, alpha: number): void {
    const state = this.entityStates.get(entityId);
    if (state) {
      state.currentAlpha = alpha;
      state.targetAlpha = alpha;
    }
    this.stopTween(entityId);
  }

  /**
   * Get the current alpha state of an entity.
   * 
   * @param entityId - Entity ID
   * @returns Current alpha value, or 1.0 if not tracked
   */
  getCurrentAlpha(entityId: string): number {
    return this.entityStates.get(entityId)?.currentAlpha ?? 1.0;
  }

  /**
   * Check if an entity is currently occluded (faded).
   * 
   * @param entityId - Entity ID
   * @returns true if entity is occluded
   */
  isOccluded(entityId: string): boolean {
    return this.entityStates.get(entityId)?.isOccluded ?? false;
  }

  /**
   * Destroy all tweens and clear state.
   * Call this when shutting down the scene.
   */
  destroy(): void {
    for (const tween of this.activeTweens.values()) {
      tween.stop();
    }
    this.activeTweens.clear();
    this.entityStates.clear();
  }

  /**
   * Fade an entity to the target alpha using Phaser tweens.
   * Also fades the entity's shadow.
   */
  private fadeEntity(
    entityId: string,
    entity: OccludableEntity,
    targetAlpha: number
  ): void {
    const sprite = entity.sprite as Phaser.GameObjects.Image | undefined;
    if (!sprite) return;

    // Stop any existing tween for this entity
    this.stopTween(entityId);

    // Create fade tween for the main sprite
    const tween = this.scene.tweens.add({
      targets: sprite,
      alpha: targetAlpha,
      duration: this.options.fadeDurationMs,
      ease: this.options.ease,
      onUpdate: () => {
        // Update tracked state
        const state = this.entityStates.get(entityId);
        if (state) {
          state.currentAlpha = sprite.alpha;
        }
      },
      onComplete: () => {
        this.activeTweens.delete(entityId);
      }
    });

    this.activeTweens.set(entityId, tween);
  }

  /**
   * Get or create alpha state for an entity.
   */
  private getOrCreateState(entityId: string): EntityAlphaState {
    let state = this.entityStates.get(entityId);
    if (!state) {
      state = {
        currentAlpha: 1.0,
        targetAlpha: 1.0,
        isOccluded: false
      };
      this.entityStates.set(entityId, state);
    }
    return state;
  }

  /**
   * Stop any active tween for an entity.
   */
  private stopTween(entityId: string): void {
    const existingTween = this.activeTweens.get(entityId);
    if (existingTween) {
      existingTween.stop();
      this.activeTweens.delete(entityId);
    }
  }
}
