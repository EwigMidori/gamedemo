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
import { GameHudHoverCard } from "./gameHudHoverCard";
import { RuntimeTheme } from "./runtimeTheme";

interface GameHudOptions {
  getCommandInput?(): Partial<RuntimeCommandInput>;
  onInventorySlotSelect?(slotIndex: number): void;
}

interface HotbarSlotView {
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  amount: Phaser.GameObjects.Text;
  index: Phaser.GameObjects.Text;
}

interface MeterView {
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  fillWidth: number;
}

export class GameHud {
  private hoveredSlotIndex: number | null = null;
  private readonly titlePanel: Phaser.GameObjects.Rectangle;
  private readonly titleText: Phaser.GameObjects.Text;
  private readonly statusPanel: Phaser.GameObjects.Rectangle;
  private readonly statusTitleText: Phaser.GameObjects.Text;
  private readonly metaText: Phaser.GameObjects.Text;
  private readonly hpMeter: MeterView;
  private readonly hungerMeter: MeterView;
  private readonly selectionPanel: Phaser.GameObjects.Rectangle;
  private readonly selectionTitleText: Phaser.GameObjects.Text;
  private readonly selectionText: Phaser.GameObjects.Text;
  private readonly contextPanel: Phaser.GameObjects.Rectangle;
  private readonly contextTitleText: Phaser.GameObjects.Text;
  private readonly clockText: Phaser.GameObjects.Text;
  private readonly contextText: Phaser.GameObjects.Text;
  private readonly hotbarPanel: Phaser.GameObjects.Rectangle;
  private readonly toastPanel: Phaser.GameObjects.Rectangle;
  private readonly toastText: Phaser.GameObjects.Text;
  private readonly helpText: Phaser.GameObjects.Text;
  private readonly hoverCard: GameHudHoverCard;
  private readonly hotbarSlots: HotbarSlotView[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: RuntimeSession,
    private readonly options: GameHudOptions
  ) {
    this.titlePanel = this.makePanel(0, 0, 150, 24, 0.84);
    this.titleText = this.makeText(0, 0, "FRONTIER COLONY", "13px", RuntimeTheme.textAccent);
    this.statusPanel = this.makePanel(0, 0, 248, 84, 0.84);
    this.statusTitleText = this.makeText(0, 0, "STATUS", "12px", RuntimeTheme.textMuted);
    this.metaText = this.makeText(0, 0, "", "10px", RuntimeTheme.textMuted);
    this.hpMeter = this.createMeter("", 1, 0xbc4b51);
    this.hungerMeter = this.createMeter("", 6, 0xd4a24c);
    this.selectionPanel = this.makePanel(0, 0, 228, 60, 0.84);
    this.selectionTitleText = this.makeText(0, 0, "ACTION", "12px", RuntimeTheme.textMuted);
    this.selectionText = this.makeText(0, 0, "", "10px", RuntimeTheme.textPrimary);
    this.selectionText.setWordWrapWidth(208);
    this.contextPanel = this.makePanel(0, 0, 228, 132, 0.84);
    this.contextTitleText = this.makeText(0, 0, "TARGET", "12px", RuntimeTheme.textMuted);
    this.clockText = this.makeText(0, 0, "", "14px", RuntimeTheme.textPrimary).setOrigin(1, 0);
    this.contextText = this.makeText(0, 0, "", "10px", RuntimeTheme.textPrimary);
    this.contextText.setWordWrapWidth(208);
    this.hotbarPanel = this.makePanel(0, 0, 528, 42, 0.84);
    this.toastPanel = this.makePanel(0, 0, 300, 26, 0.82);
    this.toastText = this.makeText(0, 0, "", "11px", RuntimeTheme.textPrimary);
    this.helpText = this.makeText(
      0,
      0,
      "WASD move  E handcraft  G gather  Hold LMB break  RMB move/interact  B build  R eat  F rest",
      "10px",
      RuntimeTheme.textMuted
    );
    this.hoverCard = new GameHudHoverCard(this.scene);
    this.createHotbar();
  }

  render(pointerTile: RuntimePointerTile | null): void {
    const snapshot = this.session.snapshot();
    const input = this.commandInput(pointerTile);
    const focusedObject = this.session.inspectWorldObject(input);
    const selectedItem = this.session.inspectSelectedInventorySlot(input);
    const combined = this.session.resolveCombinedInteractions(input);
    const objectActions = this.session.resolveWorldObjectInteractions(input);
    const itemActions = this.session.resolveSelectedInventoryInteractions(input);
    this.layout(snapshot);
    this.renderStatus(snapshot, selectedItem);
    this.renderSelection(selectedItem, itemActions, combined);
    this.renderContext(pointerTile, focusedObject, selectedItem, combined, objectActions, itemActions);
    this.renderHotbar(snapshot, input.selectedSlot ?? null);
    const latestLog = snapshot.logs.at(-1) ?? "";
    const showToast = latestLog.length > 0 && !/bootstrapped/i.test(latestLog);
    this.toastPanel.setVisible(showToast);
    this.toastText.setVisible(showToast).setText(showToast ? latestLog : "");
    this.renderHover(pointerTile, focusedObject, combined, objectActions);
  }

  getObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.titlePanel,
      this.titleText,
      this.statusPanel,
      this.statusTitleText,
      this.metaText,
      this.hpMeter.icon,
      this.hpMeter.label,
      this.hpMeter.value,
      this.hpMeter.barBg,
      this.hpMeter.barFill,
      this.hungerMeter.icon,
      this.hungerMeter.label,
      this.hungerMeter.value,
      this.hungerMeter.barBg,
      this.hungerMeter.barFill,
      this.selectionPanel,
      this.selectionTitleText,
      this.selectionText,
      this.contextPanel,
      this.contextTitleText,
      this.clockText,
      this.contextText,
      this.hotbarPanel,
      this.toastPanel,
      this.toastText,
      this.helpText,
      ...this.hoverCard.getObjects(),
      ...this.hotbarSlots.flatMap((slot) => [slot.background, slot.icon, slot.amount, slot.index])
    ];
  }

  containsScreenPoint(screenX: number, screenY: number): boolean {
    const blockers = [
      this.titlePanel,
      this.statusPanel,
      this.selectionPanel,
      this.contextPanel,
      this.hotbarPanel,
      this.toastPanel,
      ...this.hoverCard.getObjects(),
      ...this.hotbarSlots.map((slot) => slot.background)
    ];
    return blockers.some((blocker) => blocker.visible &&
      screenX >= blocker.x &&
      screenX <= blocker.x + blocker.width &&
      screenY >= blocker.y &&
      screenY <= blocker.y + blocker.height);
  }

  private commandInput(pointerTile: RuntimePointerTile | null): RuntimeCommandInput {
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
    _selectedItem: RuntimeInventorySlotDescriptor | null
  ): void {
    const dayPercent = Math.floor(((snapshot.timeSeconds % 180) / 180) * 100);
    const relativeX = snapshot.player.x;
    const relativeY = snapshot.player.y;
    this.metaText.setText(
      `D${snapshot.day} ${dayPercent}%  ${relativeX},${relativeY}`
    );
    this.renderMeter(this.hpMeter, snapshot.needs.health);
    this.renderMeter(this.hungerMeter, snapshot.needs.hunger);
    this.clockText.setText(`Day ${snapshot.day} · ${this.formatClock(snapshot.timeSeconds)}`);
  }

  private renderSelection(
    selectedItem: RuntimeInventorySlotDescriptor | null,
    _itemActions: RuntimeInventoryInteraction[],
    _combined: RuntimeCombinedInteraction[]
  ): void {
    this.selectionText.setText([
      selectedItem
        ? `HAND ${selectedItem.label.toUpperCase()}`
        : "EMPTY HAND",
      "USE OR BREAK SOMETHING",
      "BREAK TREES AND STONE FIRST"
    ].join("\n"));
  }

  private renderContext(
    pointerTile: RuntimePointerTile | null,
    focusedObject: RuntimeWorldObjectDescriptor | null,
    selectedItem: RuntimeInventorySlotDescriptor | null,
    combined: RuntimeCombinedInteraction[],
    objectActions: RuntimeWorldObjectInteraction[],
    itemActions: RuntimeInventoryInteraction[]
  ): void {
    if (!pointerTile && !focusedObject) {
      this.contextText.setText([
        "POINT AT SOMETHING",
        "MOVE CLOSER OR HOVER A TILE",
        "NO ACTIONS"
      ].join("\n"));
      return;
    }
    const header = focusedObject
      ? `${focusedObject.label.toUpperCase()}  ${focusedObject.x},${focusedObject.y}`
      : pointerTile
        ? `GROUND  ${pointerTile.x},${pointerTile.y}`
        : "POINT AT SOMETHING";
    const summary = focusedObject?.summary ?? "MOVE CLOSER OR HOVER A TILE";
    const actions = [...combined, ...objectActions, ...itemActions].slice(0, 3);
    this.contextText.setText([
      header,
      summary,
      ...(selectedItem ? [`ITEM ${selectedItem.label.toUpperCase()}`] : []),
      ...actions.map((entry) => `${this.bindingLabel(entry.binding)} ${entry.label}`.toUpperCase()),
      actions.length === 0 ? "NO ACTIONS" : ""
    ].filter(Boolean).join("\n"));
  }

  private renderHotbar(snapshot: RuntimeSessionState, selectedSlot: number | null): void {
    for (let index = 0; index < this.hotbarSlots.length; index += 1) {
      const slot = this.hotbarSlots[index];
      const entry = snapshot.inventory[index];
      const active = selectedSlot === index;
      const hasItem = Boolean(entry?.itemId && entry.quantity > 0);
      slot.background
        .setFillStyle(active ? 0x243924 : hasItem ? 0x18281b : RuntimeTheme.slotFill, active ? 1 : 0.88)
        .setStrokeStyle(active ? 2 : 1, active ? 0xf3c96b : RuntimeTheme.slotBorder, 1);
      if (!hasItem) {
        slot.icon.setVisible(false);
        slot.amount.setText("");
        continue;
      }
      slot.icon.setVisible(true).setFrame(RuntimeTheme.itemFrameFor(entry.itemId));
      slot.amount.setText(`${entry.quantity}`);
    }
  }

  private renderHover(
    pointerTile: RuntimePointerTile | null,
    focusedObject: RuntimeWorldObjectDescriptor | null,
    combined: RuntimeCombinedInteraction[],
    objectActions: RuntimeWorldObjectInteraction[]
  ): void {
    if (this.hoveredSlotIndex !== null) {
      const descriptor = this.session.inspectSelectedInventorySlot({
        ...this.commandInput(pointerTile),
        selectedSlot: this.hoveredSlotIndex
      });
      if (descriptor) {
        this.hoverCard.renderInventory(descriptor);
        return;
      }
    }
    if (!pointerTile) {
      this.hoverCard.hide();
      return;
    }
    const action = combined[0] ?? objectActions[0] ?? null;
    this.hoverCard.renderWorld(pointerTile, focusedObject, action, (binding) => this.bindingLabel(binding));
  }

  private createHotbar(): void {
    for (let index = 0; index < 12; index += 1) {
      const background = this.scene.add.rectangle(0, 0, 34, 30, RuntimeTheme.slotFill, 0.92)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1002)
        .setStrokeStyle(1, RuntimeTheme.slotBorder, 1)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => { this.hoveredSlotIndex = index; })
        .on("pointerout", () => { if (this.hoveredSlotIndex === index) this.hoveredSlotIndex = null; })
        .on("pointerdown", () => { this.options.onInventorySlotSelect?.(index); });
      const icon = this.scene.add.image(0, 0, RuntimeAssetLibrary.uiKey, 0)
        .setVisible(false)
        .setScrollFactor(0)
        .setDepth(1003);
      const amount = this.makeText(0, 0, "", "9px", RuntimeTheme.textPrimary).setOrigin(1, 1);
      const slotIndex = this.makeText(0, 0, `${index + 1}`, "8px", RuntimeTheme.textMuted);
      this.hotbarSlots.push({ background, icon, amount, index: slotIndex });
    }
  }

  private createMeter(label: string, iconFrame: number, fillColor: number): MeterView {
    return {
      icon: this.scene.add.image(0, 0, RuntimeAssetLibrary.uiKey, iconFrame)
        .setScrollFactor(0)
        .setDepth(1003)
        .setScale(0.9),
      label: this.makeText(0, 0, label, "9px", RuntimeTheme.textMuted),
      value: this.makeText(0, 0, "0", "9px", RuntimeTheme.textPrimary),
      barBg: this.scene.add.rectangle(0, 0, 124, 8, 0x142018, 1)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(1002)
        .setStrokeStyle(1, 0x29382d, 1),
      barFill: this.scene.add.rectangle(0, 0, 124, 8, fillColor, 1)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(1003),
      fillWidth: 124
    };
  }

  private renderMeter(meter: MeterView, value: number): void {
    meter.value.setText(`${Math.round(value)}`);
    meter.barFill.setSize(meter.fillWidth * Phaser.Math.Clamp(value / 100, 0, 1), 8);
  }

  private layout(snapshot: RuntimeSessionState): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const compact = width < 760 || height < 460;
    const small = width < 640 || height < 400;
    const statusWidth = compact ? 224 : 248;
    const statusHeight = compact ? 76 : 84;
    const contextWidth = compact ? 208 : 228;
    const contextHeight = compact ? 112 : 132;
    const selectionWidth = compact ? 208 : 228;
    const hotbarWidth = Math.min(width - 24, compact ? 504 : 528);
    const slotSpacing = compact ? 40 : 42;
    const slotLeft = Math.floor((width - hotbarWidth) * 0.5) + 12;

    this.placePanel(this.titlePanel, 12, 10, compact ? 132 : 150, compact ? 20 : 24);
    this.titleText.setPosition(20, compact ? 14 : 16).setFontSize(compact ? "11px" : "13px");

    this.placePanel(this.statusPanel, 12, 42, statusWidth, statusHeight);
    this.statusTitleText.setPosition(22, 50).setFontSize(compact ? "10px" : "12px");
    this.metaText.setPosition(22, compact ? 70 : 72).setFontSize(compact ? "9px" : "10px");
    this.layoutMeter(this.hpMeter, 22, compact ? 82 : 86, compact);
    this.layoutMeter(this.hungerMeter, 22, compact ? 100 : 104, compact);

    this.placePanel(this.selectionPanel, 12, height - (compact ? 106 : 114), selectionWidth, compact ? 52 : 60);
    this.selectionTitleText.setPosition(22, height - (compact ? 102 : 110)).setFontSize(compact ? "10px" : "12px");
    this.selectionText
      .setPosition(22, height - (compact ? 84 : 92))
      .setFontSize(compact ? "9px" : "10px")
      .setWordWrapWidth(selectionWidth - 20);

    this.placePanel(this.contextPanel, width - contextWidth - 12, 10, contextWidth, contextHeight);
    this.contextTitleText.setPosition(width - contextWidth, 18).setFontSize(compact ? "10px" : "12px");
    this.clockText.setPosition(width - 20, 18).setFontSize(compact ? "12px" : "14px");
    this.contextText
      .setPosition(width - contextWidth, 44)
      .setFontSize(compact ? "9px" : "10px")
      .setWordWrapWidth(contextWidth - 20);

    this.placePanel(this.hotbarPanel, Math.floor((width - hotbarWidth) * 0.5), height - 54, hotbarWidth, 42);
    this.placePanel(this.toastPanel, Math.floor((width - Math.min(width - 48, 300)) * 0.5), height - 96, Math.min(width - 48, 300), 26);
    this.toastText.setPosition(this.toastPanel.x + 12, this.toastPanel.y + 7);
    this.helpText
      .setPosition(12, height - 16)
      .setOrigin(0, 1)
      .setFontSize(small ? "9px" : "10px")
      .setVisible(false)
      .setText(small
        ? "WASD  E  G  LMB  RMB  B  R  F"
        : compact
          ? "WASD move  E handcraft  G gather  LMB break  RMB interact  B/R/F"
          : "WASD move  E handcraft  G gather  Hold LMB break  RMB move/interact  B build  R eat  F rest");

    for (let index = 0; index < this.hotbarSlots.length; index += 1) {
      const slot = this.hotbarSlots[index];
      const left = slotLeft + index * slotSpacing;
      slot.background.setPosition(left, height - 48);
      slot.icon.setPosition(left + 17, height - 33);
      slot.amount.setPosition(left + 29, height - 22).setFontSize(compact ? "8px" : "9px");
      slot.index.setPosition(left + 3, height - 46).setFontSize(compact ? "7px" : "8px");
      if (left > this.hotbarPanel.x + hotbarWidth - 38) {
        slot.background.setVisible(false);
        slot.icon.setVisible(false);
        slot.amount.setVisible(false);
        slot.index.setVisible(false);
        continue;
      }
      slot.background.setVisible(true);
      slot.amount.setVisible(true);
      slot.index.setVisible(true);
    }

    this.toastText.setWordWrapWidth(this.toastPanel.width - 20);
  }

  private layoutMeter(meter: MeterView, x: number, y: number, compact: boolean): void {
    meter.icon.setPosition(x + 7, y + 4).setScale(compact ? 0.82 : 0.9);
    meter.label.setVisible(false);
    meter.fillWidth = compact ? 108 : 124;
    meter.barBg.setPosition(x + 18, y + 6).setSize(meter.fillWidth, 8);
    meter.barFill.setPosition(x + 18, y + 6);
    meter.value.setPosition(x + (compact ? 132 : 150), y - 1).setFontSize(compact ? "8px" : "9px");
  }

  private formatClock(timeSeconds: number): string {
    const elapsed = Math.max(0, Math.floor(timeSeconds * 2));
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const seconds = (elapsed % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  private placePanel(
    panel: Phaser.GameObjects.Rectangle,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    panel.setPosition(x, y).setSize(width, height);
  }

  private makePanel(
    x: number,
    y: number,
    width: number,
    height: number,
    alpha: number
  ): Phaser.GameObjects.Rectangle {
    return this.scene.add.rectangle(x, y, width, height, RuntimeTheme.panelFill, alpha)
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

  private bindingLabel(binding: string): string {
    if (binding === "MouseRight") {
      return "RMB";
    }
    if (binding === "HoldLMB") {
      return "HOLD";
    }
    if (binding.startsWith("Digit")) {
      return binding.slice("Digit".length);
    }
    if (binding.startsWith("Key")) {
      return binding.slice("Key".length);
    }
    return binding;
  }
}
