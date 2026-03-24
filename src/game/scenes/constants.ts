import { gameContentRegistry } from '../content';

export type GroundTile = 'grass' | 'dirt' | 'sand' | 'water';
export type ResourceType = string;
export type StructureType = string;
export type ItemId = string;
export type InventoryKey = ItemId;
export type RecipeId = string;
export type Facing = 'down' | 'left' | 'right' | 'up';

export interface ItemDefinition {
    id: ItemId;
    name: string;
    stackSize: number;
    category: 'material' | 'food' | 'cooked-food';
}

export interface InventorySlot {
    itemId: ItemId | null;
    quantity: number;
}

export interface Inventory {
    slots: InventorySlot[];
}

export interface CraftRecipe {
    id: RecipeId;
    label: string;
    output: { itemId: ItemId; quantity: number };
    cost: Partial<Record<InventoryKey, number>>;
    station?: string | null;
}

export interface SaveData {
    player: { x: number; y: number };
    worldTime: number;
    hunger: number;
    health: number;
    day: number;
    inventory: { slots: Array<{ itemId: ItemId | null; quantity: number }> } | Partial<Record<InventoryKey, number>>;
    resourceRespawnAt: Array<{ key: string; at: number }>;
    plantedTrees?: Array<{ key: string; growAt: number }>;
    stoneHealth?: Array<{ key: string; hitsLeft: number }>;
    chestInventories?: Array<{ key: string; inventory: { slots: Array<{ itemId: ItemId | null; quantity: number }> } }>;
    farmProgress: Array<{ key: string; progress: number }>;
    structures: Array<{ key: string; type: StructureType }>;
    droppedItems?: Array<{ id: string; itemId: ItemId; quantity: number; x: number; y: number; vx?: number; vy?: number; spawnedAt: number; pickupDelay?: number }>;
}

export const TILE_SIZE = 16;
export const CHUNK_SIZE = 24;
export const MOVE_SPEED = 95;
export const INTERACT_DISTANCE = TILE_SIZE * 1.8;
export const SAVE_KEY = 'frontier-colony-save-v1';
export const WORLD_SEED = 1337;
export const DAY_LENGTH = 180;
export const INVENTORY_SIZE = 12;
export const CHEST_SIZE = 16;

export const ITEM_DEFS: Record<ItemId, ItemDefinition> = Object.fromEntries(
    [...gameContentRegistry.items.entries()].map(([id, def]) => [
        id,
        { id, name: def.name, stackSize: def.stackSize, category: def.category },
    ]),
) as Record<ItemId, ItemDefinition>;

export const STRUCTURE_COST: Record<StructureType, Partial<Record<InventoryKey, number>>> = Object.fromEntries(
    [...gameContentRegistry.entityKinds.entries()].map(([id, def]) => [id, def.cost ?? {}]),
) as Record<StructureType, Partial<Record<InventoryKey, number>>>;

export const STRUCTURE_BLOCKS: Record<StructureType, boolean> = Object.fromEntries(
    [...gameContentRegistry.entityKinds.entries()].map(([id, def]) => [id, def.blocks ?? false]),
) as Record<StructureType, boolean>;

export const GROUND_FRAME: Record<GroundTile, number> = {
    grass: 0,
    dirt: 1,
    sand: 2,
    water: 3,
};

export const RESOURCE_FRAME: Record<ResourceType, number> = Object.fromEntries(
    [...gameContentRegistry.resources.entries()].map(([id, def]) => [id, def.frame]),
) as Record<ResourceType, number>;

export const STRUCTURE_FRAME: Record<StructureType, number> = Object.fromEntries(
    [...gameContentRegistry.entityKinds.entries()].map(([id, def]) => [id, def.frame ?? 0]),
) as Record<StructureType, number>;

export const CRAFT_RECIPES: CraftRecipe[] = [...gameContentRegistry.recipes.values()].map((recipe) => ({
    id: recipe.id,
    label: recipe.label,
    output: { itemId: recipe.output.itemId, quantity: recipe.output.quantity },
    cost: recipe.cost,
    station: recipe.station ?? null,
}));

export function floorDiv(value: number, divisor: number): number {
    return Math.floor(value / divisor);
}

export function tileKey(tx: number, ty: number): string {
    return `${tx},${ty}`;
}

export function worldToTile(value: number): number {
    return Math.floor(value / TILE_SIZE);
}

export function tileToWorldCenter(tile: number): number {
    return tile * TILE_SIZE + TILE_SIZE * 0.5;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
