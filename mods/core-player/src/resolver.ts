import type { RuntimeCommandContext, RuntimeCommandResolver } from "@gamedemo/engine-core";
import { PlayerDomain } from "./playerDomain";

function resolvePointerMoveCommands(context: RuntimeCommandContext) {
  const { pointerTile, focusedResourceId, focusedStructureId, session } = context;
  if (!pointerTile || focusedResourceId || focusedStructureId) return [];
  if (pointerTile.x === session.player.x && pointerTile.y === session.player.y) return [];

  const path = PlayerDomain.findPathToTarget(
    { state: session, content: context.content },
    pointerTile.x,
    pointerTile.y
  );

  return [
    {
      id: "player:move-pointer-step",
      label: path
        ? `Move to ${pointerTile.x},${pointerTile.y} (${path.length} step${path.length === 1 ? "" : "s"})`
        : `Move to ${pointerTile.x},${pointerTile.y}`,
      enabled: path !== null && path.length > 0,
      reasonDisabled: path !== null ? undefined : "No valid path to that tile.",
      binding: "MouseRight",
      actionId: "player:set-move-target",
      sourceModId: "core:player",
      priority: 40,
      payload: { x: pointerTile.x, y: pointerTile.y }
    },
    ...(session.player.moveTarget
      ? [{
          id: "player:clear-move-target",
          label: "Cancel move target",
          enabled: true,
          binding: "Escape",
          actionId: "player:clear-move-target",
          sourceModId: "core:player",
          priority: 35
        }]
      : [])
  ];
}

const movement: RuntimeCommandResolver = {
  id: "player:movement",
  resolve(context) {
    if (context.trigger === "pointer") {
      return resolvePointerMoveCommands(context);
    }

    return [
      { id: "player:move-up", label: "Move Up", enabled: true, binding: "KeyW", actionId: "player:move-up", sourceModId: "core:player", priority: 10 },
      { id: "player:move-left", label: "Move Left", enabled: true, binding: "KeyA", actionId: "player:move-left", sourceModId: "core:player", priority: 10 },
      { id: "player:move-down", label: "Move Down", enabled: true, binding: "KeyS", actionId: "player:move-down", sourceModId: "core:player", priority: 10 },
      { id: "player:move-right", label: "Move Right", enabled: true, binding: "KeyD", actionId: "player:move-right", sourceModId: "core:player", priority: 10 },
      ...(context.session.player.moveTarget
        ? [{
            id: "player:clear-move-target",
            label: "Cancel move target",
            enabled: true,
            binding: "Escape",
            actionId: "player:clear-move-target",
            sourceModId: "core:player",
            priority: 11
          }]
        : [])
    ];
  }
};

export const PlayerResolvers = {
  movement
};
