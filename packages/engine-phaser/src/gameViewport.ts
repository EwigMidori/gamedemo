import Phaser from "phaser";
import type {
  RuntimeCommandInput,
  RuntimePointerTile,
  RuntimeSessionState,
  StructureDef
} from "@gamedemo/engine-core";
import type { RuntimeSession } from "@gamedemo/engine-runtime";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { RuntimeContentIndex } from "./runtimeContentIndex";
import { StructureAutotileResolver } from "./structureAutotileResolver";
import { RuntimeTheme } from "./runtimeTheme";

interface GameViewportOptions {
  contentIndex: RuntimeContentIndex;
  getSelectedTile?(): RuntimePointerTile | null;
  getSelectedTileMarker?(): {
    strokeColor: number;
    fillColor: number;
    fillAlpha: number;
  } | null;
  getCommandInput?(): Partial<RuntimeCommandInput>;
}

export class GameViewport {
  private readonly terrainSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly resourceSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly structureSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly dropSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly plantedSprites = new Map<string, Phaser.GameObjects.Image>();
  private readonly pathMarkers: Phaser.GameObjects.Rectangle[] = [];
  private readonly playerShadow: Phaser.GameObjects.Ellipse;
  private readonly playerSprite: Phaser.GameObjects.Sprite;
  private readonly cursorHighlight: Phaser.GameObjects.Rectangle;
  private readonly moveTargetMarker: Phaser.GameObjects.Container;
  private readonly structureAutotile = new StructureAutotileResolver();
  private lastFacingFrame = 0;
  private previousLogicalPosition: { x: number; y: number } | null = null;
  private renderedTerrainCount = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: RuntimeSession,
    private readonly options: GameViewportOptions
  ) {
    this.playerShadow = this.scene.add.ellipse(0, 0, 12, 5, 0x000000, 0.4).setDepth(5);
    this.playerSprite = this.scene.add
      .sprite(0, 0, RuntimeAssetLibrary.pawnKey, 0)
      .setOrigin(0.5, 0.75)
      .setDepth(7)
      .setScale(1.15)
      .setTint(0xf6e7c8);
    this.cursorHighlight = this.scene.add.rectangle(0, 0, 16, 16)
      .setDepth(10)
      .setStrokeStyle(1, 0xf6f2d7)
      .setVisible(false);
    const ring = this.scene.add.circle(0, 0, 4).setStrokeStyle(2, 0xf3c96b, 1);
    const dot = this.scene.add.circle(0, 0, 1.5, 0xf3c96b, 1);
    this.moveTargetMarker = this.scene.add.container(0, 0, [ring, dot]).setDepth(9).setVisible(false);
  }

  create(): void {
    const world = this.session.snapshot().world;
    this.createAnimations();
    this.scene.cameras.main.setBackgroundColor(RuntimeTheme.background);
    this.scene.cameras.main.setBounds(
      world.originX * RuntimeAssetLibrary.tileSize,
      world.originY * RuntimeAssetLibrary.tileSize,
      world.width * RuntimeAssetLibrary.tileSize,
      world.height * RuntimeAssetLibrary.tileSize
    );
    this.scene.cameras.main.startFollow(this.playerSprite, true, 0.14, 0.14);
    this.scene.cameras.main.setFollowOffset(10, 0);
    this.scene.cameras.main.setZoom(2);
    this.scene.cameras.main.roundPixels = true;
    this.renderTerrain();
    this.render();
  }

  render(): void {
    const snapshot = this.session.snapshot();
    this.renderTerrain();
    this.renderResources(snapshot);
    this.renderPlantedResources(snapshot);
    this.renderStructures(snapshot);
    this.renderDrops(snapshot);
    this.renderMovePath(snapshot);
    this.renderMoveTarget(snapshot);
    this.renderCursor();
    this.renderPlayer(snapshot);
  }

  getObjects(): Phaser.GameObjects.GameObject[] {
    return [
      ...this.terrainSprites.values(),
      ...this.resourceSprites.values(),
      ...this.structureSprites.values(),
      ...this.dropSprites.values(),
      ...this.plantedSprites.values(),
      ...this.pathMarkers,
      this.playerShadow,
      this.playerSprite,
      this.cursorHighlight,
      this.moveTargetMarker
    ];
  }

  private renderTerrain(): void {
    const world = this.session.snapshot().world;
    this.scene.cameras.main.setBounds(
      world.originX * RuntimeAssetLibrary.tileSize,
      world.originY * RuntimeAssetLibrary.tileSize,
      world.width * RuntimeAssetLibrary.tileSize,
      world.height * RuntimeAssetLibrary.tileSize
    );
    if (world.tiles.length === this.renderedTerrainCount) {
      return;
    }
    for (let index = this.renderedTerrainCount; index < world.tiles.length; index += 1) {
      const tile = world.tiles[index];
      const terrain = this.options.contentIndex.terrain(tile.terrainId);
      const key = `${tile.x},${tile.y}`;
      const sprite = this.scene.add.image(
        tile.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        tile.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
        RuntimeAssetLibrary.worldKey,
        terrain?.frame ?? RuntimeTheme.terrainFrame(tile.terrainId)
      )
        .setDepth(0)
        .setTint(terrain?.tint ?? RuntimeTheme.terrainTint(tile.terrainId));
      this.terrainSprites.set(key, sprite);
    }
    this.renderedTerrainCount = world.tiles.length;
  }

  private renderResources(snapshot: RuntimeSessionState): void {
    const visibleIds = new Set<string>();
    for (const resource of snapshot.resources) {
      const isRespawningTree = resource.depleted &&
        resource.resourceId === "resource:tree" &&
        resource.respawnAt !== null &&
        resource.respawnAt !== undefined &&
        resource.respawnAt > snapshot.timeSeconds;
      if (resource.depleted && !isRespawningTree) {
        continue;
      }
      if (!this.isTileVisible(resource.x, resource.y, 3)) {
        continue;
      }
      visibleIds.add(resource.id);
      const sprite = this.resourceSprites.get(resource.id)
        ?? this.scene.add.image(0, 0, RuntimeAssetLibrary.worldKey, 0).setDepth(2);
      const resourceDef = this.options.contentIndex.resource(resource.resourceId);
      const frame = isRespawningTree
        ? this.resolveRespawningTreeFrame(resource.respawnAt ?? snapshot.timeSeconds, snapshot.timeSeconds)
        : resourceDef?.frame ?? RuntimeTheme.resourceFrame(resource.resourceId);
      sprite
        .setVisible(true)
        .setPosition(
          resource.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          resource.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
        )
        .setFrame(frame)
        .setTint(isRespawningTree ? 0xbfa57f : RuntimeTheme.objectTint);
      this.resourceSprites.set(resource.id, sprite);
    }
    for (const [id, sprite] of this.resourceSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderPlantedResources(snapshot: RuntimeSessionState): void {
    const visibleIds = new Set<string>();
    for (const planted of snapshot.plantedResources ?? []) {
      if (!this.isTileVisible(planted.x, planted.y, 3)) {
        continue;
      }
      visibleIds.add(planted.id);
      const sprite = this.plantedSprites.get(planted.id)
        ?? this.scene.add.image(0, 0, RuntimeAssetLibrary.worldKey, 32).setDepth(2);
      sprite
        .setVisible(true)
        .setPosition(
          planted.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          planted.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
        )
        .setFrame(this.resolveSaplingFrame(planted.growAt - snapshot.timeSeconds))
        .setTint(0xbfa57f);
      this.plantedSprites.set(planted.id, sprite);
    }
    for (const [id, sprite] of this.plantedSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderStructures(snapshot: RuntimeSessionState): void {
    const visibleIds = new Set<string>();
    for (const structure of snapshot.placedStructures) {
      if (!this.isTileVisible(structure.x, structure.y, 3)) {
        continue;
      }
      visibleIds.add(structure.id);
      const sprite = this.structureSprites.get(structure.id)
        ?? this.scene.add.image(0, 0, RuntimeAssetLibrary.worldKey, 0).setDepth(3);
      const definition = this.options.contentIndex.structure(structure.structureId);
      const stage = definition?.growableStages?.length && structure.growth !== null && structure.growth !== undefined
        ? this.resolveGrowthStage(definition, structure.growth)
        : null;
      const autotileFrame = this.structureAutotile.resolveFrame(
        structure,
        definition,
        snapshot.placedStructures
      );
      const frame = autotileFrame
        ?? (structure.isOpen ? definition?.openFrame : null)
        ?? stage?.frame
        ?? definition?.frame
        ?? RuntimeTheme.structureFrameFor(structure.structureId);
      const tint = stage?.tint ?? RuntimeTheme.structureTintFor(structure.structureId);
      sprite
        .setVisible(true)
        .setPosition(
          structure.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          structure.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5
        )
        .setFrame(frame)
        .setTint(tint);
      this.structureSprites.set(structure.id, sprite);
    }
    for (const [id, sprite] of this.structureSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderDrops(snapshot: RuntimeSessionState): void {
    const visibleIds = new Set<string>();
    for (const drop of snapshot.droppedItems ?? []) {
      if (!this.isTileVisible(drop.x, drop.y, 4)) {
        continue;
      }
      visibleIds.add(drop.id);
      const sprite = this.dropSprites.get(drop.id)
        ?? this.scene.add.image(0, 0, RuntimeAssetLibrary.uiKey, 0).setDepth(4);
      const bob = Math.sin((snapshot.timeSeconds - drop.spawnedAt) * 4.2) * 2;
      sprite
        .setVisible(true)
        .setPosition(
          drop.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5,
          drop.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5 - 4 + bob
        )
        .setFrame(RuntimeTheme.itemFrameFor(drop.itemId));
      this.dropSprites.set(drop.id, sprite);
    }
    for (const [id, sprite] of this.dropSprites.entries()) {
      if (!visibleIds.has(id)) {
        sprite.setVisible(false);
      }
    }
  }

  private renderPlayer(snapshot: RuntimeSessionState): void {
    const position = this.resolveRenderedPlayerPosition(snapshot);
    const worldX = position.x * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.5;
    const worldY = position.y * RuntimeAssetLibrary.tileSize + RuntimeAssetLibrary.tileSize * 0.82;
    const frame = this.resolveFacingFrame(snapshot);
    this.playerShadow.setPosition(worldX, worldY + 2);
    this.playerSprite.setPosition(worldX, worldY);
    if (snapshot.player.motion) {
      this.playerSprite.anims.play(this.animationKeyForFrame(frame), true);
    } else {
      this.playerSprite.anims.stop();
      this.playerSprite.setFrame(frame);
    }
    this.previousLogicalPosition = { x: snapshot.player.x, y: snapshot.player.y };
  }

  private resolveRenderedPlayerPosition(snapshot: RuntimeSessionState): { x: number; y: number } {
    return { x: snapshot.player.x, y: snapshot.player.y };
  }

  private resolveFacingFrame(snapshot: RuntimeSessionState): number {
    const motion = snapshot.player.motion;
    if (motion) {
      const deltaX = motion.toX - motion.fromX;
      const deltaY = motion.toY - motion.fromY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        this.lastFacingFrame = deltaX < 0 ? 2 : 4;
      } else if (deltaY !== 0) {
        this.lastFacingFrame = deltaY < 0 ? 6 : 0;
      }
      return this.lastFacingFrame;
    }
    if (!this.previousLogicalPosition) {
      this.lastFacingFrame = 0;
      return this.lastFacingFrame;
    }
    const deltaX = snapshot.player.x - this.previousLogicalPosition.x;
    const deltaY = snapshot.player.y - this.previousLogicalPosition.y;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.lastFacingFrame = deltaX < 0 ? 2 : 4;
    } else if (deltaY !== 0) {
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
    while (this.pathMarkers.length < path.length) {
      this.pathMarkers.push(
        this.scene.add.rectangle(0, 0, 4, 4, 0xf3c96b, 0.68).setDepth(8)
      );
    }
    for (let index = 0; index < this.pathMarkers.length; index += 1) {
      const marker = this.pathMarkers[index];
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

  private resolveGrowthStage(definition: StructureDef, growth: number) {
    const stages = [...(definition.growableStages ?? [])].sort((left, right) => left.minProgress - right.minProgress);
    let selected = stages[0];
    for (const stage of stages) {
      if (growth >= stage.minProgress) {
        selected = stage;
      }
    }
    return selected;
  }

  private resolveRespawningTreeFrame(respawnAt: number, now: number): number {
    const remaining = Math.max(0, respawnAt - now);
    return this.resolveSaplingFrame(remaining);
  }

  private resolveSaplingFrame(remainingSeconds: number): number {
    if (remainingSeconds > 80) {
      return 27;
    }
    if (remainingSeconds > 35) {
      return 28;
    }
    return 29;
  }

  private isTileVisible(tileX: number, tileY: number, marginTiles: number): boolean {
    const bounds = this.scene.cameras.main.worldView;
    const tileSize = RuntimeAssetLibrary.tileSize;
    const worldX = tileX * tileSize + tileSize * 0.5;
    const worldY = tileY * tileSize + tileSize * 0.5;
    const margin = marginTiles * tileSize;
    return worldX >= bounds.left - margin &&
      worldX <= bounds.right + margin &&
      worldY >= bounds.top - margin &&
      worldY <= bounds.bottom + margin;
  }

  private createAnimations(): void {
    const animations = [
      { key: "runtime-walk-down", start: 0, end: 1 },
      { key: "runtime-walk-left", start: 2, end: 3 },
      { key: "runtime-walk-right", start: 4, end: 5 },
      { key: "runtime-walk-up", start: 6, end: 7 }
    ];
    for (const animation of animations) {
      if (this.scene.anims.exists(animation.key)) {
        continue;
      }
      this.scene.anims.create({
        key: animation.key,
        frames: this.scene.anims.generateFrameNumbers(RuntimeAssetLibrary.pawnKey, {
          start: animation.start,
          end: animation.end
        }),
        frameRate: 6,
        repeat: -1
      });
    }
  }

  private animationKeyForFrame(frame: number): string {
    if (frame === 2) {
      return "runtime-walk-left";
    }
    if (frame === 4) {
      return "runtime-walk-right";
    }
    if (frame === 6) {
      return "runtime-walk-up";
    }
    return "runtime-walk-down";
  }
}
