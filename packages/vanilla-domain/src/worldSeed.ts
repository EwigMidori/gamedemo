import type {
  ResourceNode,
  RuntimeSessionState,
  WorldTile,
  WorldBlueprint
} from "@gamedemo/engine-core";

type TerrainId = "core:grass" | "core:dirt" | "core:sand" | "core:water";

interface Sample {
  height: number;
  moisture: number;
  clusters: number;
  pick: number;
}

export class VanillaWorldSeed {
  private readonly seed = 1337;

  fillTerrain(blueprint: WorldBlueprint): WorldBlueprint {
    return {
      ...blueprint,
      tiles: blueprint.tiles.map((tile) => ({
        ...tile,
        terrainId: this.terrainAt(tile.x, tile.y)
      }))
    };
  }

  seedResources(state: RuntimeSessionState): void {
    const resources: ResourceNode[] = [];
    const occupied = new Map<string, ResourceNode>();
    for (const tile of state.world.tiles) {
      const terrainId = tile.terrainId as TerrainId;
      if (terrainId === "core:water") {
        continue;
      }
      const resourceId = this.resourceAt(tile.x, tile.y);
      if (!resourceId) {
        continue;
      }
      const resource = {
        id: `resource:${tile.x}:${tile.y}`,
        resourceId,
        x: tile.x,
        y: tile.y,
        depleted: false,
        respawnAt: null,
        hitsLeft: resourceId === "resource:stone" ? 3 : null
      };
      resources.push(resource);
      occupied.set(`${tile.x},${tile.y}`, resource);
    }
    this.seedSpawnLandmarks(state, resources, occupied);
    state.resources = resources;
  }

  terrainAt(x: number, y: number): TerrainId {
    return this.terrainFor(x, y);
  }

  resourceAt(x: number, y: number): string | null {
    return this.resourceFor(this.sample(x, y));
  }

  createTile(x: number, y: number): WorldTile {
    return {
      x,
      y,
      terrainId: this.terrainAt(x, y)
    };
  }

  createResource(x: number, y: number): ResourceNode | null {
    if (this.terrainAt(x, y) === "core:water") {
      return null;
    }
    const resourceId = this.resourceAt(x, y);
    if (!resourceId) {
      return null;
    }
    return {
      id: `resource:${x}:${y}`,
      resourceId,
      x,
      y,
      depleted: false,
      respawnAt: null,
      hitsLeft: resourceId === "resource:stone" ? 3 : null
    };
  }

  private terrainFor(x: number, y: number): TerrainId {
    const sample = this.sample(x, y);
    if (sample.height < 0.38) {
      return "core:water";
    }
    if (sample.height < 0.44 || sample.moisture < 0.33) {
      return "core:sand";
    }
    if (this.roughness(x, y) > 0.62 && sample.moisture < 0.62) {
      return "core:dirt";
    }
    return "core:grass";
  }

  private resourceFor(sample: Sample): string | null {
    if (sample.height <= 0.43) {
      return null;
    }
    if (sample.moisture > 0.54 && sample.clusters > 0.62 && sample.pick > 0.58) {
      return "resource:tree";
    }
    if (sample.moisture < 0.56 && sample.clusters > 0.64 && sample.pick > 0.57) {
      return "resource:stone";
    }
    if (sample.moisture > 0.54 && sample.clusters > 0.62 && sample.pick > 0.5 && sample.pick < 0.58) {
      return "resource:berry";
    }
    return null;
  }

  private sample(x: number, y: number): Sample {
    return {
      height: this.fbm(x / 64, y / 64, this.seed + 10, 5, 2, 0.55),
      moisture: this.fbm(x / 64 + 100, y / 64 - 100, this.seed + 20, 4, 2, 0.6),
      clusters: this.fbm(x * (3.1 / 64), y * (3.1 / 64), this.seed + 99, 3, 2, 0.58),
      pick: this.fbm(x * (10 / 64), y * (10 / 64), this.seed + 77, 2, 2, 0.52)
    };
  }

  private roughness(x: number, y: number): number {
    return this.fbm(x * (2.2 / 64), y * (2.2 / 64), this.seed + 30, 3, 2, 0.6);
  }

  private fbm(
    x: number,
    y: number,
    seed: number,
    octaves: number,
    lacunarity: number,
    gain: number
  ): number {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    for (let index = 0; index < octaves; index += 1) {
      sum += this.valueNoise(x * frequency, y * frequency, seed) * amplitude;
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return norm > 0 ? sum / norm : 0;
  }

  private valueNoise(x: number, y: number, seed: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = this.smoothstep(x - x0);
    const sy = this.smoothstep(y - y0);
    const n00 = this.hash(x0, y0, seed);
    const n10 = this.hash(x1, y0, seed);
    const n01 = this.hash(x0, y1, seed);
    const n11 = this.hash(x1, y1, seed);
    const ix0 = this.lerp(n00, n10, sx);
    const ix1 = this.lerp(n01, n11, sx);
    return this.lerp(ix0, ix1, sy);
  }

  private hash(x: number, y: number, seed: number): number {
    const value = Math.sin((x + seed * 17.31) * 127.1 + (y - seed * 9.13) * 311.7) * 43758.5453123;
    return value - Math.floor(value);
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private seedSpawnLandmarks(
    state: RuntimeSessionState,
    resources: ResourceNode[],
    occupied: Map<string, ResourceNode>
  ): void {
    const treeOffsets = [
      [7, -4], [8, -3], [9, -3], [7, -2], [9, -1],
      [8, 0], [10, 1], [7, 2], [9, 3], [8, 4], [10, 5], [9, 6]
    ];
    const stoneOffsets = [[10, 7], [8, 8], [11, 8]];
    const berryOffsets = [[7, 8], [11, 9]];

    for (const [dx, dy] of treeOffsets) {
      this.placeSpawnResource(state, dx, dy, "resource:tree", resources, occupied);
    }
    for (const [dx, dy] of stoneOffsets) {
      this.placeSpawnResource(state, dx, dy, "resource:stone", resources, occupied);
    }
    for (const [dx, dy] of berryOffsets) {
      this.placeSpawnResource(state, dx, dy, "resource:berry", resources, occupied);
    }
  }

  private placeSpawnResource(
    state: RuntimeSessionState,
    x: number,
    y: number,
    resourceId: string,
    resources: ResourceNode[],
    occupied: Map<string, ResourceNode>
  ): void {
    const maxX = state.world.originX + state.world.width;
    const maxY = state.world.originY + state.world.height;
    if (x < state.world.originX || y < state.world.originY || x >= maxX || y >= maxY) {
      return;
    }
    const key = `${x},${y}`;
    if (occupied.has(key)) {
      return;
    }
    const tile = state.world.tiles.find((entry) => entry.x === x && entry.y === y);
    if (!tile || tile.terrainId === "core:water") {
      return;
    }
    const resource: ResourceNode = {
      id: `resource:${x}:${y}`,
      resourceId,
      x,
      y,
      depleted: false,
      respawnAt: null,
      hitsLeft: resourceId === "resource:stone" ? 3 : null
    };
    resources.push(resource);
    occupied.set(key, resource);
  }
}
