import Phaser from 'phaser';
import type { Inventory, InventoryKey, ResourceType } from './constants';
import { CRAFT_RECIPES, INTERACT_DISTANCE, clamp, tileKey, tileToWorldCenter, worldToTile } from './constants';
import {
    addItem,
    canAddItem,
    consumeItems,
    createStorageInventory,
    getItemCount,
    hasItems,
    isInventoryEmpty,
    removeItem,
} from './inventory';
import { getGroundAt, getResourceAt } from './terrain';
import {
    getConsumableDefinition,
    getGrowableDefinition,
    getPlaceableItemForStructure,
    getPickupReturnItem,
    getPlantableDefinition,
    getProcessableDefinition,
    getRecipeDefinition,
    getResourceBreakableDefinition,
    getResourceDefinition,
    getResourceLabel,
    getStationLabel,
    getStorageSlots,
    getStorageStructureAt,
    getStructureBreakableDefinition,
    getStructureBuildCost,
    getStructureLabel,
    getToolDefinition,
    hasNearbyStation,
} from '../content/capabilities';
import type { CommandContext, GameCommand } from './commandTypes';
import type { DroppedItem } from './worldState';

const BREAK_DROP_PICKUP_DELAY = 0.35;

interface ToolStats {
    tags: string[];
    power: number;
    speed: number;
}

function getHeldToolStats(ctx: CommandContext): ToolStats {
    const tool = ctx.heldItemId ? getToolDefinition(ctx.heldItemId) : undefined;
    if (!tool) return { tags: ['hand'], power: 1, speed: 1 };
    return {
        tags: tool.tags,
        power: tool.power ?? 1,
        speed: tool.speed ?? 1,
    };
}

function getEffectiveBreakValues(
    preferredToolTags: string[] | undefined,
    ctx: CommandContext,
    effectivePower: number,
    ineffectivePower: number,
    effectiveDropMultiplier: number,
    ineffectiveDropMultiplier: number,
): { power: number; dropMultiplier: number; speed: number } {
    const tool = getHeldToolStats(ctx);
    const effective = !preferredToolTags || preferredToolTags.length === 0 || preferredToolTags.some((tag) => tool.tags.includes(tag));
    return {
        power: tool.power * (effective ? effectivePower : ineffectivePower),
        dropMultiplier: effective ? effectiveDropMultiplier : ineffectiveDropMultiplier,
        speed: tool.speed,
    };
}

function scaleDrops(
    drops: Array<{ itemId: string; min: number; max: number }>,
    dropMultiplier: number,
): Array<{ itemId: string; quantity: number }> {
    return drops
        .map((drop) => ({
            itemId: drop.itemId,
            quantity: Math.max(0, Math.round(Phaser.Math.Between(drop.min, drop.max) * dropMultiplier)),
        }))
        .filter((drop) => drop.quantity > 0);
}

function spawnDroppedItems(
    ctx: CommandContext,
    drops: Array<{ itemId: string; quantity: number }>,
    originX: number,
    originY: number,
    speedMin: number,
    speedMax: number,
    pickupDelay: number,
): void {
    for (const drop of drops) {
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.FloatBetween(speedMin, speedMax);
        const worldDrop: DroppedItem = {
            id: `drop-${Math.round(ctx.worldTime * 1000)}-${Math.floor(Math.random() * 1000000)}`,
            itemId: drop.itemId,
            quantity: drop.quantity,
            x: originX + Math.cos(angle) * Phaser.Math.FloatBetween(2, 5),
            y: originY + Math.sin(angle) * Phaser.Math.FloatBetween(2, 5),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            spawnedAt: ctx.worldTime,
            pickupDelay,
        };
        ctx.droppedItems.set(worldDrop.id, worldDrop);
    }
}

