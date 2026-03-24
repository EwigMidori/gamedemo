import Phaser from 'phaser';
import type { CraftRecipe, Inventory, InventoryKey, InventorySlot, ItemId, RecipeId, ResourceType, StructureType } from './constants';
import {
    CRAFT_RECIPES,
    INTERACT_DISTANCE,
    INVENTORY_SIZE,
    ITEM_DEFS,
    clamp,
    tileKey,
    tileToWorldCenter,
    worldToTile,
} from './constants';
import { getGroundAt, getResourceAt } from './terrain';
import { getConsumableDefinition, getGrowableDefinition, getPlantableDefinition, getProcessableDefinition, getResourceDefinition, getStationLabel, hasNearbyStation } from '../content/capabilities';

export interface PlayerNeeds {
    hunger: number;
    health: number;
}

export function createInventory(initial?: Partial<Record<ItemId, number>>, size = INVENTORY_SIZE): Inventory {
    const inventory: Inventory = {
        slots: Array.from({ length: size }, (): InventorySlot => ({ itemId: null, quantity: 0 })),
    };

    if (initial) {
        for (const [itemId, quantity] of Object.entries(initial) as Array<[ItemId, number | undefined]>) {
            if ((quantity ?? 0) > 0) {
                addItem(inventory, itemId, quantity ?? 0);
            }
        }
    }

    return inventory;
}

export function isInventoryEmpty(inventory: Inventory): boolean {
    return inventory.slots.every((slot) => !slot.itemId || slot.quantity <= 0);
}

export function cloneInventory(inventory: Inventory): Inventory {
    return {
        slots: inventory.slots.map((slot) => ({ itemId: slot.itemId, quantity: slot.quantity })),
    };
}

export function getItemCount(inventory: Inventory, itemId: ItemId): number {
    let total = 0;
    for (const slot of inventory.slots) {
        if (slot.itemId === itemId) total += slot.quantity;
    }
    return total;
}

export function canAddItem(inventory: Inventory, itemId: ItemId, quantity: number): boolean {
    return addItem(cloneInventory(inventory), itemId, quantity) === quantity;
}

export function addItem(inventory: Inventory, itemId: ItemId, quantity: number): number {
    if (quantity <= 0) return 0;
    const itemDef = ITEM_DEFS[itemId];
    if (!itemDef) return 0;

    let remaining = quantity;
    const stackSize = itemDef.stackSize;

    for (const slot of inventory.slots) {
        if (slot.itemId !== itemId || slot.quantity >= stackSize) continue;
        const space = stackSize - slot.quantity;
        const moved = Math.min(space, remaining);
        slot.quantity += moved;
        remaining -= moved;
        if (remaining <= 0) return quantity;
    }

    for (const slot of inventory.slots) {
        if (slot.itemId !== null || slot.quantity !== 0) continue;
        const moved = Math.min(stackSize, remaining);
        slot.itemId = itemId;
        slot.quantity = moved;
        remaining -= moved;
        if (remaining <= 0) return quantity;
    }

    return quantity - remaining;
}

export function removeItem(inventory: Inventory, itemId: ItemId, quantity: number): boolean {
    if (quantity <= 0) return true;
    if (getItemCount(inventory, itemId) < quantity) return false;

    let remaining = quantity;
    for (const slot of inventory.slots) {
        if (slot.itemId !== itemId) continue;
        const taken = Math.min(slot.quantity, remaining);
        slot.quantity -= taken;
        remaining -= taken;
        if (slot.quantity <= 0) {
            slot.itemId = null;
            slot.quantity = 0;
        }
        if (remaining <= 0) return true;
    }
    return remaining <= 0;
}

export function hasItems(inventory: Inventory, cost: Partial<Record<InventoryKey, number>>): boolean {
    for (const itemId of Object.keys(cost) as InventoryKey[]) {
        if (getItemCount(inventory, itemId) < (cost[itemId] ?? 0)) {
            return false;
        }
    }
    return true;
}

export function consumeItems(inventory: Inventory, cost: Partial<Record<InventoryKey, number>>): boolean {
    if (!hasItems(inventory, cost)) return false;
    for (const itemId of Object.keys(cost) as InventoryKey[]) {
        removeItem(inventory, itemId, cost[itemId] ?? 0);
    }
    return true;
}

