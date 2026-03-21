import type { RuntimeSystem } from "@gamedemo/engine-core";
import { PlayerDomain } from "./playerDomain";

const movementFollowTarget: RuntimeSystem = {
  id: "player:movement-follow-target",
  phase: "simulation",
  description: "Advances the player one tile per tick toward the active movement target.",
  run(context) {
    const target = context.state.player.moveTarget;
    if (!target) return;

    if (target.x === context.state.player.x && target.y === context.state.player.y) {
      PlayerDomain.clearMoveState(context.state.player);
      return;
    }

    if ((context.state.player.movePath ?? []).length === 0) {
      const rebuiltPath = PlayerDomain.findPathToTarget(context, target.x, target.y);
      if (!rebuiltPath || rebuiltPath.length === 0) {
        PlayerDomain.clearMoveState(context.state.player);
        if (context.state.logs.at(-1) !== `Movement blocked toward (${target.x}, ${target.y}).`) {
          context.state.logs.push(`Movement blocked toward (${target.x}, ${target.y}).`);
        }
        return;
      }
      context.state.player.movePath = rebuiltPath;
    }

    const [nextStep, ...remainingPath] = context.state.player.movePath ?? [];
    if (!nextStep || !PlayerDomain.canOccupyTile(nextStep.x, nextStep.y, context)) {
      const rebuiltPath = PlayerDomain.findPathToTarget(context, target.x, target.y);
      if (!rebuiltPath || rebuiltPath.length === 0) {
        PlayerDomain.clearMoveState(context.state.player);
        if (context.state.logs.at(-1) !== `Movement blocked toward (${target.x}, ${target.y}).`) {
          context.state.logs.push(`Movement blocked toward (${target.x}, ${target.y}).`);
        }
        return;
      }
      context.state.player.movePath = rebuiltPath;
      return;
    }

    context.state.player.movePath = remainingPath;
    context.state.player.x = nextStep.x;
    context.state.player.y = nextStep.y;
    if (nextStep.x === target.x && nextStep.y === target.y) {
      PlayerDomain.clearMoveState(context.state.player);
      context.state.logs.push(`Arrived at (${target.x}, ${target.y}).`);
      return;
    }

    context.state.logs.push(
      `Moved along path toward (${target.x}, ${target.y}) to (${nextStep.x}, ${nextStep.y}).`
    );
  }
};

export const PlayerSystems = {
  movementFollowTarget
};
