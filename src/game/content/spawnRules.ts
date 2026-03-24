import { gameContentRegistry } from '.';
import type { RegisteredResourceDefinition, ResourceSpawnRule } from './registry';

export interface ResourceSpawnSample {
    height: number;
    moisture: number;
    clusters: number;
    pick: number;
}

function matchesRule(sample: ResourceSpawnSample, rule: ResourceSpawnRule): boolean {
    if (rule.minHeight !== undefined && sample.height < rule.minHeight) return false;
    if (rule.maxHeight !== undefined && sample.height > rule.maxHeight) return false;
    if (rule.minMoisture !== undefined && sample.moisture < rule.minMoisture) return false;
    if (rule.maxMoisture !== undefined && sample.moisture > rule.maxMoisture) return false;
    if (rule.minClusters !== undefined && sample.clusters < rule.minClusters) return false;
    if (rule.maxClusters !== undefined && sample.clusters > rule.maxClusters) return false;
    if (rule.minPick !== undefined && sample.pick < rule.minPick) return false;
    if (rule.maxPick !== undefined && sample.pick > rule.maxPick) return false;
    return true;
}

export function resourceMatchesSpawnSample(
    resource: RegisteredResourceDefinition,
    sample: ResourceSpawnSample,
): boolean {
    if (!resource.spawnRules?.length) return false;
    return resource.spawnRules.some((rule) => matchesRule(sample, rule));
}

export function getSpawnResourceForSample(sample: ResourceSpawnSample): RegisteredResourceDefinition | null {
    for (const resource of gameContentRegistry.resources.values()) {
        if (resourceMatchesSpawnSample(resource, sample)) return resource;
    }
    return null;
}