export function addItems(inventory: Inventory, items: Partial<Record<InventoryKey, number>>): boolean {
    const snapshot = cloneInventory(inventory);
    for (const itemId of Object.keys(items) as InventoryKey[]) {
        const quantity = items[itemId] ?? 0;
        if (quantity <= 0) continue;
        if (addItem(snapshot, itemId, quantity) < quantity) {
            return false;
        }
    }
    inventory.slots = snapshot.slots;
    return true;
}

export function getInventorySummary(inventory: Inventory): string[] {
    return inventory.slots.map((slot, index) => {
        if (!slot.itemId || slot.quantity <= 0) {
            return `${index + 1}:-`;
        }
        return `${index + 1}:${slot.itemId}x${slot.quantity}`;
    });
}

export function updateNeeds(needs: PlayerNeeds, delta: number, hungerRateMultiplier = 1): void {
    const baseHungerPerSecond = 100 / (180 * 3);
    needs.hunger = clamp(needs.hunger - delta * baseHungerPerSecond * hungerRateMultiplier, 0, 100);
    if (needs.hunger <= 0) {
        needs.health = clamp(needs.health - delta * 6, 0, 100);
    } else {
        needs.health = clamp(needs.health + delta * 1.2, 0, 100);
    }
}

export function markResourceHarvested(
    key: string,
    type: ResourceType,
    worldTime: number,
    resourceRespawnAt: Map<string, number>,
): void {
    const respawnSeconds = getResourceDefinition(type)?.respawnSeconds ?? 180;
    resourceRespawnAt.set(key, worldTime + respawnSeconds);
}

export interface GatherContext {
    playerX: number;
    playerY: number;
    worldTime: number;
    inventory: Inventory;
    needs: PlayerNeeds;
    resourceRespawnAt: Map<string, number>;
    plantedTrees: Map<string, number>;
    stoneHealth: Map<string, number>;
    structures: Map<string, StructureType>;
    farmProgress: Map<string, number>;
}

export function tryGather(ctx: GatherContext): string | null {
    const centerTx = worldToTile(ctx.playerX);
    const centerTy = worldToTile(ctx.playerY);

    const growableHarvest = findNearestMatureGrowable(
        centerTx, centerTy, ctx.playerX, ctx.playerY,
        ctx.structures, ctx.farmProgress,
    );
    if (growableHarvest) {
        const yieldAmount = Phaser.Math.Between(5, 9);
        if (!canAddItem(ctx.inventory, 'food', yieldAmount)) {
            return 'Inventory full for crops.';
        }
        ctx.farmProgress.set(growableHarvest.key, 0);
        addItem(ctx.inventory, 'food', yieldAmount);
        return 'Harvested crops (+food).';
    }

    let target: { tx: number; ty: number; type: ResourceType; distance: number } | null = null;

    for (let y = centerTy - 2; y <= centerTy + 2; y += 1) {
        for (let x = centerTx - 2; x <= centerTx + 2; x += 1) {
            const resource = getResourceAt(
                x, y, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth,
            );
            if (!resource) continue;
            const wx = tileToWorldCenter(x);
            const wy = tileToWorldCenter(y);
            const distance = Phaser.Math.Distance.Between(ctx.playerX, ctx.playerY, wx, wy);
            if (distance > INTERACT_DISTANCE) continue;
            if (!target || distance < target.distance) {
                target = { tx: x, ty: y, type: resource, distance };
            }
        }
    }

    if (!target) return 'Nothing to gather nearby.';

    const resourceDef = getResourceDefinition(target.type);
    const primaryDrop = resourceDef?.drops[0];
    if (!resourceDef || !primaryDrop) return 'Nothing to gather nearby.';

    const yieldAmount = Phaser.Math.Between(primaryDrop.min, primaryDrop.max);
    const itemId: ItemId = primaryDrop.itemId;
    if (!canAddItem(ctx.inventory, itemId, yieldAmount)) {
        return 'Inventory full.';
    }

    const key = tileKey(target.tx, target.ty);
    addItem(ctx.inventory, itemId, yieldAmount);

    if (target.type === 'tree') {
        if (ctx.plantedTrees.has(key)) {
            ctx.plantedTrees.delete(key);
        } else {
            markResourceHarvested(key, target.type, ctx.worldTime, ctx.resourceRespawnAt);
        }

        const bonusDrop = resourceDef.bonusDrop;
        if (bonusDrop && Phaser.Math.FloatBetween(0, 1) < bonusDrop.chance && canAddItem(ctx.inventory, bonusDrop.itemId, bonusDrop.quantity)) {
            addItem(ctx.inventory, bonusDrop.itemId, bonusDrop.quantity);
            return `Chopped wood + ${bonusDrop.itemId}.`;
        }
        return 'Chopped wood.';
    }
    if (target.type === 'stone') {
        const hitsLeft = (ctx.stoneHealth.get(key) ?? resourceDef.maxHits ?? 3) - 1;
        ctx.stoneHealth.set(key, Math.max(0, hitsLeft));
        return 'Mined stone.';
    }

    markResourceHarvested(key, target.type, ctx.worldTime, ctx.resourceRespawnAt);

    ctx.needs.hunger = clamp(ctx.needs.hunger + (resourceDef.grantsHunger ?? 0), 0, 100);
    return 'Picked berries (+hunger).';
}

