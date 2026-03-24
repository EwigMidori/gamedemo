import Phaser from "phaser";
import type { RuntimeCommandInput, RuntimePointerTile } from "@gamedemo/engine-core";
import type { AssembledRuntime, RuntimeSession } from "@gamedemo/engine-runtime";
import type { RuntimePreviewOptions } from "./index";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { GameCraftPanel } from "./gameCraftPanel";
import { RuntimeContentIndex } from "./runtimeContentIndex";
import { GameHud } from "./gameHud";
import { GameViewport } from "./gameViewport";
import { RuntimeTheme } from "./runtimeTheme";

export class RuntimeGameScene extends Phaser.Scene {
  private cameraZoom = 2;
  private pointerTile: RuntimePointerTile | null = null;
  private uiCamera: Phaser.Cameras.Scene2D.Camera | null = null;
  private viewport: GameViewport | null = null;
  private hud: GameHud | null = null;
  private craftPanel: GameCraftPanel | null = null;
  private contentIndex: RuntimeContentIndex | null = null;
  private overlay: Phaser.GameObjects.RenderTexture | null = null;
  private holdTile: RuntimePointerTile | null = null;
  private holdElapsed = 0;
  private holdDuration = 0.28;
  private holdBarBg: Phaser.GameObjects.Rectangle | null = null;
  private holdBarFill: Phaser.GameObjects.Rectangle | null = null;

  constructor(
    private readonly runtime: AssembledRuntime,
    private readonly session: RuntimeSession,
    private readonly options: RuntimePreviewOptions = {}
  ) {
    super("RuntimeGameScene");
  }

  preload(): void {
    RuntimeAssetLibrary.preload(this);
  }

