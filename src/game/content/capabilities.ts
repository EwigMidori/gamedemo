import { gameContentRegistry } from '.';
import type { RegisteredEntityKind, BreakableDefinition, CapabilitySpec, ContentInspectContext, ContentInteraction } from './registry';
import { tileKey, tileToWorldCenter, type StructureType } from '../scenes/constants';
import Phaser from 'phaser';

function getEntityKind(kindId: string): RegisteredEntityKind | undefined {
    return gameContentRegistry.entityKinds.get(kindId);
}

export function getCapability<T extends CapabilitySpec['type']>(
    kindId: string,
    type: T,
): Extract<CapabilitySpec, { type: T }> | undefined {
    const kind = getEntityKind(kindId);
    return kind?.capabilities.find((capability) => capability.type === type) as Extract<CapabilitySpec, { type: T }> | undefined;
}

export function getPlaceableStructureForItem(itemId: string): string | null {
    for (const kind of gameContentRegistry.entityKinds.values()) {
        const placeable = getCapability(kind.id, 'placeable');
        if (placeable?.itemId === itemId) return kind.id;
    }
    return null;
}

export function getItemDefinition(itemId: string) {
    return gameContentRegistry.items.get(itemId);
}

export function getItemLabel(itemId: string): string {
    return getItemDefinition(itemId)?.name ?? itemId;
}

export function getConsumableDefinition(itemId: string) {
    return getItemDefinition(itemId)?.consumable;
}

export function getToolDefinition(itemId: string) {
    return getItemDefinition(itemId)?.tool;
}

export function getPlantableDefinition(itemId: string) {
    return getItemDefinition(itemId)?.plantable;
}

export function getProcessableDefinition(itemId: string) {
    return getItemDefinition(itemId)?.processable;
}

export function getPickupReturnItem(kindId: string): string | null {
    const pickupable = getCapability(kindId, 'pickupable');
    if (!pickupable) return null;
    return (pickupable.returns as string | undefined) ?? null;
}

export function getStorageSlots(kindId: string): number | null {
    const storage = getCapability(kindId, 'storage');
    return storage ? Number(storage.slots) : null;
}

export function getPlaceableItemForStructure(kindId: string): string | null {
    const placeable = getCapability(kindId, 'placeable');
    return placeable?.itemId ?? null;
}

export function isStructureBlocking(kindId: string): boolean {
    const collidable = getCapability(kindId, 'collidable');
    return Boolean(collidable?.blocks);
}

export function getStructureRenderFrame(kindId: string): number {
    const renderable = getCapability(kindId, 'renderable');
    const kind = getEntityKind(kindId);
    return Number((renderable?.frame as number | undefined) ?? kind?.frame ?? 0);
}

export function getStructureBuildCost(kindId: string): Partial<Record<string, number>> {
    return getEntityKind(kindId)?.cost ?? {};
}

export function getStructureLabel(kindId: string): string {
    return getEntityKind(kindId)?.label ?? kindId;
}

export function getStructureInspectLabel(kindId: string): string {
    const kind = getEntityKind(kindId);
    return kind?.inspectLabel ?? kind?.label ?? kindId;
}

export function getStructureInspector(kindId: string): ((ctx: ContentInspectContext) => string[]) | undefined {
    return getEntityKind(kindId)?.inspect;
}

export function getStructureInteractions(kindId: string): ((ctx: ContentInspectContext) => ContentInteraction[]) | undefined {
    return getEntityKind(kindId)?.interactions;
}

export function getStructureBreakableDefinition(kindId: string): BreakableDefinition | undefined {
    return getEntityKind(kindId)?.breakable;
}

export function getStationLabel(stationId: string): string {
    for (const kind of gameContentRegistry.entityKinds.values()) {
        const craftStation = getCapability(kind.id, 'craft-station');
        if (craftStation?.station === stationId) return kind.label;
        const utilityStation = getCapability(kind.id, 'utility-station');
        if (utilityStation?.station === stationId) return kind.label;
    }
    return stationId;
}

export function getAutotileDefinition(kindId: string): Extract<CapabilitySpec, { type: 'autotile' }> | undefined {
    return getCapability(kindId, 'autotile');
}

