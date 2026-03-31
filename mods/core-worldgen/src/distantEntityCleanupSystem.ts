import type { RuntimeSystem, RuntimeSessionState } from "@gamedemo/engine-core";

/**
 * System that periodically cleans up distant resources to prevent
 * unbounded growth of the resources array as the world expands.
 *
 * PERF-11: Distant entity cleanup (>100 tiles)
 * Note: View frustum is ~40x40 tiles (20 tiles radius), so 100 tiles
 * provides a 5x buffer to avoid frequent cleanup/respawn cycles.
 */
class DistantEntityCleanupSystemFactory {
  // Cleanup every 300 frames (~5 seconds at 60fps)
  private readonly cleanupInterval = 300;
  // Distance threshold in tiles (5x view frustum radius for buffer)
  private readonly cleanupDistance = 100;
  // Frame counter (static to persist across system instances)
  private static frameCount = 0;

  create(): RuntimeSystem {
    return {
      id: "worldgen:distant-entity-cleanup",
      phase: "simulation",
      description: "Removes depleted resources that are far from the player to prevent unbounded array growth.",
      run: ({ state }) => {
        DistantEntityCleanupSystemFactory.frameCount++;
        if (DistantEntityCleanupSystemFactory.frameCount % this.cleanupInterval === 0) {
          this.cleanupDistantResources(state);
        }
      }
    };
  }

  private cleanupDistantResources(state: RuntimeSessionState): void {
    const playerX = state.player.x;
    const playerY = state.player.y;
    const cleanupDistanceSq = this.cleanupDistance * this.cleanupDistance;

    // Count before cleanup for logging
    const beforeCount = state.resources.length;

    // Filter out resources that are:
    // 1. Depleted (already harvested)
    // 2. Beyond the cleanup distance from player
    // Note: We keep non-depleted resources even if far away, and we keep all structures
    state.resources = state.resources.filter((resource) => {
      // Always keep active (non-depleted) resources
      if (!resource.depleted) {
        return true;
      }

      // Calculate squared distance to player
      const dx = resource.x - playerX;
      const dy = resource.y - playerY;
      const distanceSq = dx * dx + dy * dy;

      // Keep if within cleanup distance
      if (distanceSq <= cleanupDistanceSq) {
        return true;
      }

      // Remove this resource (it's depleted and far away)
      return false;
    });

    const removedCount = beforeCount - state.resources.length;
    if (removedCount > 0) {
      state.logs.push(`Cleaned up ${removedCount} distant depleted resources.`);
    }
  }
}

const factory = new DistantEntityCleanupSystemFactory();

export const DistantEntityCleanupSystem = {
  create(): RuntimeSystem {
    return factory.create();
  }
};
