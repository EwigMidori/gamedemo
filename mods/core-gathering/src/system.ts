import type { RuntimeSystem } from "@gamedemo/engine-core";
import { GatheringDomain } from "./gatheringDomain";

const resourceRespawn: RuntimeSystem = {
  id: "gathering:resource-respawn",
  phase: "simulation",
  description: "Respawns renewable resources such as trees and berry bushes.",
  run({ content, state }) {
    for (const resource of state.resources) {
      if (!resource.depleted || resource.resourceId === "resource:stone") {
        continue;
      }
      const definition = content.resources.find((entry) => entry.id === resource.resourceId) ?? null;
      if (!definition) {
        continue;
      }
      if (resource.respawnAt !== null && resource.respawnAt !== undefined && state.timeSeconds >= resource.respawnAt) {
        resource.depleted = false;
        resource.respawnAt = null;
      }
    }
  }
};

const dropCollection: RuntimeSystem = {
  id: "gathering:drop-collection",
  phase: "simulation",
  description: "Collects nearby dropped items into the player inventory after pickup delay expires.",
  run({ content, state }) {
    GatheringDomain.collectNearbyDrops(content, state);
  }
};

const dropMotion: RuntimeSystem = {
  id: "gathering:drop-motion",
  phase: "simulation",
  description: "Animates dropped items and softly attracts them toward the player.",
  run({ deltaSeconds, state }) {
    GatheringDomain.simulateDrops(state, deltaSeconds);
  }
};

const plantedResourceGrowth: RuntimeSystem = {
  id: "gathering:planted-growth",
  phase: "simulation",
  description: "Turns planted saplings into active resources once growth time completes.",
  run({ state }) {
    const planted = state.plantedResources ?? [];
    const remaining = [];
    for (const entry of planted) {
      if (state.timeSeconds < entry.growAt) {
        remaining.push(entry);
        continue;
      }
      const existing = state.resources.find(
        (resource) => resource.x === entry.x && resource.y === entry.y && resource.resourceId === entry.resourceId
      );
      if (existing) {
        existing.depleted = false;
        existing.respawnAt = null;
        existing.hitsLeft = existing.resourceId === "resource:stone" ? 3 : null;
      } else {
        state.resources.push({
          id: `resource:${entry.x}:${entry.y}:${entry.resourceId}`,
          resourceId: entry.resourceId,
          x: entry.x,
          y: entry.y,
          depleted: false,
          respawnAt: null,
          hitsLeft: entry.resourceId === "resource:stone" ? 3 : null
        });
      }
    }
    state.plantedResources = remaining;
  }
};

export const GatheringSystems = {
  resourceRespawn,
  dropMotion,
  dropCollection,
  plantedResourceGrowth
};
