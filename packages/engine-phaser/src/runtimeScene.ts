import Phaser from "phaser";
import type { RuntimeCommandInput, RuntimePointerTile } from "@gamedemo/engine-core";
import type { RuntimeSession } from "@gamedemo/engine-runtime";
import type { RuntimePreviewOptions } from "./index";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { RuntimeHudView } from "./runtimeHudView";
import { RuntimeTheme } from "./runtimeTheme";
import { RuntimeWorldView } from "./runtimeWorldView";

export class RuntimeGameScene extends Phaser.Scene {
  private worldView: RuntimeWorldView | null = null;
  private hudView: RuntimeHudView | null = null;
  private pointerTile: RuntimePointerTile | null = null;

  constructor(
    private readonly session: RuntimeSession,
    private readonly options: RuntimePreviewOptions = {}
  ) {
    super("RuntimeGameScene");
  }

  preload(): void {
    RuntimeAssetLibrary.preload(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(RuntimeTheme.background);
    this.worldView = new RuntimeWorldView(this, this.session, {
      getSelectedTile: () => this.options.getSelectedTile?.() ?? this.pointerTile,
      getSelectedTileMarker: () => this.options.getSelectedTileMarker?.() ?? null,
      getCommandInput: () => this.options.getCommandInput?.() ?? {}
    });
    this.worldView.create();
    this.worldView.focusCamera();
    this.hudView = new RuntimeHudView(this, this.session, {
      getCommandInput: () => this.buildCommandInput(),
      onInventorySlotSelect: (slotIndex) => {
        this.options.onInventorySlotSelect?.(slotIndex);
      }
    });
    this.bindPointerEvents();
    this.renderViews();
  }

  update(): void {
    this.renderViews();
  }

  private bindPointerEvents(): void {
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerTile = this.resolvePointerTile(pointer);
      this.options.onPointerTileChange?.(this.pointerTile);
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const tile = this.resolvePointerTile(pointer);
      this.pointerTile = tile;
      this.options.onPointerTileChange?.(tile);
      if (tile && pointer.button === 2) {
        this.options.onPointerPrimaryAction?.(tile);
      }
    });
    this.input.mouse?.disableContextMenu();
  }

  private resolvePointerTile(pointer: Phaser.Input.Pointer): RuntimePointerTile | null {
    const world = this.session.snapshot().world;
    const tileX = Math.floor(pointer.worldX / RuntimeAssetLibrary.tileSize);
    const tileY = Math.floor(pointer.worldY / RuntimeAssetLibrary.tileSize);
    if (tileX < 0 || tileY < 0 || tileX >= world.width || tileY >= world.height) {
      return null;
    }
    return { x: tileX, y: tileY };
  }

  private renderViews(): void {
    this.worldView?.render();
    this.hudView?.render(this.options.getSelectedTile?.() ?? this.pointerTile);
  }

  private buildCommandInput(): Partial<RuntimeCommandInput> {
    return {
      ...this.options.getCommandInput?.(),
      pointerTile: this.options.getSelectedTile?.() ?? this.pointerTile
    };
  }
}