export function getGrowableDefinition(kindId: string): Extract<CapabilitySpec, { type: 'growable' }> | undefined {
    return getCapability(kindId, 'growable');
}

export function getLightSourceDefinition(kindId: string): Extract<CapabilitySpec, { type: 'light-source' }> | undefined {
    return getCapability(kindId, 'light-source');
}

export function hasNearbyCapability<T extends CapabilitySpec['type']>(
    playerX: number,
    playerY: number,
    rangeTiles: number,
    structures: Map<string, StructureType>,
    capabilityType: T,
    predicate?: (capability: Extract<CapabilitySpec, { type: T }>) => boolean,
): boolean {
    const centerTx = Math.floor(playerX / 16);
    const centerTy = Math.floor(playerY / 16);
    const maxDist = rangeTiles * 16 * 1.8;

    for (let y = centerTy - rangeTiles; y <= centerTy + rangeTiles; y += 1) {
        for (let x = centerTx - rangeTiles; x <= centerTx + rangeTiles; x += 1) {
            const structure = structures.get(tileKey(x, y));
            if (!structure) continue;
            const capability = getCapability(structure, capabilityType);
            if (!capability) continue;
            if (predicate && !predicate(capability)) continue;
            const distance = Phaser.Math.Distance.Between(playerX, playerY, tileToWorldCenter(x), tileToWorldCenter(y));
            if (distance <= maxDist) return true;
        }
    }
    return false;
}

export function hasNearbyStation(
    playerX: number,
    playerY: number,
    rangeTiles: number,
    structures: Map<string, StructureType>,
    stationId: string,
): boolean {
    return hasNearbyCapability(playerX, playerY, rangeTiles, structures, 'craft-station', (cap) => cap.station === stationId)
        || hasNearbyCapability(playerX, playerY, rangeTiles, structures, 'utility-station', (cap) => cap.station === stationId);
}

export function getNearbyStations(
    playerX: number,
    playerY: number,
    rangeTiles: number,
    structures: Map<string, StructureType>,
): Set<string> {
    const nearby = new Set<string>();
    const centerTx = Math.floor(playerX / 16);
    const centerTy = Math.floor(playerY / 16);
    const maxDist = rangeTiles * 16 * 1.8;

    for (let y = centerTy - rangeTiles; y <= centerTy + rangeTiles; y += 1) {
        for (let x = centerTx - rangeTiles; x <= centerTx + rangeTiles; x += 1) {
            const structure = structures.get(tileKey(x, y));
            if (!structure) continue;
            const distance = Phaser.Math.Distance.Between(playerX, playerY, tileToWorldCenter(x), tileToWorldCenter(y));
            if (distance > maxDist) continue;

            const craftStation = getCapability(structure, 'craft-station');
            if (craftStation) nearby.add(craftStation.station);

            const utilityStation = getCapability(structure, 'utility-station');
            if (utilityStation) nearby.add(utilityStation.station);
        }
    }

    return nearby;
}

export function getRecipeDefinition(recipeId: string) {
    return gameContentRegistry.recipes.get(recipeId);
}

export function getStorageStructureAt(
    structures: Map<string, StructureType>,
    key: string,
): { structure: StructureType; slots: number } | null {
    const structure = structures.get(key);
    if (!structure) return null;
    const slots = getStorageSlots(structure);
    if (slots === null) return null;
    return { structure, slots };
}

export function getResourceDefinition(resourceId: string) {
    return gameContentRegistry.resources.get(resourceId);
}

export function getResourceLabel(resourceId: string): string {
    const resource = getResourceDefinition(resourceId);
    return resource?.label ?? resourceId;
}

export function getResourceInspectLabel(resourceId: string): string {
    const resource = getResourceDefinition(resourceId);
    return resource?.inspectLabel ?? resource?.label ?? resourceId;
}

export function getResourceInspector(resourceId: string): ((ctx: ContentInspectContext) => string[]) | undefined {
    return getResourceDefinition(resourceId)?.inspect;
}

export function getResourceInteractions(resourceId: string): ((ctx: ContentInspectContext) => ContentInteraction[]) | undefined {
    return getResourceDefinition(resourceId)?.interactions;
}

export function getResourceBreakableDefinition(resourceId: string): BreakableDefinition | undefined {
    return getResourceDefinition(resourceId)?.breakable;
}
