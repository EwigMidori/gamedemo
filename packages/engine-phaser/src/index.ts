import Phaser from "phaser";
import type { RuntimeCommandInput, RuntimePointerTile } from "@gamedemo/engine-core";
import type { AssembledRuntime, RuntimeSession } from "@gamedemo/engine-runtime";
import { RuntimeGameScene } from "./gameScene";

export interface RuntimePreviewOptions {
  onPointerTileChange?(tile: RuntimePointerTile | null): void;
  onPointerPrimaryAction?(tile: RuntimePointerTile): void;
  onPointerHoldAction?(tile: RuntimePointerTile): void;
  onPointerHoldCancel?(): void;
  onInventorySlotSelect?(slotIndex: number): void;
  onHandcraftRecipeCraft?(recipeId: string): void;
  onHandcraftClose?(): void;
  getPointerHoldSpec?(tile: RuntimePointerTile): {
    durationSeconds: number;
    label: string;
    requiresApproach?: boolean;
  } | null;
  getSelectedTile?(): RuntimePointerTile | null;
  getSelectedTileMarker?(): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null;
  getHandcraftOpen?(): boolean;
  getCommandInput?(): Partial<RuntimeCommandInput>;
}

export const RuntimePreview = {
  mount(
    parent: HTMLElement,
    runtime: AssembledRuntime,
    session: RuntimeSession,
    options: RuntimePreviewOptions = {}
  ): Phaser.Game {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 640,
      height: 384,
      backgroundColor: "#171411",
      pixelArt: true,
      antialias: false,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [new RuntimeGameScene(runtime, session, options)]
    });
    Reflect.set(globalThis as object, "__GAMDEMO_RUNTIME_GAME__", game);
    return game;
  }
};
