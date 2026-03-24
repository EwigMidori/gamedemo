import Phaser from 'phaser';
import { pawnPngUrl, tilesetPngUrl, uiPngUrl } from '../assets';
import type { Facing, Inventory, ItemId, RecipeId, StructureType } from './constants';
import {
  TILE_SIZE,
  CRAFT_RECIPES,
  DAY_LENGTH,
  ITEM_DEFS,
  clamp,
  tileToWorldCenter,
  worldToTile,
} from './constants';
import {
  addItem,
  canAddItem,
  createInventory,
  removeItem,
  updateNeeds,
} from './inventory';
import { getBreakDurationSeconds } from './commandActions';
import { updateFarmProduction, pruneRespawnMap } from './building';
import { saveGame, loadGame, clearSave } from './saveLoad';
import { TileRenderer } from './TileRenderer';
import { Hud } from './hud';
import { InputManager } from './inputManager';
import {
  executeCommand,
  findCommandByKey,
  getPointerCommandVisuals,
  resolveGlobalCommands,
  resolvePointerCommands,
  type CommandContext,
  type GameCommand,
} from './commands';
import { getCapability, getLightSourceDefinition, getNearbyStations, getPlaceableStructureForItem } from '../content/capabilities';
import { uiFrameForItem } from './uiFrames';
import type { DroppedItem, WorldState } from './worldState';

interface DropRenderObjects {
  shadow: Phaser.GameObjects.Ellipse;
  sprite: Phaser.GameObjects.Image;
  amount: Phaser.GameObjects.Text;
}

const MANUAL_DROP_PICKUP_DELAY = 2;
const DROP_MAGNET_RADIUS = 18;
const DROP_MAGNET_SPEED = 180;
const DROP_STACK_HOLD_DELAY = 0.4;
const MANUAL_DROP_REARM_DISTANCE = 28;

export class MainScene extends Phaser.Scene {
  // Visual
  private overlay!: Phaser.GameObjects.RenderTexture;
  private player!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private cursorHighlight!: Phaser.GameObjects.Rectangle;
  private timeIndicator!: Phaser.GameObjects.Text;
  private hoverHintBg!: Phaser.GameObjects.Rectangle;
  private hoverHintText!: Phaser.GameObjects.Text;
  private breakBarBg!: Phaser.GameObjects.Rectangle;
  private breakBarFill!: Phaser.GameObjects.Rectangle;

  // Subsystems
  private tileRenderer!: TileRenderer;
  private hud!: Hud;
  private inputManager!: InputManager;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  // State
  private state: WorldState = {
    inventory: createInventory({ wood: 20, stone: 8, food: 10, ration: 0 }),
    needs: { hunger: 100, health: 100 },
    resourceRespawnAt: new Map<string, number>(),
    plantedTrees: new Map<string, number>(),
    stoneHealth: new Map<string, number>(),
    chestInventories: new Map<string, Inventory>(),
    farmProgress: new Map<string, number>(),
    structures: new Map<string, StructureType>(),
    droppedItems: new Map<string, DroppedItem>(),
    worldTime: 0,
    day: 1,
  };
  private selectedStructure: StructureType | null = null;
  private selectedRecipeId: RecipeId = 'plank';
  private activeSlotIndex = 0;
  private handcraftOpen = false;
  private stationPanelOpen = false;
  private openedStationId: string | null = null;

  private cameraZoom = 2;
  private saveCooldown = 0;
  private pointerTile: { x: number; y: number } | null = null;
  private facing: Facing = 'down';
  private moving = false;
  private ambientDarkness = 0.06;
  private breakHoldActive = false;
  private breakHoldBlockedByUi = false;
  private breakHoldProgress = 0;
  private breakHoldSignature: string | null = null;
  private dropRenderObjects = new Map<string, DropRenderObjects>();
  private dropKeyHoldTime = 0;
  private dropStackTriggered = false;

  constructor() {
    super('main');
  }