  create(): void {
    this.contentIndex = new RuntimeContentIndex(this.runtime.content);
    this.cameras.main.setBackgroundColor(RuntimeTheme.background);
    this.createLightTextures();
    this.viewport = new GameViewport(this, this.session, {
      contentIndex: this.contentIndex,
      getSelectedTile: () => this.options.getSelectedTile?.() ?? this.pointerTile,
      getSelectedTileMarker: () => this.options.getSelectedTileMarker?.() ?? null,
      getCommandInput: () => this.options.getCommandInput?.() ?? {}
    });
    this.viewport.create();
    this.overlay = this.add
      .renderTexture(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(900);
    this.hud = new GameHud(this, this.session, {
      getCommandInput: () => this.buildCommandInput(),
      onInventorySlotSelect: (slotIndex) => this.options.onInventorySlotSelect?.(slotIndex)
    });
    this.craftPanel = new GameCraftPanel(this, this.session, this.runtime.content, {
      isOpen: () => this.options.getHandcraftOpen?.() ?? false,
      onClose: () => this.options.onHandcraftClose?.(),
      onCraftRecipe: (recipeId) => this.options.onHandcraftRecipeCraft?.(recipeId)
    });
    this.holdBarBg = this.add.rectangle(0, 0, 26, 5, 0x140f0a, 0.92)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(1100)
      .setStrokeStyle(1, 0xe39b63, 1)
      .setVisible(false);
    this.holdBarFill = this.add.rectangle(0, 0, 0, 3, 0xe39b63, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1101)
      .setVisible(false);
    this.setupUiCamera();
    this.scale.on("resize", this.handleResize, this);
    this.bindPointer();
    this.render();
  }

  update(_time: number, delta: number): void {
    this.updateHold(delta / 1000);
    this.render();
  }

  private bindPointer(): void {
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _objects: unknown, _deltaX: number, deltaY: number) => {
      this.setZoom(this.cameraZoom + (deltaY > 0 ? -0.15 : 0.15));
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.craftPanel?.containsScreenPoint(pointer.x, pointer.y)) {
        this.cancelHold();
        this.pointerTile = null;
        this.options.onPointerTileChange?.(this.pointerTile);
        return;
      }
      if (this.hud?.containsScreenPoint(pointer.x, pointer.y)) {
        this.cancelHold();
        this.pointerTile = null;
        this.options.onPointerTileChange?.(this.pointerTile);
        return;
      }
      const nextTile = this.resolveTile(pointer);
      if (
        this.holdTile &&
        (!nextTile || nextTile.x !== this.holdTile.x || nextTile.y !== this.holdTile.y)
      ) {
        this.cancelHold();
      }
      this.pointerTile = nextTile;
      this.options.onPointerTileChange?.(this.pointerTile);
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.craftPanel?.containsScreenPoint(pointer.x, pointer.y)) {
        this.cancelHold();
        return;
      }
      if (this.hud?.containsScreenPoint(pointer.x, pointer.y)) {
        this.cancelHold();
        return;
      }
      this.pointerTile = this.resolveTile(pointer);
      this.options.onPointerTileChange?.(this.pointerTile);
      if (this.pointerTile && pointer.button === 2) {
        this.options.onPointerPrimaryAction?.(this.pointerTile);
        return;
      }
      if (this.pointerTile && pointer.button === 0) {
        const holdSpec = this.options.getPointerHoldSpec?.(this.pointerTile) ?? null;
        if (!holdSpec) {
          return;
        }
        if (holdSpec.requiresApproach) {
          this.options.onPointerHoldAction?.(this.pointerTile);
          return;
        }
        this.holdTile = this.pointerTile;
        this.holdElapsed = 0;
        this.holdDuration = holdSpec.durationSeconds;
      }
    });
    this.input.on("pointerup", () => {
      this.cancelHold();
      this.options.onPointerHoldCancel?.();
    });
    this.input.mouse?.disableContextMenu();
  }

  private resolveTile(pointer: Phaser.Input.Pointer): RuntimePointerTile | null {
    const world = this.session.snapshot().world;
    const tileX = Math.floor(pointer.worldX / RuntimeAssetLibrary.tileSize);
    const tileY = Math.floor(pointer.worldY / RuntimeAssetLibrary.tileSize);
    const maxX = world.originX + world.width;
    const maxY = world.originY + world.height;
    if (tileX < world.originX || tileY < world.originY || tileX >= maxX || tileY >= maxY) {
      return null;
    }
    return { x: tileX, y: tileY };
  }

  private render(): void {
    const snapshot = this.session.snapshot();
    this.viewport?.render();
    this.renderLighting(snapshot);
    this.hud?.render(this.options.getSelectedTile?.() ?? this.pointerTile);
    this.craftPanel?.render();
  }

  private renderLighting(snapshot: ReturnType<RuntimeSession["snapshot"]>): void {
    if (!this.overlay || !this.contentIndex) {
      return;
    }
    const camera = this.cameras.main;
    const phase = (snapshot.timeSeconds % 180) / 180;
    const sunlight = Phaser.Math.Clamp(Math.sin((phase - 0.25) * Math.PI * 2) * 0.5 + 0.5, 0, 1);
    const nightStrength = 1 - sunlight;
    const darkness = Phaser.Math.Linear(0, 0.46, Math.pow(Phaser.Math.Clamp((nightStrength - 0.3) / 0.7, 0, 1), 1.45));
    this.overlay.clear();
    if (darkness <= 0.001) {
      return;
    }
    this.overlay.fill(0x07111a, darkness, 0, 0, this.scale.width, this.scale.height);
    if (nightStrength < 0.05) {
      return;
    }

    const playerPosition = this.resolveRenderedPlayerPosition(snapshot);
    const playerX = (playerPosition.x * RuntimeAssetLibrary.tileSize + 8 - camera.worldView.x) * camera.zoom;
    const playerY = (playerPosition.y * RuntimeAssetLibrary.tileSize + 12 - camera.worldView.y) * camera.zoom;
    this.overlay.erase("light-player", playerX - 72, playerY - 72);

    for (const structure of snapshot.placedStructures) {
      const definition = this.contentIndex.structure(structure.structureId);
      if (!definition?.lightTexture) {
        continue;
      }
      const worldX = structure.x * RuntimeAssetLibrary.tileSize + 8;
      const worldY = structure.y * RuntimeAssetLibrary.tileSize + 8;
      if (
        worldX < camera.worldView.left - 64 ||
        worldX > camera.worldView.right + 64 ||
        worldY < camera.worldView.top - 64 ||
        worldY > camera.worldView.bottom + 64
      ) {
        continue;
      }
      const screenX = (worldX - camera.worldView.x) * camera.zoom;
      const screenY = (worldY - camera.worldView.y) * camera.zoom;
      this.overlay.erase(definition.lightTexture, screenX - 96, screenY - 96);
    }
  }

  private updateHold(deltaSeconds: number): void {
    if (!this.holdTile) {
      this.hideHoldBar();
      return;
    }
    this.holdElapsed += deltaSeconds;
    this.renderHoldBar();
    if (this.holdElapsed < this.holdDuration) {
      return;
    }
    this.options.onPointerHoldAction?.(this.holdTile);
    this.cancelHold();
  }

  private buildCommandInput(): Partial<RuntimeCommandInput> {
    return {
      ...this.options.getCommandInput?.(),
      pointerTile: this.options.getSelectedTile?.() ?? this.pointerTile
    };
  }

  private cancelHold(): void {
    this.holdTile = null;
    this.holdElapsed = 0;
    this.hideHoldBar();
  }

  private renderHoldBar(): void {
    if (!this.holdTile || !this.holdBarBg || !this.holdBarFill) {
      return;
    }
    const camera = this.cameras.main;
    const width = this.scale.width;
    const height = this.scale.height;
    const screenX = Phaser.Math.Clamp(
      this.holdTile.x * RuntimeAssetLibrary.tileSize * camera.zoom - camera.worldView.x * camera.zoom + 24,
      12,
      width - 12
    );
    const screenY = Phaser.Math.Clamp(
      this.holdTile.y * RuntimeAssetLibrary.tileSize * camera.zoom - camera.worldView.y * camera.zoom - 6,
      112,
      height - 16
    );
    this.holdBarBg.setVisible(true).setPosition(screenX, screenY);
    this.holdBarFill
      .setVisible(true)
      .setPosition(screenX - 12, screenY - 2)
      .setSize(24 * Phaser.Math.Clamp(this.holdElapsed / Math.max(this.holdDuration, 0.001), 0, 1), 3);
  }

  private hideHoldBar(): void {
    this.holdBarBg?.setVisible(false);
    this.holdBarFill?.setVisible(false).setSize(0, 3);
  }

  private resolveRenderedPlayerPosition(
    snapshot: ReturnType<RuntimeSession["snapshot"]>
  ): { x: number; y: number } {
    return { x: snapshot.player.x, y: snapshot.player.y };
  }

  private createLightTextures(): void {
    this.createLightTexture("light-player", 144, 0.17);
    this.createLightTexture("light-campfire", 192, 0.24);
  }

  private setZoom(zoom: number): void {
    const next = Phaser.Math.Clamp(zoom, 1, 4);
    if (Math.abs(next - this.cameraZoom) < 0.001) {
      return;
    }
    this.cameraZoom = next;
    this.cameras.main.setZoom(this.cameraZoom);
  }

  private setupUiCamera(): void {
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, "ui");
    this.uiCamera.setZoom(1);
    this.uiCamera.roundPixels = true;
    this.refreshCameraIgnores();
  }

  private refreshCameraIgnores(): void {
    if (!this.viewport || !this.hud || !this.overlay || !this.uiCamera) {
      return;
    }
    const uiObjects = [
      this.overlay,
      this.holdBarBg,
      this.holdBarFill,
      ...this.hud.getObjects(),
      ...this.craftPanel.getObjects()
    ].filter((entry): entry is Phaser.GameObjects.GameObject => Boolean(entry));
    const worldObjects = this.viewport.getObjects();
    this.cameras.main.ignore(uiObjects);
    this.uiCamera.ignore(worldObjects);
  }

  private createLightTexture(key: string, size: number, peakAlpha: number): void {
    if (this.textures.exists(key)) {
      return;
    }
    const graphics = this.make.graphics({ x: 0, y: 0 });
    const center = size * 0.5;
    const steps = 10;
    for (let step = steps; step >= 1; step -= 1) {
      const t = step / steps;
      graphics.fillStyle(0xffffff, peakAlpha * Math.pow(t, 1.8));
      graphics.fillCircle(center, center, center * t);
    }
    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.overlay?.setSize(gameSize.width, gameSize.height).resize(gameSize.width, gameSize.height);
    this.uiCamera?.setSize(gameSize.width, gameSize.height);
    this.uiCamera?.setViewport(0, 0, gameSize.width, gameSize.height);
    this.refreshCameraIgnores();
    this.render();
  }
}
