import type {
  PlayerState,
  RuntimeActionContext
} from "@gamedemo/engine-core";

type MovementContext = Pick<RuntimeActionContext, "state" | "content">;
type TilePoint = { x: number; y: number };

function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

function canOccupyTile(
  x: number,
  y: number,
  context: MovementContext
): boolean {
  if (x < 0 || y < 0 || x >= context.state.world.width || y >= context.state.world.height) {
    return false;
  }

  const tile = context.state.world.tiles.find((entry) => entry.x === x && entry.y === y);
  if (!tile) return false;

  const terrain = context.content.terrains.find((entry) => entry.id === tile.terrainId);
  if (terrain && !terrain.walkable) return false;

  for (const structure of context.state.placedStructures) {
    if (structure.x !== x || structure.y !== y) continue;
    const definition = context.content.structures.find(
      (entry) => entry.id === structure.structureId
    );
    if (definition?.blocksMovement ?? true) return false;
  }

  return true;
}

function clearMoveState(player: PlayerState): void {
  player.moveTarget = null;
  player.movePath = [];
}

function findPathToTarget(
  context: MovementContext,
  targetX: number,
  targetY: number
): TilePoint[] | null {
  const start = { x: context.state.player.x, y: context.state.player.y };
  if (start.x === targetX && start.y === targetY) return [];

  const queue: TilePoint[] = [start];
  const visited = new Set<string>([tileKey(start.x, start.y)]);
  const cameFrom = new Map<string, TilePoint>();
  const directions: TilePoint[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;

    if (current.x === targetX && current.y === targetY) {
      const path: TilePoint[] = [];
      let cursorKey = tileKey(current.x, current.y);

      while (cursorKey !== tileKey(start.x, start.y)) {
        const [x, y] = cursorKey.split(",").map(Number);
        path.unshift({ x, y });
        const previous = cameFrom.get(cursorKey);
        if (!previous) break;
        cursorKey = tileKey(previous.x, previous.y);
      }

      return path;
    }

    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const nextKey = tileKey(next.x, next.y);
      if (visited.has(nextKey)) continue;
      if (!canOccupyTile(next.x, next.y, context)) continue;
      visited.add(nextKey);
      cameFrom.set(nextKey, current);
      queue.push(next);
    }
  }

  return null;
}

export const PlayerDomain = {
  canOccupyTile,
  clearMoveState,
  findPathToTarget
};
