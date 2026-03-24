import Phaser from 'phaser';
import { tileKey, tileToWorldCenter } from './constants';
import { getGroundAt, getResourceAt } from './terrain';
import {
    getCapability,
    getConsumableDefinition,
    getGrowableDefinition,
    getItemLabel,
    getPlantableDefinition,
    getProcessableDefinition,
    getRecipeDefinition,
    getResourceDefinition,
    getResourceInteractions,
    getStorageStructureAt,
    getStructureInteractions,
    getStructureLabel,
} from '../content/capabilities';
import type { ContentInteraction, ContentInspectContext } from '../content/registry';
import type { CommandContext, GameCommand } from './commandTypes';
import { registerGlobalCommandProvider, registerPointerCommandProvider } from './commandProviderRegistry';

function isInRange(ctx: CommandContext, tx: number, ty: number, rangeTiles: number): boolean {
    return Phaser.Math.Distance.Between(
        ctx.playerX,
        ctx.playerY,
        tileToWorldCenter(tx),
        tileToWorldCenter(ty),
    ) <= rangeTiles * 16;
}

function getTileContentContext(ctx: CommandContext, tx: number, ty: number): ContentInspectContext {
    const key = tileKey(tx, ty);
    const structure = ctx.structures.get(key);
    const resource = getResourceAt(
        tx, ty, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth,
    );
    const plantedTreeAt = ctx.plantedTrees.get(key);
    const storage = getStorageStructureAt(ctx.structures, key);
    const growable = structure ? getGrowableDefinition(structure) : undefined;
    const growProgress = growable ? (ctx.farmProgress.get(key) ?? 0) : 0;
    const stoneHitsLeft = resource === 'stone'
        ? (ctx.stoneHealth.get(key) ?? getResourceDefinition(resource)?.maxHits ?? 3)
        : undefined;

    return {
        tx,
        ty,
        key,
        worldTime: ctx.worldTime,
        structureId: structure,
        resourceId: resource ?? undefined,
        resourceRespawnAt: ctx.resourceRespawnAt.get(key),
        plantedTreeAt,
        growProgress,
        storageUsedSlots: ctx.chestInventories.get(key)?.slots.filter((slot) => slot.itemId && slot.quantity > 0).length ?? 0,
        storageTotalSlots: ctx.chestInventories.get(key)?.slots.length ?? storage?.slots ?? 0,
        stoneHitsLeft,
    };
}

function getContentActions(ctx: CommandContext, tx: number, ty: number): ContentInteraction[] {
    const contentCtx = getTileContentContext(ctx, tx, ty);
    return [
        ...(contentCtx.structureId ? (getStructureInteractions(contentCtx.structureId)?.(contentCtx) ?? []) : []),
        ...(contentCtx.resourceId ? (getResourceInteractions(contentCtx.resourceId)?.(contentCtx) ?? []) : []),
    ];
}

function getContentActionLabel(actions: ContentInteraction[], key: string, fallback: string): string {
    return actions.find((action) => action.key === key)?.label ?? fallback;
}

function providePointerCommands(ctx: CommandContext): GameCommand[] {
    if (!ctx.pointerTile) return [];

    const { x: tx, y: ty } = ctx.pointerTile;
    const key = tileKey(tx, ty);
    if (!isInRange(ctx, tx, ty, 3.5)) return [];

    const structure = ctx.structures.get(key);
    const storage = getStorageStructureAt(ctx.structures, key);
    const resource = getResourceAt(
        tx, ty, ctx.worldTime, ctx.resourceRespawnAt, ctx.structures, ctx.plantedTrees, ctx.stoneHealth,
    );
    const plantedTreeAt = ctx.plantedTrees.get(key);
    const growable = structure ? getGrowableDefinition(structure) : undefined;
    const growProgress = growable ? (ctx.farmProgress.get(key) ?? 0) : 0;
    const canBreak = resource !== null || !!structure || (!!growable && growProgress >= 1);
    const canPlace = !!ctx.selectedStructure && !structure && !resource && !plantedTreeAt;
    const plantable = ctx.heldItemId ? getPlantableDefinition(ctx.heldItemId) : undefined;
    const canPlant = !!plantable
        && !structure
        && !resource
        && !plantedTreeAt
        && plantable.validGrounds.includes(getGroundAt(tx, ty));
    const canStore = !!storage && !!ctx.heldItemId;
    const canTake = !!storage && !ctx.heldItemId && !!ctx.chestInventories.get(key)?.slots.some((slot) => slot.itemId && slot.quantity > 0);
    const craftStation = structure ? getCapability(structure, 'craft-station') : undefined;
    const utilityStation = structure ? getCapability(structure, 'utility-station') : undefined;
    const actions = getContentActions(ctx, tx, ty);
    const commands: GameCommand[] = [];

    if (canBreak) {
        commands.push({ id: 'break-target', key: 'LMB HOLD', label: getContentActionLabel(actions, 'LMB HOLD', 'Break the target.'), tx, ty, tileKey: key });
    }
    if (canStore) {
        commands.push({ id: 'store-item', key: 'RMB', label: getContentActionLabel(actions, 'RMB', 'Store the held item.'), tx, ty, tileKey: key });
    } else if (canTake) {
        commands.push({ id: 'take-item', key: 'RMB', label: getContentActionLabel(actions, 'RMB', 'Take items from storage.'), tx, ty, tileKey: key });
    } else if (craftStation && getRecipeDefinition(ctx.selectedRecipeId)?.station === craftStation.station) {
        const recipe = getRecipeDefinition(ctx.selectedRecipeId);
        if (recipe) commands.push({ id: 'craft-recipe', key: 'RMB', label: `Craft ${recipe.label.toLowerCase()} here.`, tx, ty, tileKey: key });
    } else if (utilityStation && ctx.heldItemId) {
        const processable = getProcessableDefinition(ctx.heldItemId);
        if (processable && processable.station === utilityStation.station) {
            commands.push({ id: 'process-item', key: 'RMB', label: `Process ${getItemLabel(ctx.heldItemId).toLowerCase()} here.`, tx, ty, tileKey: key });
        }
    }

    const placeKey = commands.some((command) => command.key === 'RMB') ? 'SHIFT+RMB' : 'RMB';
    if (canPlant && ctx.heldItemId) {
        commands.push({ id: 'plant-item', key: placeKey, label: 'Plant the held item here.', tx, ty, tileKey: key });
    } else if (canPlace && ctx.selectedStructure) {
        commands.push({ id: 'place-structure', key: placeKey, label: `Place ${getStructureLabel(ctx.selectedStructure).toLowerCase()} here.`, tx, ty, tileKey: key });
    }

    return commands;
}

function provideGlobalCommands(ctx: CommandContext): GameCommand[] {
    const commands: GameCommand[] = [];

    if (ctx.heldItemId && getConsumableDefinition(ctx.heldItemId)) {
        commands.push({ id: 'use-item', key: 'F/R', label: `Use ${getItemLabel(ctx.heldItemId).toLowerCase()}.` });
    }

    return commands;
}

export function installVanillaCommandProviders(): void {
    registerPointerCommandProvider(providePointerCommands);
    registerGlobalCommandProvider(provideGlobalCommands);
}
