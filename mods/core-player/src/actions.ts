import type { RuntimeAction } from "@gamedemo/engine-core";
import { PlayerDomain } from "./playerDomain";

class PlayerActionFactory {
  createMoveAction(id: string, dx: number, dy: number, label: string): RuntimeAction {
    return {
      id,
      label,
      execute(context) {
        PlayerDomain.clearMoveState(context.state.player);
        const current = PlayerDomain.currentTile(context.state.player);
        const nextX = current.x + dx;
        const nextY = current.y + dy;
        if (!PlayerDomain.canOccupyTile(nextX, nextY, context)) {
          return {
            ok: false,
            message: `Cannot move to (${nextX}, ${nextY}).`
          };
        }
        PlayerDomain.startMotion(context.state.player, nextX, nextY);
        return {
          ok: true,
          message: `Moving to (${nextX}, ${nextY}).`
        };
      }
    };
  }
}

const factory = new PlayerActionFactory();

const setMoveTarget: RuntimeAction = {
  id: "player:set-move-target",
  label: "Set move target",
  execute(context) {
    const current = PlayerDomain.currentTile(context.state.player);
    const targetX = typeof context.command?.payload?.x === "number"
      ? Math.floor(context.command.payload.x)
      : current.x;
    const targetY = typeof context.command?.payload?.y === "number"
      ? Math.floor(context.command.payload.y)
      : current.y;
    if (targetX === current.x && targetY === current.y) {
      PlayerDomain.clearMoveState(context.state.player);
      return { ok: true, message: "Movement target cleared." };
    }
    const path = PlayerDomain.findPathToTarget(context, targetX, targetY);
    if (!path || path.length === 0) {
      PlayerDomain.clearMoveState(context.state.player);
      return { ok: false, message: `Cannot move toward (${targetX}, ${targetY}).` };
    }
    context.state.player.motion = null;
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

const updateMovementInput: RuntimeAction = {
  id: "player:update-movement-input",
  label: "Update movement input",
  execute(context) {
    const direction = typeof context.command?.payload?.direction === "string"
      ? context.command.payload.direction
      : "";
    const isDown = context.command?.payload?.isDown === true;
    if (direction !== "up" && direction !== "left" && direction !== "down" && direction !== "right") {
      return { ok: false, message: "Invalid movement direction." };
    }
    PlayerDomain.updateMovementKey(
      context.state.player,
      direction,
      isDown,
      context.state.timeSeconds
    );
    return { ok: true, message: `Movement ${direction} ${isDown ? "pressed" : "released"}.` };
  }
};

export const PlayerActions = {
  moveUp: factory.createMoveAction("player:move-up", 0, -1, "Move up"),
  moveLeft: factory.createMoveAction("player:move-left", -1, 0, "Move left"),
  moveDown: factory.createMoveAction("player:move-down", 0, 1, "Move down"),
  moveRight: factory.createMoveAction("player:move-right", 1, 0, "Move right"),
  setMoveTarget,
  clearMoveTarget,
  updateMovementInput
};
