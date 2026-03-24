import {
    registerEntityKind,
    registerItem,
    registerRecipe,
    registerResource,
    type CapabilitySpec,
    type GameContentRegistry,
} from './registry';

function caps(...capabilities: CapabilitySpec[]): CapabilitySpec[] {
    return capabilities;
}

export function installVanillaContent(registry: GameContentRegistry): void {
    registerItem(registry, { id: 'wood', name: 'Wood', stackSize: 99, category: 'material', iconFrame: 8, uiGroup: 'materials', uiPriority: 10 });
    registerItem(registry, { id: 'stone', name: 'Stone', stackSize: 99, category: 'material', iconFrame: 9, uiGroup: 'materials', uiPriority: 20 });
    registerItem(registry, {
        id: 'food',
        name: 'Food',
        stackSize: 30,
        category: 'food',
        iconFrame: 6,
        uiGroup: 'survival',
        uiPriority: 10,
        consumable: {
            hunger: 12,
            consumeMessage: 'Ate raw food (+hunger).',
            emptyMessage: 'No food to eat.',
            blockedMessage: 'Not hungry.',
        },
        processable: {
            station: 'campfire',
            cost: { food: 3, wood: 1 },
            output: { itemId: 'ration', quantity: 1 },
            successMessage: 'Cooked 1 ration.',
            missingMessage: 'Need 3 food + 1 wood to cook.',
            noSpaceMessage: 'No inventory space for ration.',
        },
    });
    registerItem(registry, {
        id: 'ration',
        name: 'Ration',
        stackSize: 20,
        category: 'cooked-food',
        iconFrame: 7,
        uiGroup: 'survival',
        uiPriority: 20,
        consumable: {
            hunger: 32,
            health: 8,
            consumeMessage: 'Ate ration (+hunger/+hp).',
            emptyMessage: 'No rations.',
            blockedMessage: 'Already full and healthy.',
        },
    });
    registerItem(registry, { id: 'plank', name: 'Plank', stackSize: 99, category: 'material', iconFrame: 10, uiGroup: 'crafted', uiPriority: 10 });
    registerItem(registry, { id: 'brick', name: 'Brick', stackSize: 99, category: 'material', iconFrame: 11, uiGroup: 'crafted', uiPriority: 20 });
    registerItem(registry, {
        id: 'wood_axe',
        name: 'Wood Axe',
        stackSize: 1,
        category: 'material',
        iconFrame: 14,
        uiGroup: 'utility',
        uiPriority: 30,
        tool: {
            tags: ['axe'],
            power: 1.65,
            speed: 1.2,
        },
    });
    registerItem(registry, {
        id: 'wood_pickaxe',
        name: 'Wood Pickaxe',
        stackSize: 1,
        category: 'material',
        iconFrame: 15,
        uiGroup: 'utility',
        uiPriority: 40,
        tool: {
            tags: ['pickaxe'],
            power: 1.7,
            speed: 1.2,
        },
    });
    registerItem(registry, {
        id: 'sapling',
        name: 'Sapling',
        stackSize: 99,
        category: 'material',
        iconFrame: 12,
        uiGroup: 'utility',
        uiPriority: 10,
        plantable: {
            validGrounds: ['grass', 'dirt'],
            growSeconds: 90,
            growsInto: 'tree',
            needMessage: 'Need a sapling.',
            invalidGroundMessage: 'Plant saplings on grass or dirt.',
            occupiedMessage: 'Tile already occupied.',
            successMessage: 'Planted sapling.',
        },
    });
    registerItem(registry, { id: 'workbench', name: 'Workbench', stackSize: 20, category: 'material', iconFrame: 13, uiGroup: 'utility', uiPriority: 15 });
    registerItem(registry, { id: 'chest', name: 'Chest', stackSize: 20, category: 'material', iconFrame: 13, uiGroup: 'utility', uiPriority: 20 });

    registerResource(registry, {
        id: 'tree',
        label: 'Tree',
        frame: 4,
        blocksMovement: true,
        respawnSeconds: 120,
        drops: [{ itemId: 'wood', min: 3, max: 6 }],
        bonusDrop: { itemId: 'sapling', chance: 0.45, quantity: 1 },
        breakable: {
            preferredToolTags: ['axe'],
            hardness: 0.28,
            effectivePower: 1,
            ineffectivePower: 0.85,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 1,
        },
        inspectLabel: 'Tree',
        inspect: () => ['WOOD SOURCE', 'CAN DROP SAPLINGS'],
        interactions: () => [{ key: 'LMB HOLD', label: 'Break for wood.' }],
        spawnRules: [{
            minHeight: 0.43,
            minMoisture: 0.54,
            minClusters: 0.62,
            minPick: 0.58,
        }],
    });
    registerResource(registry, {
        id: 'stone',
        label: 'Stone',
        frame: 5,
        blocksMovement: true,
        drops: [{ itemId: 'stone', min: 2, max: 5 }],
        maxHits: 3,
        breakable: {
            preferredToolTags: ['pickaxe'],
            hardness: 0.42,
            effectivePower: 1,
            ineffectivePower: 0.75,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 0.75,
        },
        inspectLabel: 'Stone deposit',
        inspect: (ctx) => [`STONE HITS ${ctx.stoneHitsLeft ?? 3}`],
        interactions: () => [{ key: 'LMB HOLD', label: 'Break for stone.' }],
        spawnRules: [{
            minHeight: 0.43,
            maxMoisture: 0.56,
            minClusters: 0.64,
            minPick: 0.57,
        }],
    });
    registerResource(registry, {
        id: 'berry',
        label: 'Berry',
        frame: 6,
        blocksMovement: false,
        respawnSeconds: 45,
        drops: [{ itemId: 'food', min: 2, max: 4 }],
        grantsHunger: 12,
        breakable: {
            preferredToolTags: ['hand'],
            hardness: 0.18,
            effectivePower: 1,
            ineffectivePower: 1,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 1,
        },
        inspectLabel: 'Berry bush',
        inspect: () => ['EDIBLE GATHERING'],
        interactions: () => [{ key: 'LMB HOLD', label: 'Pick berries.' }],
        spawnRules: [{
            minHeight: 0.43,
            minMoisture: 0.54,
            minClusters: 0.62,
            minPick: 0.5,
            maxPick: 0.58,
        }],
    });

    registerRecipe(registry, {
        id: 'plank',
        label: 'Plank',
        output: { itemId: 'plank', quantity: 4 },
        cost: { wood: 1 },
        station: null,
    });
    registerRecipe(registry, {
        id: 'workbench',
        label: 'Workbench',
        output: { itemId: 'workbench', quantity: 1 },
        cost: { plank: 8 },
        station: null,
    });
    registerRecipe(registry, {
        id: 'brick',
        label: 'Brick',
        output: { itemId: 'brick', quantity: 1 },
        cost: { stone: 2 },
        station: 'workbench',
    });
    registerRecipe(registry, {
        id: 'chest',
        label: 'Chest',
        output: { itemId: 'chest', quantity: 1 },
        cost: { plank: 8 },
        station: 'workbench',
    });
    registerRecipe(registry, {
        id: 'wood_axe',
        label: 'Wood Axe',
        output: { itemId: 'wood_axe', quantity: 1 },
        cost: { plank: 3, wood: 2 },
        station: 'workbench',
    });
    registerRecipe(registry, {
        id: 'wood_pickaxe',
        label: 'Wood Pickaxe',
        output: { itemId: 'wood_pickaxe', quantity: 1 },
        cost: { plank: 3, stone: 2 },
        station: 'workbench',
    });

    registerEntityKind(registry, {
        id: 'campfire',
        label: 'Campfire',
        inspectLabel: 'Campfire',
        inspect: () => ['UTILITY STATION', 'COOKS FOOD INTO RATIONS'],
        breakable: {
            preferredToolTags: ['pickaxe'],
            hardness: 0.32,
            effectivePower: 1,
            ineffectivePower: 0.9,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 1,
        },
        interactions: () => [{ key: 'LMB HOLD', label: 'Break the campfire.' }],
        frame: 7,
        cost: { plank: 2, brick: 2 },
        blocks: true,
        capabilities: caps(
            { type: 'placeable', itemId: 'brick' },
            { type: 'pickupable' },
            { type: 'utility-station', station: 'campfire' },
            { type: 'light-source', texture: 'light-campfire' },
            { type: 'collidable', blocks: true },
            { type: 'renderable', sprite: 'campfire' },
        ),
    });
    registerEntityKind(registry, {
        id: 'wall',
        label: 'Wall',
        inspectLabel: 'Wall',
        inspect: () => ['BLOCKS MOVEMENT'],
        breakable: {
            preferredToolTags: ['axe'],
            hardness: 0.22,
            effectivePower: 1,
            ineffectivePower: 0.9,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 1,
        },
        interactions: () => [{ key: 'LMB HOLD', label: 'Break the wall.' }],
        frame: 8,
        cost: { plank: 3 },
        blocks: true,
        capabilities: caps(
            { type: 'placeable', itemId: 'plank' },
            { type: 'pickupable' },
            { type: 'autotile', group: 'wall', frameBase: 11 },
            { type: 'collidable', blocks: true },
            { type: 'renderable', sprite: 'wall' },
        ),
    });
    registerEntityKind(registry, {
        id: 'farm',
        label: 'Farm',
        inspectLabel: 'Farm plot',
        inspect: (ctx) => [`GROWTH ${Math.floor((ctx.growProgress ?? 0) * 100)}%`],
        breakable: {
            preferredToolTags: ['hand'],
            hardness: 0.18,
            effectivePower: 1,
            ineffectivePower: 1,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 1,
            drops: [{ itemId: 'food', min: 5, max: 9 }],
        },
        interactions: (ctx) => (ctx.growProgress ?? 0) >= 1
            ? [{ key: 'LMB HOLD', label: 'Harvest the crop.' }]
            : [{ key: 'LMB HOLD', label: 'Break the farm.' }],
        frame: 9,
        cost: { plank: 2, food: 3 },
        blocks: false,
        capabilities: caps(
            { type: 'placeable', itemId: 'food' },
            { type: 'pickupable' },
            {
                type: 'growable',
                growSeconds: 55,
                stages: [
                    { minProgress: 0, frame: 32, tint: 0xbfa57f },
                    { minProgress: 0.4, frame: 33, tint: 0xd7e7ad },
                    { minProgress: 1, frame: 34, tint: 0xfff3b0 },
                ],
            },
            { type: 'collidable', blocks: false },
            { type: 'renderable', sprite: 'farm' },
        ),
    });
    registerEntityKind(registry, {
        id: 'workbench',
        label: 'Workbench',
        inspectLabel: 'Workbench',
        inspect: () => ['CRAFT STATION', 'TURNS WOOD AND STONE INTO PARTS'],
        breakable: {
            preferredToolTags: ['axe'],
            hardness: 0.35,
            effectivePower: 1,
            ineffectivePower: 0.9,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 1,
        },
        interactions: () => [{ key: 'RMB', label: 'Use the workbench.' }, { key: 'LMB HOLD', label: 'Break the workbench.' }],
        frame: 10,
        cost: { workbench: 1 },
        blocks: true,
        capabilities: caps(
            { type: 'placeable', itemId: 'workbench' },
            { type: 'pickupable', returns: 'workbench' },
            { type: 'craft-station', station: 'workbench' },
            { type: 'collidable', blocks: true },
            { type: 'renderable', sprite: 'workbench' },
        ),
    });
    registerEntityKind(registry, {
        id: 'chest',
        label: 'Chest',
        inspectLabel: 'Storage chest',
        inspect: (ctx) => [`STORAGE ${ctx.storageUsedSlots ?? 0}/${ctx.storageTotalSlots ?? 0}`],
        breakable: {
            preferredToolTags: ['axe'],
            hardness: 0.28,
            effectivePower: 1,
            ineffectivePower: 0.9,
            effectiveDropMultiplier: 1,
            ineffectiveDropMultiplier: 1,
        },
        interactions: () => [
            { key: 'RMB', label: 'Store or take items.' },
            { key: 'LMB HOLD', label: 'Break the chest.' },
        ],
        frame: 35,
        cost: { chest: 1 },
        blocks: true,
        capabilities: caps(
            { type: 'placeable', itemId: 'chest' },
            { type: 'pickupable', returns: 'chest' },
            { type: 'storage', slots: 16 },
            { type: 'collidable', blocks: true },
            { type: 'renderable', sprite: 'chest' },
        ),
    });
}