  preload(): void {
    this.load.spritesheet('tiles', tilesetPngUrl, { frameWidth: TILE_SIZE, frameHeight: TILE_SIZE });
    this.load.spritesheet('ui', uiPngUrl, { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('pawn', pawnPngUrl, { frameWidth: 16, frameHeight: 16 });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#171411');
    this.createAnimations();
    this.createLightTextures();

    this.playerShadow = this.add.ellipse(0, 0, 12, 5, 0x000000, 0.4).setDepth(5);
    this.player = this.add
      .sprite(0, 0, 'pawn', 0)
      .setOrigin(0.5, 0.75)
      .setDepth(7)
      .setScale(1.15)
      .setTint(0xf6e7c8);
    this.cursorHighlight = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE)
      .setStrokeStyle(1, 0xf6f2d7).setVisible(false).setDepth(10);

    this.overlay = this.add
      .renderTexture(0, 0, this.scale.width, this.scale.height)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(20);

    this.timeIndicator = this.add.text(this.scale.width - 12, 10, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f6f2d7',
      backgroundColor: '#152018cc',
      padding: { x: 6, y: 3 },
    })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(21);

    this.hoverHintBg = this.add.rectangle(0, 0, 10, 10, 0x142018, 0.92)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(22)
      .setStrokeStyle(1, 0xf3c96b, 1)
      .setVisible(false);
    this.hoverHintText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f6f2d7',
      padding: { x: 4, y: 2 },
    })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(23)
      .setVisible(false);
    this.breakBarBg = this.add.rectangle(0, 0, 24, 4, 0x140f0a, 0.92)
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(24)
      .setStrokeStyle(1, 0xe39b63, 1)
      .setVisible(false);
    this.breakBarFill = this.add.rectangle(0, 0, 0, 2, 0xe39b63, 1)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(25)
      .setVisible(false);

    this.hud = new Hud(
      this,
      (index) => this.setActiveSlot(index),
      (recipeId) => this.setSelectedRecipe(recipeId),
      (recipeId) => this.craftRecipeFromPanel(recipeId),
      () => { this.handcraftOpen = false; },
      () => { this.closeStationPanel(); },
    );
    this.tileRenderer = new TileRenderer(this);
    this.inputManager = new InputManager();
    this.inputManager.init(this);

    this.loadSave();
    this.selectInitialSlot();
    this.updateTimeIndicator();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameraZoom = 2;
    this.cameras.main.setZoom(this.cameraZoom);
    this.cameras.main.roundPixels = true;
    this.tileRenderer.ensurePool(true);
    this.setupUiCamera();

    this.setupEvents();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.saveNow());
  }

  update(_time: number, deltaMs: number): void {
    const delta = deltaMs / 1000;
    this.state.worldTime += delta;
    this.saveCooldown += delta;

    // Movement
    const result = this.inputManager.handleMovement(
      delta, this.player, this.state.worldTime, this.state.resourceRespawnAt, this.state.plantedTrees, this.state.stoneHealth, this.state.structures,
    );
    if (result.moving) {
      this.facing = result.facing;
      this.moving = true;
    } else if (!result.moving) {
      this.moving = false;
    }

    // Simulation
    updateNeeds(this.state.needs, delta, result.sprinting ? 2.6 : 1);
    this.updateDayNight();
    updateFarmProduction(delta, this.state.farmProgress, this.state.structures);
    pruneRespawnMap(this.state.resourceRespawnAt, this.state.worldTime);
    this.updateTimeIndicator();
    this.simulateDroppedItems(delta);

    // Rendering
    this.tileRenderer.render(
      this.state.worldTime,
      this.state.structures,
      this.state.farmProgress,
      this.state.resourceRespawnAt,
      this.state.plantedTrees,
      this.state.stoneHealth,
    );
    this.updatePlayerPresentation();
    this.mergeDroppedItems();
    this.updateDroppedItems();
    this.collectNearbyDrops();
    const nearbyStations = getNearbyStations(this.player.x, this.player.y, 4, this.state.structures);
    if (this.stationPanelOpen && this.openedStationId && !nearbyStations.has(this.openedStationId)) {
      this.closeStationPanel();
    }
    const modalOpen = this.handcraftOpen || this.stationPanelOpen;
    this.timeIndicator.setVisible(!modalOpen);
    this.hud.update({
      worldTime: this.state.worldTime,
      day: this.state.day,
      cameraZoom: this.cameraZoom,
      needs: this.state.needs,
      inventory: this.state.inventory,
      selectedStructure: this.selectedStructure,
      activeSlotIndex: this.activeSlotIndex,
      heldItemId: this.getHeldItemId(),
      selectedRecipeId: this.selectedRecipeId,
      handcraftOpen: this.handcraftOpen,
      stationPanelOpen: this.stationPanelOpen,
      openedStationId: this.openedStationId,
      modalOpen,
      nearbyStations,
      playerX: this.player.x,
      playerY: this.player.y,
      pointerTile: this.pointerTile,
      structures: this.state.structures,
      chestInventories: this.state.chestInventories,
      farmProgress: this.state.farmProgress,
      resourceRespawnAt: this.state.resourceRespawnAt,
      plantedTrees: this.state.plantedTrees,
      stoneHealth: this.state.stoneHealth,
      droppedItems: this.state.droppedItems,
      scaleWidth: this.scale.width,
      scaleHeight: this.scale.height,
    });
    this.updateHoverHint();
    this.updateBreakHold(delta);
    this.updateDropKeyHold(delta);

    // Key actions
    this.handleKeyActions();

    if (this.saveCooldown >= 8) this.saveNow();
  }

  // ── Private helpers ────────────────────────────

  private createAnimations(): void {
    const dirs: Array<{ key: string; start: number; end: number }> = [
      { key: 'walk-down', start: 0, end: 1 },
      { key: 'walk-left', start: 2, end: 3 },
      { key: 'walk-right', start: 4, end: 5 },
      { key: 'walk-up', start: 6, end: 7 },
    ];
    for (const d of dirs) {
      this.anims.create({
        key: d.key,
        frames: this.anims.generateFrameNumbers('pawn', { start: d.start, end: d.end }),
        frameRate: 6,
        repeat: -1,
      });
    }
  }

  private createLightTextures(): void {
    this.createLightTexture('light-player', 144, 0.17);
    this.createLightTexture('light-campfire', 192, 0.24);
  }

  private createLightTexture(key: string, size: number, peakAlpha: number): void {
    if (this.textures.exists(key)) return;

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

  private setupEvents(): void {
    this.input.setTopOnly(true);

    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.overlay.setSize(size.width, size.height);
      this.overlay.resize(size.width, size.height);
      this.hud.onResize(size.width, size.height);
      this.tileRenderer.ensurePool(true);
      this.uiCamera.setSize(size.width, size.height);
      this.uiCamera.setViewport(0, 0, size.width, size.height);
      this.refreshCameraIgnores();
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isModalOpen()) {
        this.resetBreakHold();
        this.hoverHintBg.setVisible(false);
        this.hoverHintText.setVisible(false);
        this.cursorHighlight.setVisible(false);
        return;
      }
      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tx = worldToTile(wp.x);
      const ty = worldToTile(wp.y);
      if (this.pointerTile && (this.pointerTile.x !== tx || this.pointerTile.y !== ty)) {
        this.resetBreakHold();
      }
      this.pointerTile = { x: tx, y: ty };
      this.cursorHighlight.setVisible(true).setPosition(tileToWorldCenter(tx), tileToWorldCenter(ty));
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.isModalOpen()) {
        this.resetBreakHold();
        return;
      }
      const overHud = currentlyOver.some((gameObject) => this.hud.getObjects().includes(gameObject));
      if (overHud) {
        this.resetBreakHold();
        return;
      }

      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tx = worldToTile(wp.x);
      const ty = worldToTile(wp.y);
      this.pointerTile = { x: tx, y: ty };
      if (pointer.button === 0) {
        this.breakHoldActive = true;
        this.breakHoldBlockedByUi = false;
        this.breakHoldProgress = 0;
        this.breakHoldSignature = null;
        return;
      }
      if (pointer.button !== 2) return;
      if (!this.inputManager.shiftKey.isDown && this.tryToggleStationPanelAtPointer()) return;
      const command = this.resolveRightClickCommand(this.inputManager.shiftKey.isDown);
      if (!command) return;
      this.dispatchCommand(command, 0.9);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) {
        this.resetBreakHold();
      }
    });

    this.input.on('wheel', (_p: Phaser.Input.Pointer, _go: unknown, _dx: number, dy: number) => {
      this.setZoom(this.cameraZoom + (dy > 0 ? -0.15 : 0.15));
    });

    this.input.mouse?.disableContextMenu();
  }

  private handleKeyActions(): void {
    const im = this.inputManager;
    const JD = Phaser.Input.Keyboard.JustDown;

    if (JD(im.interactKey)) {
      this.toggleHandcraft();
    }
    if (JD(im.eatKey)) {
      const command = this.resolveKeyCommand('F/R');
      this.hud.toast(command ? this.dispatchCommand(command, 0.9, true) : 'Hold a usable item to use.', 0.9, this.state.worldTime);
    }
    if (JD(im.eatRationKey)) {
      const command = this.resolveKeyCommand('F/R');
      this.hud.toast(command ? this.dispatchCommand(command, 1.0, true) : 'Hold a usable item to use.', 1.0, this.state.worldTime);
    }
    if (JD(im.stashKey)) {
      const command = this.resolvePointerCommands().find((entry) => entry.id === 'store-item') ?? null;
      this.hud.toast(command ? this.dispatchCommand(command, 0.9, true) : 'Point at a storage object.', 0.9, this.state.worldTime);
    }
    if (JD(im.withdrawKey)) {
      const command = this.resolvePointerCommands().find((entry) => entry.id === 'take-item') ?? null;
      this.hud.toast(command ? this.dispatchCommand(command, 0.9, true) : 'Point at a storage object.', 0.9, this.state.worldTime);
    }
    if (JD(im.dropKey)) {
      this.dropKeyHoldTime = 0;
      this.dropStackTriggered = false;
      this.hud.toast(this.dropHeldItem(), 0.9, this.state.worldTime);
    }

    if (JD(im.buildKey1)) this.setActiveSlot(0);
    else if (JD(im.buildKey2)) this.setActiveSlot(1);
    else if (JD(im.buildKey3)) this.setActiveSlot(2);

    if (JD(im.zoomInKey) || JD(im.zoomInNumpadKey)) this.setZoom(this.cameraZoom + 0.25);
    else if (JD(im.zoomOutKey) || JD(im.zoomOutNumpadKey)) this.setZoom(this.cameraZoom - 0.25);
    else if (JD(im.zoomResetKey)) this.setZoom(2);

    if (JD(im.clearSaveKey)) {
      clearSave();
      this.scene.restart();
    }
  }

  private updateDayNight(): void {
    const previousDay = this.state.day;
    this.state.day = Math.max(1, Math.floor(this.state.worldTime / DAY_LENGTH) + 1);
    if (this.state.day > previousDay) addItem(this.state.inventory, 'food', 2);

    const phase = (this.state.worldTime % DAY_LENGTH) / DAY_LENGTH;
    const sunlight = Phaser.Math.Clamp(Math.sin((phase - 0.25) * Math.PI * 2) * 0.5 + 0.5, 0, 1);
    const nightStrength = 1 - sunlight;

    const duskStart = 0.3;
    const darknessStrength = Phaser.Math.Clamp((nightStrength - duskStart) / (1 - duskStart), 0, 1);

    this.ambientDarkness = Phaser.Math.Linear(0, 0.46, Math.pow(darknessStrength, 1.45));
    this.renderLighting(darknessStrength);
  }

  private renderLighting(darknessStrength: number): void {
    const camera = this.cameras.main;
    const zoom = camera.zoom;

    this.overlay.clear();
    if (darknessStrength <= 0.001) return;

    this.overlay.fill(0x07111a, this.ambientDarkness, 0, 0, this.scale.width, this.scale.height);

    if (darknessStrength < 0.05) return;

    const playerScreenX = (this.player.x - camera.worldView.x) * zoom;
    const playerScreenY = (this.player.y - camera.worldView.y) * zoom;
    this.overlay.erase('light-player', playerScreenX - 72, playerScreenY - 72);

    for (const [key, structure] of this.state.structures) {
      const light = getLightSourceDefinition(structure);
      if (!light) continue;

      const [tx, ty] = key.split(',').map(Number);
      const worldX = tileToWorldCenter(tx);
      const worldY = tileToWorldCenter(ty);

      if (
        worldX < camera.worldView.left - 64 ||
        worldX > camera.worldView.right + 64 ||
        worldY < camera.worldView.top - 64 ||
        worldY > camera.worldView.bottom + 64
      ) {
        continue;
      }

      const screenX = (worldX - camera.worldView.x) * zoom;
      const screenY = (worldY - camera.worldView.y) * zoom;
      this.overlay.erase(
        light.texture,
        screenX - 96 + (light.offsetX ?? 0),
        screenY - 96 + (light.offsetY ?? 0),
      );
    }
  }

  private updatePlayerPresentation(): void {
    this.playerShadow.setPosition(this.player.x, this.player.y - 2);
    const depth = 100 + this.player.y / 1000;
    this.playerShadow.setDepth(depth - 0.5);
    this.player.setDepth(depth);

    if (this.moving) {
      this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.stop();
      const idleFrame = this.facing === 'down' ? 0 : this.facing === 'left' ? 2 : this.facing === 'right' ? 4 : 6;
      this.player.setFrame(idleFrame);
    }
  }

  private setZoom(zoom: number): void {
    const next = clamp(zoom, 1, 4);
    if (Math.abs(next - this.cameraZoom) < 0.001) return;
    this.cameraZoom = next;
    this.cameras.main.setZoom(this.cameraZoom);
    this.tileRenderer.ensurePool(true);
    this.refreshCameraIgnores();
  }

  private setupUiCamera(): void {
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, 'ui');
    this.uiCamera.setZoom(1);
    this.uiCamera.roundPixels = true;
    this.refreshCameraIgnores();
  }

  private refreshCameraIgnores(): void {
    const uiObjects = [this.overlay, this.timeIndicator, this.hoverHintBg, this.hoverHintText, this.breakBarBg, this.breakBarFill, ...this.hud.getObjects()];
    const worldObjects = [
      ...this.tileRenderer.getObjects(),
      ...this.getDropObjects(),
      this.playerShadow,
      this.player,
      this.cursorHighlight,
    ];

    this.cameras.main.ignore(uiObjects);
    this.uiCamera.ignore(worldObjects);
  }

  private selectInitialSlot(): void {
    const firstFilled = this.state.inventory.slots.findIndex((slot) => slot.itemId && slot.quantity > 0);
    this.setActiveSlot(firstFilled >= 0 ? firstFilled : 0);
  }

  private setActiveSlot(index: number): void {
    this.activeSlotIndex = clamp(index, 0, Math.max(0, this.state.inventory.slots.length - 1));
    this.selectedStructure = this.structureForHeldItem(this.getHeldItemId());
  }

  private refreshHeldSelection(): void {
    this.setActiveSlot(this.activeSlotIndex);
  }

  private setSelectedRecipe(recipeId: RecipeId): void {
    this.selectedRecipeId = recipeId;
  }

  private toggleHandcraft(): void {
    const hasHandcraftRecipes = CRAFT_RECIPES.some((recipe) => !recipe.station);
    if (!hasHandcraftRecipes) {
      this.hud.toast('No handcraft recipes yet.', 0.9, this.state.worldTime);
      return;
    }
    if (!this.handcraftOpen) this.closeStationPanel();
    this.handcraftOpen = !this.handcraftOpen;
    this.hud.toast(this.handcraftOpen ? 'Opened handcraft.' : 'Closed handcraft.', 0.6, this.state.worldTime);
  }

  private closeStationPanel(): void {
    this.stationPanelOpen = false;
    this.openedStationId = null;
  }

  private toggleStationPanel(stationId: string): void {
    if (this.stationPanelOpen && this.openedStationId === stationId) {
      this.closeStationPanel();
      this.hud.toast(`Closed ${stationId}.`, 0.6, this.state.worldTime);
      return;
    }
    this.handcraftOpen = false;
    this.stationPanelOpen = true;
    this.openedStationId = stationId;
    const firstRecipe = CRAFT_RECIPES.find((recipe) => recipe.station === stationId);
    if (firstRecipe) this.selectedRecipeId = firstRecipe.id;
    this.hud.toast(`Opened ${stationId}.`, 0.6, this.state.worldTime);
  }

  private tryToggleStationPanelAtPointer(): boolean {
    if (!this.pointerTile) return false;
    const key = `${this.pointerTile.x},${this.pointerTile.y}`;
    const structure = this.state.structures.get(key);
    if (!structure) return false;
    const craftStation = getCapability(structure, 'craft-station');
    if (!craftStation) return false;
    this.toggleStationPanel(craftStation.station);
    return true;
  }

  private getHeldItemId(): ItemId | null {
    const slot = this.state.inventory.slots[this.activeSlotIndex];
    if (!slot || !slot.itemId || slot.quantity <= 0) return null;
    return slot.itemId;
  }

  private structureForHeldItem(itemId: ItemId | null): StructureType | null {
    return itemId ? getPlaceableStructureForItem(itemId) : null;
  }

  private saveNow(): void {
    this.saveCooldown = 0;
    saveGame({
      playerX: this.player.x,
      playerY: this.player.y,
      ...this.state,
      });
  }

  private loadSave(): void {
    const state = loadGame();
    this.player.setPosition(state.playerX, state.playerY);
    this.state = {
      inventory: state.inventory,
      needs: state.needs,
      resourceRespawnAt: state.resourceRespawnAt,
      plantedTrees: state.plantedTrees,
      stoneHealth: state.stoneHealth,
      chestInventories: state.chestInventories,
      farmProgress: state.farmProgress,
      structures: state.structures,
      droppedItems: state.droppedItems,
      worldTime: state.worldTime,
      day: state.day,
    };
  }

  private updateTimeIndicator(): void {
    const dayProgress = (this.state.worldTime % DAY_LENGTH) / DAY_LENGTH;
    const totalMinutes = Math.floor(dayProgress * 24 * 60);
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    this.timeIndicator.setText(`Day ${this.state.day} · ${hours}:${minutes}`);
  }

  private updateHoverHint(): void {
    if (this.isModalOpen()) {
      this.hoverHintBg.setVisible(false);
      this.hoverHintText.setVisible(false);
      this.breakBarBg.setVisible(false);
      this.breakBarFill.setVisible(false);
      this.cursorHighlight.setVisible(false);
      return;
    }

    if (!this.pointerTile) {
      this.hoverHintBg.setVisible(false);
      this.hoverHintText.setVisible(false);
      this.breakBarBg.setVisible(false);
      this.breakBarFill.setVisible(false);
      this.cursorHighlight.setStrokeStyle(1, 0xf6f2d7, 1);
      return;
    }

    const pointer = this.input.activePointer;
    const commands = this.resolvePointerCommands();
    const visuals = getPointerCommandVisuals(commands);
    const hintLabel = commands.map((command) => command.key).join(' / ');

    this.cursorHighlight.setStrokeStyle(visuals.width, visuals.stroke, 1);
    this.cursorHighlight.setFillStyle(visuals.stroke, visuals.alpha);

    if (commands.length === 0) {
      this.hoverHintBg.setVisible(false);
      this.hoverHintText.setVisible(false);
      this.breakBarBg.setVisible(false);
      this.breakBarFill.setVisible(false);
      return;
    }

    this.hoverHintText.setText(hintLabel).setPosition(pointer.x, pointer.y - 10).setVisible(true);
    this.hoverHintBg
      .setSize(this.hoverHintText.width + 10, this.hoverHintText.height + 6)
      .setPosition(pointer.x, pointer.y - 6)
      .setFillStyle(visuals.fill, 0.94)
      .setStrokeStyle(1, visuals.stroke, 1)
      .setVisible(true);

    this.updateBreakProgressUi(pointer);
  }

  private updateBreakHold(delta: number): void {
    if (this.isModalOpen()) {
      this.resetBreakHold();
      return;
    }
    const pointer = this.input.activePointer;
    if (!this.breakHoldActive || this.breakHoldBlockedByUi || !pointer.leftButtonDown()) {
      this.resetBreakHold();
      return;
    }

    const command = this.resolveBreakCommand();
    if (!command) {
      this.breakHoldProgress = 0;
      this.breakHoldSignature = null;
      return;
    }

    const signature = `${command.id}:${command.tileKey ?? ''}`;
    if (this.breakHoldSignature !== signature) {
      this.breakHoldSignature = signature;
      this.breakHoldProgress = 0;
    }

    this.breakHoldProgress += delta;
    const duration = getBreakDurationSeconds(command, this.getCommandContext());
    if (this.breakHoldProgress < duration) return;

    this.breakHoldProgress = 0;
    this.dispatchCommand(command, 0.7);
  }

  private resetBreakHold(): void {
    this.breakHoldActive = false;
    this.breakHoldBlockedByUi = false;
    this.breakHoldProgress = 0;
    this.breakHoldSignature = null;
    this.breakBarBg.setVisible(false);
    this.breakBarFill.setVisible(false);
  }

  private isModalOpen(): boolean {
    return this.handcraftOpen || this.stationPanelOpen;
  }

  private updateBreakProgressUi(pointer: Phaser.Input.Pointer): void {
    if (!this.breakHoldActive || !this.breakHoldSignature) {
      this.breakBarBg.setVisible(false);
      this.breakBarFill.setVisible(false);
      return;
    }

    const command = this.resolveBreakCommand();
    if (!command) {
      this.breakBarBg.setVisible(false);
      this.breakBarFill.setVisible(false);
      return;
    }

    const duration = getBreakDurationSeconds(command, this.getCommandContext());
    const progress = Phaser.Math.Clamp(this.breakHoldProgress / Math.max(duration, 0.001), 0, 1);
    const barWidth = 24;
    const x = pointer.x - barWidth * 0.5;
    const y = pointer.y - 20;

    this.breakBarBg
      .setPosition(pointer.x, y)
      .setVisible(progress > 0);
    this.breakBarFill
      .setPosition(x + 1, y - 1)
      .setSize(Math.max(0, (barWidth - 2) * progress), 2)
      .setVisible(progress > 0);
  }

  private updateDropKeyHold(delta: number): void {
    if (!this.inputManager.dropKey.isDown) {
      this.dropKeyHoldTime = 0;
      this.dropStackTriggered = false;
      return;
    }

    if (this.dropStackTriggered) return;

    this.dropKeyHoldTime += delta;
    if (this.dropKeyHoldTime < DROP_STACK_HOLD_DELAY) return;

    this.dropStackTriggered = true;
    const message = this.dropHeldStack();
    if (message) this.hud.toast(message, 1.0, this.state.worldTime);
  }

  private updateDroppedItems(): void {
    const seen = new Set<string>();

    for (const [id, drop] of this.state.droppedItems) {
      seen.add(id);
      let render = this.dropRenderObjects.get(id);
      if (!render) {
        const shadow = this.add.ellipse(drop.x, drop.y + 5, 11, 5, 0x000000, 0.32).setDepth(4);
        const sprite = this.add.image(drop.x, drop.y, 'ui', uiFrameForItem(drop.itemId)).setDepth(6).setScale(0.9);
        const amount = this.add.text(drop.x, drop.y, drop.quantity > 1 ? `${drop.quantity}` : '', {
          fontFamily: 'monospace',
          fontSize: '8px',
          color: '#f6f2d7',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5, 0.5).setDepth(7);
        render = { shadow, sprite, amount };
        this.dropRenderObjects.set(id, render);
        this.refreshCameraIgnores();
      }

      const bob = Math.sin((this.state.worldTime - drop.spawnedAt) * 3.2) * 2;
      render.shadow.setPosition(drop.x, drop.y + 5);
      render.shadow.setDepth(100 + drop.y / 1000 - 0.5);
      render.sprite.setFrame(uiFrameForItem(drop.itemId));
      render.sprite.setPosition(drop.x, drop.y - 4 + bob);
      render.sprite.setDepth(100 + drop.y / 1000);
      render.amount
        .setText(drop.quantity > 1 ? `${drop.quantity}` : '')
        .setPosition(drop.x + 5, drop.y + 3 + bob)
        .setDepth(100 + drop.y / 1000 + 0.1);
    }

    for (const [id, render] of this.dropRenderObjects) {
      if (seen.has(id)) continue;
      render.shadow.destroy();
      render.sprite.destroy();
      render.amount.destroy();
      this.dropRenderObjects.delete(id);
    }
  }

  private mergeDroppedItems(): void {
    const drops = [...this.state.droppedItems.values()];
    const removed = new Set<string>();

    for (let i = 0; i < drops.length; i += 1) {
      const base = drops[i];
      if (removed.has(base.id)) continue;

      for (let j = i + 1; j < drops.length; j += 1) {
        const other = drops[j];
        if (removed.has(other.id) || base.itemId !== other.itemId) continue;

        const distance = Phaser.Math.Distance.Between(base.x, base.y, other.x, other.y);
        if (distance > 14) continue;

        base.quantity += other.quantity;
        base.x = (base.x + other.x) * 0.5;
        base.y = (base.y + other.y) * 0.5;
        base.vx = (base.vx + other.vx) * 0.5;
        base.vy = (base.vy + other.vy) * 0.5;
        base.spawnedAt = Math.max(base.spawnedAt, other.spawnedAt);
        base.pickupDelay = Math.max(base.pickupDelay, other.pickupDelay);
        removed.add(other.id);
      }
    }

    if (removed.size === 0) return;
    for (const id of removed) {
      this.state.droppedItems.delete(id);
    }
  }

  private tryMergeIntoNearbyDrop(itemId: ItemId, quantity: number, x: number, y: number): boolean {
    const maxStack = ITEM_DEFS[itemId]?.stackSize ?? 99;
    let best: DroppedItem | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const drop of this.state.droppedItems.values()) {
      if (drop.itemId !== itemId || drop.quantity >= maxStack) continue;
      const distance = Phaser.Math.Distance.Between(x, y, drop.x, drop.y);
      if (distance > 20 || distance >= bestDistance) continue;
      best = drop;
      bestDistance = distance;
    }

    if (!best) return false;

    best.quantity += quantity;
    best.x = (best.x + x) * 0.5;
    best.y = (best.y + y) * 0.5;
    best.vx *= 0.5;
    best.vy *= 0.5;
    best.spawnedAt = this.state.worldTime;
    best.pickupDelay = MANUAL_DROP_PICKUP_DELAY;
    return true;
  }

  private simulateDroppedItems(delta: number): void {
    const drag = Math.pow(0.025, delta);
    for (const drop of this.state.droppedItems.values()) {
      if (this.state.worldTime - drop.spawnedAt >= drop.pickupDelay) {
        const distanceToPlayer = Phaser.Math.Distance.Between(drop.x, drop.y, this.player.x, this.player.y);
        if (drop.pickupDelay >= MANUAL_DROP_PICKUP_DELAY && distanceToPlayer < MANUAL_DROP_REARM_DISTANCE) {
          continue;
        }
        if (distanceToPlayer <= DROP_MAGNET_RADIUS && distanceToPlayer > 0.001) {
          const pull = DROP_MAGNET_SPEED * delta;
          drop.vx += ((this.player.x - drop.x) / distanceToPlayer) * pull;
          drop.vy += ((this.player.y - drop.y) / distanceToPlayer) * pull;
        }
      }
      drop.x += drop.vx * delta;
      drop.y += drop.vy * delta;
      drop.vx *= drag;
      drop.vy *= drag;
      if (Math.abs(drop.vx) < 1) drop.vx = 0;
      if (Math.abs(drop.vy) < 1) drop.vy = 0;
    }
  }

  private collectNearbyDrops(): void {
    const collected: string[] = [];
    const messages: string[] = [];

    for (const [id, drop] of this.state.droppedItems) {
      if (this.state.worldTime - drop.spawnedAt < drop.pickupDelay) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, drop.x, drop.y);
      if (distance > 18) continue;
      if (!canAddItem(this.state.inventory, drop.itemId, drop.quantity)) continue;
      addItem(this.state.inventory, drop.itemId, drop.quantity);
      collected.push(id);
      messages.push(`${drop.itemId} x${drop.quantity}`);
    }

    if (collected.length === 0) return;
    for (const id of collected) {
      this.state.droppedItems.delete(id);
    }
    this.refreshHeldSelection();
    this.hud.toast(`Picked up ${messages.slice(0, 2).join(', ')}${messages.length > 2 ? '...' : ''}.`, 0.7, this.state.worldTime);
  }

  private dropHeldItem(): string {
    const heldItemId = this.getHeldItemId();
    if (!heldItemId) return 'Hold something to drop it.';
    if (!removeItem(this.state.inventory, heldItemId, 1)) return 'Nothing to drop.';

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.FloatBetween(7, 12);
    const dropX = this.player.x + Math.cos(angle) * radius;
    const dropY = this.player.y + Math.sin(angle) * radius;
    if (this.tryMergeIntoNearbyDrop(heldItemId, 1, dropX, dropY)) {
      this.refreshHeldSelection();
      return `Dropped 1 ${heldItemId}.`;
    }
    const drop: DroppedItem = {
      id: `drop-${Math.round(this.state.worldTime * 1000)}-${Math.floor(Math.random() * 100000)}`,
      itemId: heldItemId,
      quantity: 1,
      x: dropX,
      y: dropY,
      vx: Math.cos(angle) * Phaser.Math.FloatBetween(48, 70),
      vy: Math.sin(angle) * Phaser.Math.FloatBetween(48, 70),
      spawnedAt: this.state.worldTime,
      pickupDelay: MANUAL_DROP_PICKUP_DELAY,
    };
    this.state.droppedItems.set(drop.id, drop);
    this.refreshHeldSelection();
    return `Dropped 1 ${heldItemId}.`;
  }

  private dropHeldStack(): string | null {
    const slot = this.state.inventory.slots[this.activeSlotIndex];
    if (!slot || !slot.itemId || slot.quantity <= 0) return null;

    const itemId = slot.itemId;
    const quantity = slot.quantity;
    if (!removeItem(this.state.inventory, itemId, quantity)) return null;

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.FloatBetween(8, 13);
    const dropX = this.player.x + Math.cos(angle) * radius;
    const dropY = this.player.y + Math.sin(angle) * radius;
    if (this.tryMergeIntoNearbyDrop(itemId, quantity, dropX, dropY)) {
      this.refreshHeldSelection();
      return `Dropped ${quantity} ${itemId}.`;
    }

    const drop: DroppedItem = {
      id: `drop-${Math.round(this.state.worldTime * 1000)}-${Math.floor(Math.random() * 100000)}`,
      itemId,
      quantity,
      x: dropX,
      y: dropY,
      vx: Math.cos(angle) * Phaser.Math.FloatBetween(52, 76),
      vy: Math.sin(angle) * Phaser.Math.FloatBetween(52, 76),
      spawnedAt: this.state.worldTime,
      pickupDelay: MANUAL_DROP_PICKUP_DELAY,
    };
    this.state.droppedItems.set(drop.id, drop);
    this.refreshHeldSelection();
    return `Dropped ${quantity} ${itemId}.`;
  }

  private getDropObjects(): Phaser.GameObjects.GameObject[] {
    return [...this.dropRenderObjects.values()].flatMap((entry) => [entry.shadow, entry.sprite, entry.amount]);
  }

  private craftRecipeFromPanel(recipeId: RecipeId): void {
    this.setSelectedRecipe(recipeId);
    const command: GameCommand = {
      id: 'craft-recipe',
      key: 'PANEL',
      label: 'Craft from panel.',
    };
    this.hud.toast(this.dispatchCommand(command, 1.0, true), 1.0, this.state.worldTime);
  }

  private getCommandContext(): CommandContext {
    return {
      playerX: this.player.x,
      playerY: this.player.y,
      worldTime: this.state.worldTime,
      inventory: this.state.inventory,
      needs: this.state.needs,
      resourceRespawnAt: this.state.resourceRespawnAt,
      plantedTrees: this.state.plantedTrees,
      stoneHealth: this.state.stoneHealth,
      chestInventories: this.state.chestInventories,
      farmProgress: this.state.farmProgress,
      structures: this.state.structures,
      droppedItems: this.state.droppedItems,
      heldItemId: this.getHeldItemId(),
      selectedStructure: this.selectedStructure,
      selectedRecipeId: this.selectedRecipeId,
      activeSlotIndex: this.activeSlotIndex,
      pointerTile: this.pointerTile,
    };
  }

  private resolvePointerCommands(): GameCommand[] {
    return resolvePointerCommands(this.getCommandContext());
  }

  private resolveBreakCommand(): GameCommand | null {
    return this.resolvePointerCommands().find((command) => command.id === 'break-target') ?? null;
  }

  private resolvePlacementCommand(forceShift = false): GameCommand | null {
    const key = forceShift ? 'SHIFT+RMB' : 'RMB';
    return this.resolvePointerCommands().find((command) => (
      (command.id === 'plant-item' || command.id === 'place-structure') && command.key === key
    )) ?? null;
  }

  private resolveInteractCommand(): GameCommand | null {
    return this.resolvePointerCommands().find((command) => (
      command.id === 'store-item'
      || command.id === 'take-item'
      || command.id === 'craft-recipe'
      || command.id === 'process-item'
    )) ?? null;
  }

  private resolveRightClickCommand(forcePlace: boolean): GameCommand | null {
    if (forcePlace) {
      return this.resolvePlacementCommand(true) ?? this.resolvePlacementCommand(false);
    }
    return this.resolveInteractCommand() ?? this.resolvePlacementCommand(false);
  }

  private resolveKeyCommand(key: string): GameCommand | null {
    return findCommandByKey(resolveGlobalCommands(this.getCommandContext()), key);
  }

  private dispatchCommand(command: GameCommand, toastSeconds: number, returnOnly = false): string {
    const message = executeCommand(command, this.getCommandContext());
    this.refreshHeldSelection();
    if (!returnOnly) this.hud.toast(message, toastSeconds, this.state.worldTime);
    return message;
  }
}