function getBreakContext(command: GameCommand, ctx: CommandContext) {
    if (command.tx === undefined || command.ty === undefined || !command.tileKey) return null;
    const structure = ctx.structures.get(command.tileKey);
    const resource = getResourceAt(
        command.tx,
        command.ty,
        ctx.worldTime,
        ctx.resourceRespawnAt,
        ctx.structures,
        ctx.plantedTrees,
        ctx.stoneHealth,
    );
    const growable = structure ? getGrowableDefinition(structure) : undefined;
    const growProgress = growable ? (ctx.farmProgress.get(command.tileKey) ?? 0) : 0;
    return { structure, resource, growable, growProgress };
}

function markResourceHarvested(
    key: string,
    type: ResourceType,
    worldTime: number,
    resourceRespawnAt: Map<string, number>,
): void {
    const respawnSeconds = getResourceDefinition(type)?.respawnSeconds ?? 180;
    resourceRespawnAt.set(key, worldTime + respawnSeconds);
}

function findNearestMatureGrowable(ctx: CommandContext): { key: string; distance: number } | null {
    const centerTx = worldToTile(ctx.playerX);
    const centerTy = worldToTile(ctx.playerY);
    let best: { key: string; distance: number } | null = null;

    for (let y = centerTy - 2; y <= centerTy + 2; y += 1) {
        for (let x = centerTx - 2; x <= centerTx + 2; x += 1) {
            const key = tileKey(x, y);
            const structure = ctx.structures.get(key);
            if (!structure || !getGrowableDefinition(structure)) continue;
            const progress = ctx.farmProgress.get(key) ?? 0;
            if (progress < 1) continue;
            const distance = Phaser.Math.Distance.Between(ctx.playerX, ctx.playerY, tileToWorldCenter(x), tileToWorldCenter(y));
            if (distance > INTERACT_DISTANCE) continue;
            if (!best || distance < best.distance) {
                best = { key, distance };
            }
        }
    }

    return best;
}

function gatherNearbyTarget(ctx: CommandContext): { tx: number; ty: number; type: ResourceType; distance: number } | null {
    const centerTx = worldToTile(ctx.playerX);
    const centerTy = worldToTile(ctx.playerY);
    let target: { tx: number; ty: number; type: ResourceType; distance: number } | null = null;

    for (let y = centerTy - 2; y <= centerTy + 2; y += 1) {
        for (let x = centerTx - 2; x <= centerTx + 2; x += 1) {
            const resource = getResourceAt(
                x, y, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth,
            );
            if (!resource) continue;
            const distance = Phaser.Math.Distance.Between(ctx.playerX, ctx.playerY, tileToWorldCenter(x), tileToWorldCenter(y));
            if (distance > INTERACT_DISTANCE) continue;
            if (!target || distance < target.distance) {
                target = { tx: x, ty: y, type: resource, distance };
            }
        }
    }

    return target;
}

