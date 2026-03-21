import Phaser from "phaser";
import type { RuntimeCommandInput, RuntimePointerTile } from "@gamedemo/engine-core";
import type { AssembledRuntime, RuntimeSession } from "@gamedemo/engine-runtime";
import { RuntimeGameScene } from "./runtimeScene";

export interface RuntimePreviewOptions {
  onPointerTileChange?(tile: RuntimePointerTile | null): void;
  onPointerPrimaryAction?(tile: RuntimePointerTile): void;
  onInventorySlotSelect?(slotIndex: number): void;
  getSelectedTile?(): RuntimePointerTile | null;
  getSelectedTileMarker?(): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null;
  getCommandInput?(): Partial<RuntimeCommandInput>;
}

export const RuntimePreview = {
  mount(
    parent: HTMLElement,
    _runtime: AssembledRuntime,
    session: RuntimeSession,
    options: RuntimePreviewOptions = {}
  ): Phaser.Game {
    return new Phaser.Game({
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
      scene: [new RuntimeGameScene(session, options)]
    });
  }
};
