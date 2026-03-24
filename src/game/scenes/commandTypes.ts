import type { Inventory, ItemId, RecipeId, StructureType } from './constants';
import type { PlayerNeeds } from './inventory';
import type { DroppedItem } from './worldState';

export type GameCommandId =
    | 'break-target'
    | 'gather'
    | 'place-structure'
    | 'plant-item'
    | 'remove-structure'
    | 'store-item'
    | 'take-item'
    | 'use-item'
    | 'craft-recipe'
    | 'process-item';

export interface GameCommand {
    id: GameCommandId;
    key: string;
    label: string;
    tx?: number;
    ty?: number;
    tileKey?: string;
}

export interface CommandContext {
    playerX: number;
    playerY: number;
    worldTime: number;
    inventory: Inventory;
    needs: PlayerNeeds;
    resourceRespawnAt: Map<string, number>;
    plantedTrees: Map<string, number>;
    stoneHealth: Map<string, number>;
    chestInventories: Map<string, Inventory>;
    farmProgress: Map<string, number>;
    structures: Map<string, StructureType>;
    droppedItems: Map<string, DroppedItem>;
    heldItemId: ItemId | null;
    selectedStructure: StructureType | null;
    selectedRecipeId: RecipeId;
    activeSlotIndex: number;
    pointerTile: { x: number; y: number } | null;
}

export type CommandHandler = (command: GameCommand, ctx: CommandContext) => string;
export type CommandProvider = (ctx: CommandContext) => GameCommand[];
