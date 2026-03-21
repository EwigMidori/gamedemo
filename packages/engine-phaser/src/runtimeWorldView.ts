import Phaser from "phaser";
import type { RuntimeCommandInput, RuntimePointerTile, RuntimeSessionState } from "@gamedemo/engine-core";
import type { RuntimeSession } from "@gamedemo/engine-runtime";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { RuntimeTheme } from "./runtimeTheme";

interface RuntimeWorldViewOptions {
  getSelectedTile?(): RuntimePointerTile | null;
  getSelectedTileMarker?(): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null;
  getCommandInput?(): Partial<RuntimeCommandInput>;
}

export class RuntimeWorldView {
  private readonly terrainSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly resourceSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly structureSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly playerShadow: Phaser.GameObjects.Ellipse;
  private readonly playerSprite: Phaser.GameObjects.Sprite;
  private readonly cursorHighlight: Phaser.GameObjects.Rectangle;
  private readonly moveTargetMarker: Phaser.GameObjects.Container;
  private readonly movePathMarkers: Phaser.GameObjects.Rectangle[] = [];
  private lastPlayerPosition: { x: number; y: number } | null = null;
  private lastFacingFrame = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: RuntimeSession,
    private readonly options: RuntimeWorldViewOptions
  ) {
    this.playerShadow = this.scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.4).setDepth(5);
    this.playerSprite = this.scene.add
      .sprite(0, 0, RuntimeAssetLibrary.pawnKey, 0)
      .setOrigin(0.5, 0.75)
      .setDepth(7)
      .setScale(1.15)
      .setTint(0xf6e7c8);
    this.cursorHighlight = this.scene.add.rectangle(0, 0, 16, 16)
      .setStrokeStyle(1, 0xf6f2d7)
      .setVisible(false)
      .setDepth(10);
    const moveRing = this.scene.add.circle(0, 0, 4).setStrokeStyle(2, 0xf3c96b, 1);
    const moveDot = this.scene.add.circle(0, 0, 1.5, 0xf3c96b, 1);
    this.moveTargetMarker = this.scene.add.container(0, 0, [moveRing, moveDot]).setDepth(9);
  }

  create(): void {
    const world = this.session.snapshot().world;
    this.scene.cameras.main.setBackgroundColor(RuntimeTheme.background);
    this.scene.cameras.main.setBounds(
      0,
      0,
      world.width * RuntimeAssetLibrary.tileSize,
      world.height * RuntimeAssetLibrary.tileSize
    );
    this.renderTerrain();
    this.render();
  }

  render(): void {
    const snapshot = this.session.snapshot();
    this.renderResources(snapshot);
    this.renderStructures(snapshot);
    this.renderMovePath(snapshot);
    this.renderMoveTarget(snapshot);
    this.renderCursor();
    this.renderPlayer(snapshot);
  }

  focusCamera(): void {
    this.scene.cameras.main.startFollow(this.playerSprite, true, 0.12, 0.12);
    this.scene.cameras.main.setZoom(3);
    this.scene.cameras.main.setDeadzone(72, 48);
    this.scene.cameras.main.roundPixels = true;
  }

  private renderTerrain(): void {
    const snapshot = this.session.snapshot();
    for (const tile of snapshot.world.tiles) {
      const key = `${tile.x},${tile.y}`;
      const sprite = this.scene.add
        .image(
          tile.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          tile.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          RuntimeAssetLibrary.worldKey,
          RuntimeTheme.terrainFrame(tile.terrainId)
        )
        .setDepth(0)
        .setTint(RuntimeTheme.terrainTint(tile.terrainId));
      this.terrainSprites.set(key, sprite);
    }
  }

  private renderResources(snapshot: RuntimeSessionState): void {
    const visibleIds = new Set<string>();
    for (const resource of snapshot.resources) {
      if (resource.depleted) {
        continue;
      }
      visibleIds.add(resource.id);
      const sprite = this.resourceSprites.get(resource.id)
        ?? this.scene.add.image(0, 0, RuntimeAssetLibrary.worldKey, 0).setDepth(2);
      sprite
        .setVisible(true)
        .setPosition(
          resource.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          resource.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
        )
        .setFrame(RuntimeTheme.resourceFrame(resource.resourceId))
        .setTint(RuntimeTheme.objectTint);
      this.resourceSprites.set(resource.id, sprite);
    }
    for (const [id, sprite] of this.resourceSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderStructures(snapshot: RuntimeSessionState): void {
    const visibleIds = new Set<string>();
    for (const structure of snapshot.placedStructures) {
      visibleIds.add(structure.id);
      const sprite = this.structureSprites.get(structure.id)
        ?? this.scene.add.image(0, 0, RuntimeAssetLibrary.worldKey, 0).setDepth(3);
      sprite
        .setVisible(true)
        .setPosition(
          structure.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          structure.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
        )
        .setFrame(RuntimeTheme.structureFrameFor(structure.structureId))
        .setTint(RuntimeTheme.objectTint);
      this.structureSprites.set(structure.id, sprite);
    }
    for (const [id, sprite] of this.structureSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderPlayer(snapshot: RuntimeSessionState): void {
    const worldX = snapshot.player.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5;
    const worldY = snapshot.player.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.82;
    this.playerShadow.setPosition(worldX, worldY + 2);
    this.playerSprite.setPosition(worldX, worldY);
    this.playerSprite.setFrame(this.resolveFacingFrame(snapshot));
    this.lastPlayerPosition = { x: snapshot.player.x, y: snapshot.player.y };
  }

  private resolveFacingFrame(snapshot: RuntimeSessionState): number {
    if (!this.lastPlayerPosition) {
      this.lastFacingFrame = 0;
      return this.lastFacingFrame;
    }
    const deltaX = snapshot.player.x - this.lastPlayerPosition.x;
    const deltaY = snapshot.player.y - this.lastPlayerPosition.y;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.lastFacingFrame = deltaX < 0 ? 2 : 4;
      return this.lastFacingFrame;
    }
    if (deltaY !== 0) {
      this.lastFacingFrame = deltaY < 0 ? 6 : 0;
    }
    return this.lastFacingFrame;
  }

  private renderCursor(): void {
    const selectedTile = this.options.getSelectedTile?.() ?? null;
    if (!selectedTile) {
      this.cursorHighlight.setVisible(false);
      return;
    }
    const style = this.options.getSelectedTileMarker?.() ?? {
      strokeColor: 0xf3ead8,
      fillColor: 0xffffff,
      fillAlpha: 0.08
    };
    this.cursorHighlight
      .setVisible(true)
      .setPosition(
        selectedTile.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        selectedTile.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
      )
      .setStrokeStyle(1, style.strokeColor, 1)
      .setFillStyle(style.fillColor, style.fillAlpha);
  }

  private renderMoveTarget(snapshot: RuntimeSessionState): void {
    const moveTarget = snapshot.player.moveTarget;
    if (!moveTarget) {
      this.moveTargetMarker.setVisible(false);
      return;
    }
    this.moveTargetMarker
      .setVisible(true)
      .setPosition(
        moveTarget.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        moveTarget.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
      );
  }

  private renderMovePath(snapshot: RuntimeSessionState): void {
    const path = snapshot.player.movePath ?? [];
    while (this.movePathMarkers.length < path.length) {
      this.movePathMarkers.push(
        this.scene.add.rectangle(0, 0, 4, 4, 0xf3c96b, 0.68).setDepth(8)
      );
    }
    for (let index = 0; index < this.movePathMarkers.length; index += 1) {
      const marker = this.movePathMarkers[index];
      const step = path[index];
      if (!step) {
        marker.setVisible(false);
        continue;
      }
      marker
        .setVisible(true)
        .setPosition(
          step.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          step.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
        );
    }
  }
}
