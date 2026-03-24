import type { Inventory, ItemId, StructureType } from './constants';
import type { PlayerNeeds } from './inventory';

export interface DroppedItem {
    id: string;
    itemId: ItemId;
    quantity: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    spawnedAt: number;
    pickupDelay: number;
}

export interface WorldState {
    inventory: Inventory;
    needs: PlayerNeeds;
    resourceRespawnAt: Map<string, number>;
    plantedTrees: Map<string, number>;
    stoneHealth: Map<string, number>;
    chestInventories: Map<string, Inventory>;
    farmProgress: Map<string, number>;
    structures: Map<string, StructureType>;
    droppedItems: Map<string, DroppedItem>;
    worldTime: number;
    day: number;
}
