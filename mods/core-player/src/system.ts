import type { RuntimeSystem } from "@gamedemo/engine-core";
import { PlayerDomain } from "./playerDomain";

const movementFollowTarget: RuntimeSystem = {
  id: "player:movement-follow-target",
  phase: "simulation",
  description: "Advances player path motion with continuous step timing.",
  run(context) {
    if (PlayerDomain.tickKeyboardMovement(context)) {
      return;
    }
    const currentTile = PlayerDomain.currentTile(context.state.player);
    if (PlayerDomain.advanceMotion(context.state.player, context.deltaSeconds)) {
      const target = context.state.player.moveTarget;
      const updatedTile = PlayerDomain.currentTile(context.state.player);
      if (target && target.x === updatedTile.x && target.y === updatedTile.y) {
        PlayerDomain.clearMoveState(context.state.player);
        context.state.logs.push(`Arrived at (${target.x}, ${target.y}).`);
      }
    }
    if (context.state.player.motion) {
      return;
    }
    const target = context.state.player.moveTarget;
    if (!target) {
      return;
    }
    if (target.x === currentTile.x && target.y === currentTile.y) {
      PlayerDomain.clearMoveState(context.state.player);
      return;
    }
    if ((context.state.player.movePath ?? []).length === 0) {
      const rebuiltPath = PlayerDomain.findPathToTarget(context, target.x, target.y);
      if (!rebuiltPath || rebuiltPath.length === 0) {
        PlayerDomain.clearMoveState(context.state.player);
        return;
      }
      context.state.player.movePath = rebuiltPath;
    }
    const [nextStep, ...remainingPath] = context.state.player.movePath ?? [];
    if (!nextStep || !PlayerDomain.canOccupyTile(nextStep.x, nextStep.y, context)) {
      const rebuiltPath = PlayerDomain.findPathToTarget(context, target.x, target.y);
      if (!rebuiltPath || rebuiltPath.length === 0) {
        PlayerDomain.clearMoveState(context.state.player);
        return;
      }
      context.state.player.movePath = rebuiltPath;
      return;
    }
    context.state.player.movePath = remainingPath;
    PlayerDomain.startMotion(context.state.player, nextStep.x, nextStep.y);
  }
};

export const PlayerSystems = {
  movementFollowTarget
};
