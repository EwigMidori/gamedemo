import type { RuntimeCommandContext, RuntimeCommandResolver } from "@gamedemo/engine-core";
import { PlayerDomain } from "./playerDomain";

function resolvePointerMoveCommands(context: RuntimeCommandContext) {
  const { pointerTile, focusedResourceId, focusedStructureId, session } = context;
  if (!pointerTile) return [];
  const current = PlayerDomain.currentTile(session.player);
  if (pointerTile.x === current.x && pointerTile.y === current.y) return [];

  const movementContext = { state: session, content: context.content };
  const directPath = !focusedResourceId && !focusedStructureId
    ? PlayerDomain.findPathToTarget(
        movementContext,
        pointerTile.x,
        pointerTile.y
      )
    : null;
  const adjacentPath = focusedResourceId || focusedStructureId
    ? PlayerDomain.findPathToAdjacentTarget(
        movementContext,
        pointerTile.x,
        pointerTile.y
      )
    : null;
  const targetPath = directPath ?? adjacentPath?.path ?? null;
  const targetDestination = adjacentPath?.destination ?? pointerTile;
  const actionLabel = focusedResourceId || focusedStructureId
    ? `Move near ${pointerTile.x},${pointerTile.y}`
    : `Move to ${pointerTile.x},${pointerTile.y}`;

  return [
    {
      id: `player:move-pointer-step:${targetDestination.x}:${targetDestination.y}`,
      label: targetPath
        ? `${actionLabel} (${targetPath.length} step${targetPath.length === 1 ? "" : "s"})`
        : actionLabel,
      enabled: targetPath !== null && targetPath.length > 0,
      reasonDisabled: targetPath !== null ? undefined : "No valid path to that target.",
      binding: "MouseRight",
      actionId: "player:set-move-target",
      sourceModId: "core:player",
      priority: 40,
      payload: { x: targetDestination.x, y: targetDestination.y }
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
