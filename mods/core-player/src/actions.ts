import type { RuntimeAction } from "@gamedemo/engine-core";
import { PlayerDomain } from "./playerDomain";

function createMoveAction(id: string, dx: number, dy: number, label: string): RuntimeAction {
  return {
    id,
    label,
    execute(context) {
      PlayerDomain.clearMoveState(context.state.player);
      const nextX = context.state.player.x + dx;
      const nextY = context.state.player.y + dy;
      if (!PlayerDomain.canOccupyTile(nextX, nextY, context)) {
        return {
          ok: false,
          message: `Cannot move to (${nextX}, ${nextY}).`
        };
      }

      context.state.player.x = nextX;
      context.state.player.y = nextY;
      return {
        ok: true,
        message: `Moved to (${context.state.player.x}, ${context.state.player.y}).`
      };
    }
  };
}

const setMoveTarget: RuntimeAction = {
  id: "player:set-move-target",
  label: "Set move target",
  execute(context) {
    const targetX = typeof context.command?.payload?.x === "number"
      ? Math.floor(context.command.payload.x)
      : context.state.player.x;
    const targetY = typeof context.command?.payload?.y === "number"
      ? Math.floor(context.command.payload.y)
      : context.state.player.y;

    if (targetX === context.state.player.x && targetY === context.state.player.y) {
      PlayerDomain.clearMoveState(context.state.player);
      return { ok: true, message: "Movement target cleared." };
    }

    const path = PlayerDomain.findPathToTarget(context, targetX, targetY);
    if (!path || path.length === 0) {
      PlayerDomain.clearMoveState(context.state.player);
      return { ok: false, message: `Cannot move toward (${targetX}, ${targetY}).` };
    }

    context.state.player.moveTarget = { x: targetX, y: targetY };
    context.state.player.movePath = path;
    return {
      ok: true,
      message: `Path set toward (${targetX}, ${targetY}) with ${path.length} step(s).`
    };
  }
};

const clearMoveTarget: RuntimeAction = {
  id: "player:clear-move-target",
  label: "Clear move target",
  execute(context) {
    PlayerDomain.clearMoveState(context.state.player);
    return { ok: true, message: "Movement target cleared." };
  }
};

export const PlayerActions = {
  moveUp: createMoveAction("player:move-up", 0, -1, "Move up"),
  moveLeft: createMoveAction("player:move-left", -1, 0, "Move left"),
  moveDown: createMoveAction("player:move-down", 0, 1, "Move down"),
  moveRight: createMoveAction("player:move-right", 1, 0, "Move right"),
  setMoveTarget,
  clearMoveTarget
};
