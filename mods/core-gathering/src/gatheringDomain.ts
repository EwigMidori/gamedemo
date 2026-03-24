import type {
  ContentSnapshot,
  DroppedItemState,
  ItemDef,
  ResourceNode,
  RuntimeSessionState
} from "@gamedemo/engine-core";
import { PlayerDomain } from "@gamedemo/mod-core-player";
import { VanillaInventory, VanillaWorldLookup } from "@gamedemo/vanilla-domain";

function nearestAvailableResource(state: RuntimeSessionState): ResourceNode | null {
  const playerTile = PlayerDomain.currentTile(state.player);
  let best: ResourceNode | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const resource of state.resources) {
    if (resource.depleted) continue;
    const distance = Math.max(Math.abs(resource.x - playerTile.x), Math.abs(resource.y - playerTile.y));
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
  const playerTile = PlayerDomain.currentTile(state.player);
  return PlayerDomain.isAdjacentTile(playerTile.x, playerTile.y, target.x, target.y);
}

function getResourceDef(content: ContentSnapshot, resourceId: string) {
  return content.resources.find((entry) => entry.id === resourceId) ?? null;
}

function canPlantSelectedItem(
  content: ContentSnapshot,
  state: RuntimeSessionState,
  selectedSlot: number | null | undefined,
  x: number,
  y: number
): { ok: boolean; reason?: string } {
  if (selectedSlot === null || selectedSlot === undefined) {
    return { ok: false, reason: "Select a plantable item first." };
  }
  const entry = state.inventory[selectedSlot] ?? null;
  const item = entry?.itemId
    ? content.items.find((candidate) => candidate.id === entry.itemId) ?? null
    : null;
  if (!entry?.itemId || entry.quantity <= 0 || !item?.plantable) {
    return { ok: false, reason: "Selected slot is not plantable." };
  }
  const tile = VanillaWorldLookup.tileAt(state.world, x, y);
  if (!tile || !item.plantable.validTerrainIds.includes(tile.terrainId)) {
    return { ok: false, reason: item.plantable.invalidTerrainMessage };
  }
  if (state.placedStructures.some((structure) => structure.x === x && structure.y === y)) {
    return { ok: false, reason: item.plantable.occupiedMessage };
  }
  if ((state.plantedResources ?? []).some((resource) => resource.x === x && resource.y === y)) {
    return { ok: false, reason: `${item.plantable.growsIntoResourceId} already planted.` };
  }
  if (state.resources.some((resource) => !resource.depleted && resource.x === x && resource.y === y)) {
    return { ok: false, reason: "Clear the resource first." };
  }
  return { ok: true };
}

function plantSelectedItem(
  content: ContentSnapshot,
  state: RuntimeSessionState,
  selectedSlot: number | null | undefined,
  x: number,
  y: number
): string {
  const check = canPlantSelectedItem(content, state, selectedSlot, x, y);
  if (!check.ok) {
    return check.reason ?? "Cannot plant here.";
  }
  const entry = state.inventory[selectedSlot ?? -1];
  const item = content.items.find((candidate) => candidate.id === entry.itemId) ?? null;
  if (!item?.plantable) {
    return "This item cannot be planted.";
  }
  entry.quantity -= 1;
  if (entry.quantity <= 0) {
    entry.itemId = "";
    entry.quantity = 0;
  }
  state.plantedResources ??= [];
  state.plantedResources.push({
    id: `planted:${x}:${y}:${item.id}:${state.timeSeconds}`,
    resourceId: item.plantable.growsIntoResourceId,
    x,
    y,
    growAt: state.timeSeconds + item.plantable.growSeconds
  });
  return item.plantable.successMessage;
}