function craftRecipe(inventory: Inventory, recipeId: string): string {
    const recipe = getRecipeDefinition(recipeId) ?? CRAFT_RECIPES.find((entry) => entry.id === recipeId);
    if (!recipe) return 'Unknown recipe.';

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

export function getBreakDurationSeconds(command: GameCommand, ctx: CommandContext): number {
    const breakCtx = getBreakContext(command, ctx);
    if (!breakCtx) return 0.25;

    if (breakCtx.resource) {
        const breakable = getResourceBreakableDefinition(breakCtx.resource);
        const effective = getEffectiveBreakValues(
            breakable?.preferredToolTags,
            ctx,
            breakable?.effectivePower ?? 1,
            breakable?.ineffectivePower ?? 0.85,
            breakable?.effectiveDropMultiplier ?? 1,
            breakable?.ineffectiveDropMultiplier ?? 1,
        );
        const hardness = breakable?.hardness ?? 0.28;
        return Phaser.Math.Clamp(hardness / Math.max(0.2, effective.power * effective.speed), 0.12, 0.9);
    }

    if (breakCtx.structure) {
        const breakable = getStructureBreakableDefinition(breakCtx.structure);
        const effective = getEffectiveBreakValues(
            breakable?.preferredToolTags,
            ctx,
            breakable?.effectivePower ?? 1,
            breakable?.ineffectivePower ?? 0.9,
            breakable?.effectiveDropMultiplier ?? 1,
            breakable?.ineffectiveDropMultiplier ?? 1,
        );
        const hardness = breakable?.hardness ?? 0.28;
        return Phaser.Math.Clamp(hardness / Math.max(0.2, effective.power * effective.speed), 0.14, 1.1);
    }

    return 0.25;
}

export function executeBreakAction(command: GameCommand, ctx: CommandContext): string {
    const breakCtx = getBreakContext(command, ctx);
    if (!breakCtx || command.tx === undefined || command.ty === undefined || !command.tileKey) return 'Nothing to break.';

    if (breakCtx.resource) {
        const resourceDef = getResourceDefinition(breakCtx.resource);
        const breakable = getResourceBreakableDefinition(breakCtx.resource);
        if (!resourceDef) return 'Nothing to break.';

        const effective = getEffectiveBreakValues(
            breakable?.preferredToolTags,
            ctx,
            breakable?.effectivePower ?? 1,
            breakable?.ineffectivePower ?? 0.85,
            breakable?.effectiveDropMultiplier ?? 1,
            breakable?.ineffectiveDropMultiplier ?? 1,
        );

        if (breakCtx.resource === 'stone') {
            const hitsLeft = Math.max(0, (ctx.stoneHealth.get(command.tileKey) ?? resourceDef.maxHits ?? 3) - 1);
            ctx.stoneHealth.set(command.tileKey, hitsLeft);
            if (hitsLeft > 0) return `Mining stone... ${hitsLeft} hits left.`;

            const drops = scaleDrops(breakable?.drops ?? resourceDef.drops, effective.dropMultiplier);
            spawnDroppedItems(ctx, drops, tileToWorldCenter(command.tx), tileToWorldCenter(command.ty), 18, 32, BREAK_DROP_PICKUP_DELAY);
            markResourceHarvested(command.tileKey, breakCtx.resource, ctx.worldTime, ctx.resourceRespawnAt);
            return `Broke stone deposit.${drops.length > 0 ? ` +${drops.map((drop) => `${drop.quantity} ${drop.itemId}`).join(', ')}` : ''}`;
        }

        const drops = scaleDrops(breakable?.drops ?? resourceDef.drops, effective.dropMultiplier);
        spawnDroppedItems(ctx, drops, tileToWorldCenter(command.tx), tileToWorldCenter(command.ty), 18, 32, BREAK_DROP_PICKUP_DELAY);

        if (breakCtx.resource === 'tree') {
            if (ctx.plantedTrees.has(command.tileKey)) ctx.plantedTrees.delete(command.tileKey);
            else markResourceHarvested(command.tileKey, breakCtx.resource, ctx.worldTime, ctx.resourceRespawnAt);
            const bonusDrop = resourceDef.bonusDrop;
            if (bonusDrop && Phaser.Math.FloatBetween(0, 1) < bonusDrop.chance) {
                spawnDroppedItems(ctx, [{ itemId: bonusDrop.itemId, quantity: bonusDrop.quantity }], tileToWorldCenter(command.tx), tileToWorldCenter(command.ty), 18, 32, BREAK_DROP_PICKUP_DELAY);
                return `Broke tree. +${drops.map((drop) => `${drop.quantity} ${drop.itemId}`).join(', ')}, +${bonusDrop.quantity} ${bonusDrop.itemId}`;
            }
            return `Broke tree.${drops.length > 0 ? ` +${drops.map((drop) => `${drop.quantity} ${drop.itemId}`).join(', ')}` : ''}`;
        }

        markResourceHarvested(command.tileKey, breakCtx.resource, ctx.worldTime, ctx.resourceRespawnAt);
        return `Collected ${getResourceLabel(breakCtx.resource)}.${drops.length > 0 ? ` +${drops.map((drop) => `${drop.quantity} ${drop.itemId}`).join(', ')}` : ''}`;
    }

    if (breakCtx.structure) {
        const storageSlots = getStorageSlots(breakCtx.structure);
        const structureBreakable = getStructureBreakableDefinition(breakCtx.structure);
        const effective = getEffectiveBreakValues(
            structureBreakable?.preferredToolTags,
            ctx,
            structureBreakable?.effectivePower ?? 1,
            structureBreakable?.ineffectivePower ?? 0.9,
            structureBreakable?.effectiveDropMultiplier ?? 1,
            structureBreakable?.ineffectiveDropMultiplier ?? 1,
        );
        const drops = scaleDrops(structureBreakable?.drops ?? [], effective.dropMultiplier);

        if (storageSlots !== null) {
            const chestInventory = ctx.chestInventories.get(command.tileKey) ?? createStorageInventory(storageSlots);
            const chestDrops = chestInventory.slots
                .filter((slot) => slot.itemId && slot.quantity > 0)
                .map((slot) => ({ itemId: slot.itemId!, quantity: slot.quantity }));
            const pickupItemId = getPickupReturnItem(breakCtx.structure) ?? getPlaceableItemForStructure(breakCtx.structure);
            const allDrops = [...drops];
            if (pickupItemId) allDrops.unshift({ itemId: pickupItemId, quantity: 1 });
            allDrops.push(...chestDrops);
            spawnDroppedItems(ctx, allDrops, tileToWorldCenter(command.tx), tileToWorldCenter(command.ty), 16, 28, BREAK_DROP_PICKUP_DELAY);
            ctx.chestInventories.delete(command.tileKey);
            ctx.structures.delete(command.tileKey);
            return `Broke ${getStructureLabel(breakCtx.structure)}.`;
        }

        const pickupItemId = getPickupReturnItem(breakCtx.structure) ?? getPlaceableItemForStructure(breakCtx.structure);
        const allDrops = [...drops];
        if (pickupItemId) {
            allDrops.unshift({ itemId: pickupItemId, quantity: 1 });
        } else {
            const cost = getStructureBuildCost(breakCtx.structure);
            for (const itemId of Object.keys(cost) as InventoryKey[]) {
                const amount = Math.max(1, Math.floor((cost[itemId] ?? 0) * 0.5 * effective.dropMultiplier));
                if (amount > 0) allDrops.push({ itemId, quantity: amount });
            }
        }
        spawnDroppedItems(ctx, allDrops, tileToWorldCenter(command.tx), tileToWorldCenter(command.ty), 16, 28, BREAK_DROP_PICKUP_DELAY);
        ctx.structures.delete(command.tileKey);
        ctx.farmProgress.delete(command.tileKey);
        return `Broke ${getStructureLabel(breakCtx.structure)}.`;
    }

    return 'Nothing to break.';
}

export function executeGatherAction(ctx: CommandContext): string {
    const matureGrowable = findNearestMatureGrowable(ctx);
    if (matureGrowable) {
        const yieldAmount = Phaser.Math.Between(5, 9);
        if (!canAddItem(ctx.inventory, 'food', yieldAmount)) return 'Inventory full for crops.';
        ctx.farmProgress.set(matureGrowable.key, 0);
        addItem(ctx.inventory, 'food', yieldAmount);
        return 'Harvested crops (+food).';
    }

    const target = gatherNearbyTarget(ctx);
    if (!target) return 'Nothing to gather nearby.';

    const resourceDef = getResourceDefinition(target.type);
    const primaryDrop = resourceDef?.drops[0];
    if (!resourceDef || !primaryDrop) return 'Nothing to gather nearby.';

    const yieldAmount = Phaser.Math.Between(primaryDrop.min, primaryDrop.max);
    if (!canAddItem(ctx.inventory, primaryDrop.itemId, yieldAmount)) return 'Inventory full.';

    const key = tileKey(target.tx, target.ty);
    addItem(ctx.inventory, primaryDrop.itemId, yieldAmount);

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

export function executePlantAction(command: GameCommand, ctx: CommandContext): string {
    if (ctx.heldItemId === null || command.tx === undefined || command.ty === undefined) return 'Nothing to plant.';

    const key = tileKey(command.tx, command.ty);
    const ground = getGroundAt(command.tx, command.ty);
    const plantable = getPlantableDefinition(ctx.heldItemId);
    if (!plantable) return 'This item cannot be planted.';
    if (!plantable.validGrounds.includes(ground)) return plantable.invalidGroundMessage;
    if (ctx.structures.has(key)) return plantable.occupiedMessage;
    if (ctx.plantedTrees.has(key)) return `${plantable.growsInto} already planted.`;
    if (getResourceAt(command.tx, command.ty, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth)) {
        return 'Clear the resource first (E).';
    }
    if (getItemCount(ctx.inventory, ctx.heldItemId) <= 0) return plantable.needMessage;

    removeItem(ctx.inventory, ctx.heldItemId, 1);
    ctx.plantedTrees.set(key, ctx.worldTime + plantable.growSeconds);
    return plantable.successMessage;
}

export function executePlaceStructureAction(command: GameCommand, ctx: CommandContext): string {
    if (!ctx.selectedStructure || command.tx === undefined || command.ty === undefined || !command.tileKey) return 'Nothing placeable in hand.';
    if (ctx.structures.has(command.tileKey)) return 'Tile already occupied.';
    if (getGroundAt(command.tx, command.ty) === 'water') return 'Cannot build on water.';
    if (getResourceAt(command.tx, command.ty, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth)) {
        return 'Clear the resource first (E).';
    }

    const cost = getStructureBuildCost(ctx.selectedStructure);
    for (const itemId of Object.keys(cost) as InventoryKey[]) {
        const amount = cost[itemId] ?? 0;
        if (getItemCount(ctx.inventory, itemId) < amount) return 'Not enough resources for that.';
    }

    consumeItems(ctx.inventory, cost);
    ctx.structures.set(command.tileKey, ctx.selectedStructure);

    if (getGrowableDefinition(ctx.selectedStructure) && !ctx.farmProgress.has(command.tileKey)) {
        ctx.farmProgress.set(command.tileKey, 0);
    }

    const storageSlots = getStorageSlots(ctx.selectedStructure);
    if (storageSlots !== null && !ctx.chestInventories.has(command.tileKey)) {
        ctx.chestInventories.set(command.tileKey, createStorageInventory(storageSlots));
    }

    return `Built ${getStructureLabel(ctx.selectedStructure)}.`;
}

export function executeRemoveStructureAction(command: GameCommand, ctx: CommandContext): string {
    if (!command.tileKey) return 'Nothing to remove.';

    const structure = ctx.structures.get(command.tileKey);
    if (!structure) return 'Nothing to remove.';

    const storageSlots = getStorageSlots(structure);
    if (storageSlots !== null) {
        const chestInventory = ctx.chestInventories.get(command.tileKey) ?? createStorageInventory(storageSlots);
        if (!isInventoryEmpty(chestInventory)) return 'Empty the chest first.';
        const returnItemId = getPickupReturnItem(structure);
        if (!returnItemId) return 'Cannot pick that up.';
        if (addItem(ctx.inventory, returnItemId, 1) < 1) return `No room to pick up ${returnItemId}.`;
        ctx.chestInventories.delete(command.tileKey);
        ctx.structures.delete(command.tileKey);
        return `Picked up ${returnItemId}.`;
    }

    const cost = getStructureBuildCost(structure);
    for (const itemId of Object.keys(cost) as InventoryKey[]) {
        const amount = cost[itemId] ?? 0;
        addItem(ctx.inventory, itemId, Math.max(1, Math.floor(amount * 0.5)));
    }

    ctx.structures.delete(command.tileKey);
    return `Removed ${getStructureLabel(structure)}.`;
}

export function executeStoreItemAction(command: GameCommand, ctx: CommandContext): string {
    if (!command.tileKey) return 'Point at a storage object.';

    let storageInventory = ctx.chestInventories.get(command.tileKey);
    if (!storageInventory) {
        const storage = getStorageStructureAt(ctx.structures, command.tileKey);
        if (!storage) return 'No storage here.';
        storageInventory = createStorageInventory(storage.slots);
        ctx.chestInventories.set(command.tileKey, storageInventory);
    }

    const slot = ctx.inventory.slots[ctx.activeSlotIndex];
    if (!slot || !slot.itemId || slot.quantity <= 0) return 'Hold something first.';
    if (!canAddItem(storageInventory, slot.itemId, slot.quantity)) return 'Chest is full.';
    addItem(storageInventory, slot.itemId, slot.quantity);
    removeItem(ctx.inventory, slot.itemId, slot.quantity);
    return `Stored ${slot.itemId}.`;
}

export function executeTakeItemAction(command: GameCommand, ctx: CommandContext): string {
    if (!command.tileKey) return 'Point at a storage object.';

    let storageInventory = ctx.chestInventories.get(command.tileKey);
    if (!storageInventory) {
        const storage = getStorageStructureAt(ctx.structures, command.tileKey);
        if (!storage) return 'No storage here.';
        storageInventory = createStorageInventory(storage.slots);
        ctx.chestInventories.set(command.tileKey, storageInventory);
    }

    const slot = storageInventory.slots.find((entry) => entry.itemId && entry.quantity > 0);
    if (!slot || !slot.itemId) return 'Chest is empty.';
    if (!canAddItem(ctx.inventory, slot.itemId, slot.quantity)) return 'No room in bag.';
    addItem(ctx.inventory, slot.itemId, slot.quantity);
    removeItem(storageInventory, slot.itemId, slot.quantity);
    return `Took ${slot.itemId}.`;
}

export function executeUseItemAction(ctx: CommandContext): string {
    if (!ctx.heldItemId) return 'Hold a usable item to use.';

    const consumable = getConsumableDefinition(ctx.heldItemId);
    if (!consumable) return 'This item cannot be used.';
    if (getItemCount(ctx.inventory, ctx.heldItemId) <= 0) return consumable.emptyMessage;

    const hungerFull = (consumable.hunger ?? 0) > 0 && ctx.needs.hunger >= 100;
    const healthFull = (consumable.health ?? 0) > 0 && ctx.needs.health >= 100;
    if (hungerFull && ((consumable.health ?? 0) === 0 || healthFull)) return consumable.blockedMessage;

    removeItem(ctx.inventory, ctx.heldItemId, 1);
    ctx.needs.hunger = clamp(ctx.needs.hunger + (consumable.hunger ?? 0), 0, 100);
    ctx.needs.health = clamp(ctx.needs.health + (consumable.health ?? 0), 0, 100);
    return consumable.consumeMessage;
}

export function executeCraftRecipeAction(ctx: CommandContext): string {
    const recipe = getRecipeDefinition(ctx.selectedRecipeId) ?? CRAFT_RECIPES.find((entry) => entry.id === ctx.selectedRecipeId);
    if (!recipe) return 'Unknown recipe.';
    if (recipe.station && !hasNearbyStation(ctx.playerX, ctx.playerY, 4, ctx.structures, recipe.station)) {
        return `Need a ${getStationLabel(recipe.station).toLowerCase()} nearby.`;
    }
    return craftRecipe(ctx.inventory, ctx.selectedRecipeId);
}

export function executeProcessItemAction(ctx: CommandContext): string {
    if (!ctx.heldItemId) return 'Nothing to process.';

    const processable = getProcessableDefinition(ctx.heldItemId);
    if (!processable) return 'This item cannot be processed.';
    if (!hasItems(ctx.inventory, processable.cost)) return processable.missingMessage;
    if (!hasNearbyStation(ctx.playerX, ctx.playerY, 4, ctx.structures, processable.station)) {
        return `Need a ${getStationLabel(processable.station).toLowerCase()} nearby.`;
    }
    if (!canAddItem(ctx.inventory, processable.output.itemId, processable.output.quantity)) {
        return processable.noSpaceMessage;
    }

    consumeItems(ctx.inventory, processable.cost);
    addItem(ctx.inventory, processable.output.itemId, processable.output.quantity);
    return processable.successMessage;
}
