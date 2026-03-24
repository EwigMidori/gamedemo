import type { Inventory, ItemId, RecipeId, StructureType } from '../constants';
import type { PlayerNeeds } from '../inventory';
import type { DroppedItem } from '../worldState';

export interface HudContext {
    readonly worldTime: number;
    readonly day: number;
    readonly cameraZoom: number;
    readonly needs: PlayerNeeds;
    readonly inventory: Inventory;
    readonly selectedStructure: StructureType | null;
    readonly activeSlotIndex: number;
    readonly heldItemId: ItemId | null;
    readonly selectedRecipeId: RecipeId;
    readonly handcraftOpen: boolean;
    readonly stationPanelOpen: boolean;
    readonly openedStationId: string | null;
    readonly modalOpen: boolean;
    readonly nearbyStations: Set<string>;
    readonly playerX: number;
    readonly playerY: number;
    readonly pointerTile: { x: number; y: number } | null;
    readonly structures: Map<string, StructureType>;
    readonly chestInventories: Map<string, Inventory>;
    readonly farmProgress: Map<string, number>;
    readonly resourceRespawnAt: Map<string, number>;
    readonly plantedTrees: Map<string, number>;
    readonly stoneHealth: Map<string, number>;
    readonly droppedItems: Map<string, DroppedItem>;
    readonly scaleWidth: number;
    readonly scaleHeight: number;
}
