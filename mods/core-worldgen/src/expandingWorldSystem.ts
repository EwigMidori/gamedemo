import type { RuntimeSystem, RuntimeSessionState, WorldTile } from "@gamedemo/engine-core";
import { VanillaWorldSeed } from "@gamedemo/vanilla-domain";

class ExpandingWorldSystemFactory {
  private readonly seed = new VanillaWorldSeed();
  private readonly threshold = 12;
  private readonly bandSize = 24;

  create(): RuntimeSystem {
    return {
      id: "worldgen:expand-world",
      phase: "preUpdate",
      description: "Expands the world outward in deterministic bands as the player approaches the edge.",
      run: ({ state }) => {
        this.expandAroundPlayer(state);
      }
    };
  }

  private expandAroundPlayer(state: RuntimeSessionState): void {
    const minX = state.world.originX;
    const minY = state.world.originY;
    const maxX = state.world.originX + state.world.width - 1;
    const maxY = state.world.originY + state.world.height - 1;
    const occupiedResourceTiles = new Set(state.resources.map((entry) => `${entry.x},${entry.y}`));
    let expanded = false;

    if (state.player.x - minX <= this.threshold) {
      this.expandLeft(state, this.bandSize, occupiedResourceTiles);
      expanded = true;
    }
    if (maxX - state.player.x <= this.threshold) {
      this.expandRight(state, this.bandSize, occupiedResourceTiles);
      expanded = true;
    }
    if (state.player.y - minY <= this.threshold) {
      this.expandUp(state, this.bandSize, occupiedResourceTiles);
      expanded = true;
    }
    if (maxY - state.player.y <= this.threshold) {
      this.expandDown(state, this.bandSize, occupiedResourceTiles);
      expanded = true;
    }

    if (expanded) {
      state.logs.push(`World expanded to ${state.world.width}x${state.world.height}.`);
    }
  }

  private expandLeft(
    state: RuntimeSessionState,
    amount: number,
    occupiedResourceTiles: Set<string>
  ): void {
    const nextOriginX = state.world.originX - amount;
    const maxYExclusive = state.world.originY + state.world.height;
    const tiles: WorldTile[] = [];
    for (let x = nextOriginX; x < state.world.originX; x += 1) {
      for (let y = state.world.originY; y < maxYExclusive; y += 1) {
        tiles.push(this.seed.createTile(x, y));
        this.seedResourceIfNeeded(state, x, y, occupiedResourceTiles);
      }
    }
    state.world.originX = nextOriginX;
    state.world.width += amount;
    state.world.tiles.push(...tiles);
  }

  private expandRight(
    state: RuntimeSessionState,
    amount: number,
    occupiedResourceTiles: Set<string>
  ): void {
    const startX = state.world.originX + state.world.width;
    const endX = startX + amount;
    const maxYExclusive = state.world.originY + state.world.height;
    for (let x = startX; x < endX; x += 1) {
      for (let y = state.world.originY; y < maxYExclusive; y += 1) {
        state.world.tiles.push(this.seed.createTile(x, y));
        this.seedResourceIfNeeded(state, x, y, occupiedResourceTiles);
      }
    }
    state.world.width += amount;
  }

  private expandUp(
    state: RuntimeSessionState,
    amount: number,
    occupiedResourceTiles: Set<string>
  ): void {
    const nextOriginY = state.world.originY - amount;
    const maxXExclusive = state.world.originX + state.world.width;
    const tiles: WorldTile[] = [];
    for (let y = nextOriginY; y < state.world.originY; y += 1) {
      for (let x = state.world.originX; x < maxXExclusive; x += 1) {
        tiles.push(this.seed.createTile(x, y));
        this.seedResourceIfNeeded(state, x, y, occupiedResourceTiles);
      }
    }
    state.world.originY = nextOriginY;
    state.world.height += amount;
    state.world.tiles.push(...tiles);
  }

  private expandDown(
    state: RuntimeSessionState,
    amount: number,
    occupiedResourceTiles: Set<string>
  ): void {
    const startY = state.world.originY + state.world.height;
    const endY = startY + amount;
    const maxXExclusive = state.world.originX + state.world.width;
    for (let y = startY; y < endY; y += 1) {
      for (let x = state.world.originX; x < maxXExclusive; x += 1) {
        state.world.tiles.push(this.seed.createTile(x, y));
        this.seedResourceIfNeeded(state, x, y, occupiedResourceTiles);
      }
    }
    state.world.height += amount;
  }

  private seedResourceIfNeeded(
    state: RuntimeSessionState,
    x: number,
    y: number,
    occupiedResourceTiles: Set<string>
  ): void {
    const key = `${x},${y}`;
    if (occupiedResourceTiles.has(key)) {
      return;
    }
    const resource = this.seed.createResource(x, y);
    if (resource) {
      state.resources.push(resource);
      occupiedResourceTiles.add(key);
    }
  }
}

const factory = new ExpandingWorldSystemFactory();

export const ExpandingWorldSystem = {
  create(): RuntimeSystem {
    return factory.create();
  }
};