function findNearestMatureGrowable(
    centerTx: number, centerTy: number,
    playerX: number, playerY: number,
    structures: Map<string, StructureType>,
    farmProgress: Map<string, number>,
): { key: string } | null {
    let best: { key: string; distance: number } | null = null;
    for (let y = centerTy - 2; y <= centerTy + 2; y += 1) {
        for (let x = centerTx - 2; x <= centerTx + 2; x += 1) {
            const key = tileKey(x, y);
            const structure = structures.get(key);
            if (!structure || !getGrowableDefinition(structure)) continue;
            const progress = farmProgress.get(key) ?? 0;
            if (progress < 1) continue;
            const wx = tileToWorldCenter(x);
            const wy = tileToWorldCenter(y);
            const distance = Phaser.Math.Distance.Between(playerX, playerY, wx, wy);
            if (distance > INTERACT_DISTANCE) continue;
            if (!best || distance < best.distance) {
                best = { key, distance };
            }
        }
    }
    return best;
}

export function tryCook(
    inventory: Inventory,
    playerX: number, playerY: number,
    structures: Map<string, StructureType>,
): string {
    return tryProcessItem('food', inventory, playerX, playerY, structures);
}

export function tryPlantTree(
    tx: number,
    ty: number,
    inventory: Inventory,
    worldTime: number,
    resourceRespawnAt: Map<string, number>,
    structures: Map<string, StructureType>,
    plantedTrees: Map<string, number>,
    stoneHealth: Map<string, number>,
): string {
    return tryPlantItem('sapling', tx, ty, inventory, worldTime, resourceRespawnAt, structures, plantedTrees, stoneHealth);
}

export function tryPlantItem(
    itemId: ItemId,
    tx: number,
    ty: number,
    inventory: Inventory,
    worldTime: number,
    resourceRespawnAt: Map<string, number>,
    structures: Map<string, StructureType>,
    plantedTrees: Map<string, number>,
    stoneHealth: Map<string, number>,
): string {
    const key = tileKey(tx, ty);
    const ground = getGroundAt(tx, ty);
    const plantable = getPlantableDefinition(itemId);
    if (!plantable) return 'This item cannot be planted.';

    if (!plantable.validGrounds.includes(ground)) return plantable.invalidGroundMessage;
    if (structures.has(key)) return plantable.occupiedMessage;
    if (plantedTrees.has(key)) return `${plantable.growsInto} already planted.`;
    if (getResourceAt(tx, ty, worldTime, resourceRespawnAt, structures, plantedTrees, stoneHealth)) {
        return 'Clear the resource first (E).';
    }
    if (getItemCount(inventory, itemId) <= 0) return plantable.needMessage;

    removeItem(inventory, itemId, 1);
    plantedTrees.set(key, worldTime + plantable.growSeconds);
    return plantable.successMessage;
}

export function transferHeldItemToChest(
    playerInventory: Inventory,
    activeSlotIndex: number,
    chestInventory: Inventory,
): string {
    const slot = playerInventory.slots[activeSlotIndex];
    if (!slot || !slot.itemId || slot.quantity <= 0) return 'Hold something first.';
    if (!canAddItem(chestInventory, slot.itemId, slot.quantity)) return 'Chest is full.';
    addItem(chestInventory, slot.itemId, slot.quantity);
    removeItem(playerInventory, slot.itemId, slot.quantity);
    return `Stored ${slot.itemId}.`;
}

export function transferFirstChestItemToInventory(
    chestInventory: Inventory,
    playerInventory: Inventory,
): string {
    const slot = chestInventory.slots.find((entry) => entry.itemId && entry.quantity > 0);
    if (!slot || !slot.itemId) return 'Chest is empty.';
    if (!canAddItem(playerInventory, slot.itemId, slot.quantity)) return 'No room in bag.';
    addItem(playerInventory, slot.itemId, slot.quantity);
    removeItem(chestInventory, slot.itemId, slot.quantity);
    return `Took ${slot.itemId}.`;
}

