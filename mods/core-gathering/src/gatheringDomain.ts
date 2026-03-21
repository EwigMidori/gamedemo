import type {
  ResourceNode,
  RuntimeSessionState
} from "@gamedemo/engine-core";

function nearestAvailableResource(state: RuntimeSessionState): ResourceNode | null {
  let best: ResourceNode | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const resource of state.resources) {
    if (resource.depleted) continue;
    const distance = Math.abs(resource.x - state.player.x) + Math.abs(resource.y - state.player.y);
    if (distance < bestDistance) {
      best = resource;
      bestDistance = distance;
    }
  }

  return best && bestDistance <= 1 ? best : null;
}

function getResourceAtTile(
  state: RuntimeSessionState,
  x: number,
  y: number
): ResourceNode | null {
  return (
    state.resources.find(
      (resource) => !resource.depleted && resource.x === x && resource.y === y
    ) ?? null
  );
}

function getResourceById(
  state: RuntimeSessionState,
  resourceId: string
): ResourceNode | null {
  return state.resources.find((resource) => !resource.depleted && resource.id === resourceId) ?? null;
}

function canGatherTarget(state: RuntimeSessionState, target: ResourceNode | null): boolean {
  if (!target) return false;
  return Math.abs(target.x - state.player.x) + Math.abs(target.y - state.player.y) <= 1;
}

function addItem(state: RuntimeSessionState, itemId: string, quantity: number): void {
  const existing = state.inventory.find((entry) => entry.itemId === itemId);
  if (existing) {
    existing.quantity += quantity;
    return;
  }
  state.inventory.push({ itemId, quantity });
}

function describeGatherYield(resourceId: string) {
  if (resourceId === "resource:tree") {
    return {
      summary: "Harvest wood from this tree.",
      detail: "Gathering a tree consumes the node and yields building material.",
      rewards: [{
        itemId: "core:wood",
        quantity: 2
      }]
    };
  }

  return {
    summary: "Mine stone from this deposit.",
    detail: "Gathering a stone deposit consumes the node and yields construction material.",
    rewards: [{
      itemId: "core:stone",
      quantity: 2
    }]
  };
}

export const GatheringDomain = {
  nearestAvailableResource,
  getResourceAtTile,
  getResourceById,
  canGatherTarget,
  addItem,
  describeGatherYield
};
