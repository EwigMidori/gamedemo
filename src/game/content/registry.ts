export interface RegisteredItemDefinition {
    id: string;
    name: string;
    stackSize: number;
    category: 'material' | 'food' | 'cooked-food';
    iconFrame?: number | null;
    uiGroup?: string;
    uiPriority?: number;
    consumable?: {
        hunger?: number;
        health?: number;
        consumeMessage: string;
        emptyMessage: string;
        blockedMessage: string;
    };
    plantable?: {
        validGrounds: string[];
        growSeconds: number;
        growsInto: string;
        needMessage: string;
        invalidGroundMessage: string;
        occupiedMessage: string;
        successMessage: string;
    };
    processable?: {
        station: string;
        cost: Partial<Record<string, number>>;
        output: { itemId: string; quantity: number };
        successMessage: string;
        missingMessage: string;
        noSpaceMessage: string;
    };
    tool?: {
        tags: string[];
        power?: number;
        speed?: number;
    };
}

export interface RegisteredRecipeDefinition {
    id: string;
    label: string;
    output: { itemId: string; quantity: number };
    cost: Partial<Record<string, number>>;
    station?: string | null;
}

export interface ResourceDropDefinition {
    itemId: string;
    min: number;
    max: number;
}

export interface ResourceSpawnRule {
    minHeight?: number;
    maxHeight?: number;
    minMoisture?: number;
    maxMoisture?: number;
    minClusters?: number;
    maxClusters?: number;
    minPick?: number;
    maxPick?: number;
}

export interface ContentInspectContext {
    tx: number;
    ty: number;
    key: string;
    worldTime: number;
    structureId?: string;
    resourceId?: string;
    resourceRespawnAt?: number;
    plantedTreeAt?: number;
    growProgress?: number;
    storageUsedSlots?: number;
    storageTotalSlots?: number;
    stoneHitsLeft?: number;
}

export interface ContentInteraction {
    key: string;
    label: string;
}

export interface BreakableDefinition {
    preferredToolTags?: string[];
    hardness?: number;
    effectivePower?: number;
    ineffectivePower?: number;
    effectiveDropMultiplier?: number;
    ineffectiveDropMultiplier?: number;
    drops?: ResourceDropDefinition[];
}

export interface RegisteredResourceDefinition {
    id: string;
    label?: string;
    frame: number;
    blocksMovement: boolean;
    respawnSeconds?: number;
    drops: ResourceDropDefinition[];
    maxHits?: number;
    grantsHunger?: number;
    bonusDrop?: { itemId: string; chance: number; quantity: number };
    spawnRules?: ResourceSpawnRule[];
    breakable?: BreakableDefinition;
    inspectLabel?: string;
    inspect?: (ctx: ContentInspectContext) => string[];
    interactions?: (ctx: ContentInspectContext) => ContentInteraction[];
}

export type CapabilitySpec =
    | { type: 'placeable'; itemId: string }
    | { type: 'pickupable'; returns?: string }
    | { type: 'storage'; slots: number }
    | { type: 'craft-station'; station: string }
    | { type: 'utility-station'; station: string }
    | { type: 'autotile'; group: string; frameBase: number }
    | { type: 'growable'; growSeconds: number; stages: Array<{ minProgress: number; frame: number; tint?: number }> }
    | { type: 'light-source'; texture: string; offsetX?: number; offsetY?: number }
    | { type: 'collidable'; blocks: boolean }
    | { type: 'renderable'; sprite: string; frame?: number };

export interface RegisteredEntityKind {
    id: string;
    label: string;
    capabilities: CapabilitySpec[];
    cost?: Partial<Record<string, number>>;
    blocks?: boolean;
    frame?: number;
    breakable?: BreakableDefinition;
    inspectLabel?: string;
    inspect?: (ctx: ContentInspectContext) => string[];
    interactions?: (ctx: ContentInspectContext) => ContentInteraction[];
}

export interface GameContentRegistry {
    items: Map<string, RegisteredItemDefinition>;
    recipes: Map<string, RegisteredRecipeDefinition>;
    entityKinds: Map<string, RegisteredEntityKind>;
    resources: Map<string, RegisteredResourceDefinition>;
}

export function createContentRegistry(): GameContentRegistry {
    return {
        items: new Map(),
        recipes: new Map(),
        entityKinds: new Map(),
        resources: new Map(),
    };
}

export function registerItem(registry: GameContentRegistry, item: RegisteredItemDefinition): void {
    registry.items.set(item.id, item);
}

export function registerRecipe(registry: GameContentRegistry, recipe: RegisteredRecipeDefinition): void {
    registry.recipes.set(recipe.id, recipe);
}

export function registerEntityKind(registry: GameContentRegistry, kind: RegisteredEntityKind): void {
    registry.entityKinds.set(kind.id, kind);
}

export function registerResource(registry: GameContentRegistry, resource: RegisteredResourceDefinition): void {
    registry.resources.set(resource.id, resource);
}
