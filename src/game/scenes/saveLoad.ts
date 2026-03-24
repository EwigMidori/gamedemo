import type { Inventory, InventoryKey, ItemId, SaveData, StructureType } from './constants';
import {
  SAVE_KEY,
  clamp,
} from './constants';
import { createInventory } from './inventory';
import type { PlayerNeeds } from './inventory';
import type { DroppedItem } from './worldState';

export interface GameState {
    playerX: number;
    playerY: number;
    worldTime: number;
    day: number;
    needs: PlayerNeeds;
    inventory: Inventory;
    resourceRespawnAt: Map<string, number>;
    plantedTrees: Map<string, number>;
    stoneHealth: Map<string, number>;
    chestInventories: Map<string, Inventory>;
    farmProgress: Map<string, number>;
    structures: Map<string, StructureType>;
    droppedItems: Map<string, DroppedItem>;
}

export function saveGame(state: GameState): void {
    const data: SaveData = {
        player: { x: state.playerX, y: state.playerY },
        worldTime: state.worldTime,
        hunger: state.needs.hunger,
        health: state.needs.health,
        day: state.day,
        inventory: state.inventory,
        resourceRespawnAt: [...state.resourceRespawnAt.entries()].map(([key, at]) => ({ key, at })),
        plantedTrees: [...state.plantedTrees.entries()].map(([key, growAt]) => ({ key, growAt })),
        stoneHealth: [...state.stoneHealth.entries()].map(([key, hitsLeft]) => ({ key, hitsLeft })),
        chestInventories: [...state.chestInventories.entries()].map(([key, inventory]) => ({ key, inventory })),
        farmProgress: [...state.farmProgress.entries()].map(([key, progress]) => ({ key, progress })),
        structures: [...state.structures.entries()].map(([key, type]) => ({ key, type })),
        droppedItems: [...state.droppedItems.values()].map((drop) => ({ ...drop })),
    };
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
        // Ignore storage failures.
    }
}

export function loadGame(): GameState {
    const defaults: GameState = {
        playerX: 0,
        playerY: 0,
        worldTime: 0,
        day: 1,
        needs: { hunger: 100, health: 100 },
        inventory: createInventory({ wood: 20, stone: 8, food: 10, ration: 0 }),
        resourceRespawnAt: new Map(),
        plantedTrees: new Map(),
        stoneHealth: new Map(),
        chestInventories: new Map(),
        farmProgress: new Map(),
        structures: new Map(),
        droppedItems: new Map(),
    };

    let raw: string | null = null;
    try {
        raw = localStorage.getItem(SAVE_KEY);
    } catch {
        return defaults;
    }
    if (!raw) return defaults;

    try {
        const data = JSON.parse(raw) as SaveData;
        const state: GameState = {
            playerX: data.player.x,
            playerY: data.player.y,
            worldTime: data.worldTime,
            day: Math.max(1, data.day),
            needs: {
                hunger: clamp(data.hunger, 0, 100),
                health: clamp(data.health, 0, 100),
            },
            inventory: deserializeInventory(data.inventory),
            resourceRespawnAt: new Map((data.resourceRespawnAt ?? []).map((e) => [e.key, e.at])),
            plantedTrees: new Map((data.plantedTrees ?? []).map((e) => [e.key, e.growAt])),
            stoneHealth: new Map((data.stoneHealth ?? []).map((e) => [e.key, e.hitsLeft])),
            chestInventories: new Map((data.chestInventories ?? []).map((e) => [e.key, deserializeInventory(e.inventory)])),
            farmProgress: new Map((data.farmProgress ?? []).map((e) => [e.key, e.progress])),
            structures: new Map((data.structures ?? []).map((e) => [e.key, e.type])),
            droppedItems: new Map((data.droppedItems ?? []).map((drop) => [drop.id, {
                ...drop,
                vx: drop.vx ?? 0,
                vy: drop.vy ?? 0,
                pickupDelay: drop.pickupDelay ?? 0.45,
            }])),
        };

        // Backward compat: old saves had `harvested: string[]`.
        const legacyHarvested = (data as unknown as { harvested?: string[] }).harvested ?? [];
        for (const key of legacyHarvested) {
            if (!state.resourceRespawnAt.has(key)) {
                state.resourceRespawnAt.set(key, Number.POSITIVE_INFINITY);
            }
        }

        return state;
    } catch {
        return defaults;
    }
}

export function clearSave(): void {
    localStorage.removeItem(SAVE_KEY);
}

function deserializeInventory(raw: SaveData['inventory']): Inventory {
    if ('slots' in raw && Array.isArray(raw.slots)) {
        return {
            slots: raw.slots.map((slot) => ({
                itemId: slot.itemId,
                quantity: slot.itemId ? Math.max(0, slot.quantity) : 0,
            })),
        };
    }

    const legacy = raw as Partial<Record<InventoryKey, number>>;
    const initial: Partial<Record<ItemId, number>> = {
        wood: legacy.wood ?? 0,
        stone: legacy.stone ?? 0,
        food: legacy.food ?? 0,
        ration: legacy.ration ?? 0,
        plank: legacy.plank ?? 0,
        brick: legacy.brick ?? 0,
        sapling: legacy.sapling ?? 0,
    };
    return createInventory(initial);
}
