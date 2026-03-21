import {
  MOD_API_VERSION
} from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { PlayerActions } from "./actions";
import { PlayerResolvers } from "./resolver";
import { PlayerSystems } from "./system";

export const corePlayerMod: GameModModule = {
  manifest: {
    id: "core:player",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }]
  },
  install(context) {
    context.actions.register(PlayerActions.moveUp);
    context.actions.register(PlayerActions.moveLeft);
    context.actions.register(PlayerActions.moveDown);
    context.actions.register(PlayerActions.moveRight);
    context.actions.register(PlayerActions.setMoveTarget);
    context.actions.register(PlayerActions.clearMoveTarget);
    context.systems.register(PlayerSystems.movementFollowTarget);
    context.commandResolvers.register(PlayerResolvers.movement);
    context.ui.register({
      id: "player:status",
      title: "Player",
      body: "Movement is exposed through runtime command resolution."
    });
  }
};