function addItem(state: RuntimeSessionState, itemId: string, quantity: number): void {
  const itemIndex = new Map<string, ItemDef>([
    ["core:wood", { id: "core:wood", label: "Wood", stackSize: 99, tags: [] }],
    ["core:stone", { id: "core:stone", label: "Stone", stackSize: 99, tags: [] }],
    ["core:food", { id: "core:food", label: "Food", stackSize: 30, tags: [] }],
    ["core:sapling", { id: "core:sapling", label: "Sapling", stackSize: 99, tags: [] }]
  ]);
  const inventory = new VanillaInventory(state.inventory, itemIndex);
  inventory.normalizeSize(12);
  inventory.add(itemId, quantity);
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

  if (resourceId === "resource:berry") {
    return {
      summary: "Pick berries from this bush.",
      detail: "Gathering berries yields raw food and can sustain early survival.",
      rewards: [{
        itemId: "core:food",
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

function spawnDrops(
  state: RuntimeSessionState,
  x: number,
  y: number,
  drops: Array<{ itemId: string; quantity: number }>
): void {
  state.droppedItems ??= [];
  for (const drop of drops) {
    if (drop.quantity <= 0) {
      continue;
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.55 + Math.random() * 0.45;
    state.droppedItems.push({
      id: `drop:${x}:${y}:${drop.itemId}:${state.timeSeconds}:${Math.random()}`,
      itemId: drop.itemId,
      quantity: drop.quantity,
      x: x + Math.cos(angle) * (0.08 + Math.random() * 0.1),
      y: y + Math.sin(angle) * (0.08 + Math.random() * 0.1),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spawnedAt: state.timeSeconds,
      pickupDelay: 0.35,
      manualDrop: false,
      pickupArmed: true
    });
  }
}

function simulateDrops(state: RuntimeSessionState, deltaSeconds: number): void {
  const drag = Math.pow(0.06, deltaSeconds);
  for (const drop of state.droppedItems ?? []) {
    const deltaX = state.player.x - drop.x;
    const deltaY = state.player.y - drop.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (drop.manualDrop && !drop.pickupArmed && distance >= 1.1) {
      drop.pickupArmed = true;
    }
    const canMagnetize = state.timeSeconds >= drop.spawnedAt + drop.pickupDelay &&
      (!drop.manualDrop || drop.pickupArmed);
    if (canMagnetize && distance <= 1.85 && distance > 0.001) {
      const pull = 3.2 * deltaSeconds;
        drop.vx += (deltaX / distance) * pull;
        drop.vy += (deltaY / distance) * pull;
    }
    drop.x += drop.vx * deltaSeconds;
    drop.y += drop.vy * deltaSeconds;
    drop.vx *= drag;
    drop.vy *= drag;
    if (Math.abs(drop.vx) < 0.02) {
      drop.vx = 0;
    }
    if (Math.abs(drop.vy) < 0.02) {
      drop.vy = 0;
    }
  }
}

function collectNearbyDrops(content: ContentSnapshot, state: RuntimeSessionState): void {
  const itemIndex = new Map(content.items.map((entry) => [entry.id, entry]));
  const inventory = new VanillaInventory(state.inventory, itemIndex);
  const kept: DroppedItemState[] = [];
  for (const drop of state.droppedItems ?? []) {
    const distance = Math.hypot(drop.x - state.player.x, drop.y - state.player.y);
    const canPickup = state.timeSeconds >= drop.spawnedAt + drop.pickupDelay &&
      (!drop.manualDrop || drop.pickupArmed);
    if (distance <= 0.82 && canPickup && inventory.canAdd(drop.itemId, drop.quantity)) {
      inventory.add(drop.itemId, drop.quantity);
      continue;
    }
    kept.push(drop);
  }
  inventory.normalizeSize(12);
  state.droppedItems = kept;
}

export const GatheringDomain = {
  nearestAvailableResource,
  getResourceAtTile,
  getResourceById,
  canGatherTarget,
  getResourceDef,
  addItem,
  describeGatherYield,
  collectNearbyDrops,
  simulateDrops,
  spawnDrops,
  canPlantSelectedItem,
  plantSelectedItem
};
