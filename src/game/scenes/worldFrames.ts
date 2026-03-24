import { tileKey, type StructureType } from './constants';

const SAPLING_FRAME_BASE = 27;
const STONE_FRAME_CRACKED = 30;
const STONE_FRAME_BROKEN = 31;

function hasAutotileNeighbor(
    structures: Map<string, StructureType>,
    tx: number,
    ty: number,
    group: string,
    getGroupForStructure: (structureId: string) => string | null,
): boolean {
    const structure = structures.get(tileKey(tx, ty));
    return structure !== undefined && getGroupForStructure(structure) === group;
}

export function getAutotileFrameForTile(
    tx: number,
    ty: number,
    structures: Map<string, StructureType>,
    group: string,
    frameBase: number,
    getGroupForStructure: (structureId: string) => string | null,
): number {
    let mask = 0;
    if (hasAutotileNeighbor(structures, tx, ty - 1, group, getGroupForStructure)) mask |= 1;
    if (hasAutotileNeighbor(structures, tx + 1, ty, group, getGroupForStructure)) mask |= 2;
    if (hasAutotileNeighbor(structures, tx, ty + 1, group, getGroupForStructure)) mask |= 4;
    if (hasAutotileNeighbor(structures, tx - 1, ty, group, getGroupForStructure)) mask |= 8;
    return frameBase + mask;
}

export function getSaplingFrameForTimeRemaining(secondsLeft: number): number {
    if (secondsLeft > 60) return SAPLING_FRAME_BASE;
    if (secondsLeft > 25) return SAPLING_FRAME_BASE + 1;
    return SAPLING_FRAME_BASE + 2;
}

export function getStoneFrameForHitsLeft(hitsLeft: number): number {
    if (hitsLeft <= 1) return STONE_FRAME_BROKEN;
    if (hitsLeft === 2) return STONE_FRAME_CRACKED;
    return 5;
}

export function getGrowableFrame(progress: number, stages: Array<{ minProgress: number; frame: number }>): number {
    let frame = stages[0]?.frame ?? 0;
    for (const stage of stages) {
        if (progress >= stage.minProgress) frame = stage.frame;
    }
    return frame;
}

export function getGrowableTint(
    progress: number,
    stages: Array<{ minProgress: number; tint?: number }>,
): number | null {
    let tint: number | null = null;
    for (const stage of stages) {
        if (progress >= stage.minProgress) tint = stage.tint ?? null;
    }
    return tint;
}
