import { fbm2D } from '../terrain/noise';
import type { GroundTile, ResourceType, StructureType } from './constants';
import { WORLD_SEED, tileKey } from './constants';
import { getSpawnResourceForSample } from '../content/spawnRules';

export function getGroundAt(tx: number, ty: number): GroundTile {
    const nx = tx / 64;
    const ny = ty / 64;

    const height = fbm2D(nx, ny, { seed: WORLD_SEED + 10, octaves: 5, gain: 0.55 });
    const moisture = fbm2D(nx + 100, ny - 100, { seed: WORLD_SEED + 20, octaves: 4, gain: 0.6 });
    const rough = fbm2D(nx * 2.2, ny * 2.2, { seed: WORLD_SEED + 30, octaves: 3, gain: 0.6 });

    if (height < 0.38) return 'water';
    if (height < 0.44 || moisture < 0.33) return 'sand';
    if (rough > 0.62 && moisture < 0.62) return 'dirt';
    return 'grass';
}

export function getResourceAt(
    tx: number,
    ty: number,
    worldTime: number,
    resourceRespawnAt: Map<string, number>,
    structures: Map<string, StructureType>,
    plantedTrees: Map<string, number>,
    stoneHealth: Map<string, number>,
): ResourceType | null {
    const key = tileKey(tx, ty);
    const plantedTreeAt = plantedTrees.get(key);
    if (plantedTreeAt !== undefined) {
        return worldTime >= plantedTreeAt ? 'tree' : null;
    }

    const respawnAt = resourceRespawnAt.get(key);
    if (respawnAt !== undefined) {
        if (worldTime < respawnAt) return null;
        resourceRespawnAt.delete(key);
    }

    if (getGroundAt(tx, ty) === 'water') return null;
    if (structures.has(key)) return null;

    const nx = tx / 64;
    const ny = ty / 64;
    const height = fbm2D(nx, ny, { seed: WORLD_SEED + 10, octaves: 5, gain: 0.55 });
    const moisture = fbm2D(nx + 100, ny - 100, { seed: WORLD_SEED + 20, octaves: 4, gain: 0.6 });
    const clusters = fbm2D(nx * 3.1, ny * 3.1, { seed: WORLD_SEED + 99, octaves: 3, gain: 0.58 });
    const pick = fbm2D(nx * 10.0, ny * 10.0, { seed: WORLD_SEED + 77, octaves: 2, gain: 0.52 });
    const resource = getSpawnResourceForSample({ height, moisture, clusters, pick });
    if (!resource) return null;

    if (resource.maxHits !== undefined) {
        const hitsLeft = stoneHealth.get(key) ?? resource.maxHits;
        if (hitsLeft <= 0) return null;
    }

    return resource.id;
}
