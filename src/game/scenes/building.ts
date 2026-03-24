import type { Inventory, InventoryKey, StructureType } from './constants';
import {
    clamp,
    tileKey,
} from './constants';
import { addItem, consumeItems, createInventory, getItemCount, isInventoryEmpty } from './inventory';
import { getGroundAt, getResourceAt } from './terrain';
import { getGrowableDefinition, getPickupReturnItem, getStorageSlots, getStructureBuildCost } from '../content/capabilities';

export function tryBuildAt(
    tx: number, ty: number,
    selectedStructure: StructureType,
    inventory: Inventory,
    structures: Map<string, StructureType>,
    farmProgress: Map<string, number>,
    worldTime: number,
    resourceRespawnAt: Map<string, number>,
    plantedTrees: Map<string, number>,
    stoneHealth: Map<string, number>,
): string | null {
    const key = tileKey(tx, ty);

    if (structures.has(key)) return 'Tile already occupied.';
    if (getGroundAt(tx, ty) === 'water') return 'Cannot build on water.';
    if (getResourceAt(tx, ty, worldTime, resourceRespawnAt, structures, plantedTrees, stoneHealth)) return 'Clear the resource first (E).';

    const cost = getStructureBuildCost(selectedStructure);
    for (const invKey of Object.keys(cost) as InventoryKey[]) {
        const amount = cost[invKey] ?? 0;
        if (getItemCount(inventory, invKey) < amount) return 'Not enough resources for that.';
    }

    consumeItems(inventory, cost);

    structures.set(key, selectedStructure);
    if (getGrowableDefinition(selectedStructure) && !farmProgress.has(key)) {
        farmProgress.set(key, 0);
    }

    return null; // success
}

export function tryRemoveStructure(
    key: string,
    inventory: Inventory,
    structures: Map<string, StructureType>,
    chestInventories?: Map<string, Inventory>,
): string | null {
    const structure = structures.get(key);
    if (!structure) return 'Nothing to remove.';

    const storageSlots = getStorageSlots(structure);
    if (storageSlots !== null) {
        const chestInventory = chestInventories?.get(key) ?? createInventory(undefined, storageSlots);
        if (!isInventoryEmpty(chestInventory)) return 'Empty the chest first.';
        const returnItemId = getPickupReturnItem(structure);
        if (!returnItemId) return 'Cannot pick that up.';
        if (addItem(inventory, returnItemId, 1) < 1) return 'No room to pick up chest.';
        chestInventories?.delete(key);
        structures.delete(key);
        return `Picked up ${returnItemId}.`;
    }

    const cost = getStructureBuildCost(structure);
    for (const invKey of Object.keys(cost) as InventoryKey[]) {
        const amount = cost[invKey] ?? 0;
        addItem(inventory, invKey, Math.max(1, Math.floor(amount * 0.5)));
    }

    structures.delete(key);
    return null; // success
}

export function updateFarmProduction(
    delta: number,
    farmProgress: Map<string, number>,
    structures: Map<string, StructureType>,
): void {
    for (const [key, progress] of farmProgress.entries()) {
        const structure = structures.get(key);
        const growable = structure ? getGrowableDefinition(structure) : undefined;
        if (!growable) {
            farmProgress.delete(key);
            continue;
        }
        if (progress >= 1) continue;
        farmProgress.set(key, clamp(progress + delta / growable.growSeconds, 0, 1));
    }
}

export function pruneRespawnMap(
    resourceRespawnAt: Map<string, number>,
    worldTime: number,
): void {
    if (resourceRespawnAt.size <= 5000) return;
    for (const [key, at] of resourceRespawnAt.entries()) {
        if (worldTime >= at) resourceRespawnAt.delete(key);
    }
}
