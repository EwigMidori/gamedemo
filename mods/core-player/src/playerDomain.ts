import type {
  PlayerState,
  RuntimeActionContext
} from "@gamedemo/engine-core";
import { VanillaWorldLookup } from "@gamedemo/vanilla-domain";

type MovementContext = Pick<RuntimeActionContext, "state" | "content">;
type TilePoint = { x: number; y: number };
type MovementDirection = "up" | "left" | "down" | "right";

export class PlayerDomain {
  static readonly stepDurationSeconds = 0.15;
  static readonly moveSpeedTilesPerSecond = 95 / 16;
  static readonly sprintMultiplier = 1.75;
  static readonly sprintWindowSeconds = 0.28;
  static readonly sprintDurationSeconds = 0.9;

  static currentTile(player: PlayerState): TilePoint {
    return {
      x: Math.round(player.x),
      y: Math.round(player.y)
    };
  }

  static isAdjacentTile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    return Math.max(Math.abs(fromX - toX), Math.abs(fromY - toY)) <= 1;
  }

  static canOccupyTile(
    x: number,
    y: number,
    context: MovementContext
  ): boolean {
    const maxX = context.state.world.originX + context.state.world.width;
    const maxY = context.state.world.originY + context.state.world.height;
    if (
      x < context.state.world.originX ||
      y < context.state.world.originY ||
      x >= maxX ||
      y >= maxY
    ) {
      return false;
    }
    const tile = VanillaWorldLookup.tileAt(context.state.world, x, y);
    if (!tile) {
      return false;
    }
    const terrain = VanillaWorldLookup.terrainAt(context.content, context.state, x, y);
    if (terrain && !terrain.walkable) {
      return false;
    }
    for (const resource of context.state.resources) {
      if (resource.depleted || resource.x !== x || resource.y !== y) {
        continue;
      }
      const definition = VanillaWorldLookup.resourceDef(context.content, resource.resourceId);
      if (definition?.blocksMovement) {
        return false;
      }
    }
    for (const structure of context.state.placedStructures) {
      if (structure.x !== x || structure.y !== y) {
        continue;
      }
      const definition = VanillaWorldLookup.structureDef(context.content, structure.structureId);
      if (definition?.blocksMovement ?? true) {
        return false;
      }
    }
    return true;
  }

  static clearMoveState(player: PlayerState): void {
    player.motion = null;
    player.moveTarget = null;
    player.movePath = [];
  }

  static startMotion(player: PlayerState, nextX: number, nextY: number): void {
    player.motion = {
      fromX: player.x,
      fromY: player.y,
      toX: nextX,
      toY: nextY,
      progressSeconds: 0,
      durationSeconds: this.stepDurationSeconds
    };
  }

  static advanceMotion(player: PlayerState, deltaSeconds: number): boolean {
    if (!player.motion) {
      return false;
    }
    player.motion.progressSeconds += deltaSeconds;
    const progress = Math.max(
      0,
      Math.min(
        1,
      player.motion.progressSeconds / Math.max(player.motion.durationSeconds, 0.001),
      )
    );
    player.x = player.motion.fromX + (player.motion.toX - player.motion.fromX) * progress;
    player.y = player.motion.fromY + (player.motion.toY - player.motion.fromY) * progress;
    if (player.motion.progressSeconds < player.motion.durationSeconds) {
      return false;
    }
    player.x = player.motion.toX;
    player.y = player.motion.toY;
    player.motion = null;
    return true;
  }

  static ensureMovementInput(player: PlayerState): NonNullable<PlayerState["movementInput"]> {
    player.movementInput ??= {
      up: false,
      left: false,
      down: false,
      right: false,
      facing: "down",
      sprintFacing: null,
      sprintUntil: 0,
      lastTapAt: {
        up: Number.NEGATIVE_INFINITY,
        left: Number.NEGATIVE_INFINITY,
        down: Number.NEGATIVE_INFINITY,
        right: Number.NEGATIVE_INFINITY
      }
    };
    return player.movementInput;
  }

  static updateMovementKey(
    player: PlayerState,
    direction: MovementDirection,
    isDown: boolean,
    currentTimeSeconds: number
  ): void {
    const input = this.ensureMovementInput(player);
    const wasDown = input[direction];
    if (wasDown === isDown) {
      return;
    }
    input[direction] = isDown;
    if (!isDown) {
      return;
    }
    if (currentTimeSeconds - input.lastTapAt[direction] <= this.sprintWindowSeconds) {
      input.sprintFacing = direction;
      input.sprintUntil = currentTimeSeconds + this.sprintDurationSeconds;
    }
    input.lastTapAt[direction] = currentTimeSeconds;
  }

  static hasKeyboardMovement(player: PlayerState): boolean {
    const input = this.ensureMovementInput(player);
    return input.up || input.left || input.down || input.right;
  }

  static tickKeyboardMovement(context: MovementContext & { deltaSeconds: number }): boolean {
    const input = this.ensureMovementInput(context.state.player);
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (dx === 0 && dy === 0) {
      return false;
    }
    const length = Math.hypot(dx, dy);
    const normalizedX = dx / length;
    const normalizedY = dy / length;
    const facing = Math.abs(dx) >= Math.abs(dy)
      ? (dx < 0 ? "left" : "right")
      : (dy < 0 ? "up" : "down");
    input.facing = facing;
    const sprinting = input.sprintFacing === facing && context.state.timeSeconds <= input.sprintUntil;
    const speed = this.moveSpeedTilesPerSecond *
      context.deltaSeconds *
      (sprinting ? this.sprintMultiplier : 1);
    this.clearMoveState(context.state.player);
    const nextX = context.state.player.x + normalizedX * speed;
    if (this.canOccupyPosition(nextX, context.state.player.y, context)) {
      context.state.player.x = nextX;
    }
    const nextY = context.state.player.y + normalizedY * speed;
    if (this.canOccupyPosition(context.state.player.x, nextY, context)) {
      context.state.player.y = nextY;
    }
    return true;
  }

  static movementFacing(player: PlayerState): MovementDirection {
    return this.ensureMovementInput(player).facing;
  }

  private static canOccupyPosition(
    x: number,
    y: number,
    context: MovementContext
  ): boolean {
    const tile = { x: Math.round(x), y: Math.round(y) };
    return this.canOccupyTile(tile.x, tile.y, context);
  }

  static findPathToTarget(
    context: MovementContext,
    targetX: number,
    targetY: number
  ): TilePoint[] | null {
    const start = this.currentTile(context.state.player);
    if (start.x === targetX && start.y === targetY) {
      return [];
    }
    const queue: TilePoint[] = [start];
    const visited = new Set<string>([this.tileKey(start.x, start.y)]);
    const cameFrom = new Map<string, TilePoint>();
    const directions: TilePoint[] = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 }
    ];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        break;
      }
      if (current.x === targetX && current.y === targetY) {
        const path: TilePoint[] = [];
        let cursorKey = this.tileKey(current.x, current.y);
        while (cursorKey !== this.tileKey(start.x, start.y)) {
          const [x, y] = cursorKey.split(",").map(Number);
          path.unshift({ x, y });
          const previous = cameFrom.get(cursorKey);
          if (!previous) {
            break;
          }
          cursorKey = this.tileKey(previous.x, previous.y);
        }
        return path;
      }
      for (const direction of directions) {
        const next = { x: current.x + direction.x, y: current.y + direction.y };
        const nextKey = this.tileKey(next.x, next.y);
        if (visited.has(nextKey) || !this.canOccupyTile(next.x, next.y, context)) {
          continue;
        }
        visited.add(nextKey);
        cameFrom.set(nextKey, current);
        queue.push(next);
      }
    }
    return null;
  }

  static findPathToAdjacentTarget(
    context: MovementContext,
    targetX: number,
    targetY: number
  ): { path: TilePoint[]; destination: TilePoint } | null {
    const candidates: TilePoint[] = [
      { x: targetX + 1, y: targetY },
      { x: targetX - 1, y: targetY },
      { x: targetX, y: targetY + 1 },
      { x: targetX, y: targetY - 1 },
      { x: targetX + 1, y: targetY + 1 },
      { x: targetX + 1, y: targetY - 1 },
      { x: targetX - 1, y: targetY + 1 },
      { x: targetX - 1, y: targetY - 1 }
    ].filter((candidate) => this.canOccupyTile(candidate.x, candidate.y, context));

    let best: { path: TilePoint[]; destination: TilePoint } | null = null;
    for (const candidate of candidates) {
      const path = this.findPathToTarget(context, candidate.x, candidate.y);
      if (!path) {
        continue;
      }
      if (!best || path.length < best.path.length) {
        best = { path, destination: candidate };
      }
    }
    return best;
  }

  private static tileKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}