export function createStorageInventory(size: number): Inventory {
    return createInventory(undefined, size);
}

export function tryCraftAtStation(
    inventory: Inventory,
    recipeId: RecipeId,
): string {
    const recipe = CRAFT_RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe) return 'Unknown recipe.';
    return craftRecipe(inventory, recipe);
}

export function canCraftRecipe(inventory: Inventory, recipe: CraftRecipe): boolean {
    for (const itemId of Object.keys(recipe.cost) as InventoryKey[]) {
        if (getItemCount(inventory, itemId) < (recipe.cost[itemId] ?? 0)) return false;
    }
    return canAddItem(inventory, recipe.output.itemId, recipe.output.quantity);
}

function craftRecipe(inventory: Inventory, recipe: CraftRecipe): string {
    for (const itemId of Object.keys(recipe.cost) as InventoryKey[]) {
        const amount = recipe.cost[itemId] ?? 0;
        if (getItemCount(inventory, itemId) < amount) {
            return `Need ${amount} ${itemId} for ${recipe.label.toLowerCase()}.`;
        }
    }
    if (!canAddItem(inventory, recipe.output.itemId, recipe.output.quantity)) {
        return `No space for ${recipe.label.toLowerCase()}.`;
    }
    consumeItems(inventory, recipe.cost);
    addItem(inventory, recipe.output.itemId, recipe.output.quantity);
    return `Crafted ${recipe.output.quantity} ${recipe.label.toLowerCase()}.`;
}

export function tryEatRaw(inventory: Inventory, needs: PlayerNeeds): string {
    return tryConsumeItem('food', inventory, needs);
}

export function tryEatRation(inventory: Inventory, needs: PlayerNeeds): string {
    return tryConsumeItem('ration', inventory, needs);
}

export function tryConsumeItem(itemId: ItemId, inventory: Inventory, needs: PlayerNeeds): string {
    const consumable = getConsumableDefinition(itemId);
    if (!consumable) return 'This item cannot be used.';
    if (getItemCount(inventory, itemId) <= 0) return consumable.emptyMessage;
    const hungerFull = (consumable.hunger ?? 0) > 0 && needs.hunger >= 100;
    const healthFull = (consumable.health ?? 0) > 0 && needs.health >= 100;
    if (hungerFull && ((consumable.health ?? 0) === 0 || healthFull)) return consumable.blockedMessage;
    removeItem(inventory, itemId, 1);
    needs.hunger = clamp(needs.hunger + (consumable.hunger ?? 0), 0, 100);
    needs.health = clamp(needs.health + (consumable.health ?? 0), 0, 100);
    return consumable.consumeMessage;
}

export function tryProcessItem(
    itemId: ItemId,
    inventory: Inventory,
    playerX: number,
    playerY: number,
    structures: Map<string, StructureType>,
): string {
    const processable = getProcessableDefinition(itemId);
    if (!processable) return 'This item cannot be processed.';
    if (!hasItems(inventory, processable.cost)) return processable.missingMessage;
    if (!hasNearbyStation(playerX, playerY, 4, structures, processable.station)) {
        return `Need a ${getStationLabel(processable.station).toLowerCase()} nearby.`;
    }
    if (!canAddItem(inventory, processable.output.itemId, processable.output.quantity)) {
        return processable.noSpaceMessage;
    }
    consumeItems(inventory, processable.cost);
    addItem(inventory, processable.output.itemId, processable.output.quantity);
    return processable.successMessage;
}

export function hasNearbyStructure(
    playerX: number, playerY: number,
    type: StructureType, rangeTiles: number,
    structures: Map<string, StructureType>,
): boolean {
    const centerTx = worldToTile(playerX);
    const centerTy = worldToTile(playerY);
    const maxDist = rangeTiles * INTERACT_DISTANCE / 1.8;
    for (let y = centerTy - rangeTiles; y <= centerTy + rangeTiles; y += 1) {
        for (let x = centerTx - rangeTiles; x <= centerTx + rangeTiles; x += 1) {
            if (structures.get(tileKey(x, y)) === type) {
                const wx = tileToWorldCenter(x);
                const wy = tileToWorldCenter(y);
                const distance = Phaser.Math.Distance.Between(playerX, playerY, wx, wy);
                if (distance <= maxDist) return true;
            }
        }
    }
    return false;
}
