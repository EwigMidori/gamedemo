import Phaser from "phaser";
import type {
  RuntimeCommandInput,
  RuntimeCombinedInteraction,
  RuntimeInventoryInteraction,
  RuntimeInventorySlotDescriptor,
  RuntimePointerTile,
  RuntimeSessionState,
  RuntimeWorldObjectDescriptor,
  RuntimeWorldObjectInteraction
} from "@gamedemo/engine-core";
import type { RuntimeSession } from "@gamedemo/engine-runtime";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { RuntimeTheme } from "./runtimeTheme";

interface RuntimeHudViewOptions {
  getCommandInput?(): Partial<RuntimeCommandInput>;
  onInventorySlotSelect?(slotIndex: number): void;
}

interface MeterBarView {
  background: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  value: Phaser.GameObjects.Text;
}

interface HotbarSlotView {
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  amount: Phaser.GameObjects.Text;
  index: Phaser.GameObjects.Text;
}

export class RuntimeHudView {
  private readonly titlePanel: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly statusPanel: Phaser.GameObjects.Rectangle;
  private readonly statusMeta: Phaser.GameObjects.Text;
  private readonly statusHealth: MeterBarView;
  private readonly statusHunger: MeterBarView;
  private readonly contextPanel: Phaser.GameObjects.Rectangle;
  private readonly contextTitle: Phaser.GameObjects.Text;
  private readonly contextBody: Phaser.GameObjects.Text;
  private readonly hotbarPanel: Phaser.GameObjects.Rectangle;
  private readonly hotbarSlots: HotbarSlotView[] = [];
  private readonly toastPanel: Phaser.GameObjects.Rectangle;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly helpText: Phaser.GameObjects.Text;
  private readonly hoverPanel: Phaser.GameObjects.Rectangle;
  private readonly hoverTitle: Phaser.GameObjects.Text;
  private readonly hoverBody: Phaser.GameObjects.Text;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: RuntimeSession,
    private readonly options: RuntimeHudViewOptions
  ) {
    this.titlePanel = this.makePanel(253, 10, 134, 24);
    this.titleText = this.makeText(261, 16, "FRONTIER COLONY", "13px", RuntimeTheme.textAccent);

    this.statusPanel = this.makePanel(12, 12, 224, 76);
    this.statusMeta = this.makeText(22, 20, "", "10px", RuntimeTheme.textMuted);
    this.statusHealth = this.makeMeter(22, 48, 0xbc4b51);
    this.statusHunger = this.makeMeter(22, 67, 0xd4a24c);

    this.contextPanel = this.makePanel(430, 12, 198, 96);
    this.contextTitle = this.makeText(440, 20, "TARGET", "10px", RuntimeTheme.textMuted);
    this.contextBody = this.makeText(440, 36, "", "11px", RuntimeTheme.textPrimary);
    this.contextBody.setWordWrapWidth(178);

    this.hotbarPanel = this.makePanel(122, 286, 396, 42);
    this.createHotbar();

    this.toastPanel = this.makePanel(170, 338, 300, 26);
    this.toastText = this.makeText(182, 345, "", "11px", RuntimeTheme.textPrimary);
    this.toastText.setWordWrapWidth(276);

    this.helpText = this.makeText(
      12,
      368,
      "WASD move  |  RMB use/place  |  1-9 select  |  E gather  |  C craft  |  F rest  |  R consume",
      "10px",
      RuntimeTheme.textMuted
    );

    this.hoverPanel = this.makePanel(0, 0, 10, 10);
    this.hoverTitle = this.makeText(0, 0, "", "11px", RuntimeTheme.textAccent);
    this.hoverBody = this.makeText(0, 0, "", "10px", RuntimeTheme.textPrimary);
    this.setHoverVisible(false);
  }

  render(pointerTile: RuntimePointerTile | null): void {
    const snapshot = this.session.snapshot();
    const commandInput = this.getCommandInput(pointerTile);
    const focusedObject = this.session.inspectWorldObject(commandInput);
    const selectedItem = this.session.inspectSelectedInventorySlot(commandInput);
    const combinedActions = this.session.resolveCombinedInteractions(commandInput);
    const objectActions = this.session.resolveWorldObjectInteractions(commandInput);
    const itemActions = this.session.resolveSelectedInventoryInteractions(commandInput);

    this.renderStatus(snapshot, selectedItem);
    this.renderContext(pointerTile, focusedObject, selectedItem, combinedActions, objectActions, itemActions);
    this.renderHotbar(snapshot, commandInput.selectedSlot ?? null);
    this.renderToast(snapshot);
    this.renderHover(pointerTile, focusedObject, combinedActions, objectActions);
  }

  private getCommandInput(pointerTile: RuntimePointerTile | null): RuntimeCommandInput {
    const input = this.options.getCommandInput?.() ?? {};
    return {
      trigger: input.trigger ?? "ui",
      pointerTile,
      selectedSlot: input.selectedSlot ?? null,
      focusedResourceId: input.focusedResourceId ?? null,
      focusedStructureId: input.focusedStructureId ?? null
    };
  }

  private renderStatus(
    snapshot: RuntimeSessionState,
    selectedItem: RuntimeInventorySlotDescriptor | null
  ): void {
    this.statusMeta.setText(
      `DAY ${snapshot.day}  ${snapshot.timeSeconds.toFixed(0)}% SUN\n` +
      `POS ${snapshot.player.x},${snapshot.player.y}  HAND ${selectedItem?.label.toUpperCase() ?? "EMPTY"}`
    );
    this.updateMeter(this.statusHealth, snapshot.needs.health, 100);
    this.updateMeter(this.statusHunger, snapshot.needs.hunger, 100);
  }

  private renderContext(
    pointerTile: RuntimePointerTile | null,
    focusedObject: RuntimeWorldObjectDescriptor | null,
    selectedItem: RuntimeInventorySlotDescriptor | null,
    combinedActions: RuntimeCombinedInteraction[],
    objectActions: RuntimeWorldObjectInteraction[],
    itemActions: RuntimeInventoryInteraction[]
  ): void {
    const header = focusedObject
      ? `${focusedObject.label.toUpperCase()}  ${focusedObject.x},${focusedObject.y}`
      : pointerTile
        ? `GROUND  ${pointerTile.x},${pointerTile.y}`
        : "POINT AT SOMETHING";
    const summary = focusedObject?.summary ?? "MOVE CLOSER OR HOVER A TILE";
    const primaryAction = combinedActions[0] ?? objectActions[0] ?? itemActions[0] ?? null;
    const actionLine = primaryAction
      ? `${primaryAction.binding} ${primaryAction.label}`.toUpperCase()
      : "NO ACTIONS";
    const heldLine = `ITEM ${selectedItem?.label.toUpperCase() ?? "NONE"}`;
    this.contextBody.setText([header, summary, heldLine, actionLine].join("\n"));
  }

  private renderHotbar(snapshot: RuntimeSessionState, selectedSlot: number | null): void {
    for (let index = 0; index < this.hotbarSlots.length; index += 1) {
      const slot = this.hotbarSlots[index];
      const entry = snapshot.inventory[index];
      const hasItem = Boolean(entry?.itemId && entry.quantity > 0);
      const active = selectedSlot === index;
      slot.background
        .setFillStyle(active ? 0x243924 : hasItem ? 0x18281b : RuntimeTheme.slotFill, active ? 1 : 0.88)
        .setStrokeStyle(active ? 2 : 1, active ? 0xf3c96b : RuntimeTheme.slotBorder, 1);
      if (!hasItem) {
        slot.icon.setVisible(false);
        slot.amount.setText("");
        continue;
      }
      slot.icon
        .setVisible(true)
        .setFrame(RuntimeTheme.itemFrameFor(entry.itemId))
        .setTint(0xffffff);
      slot.amount.setText(`${entry.quantity}`);
    }
  }

  private renderToast(snapshot: RuntimeSessionState): void {
    this.toastText.setText(snapshot.logs.at(-1) ?? "Explore the frontier.");
  }

  private renderHover(
    pointerTile: RuntimePointerTile | null,
    focusedObject: RuntimeWorldObjectDescriptor | null,
    combinedActions: RuntimeCombinedInteraction[],
    objectActions: RuntimeWorldObjectInteraction[]
  ): void {
    if (!pointerTile) {
      this.setHoverVisible(false);
      return;
    }
    const topLine = focusedObject?.label.toUpperCase() ?? `TILE ${pointerTile.x},${pointerTile.y}`;
    const bodyLine = combinedActions[0]
      ? `${combinedActions[0].binding} ${combinedActions[0].label}`
      : objectActions[0]
        ? `${objectActions[0].binding} ${objectActions[0].label}`
        : focusedObject?.summary ?? "NO ACTION";
    const camera = this.scene.cameras.main;
    const worldX = pointerTile.x * RuntimeAssetLibrary.tileSize;
    const worldY = pointerTile.y * RuntimeAssetLibrary.tileSize;
    const screenX = Phaser.Math.Clamp(
      (worldX - camera.worldView.x) * camera.zoom + 18,
      8,
      640 - 188
    );
    const screenY = Phaser.Math.Clamp(
      (worldY - camera.worldView.y) * camera.zoom - 8,
      102,
      384 - 44
    );
    this.hoverPanel.setPosition(screenX, screenY).setSize(180, 34);
    this.hoverTitle.setPosition(screenX + 6, screenY + 4).setText(topLine);
    this.hoverBody.setPosition(screenX + 6, screenY + 18).setText(bodyLine);
    this.setHoverVisible(true);
  }

  private createHotbar(): void {
    for (let index = 0; index < 9; index += 1) {
      const left = 134 + index * 42;
      const background = this.scene.add.rectangle(left, 292, 34, 30, RuntimeTheme.slotFill, 0.92)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1002)
        .setStrokeStyle(1, RuntimeTheme.slotBorder, 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.options.onInventorySlotSelect?.(index);
        });
      const icon = this.scene.add.image(left + 17, 307, RuntimeAssetLibrary.uiKey, 0)
        .setVisible(false)
        .setScrollFactor(0)
        .setDepth(1003);
      const amount = this.makeText(left + 29, 318, "", "9px", RuntimeTheme.textPrimary).setOrigin(1, 1);
      const slotIndex = this.makeText(left + 3, 294, `${index + 1}`, "8px", RuntimeTheme.textMuted);
      this.hotbarSlots.push({ background, icon, amount, index: slotIndex });
    }
  }

  private makeMeter(x: number, y: number, fillColor: number): MeterBarView {
    const background = this.scene.add.rectangle(x, y, 130, 8, 0x142018, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setStrokeStyle(1, 0x29382d, 1);
    const fill = this.scene.add.rectangle(x, y, 0, 8, fillColor, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1002);
    const value = this.makeText(x + 138, y - 2, "0", "10px", RuntimeTheme.textPrimary);
    return { background, fill, value };
  }

  private updateMeter(bar: MeterBarView, current: number, max: number): void {
    const ratio = Phaser.Math.Clamp(current / max, 0, 1);
    bar.fill.setSize(130 * ratio, 8);
    bar.value.setText(`${Math.round(current)}`);
  }

  private makePanel(
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Rectangle {
    return this.scene.add.rectangle(x, y, width, height, RuntimeTheme.panelFill, 0.62)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setStrokeStyle(1, RuntimeTheme.panelBorder, 0.22);
  }

  private makeText(
    x: number,
    y: number,
    text: string,
    fontSize: string,
    color: string
  ): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, text, {
      fontFamily: "monospace",
      fontSize,
      color
    }).setScrollFactor(0).setDepth(1003);
  }

  private setHoverVisible(visible: boolean): void {
    this.hoverPanel.setVisible(visible);
    this.hoverTitle.setVisible(visible);
    this.hoverBody.setVisible(visible);
  }
}
