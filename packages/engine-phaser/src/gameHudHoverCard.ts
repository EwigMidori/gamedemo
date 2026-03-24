import Phaser from "phaser";
import type {
  RuntimeCombinedInteraction,
  RuntimeInventorySlotDescriptor,
  RuntimePointerTile,
  RuntimeWorldObjectDescriptor,
  RuntimeWorldObjectInteraction
} from "@gamedemo/engine-core";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { RuntimeTheme } from "./runtimeTheme";

export class GameHudHoverCard {
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly text: Phaser.GameObjects.Text;

  constructor(private readonly scene: Phaser.Scene) {
    this.panel = this.scene.add.rectangle(0, 0, 188, 38, RuntimeTheme.panelFill, 0.94)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setStrokeStyle(1, RuntimeTheme.panelBorder, 0.22)
      .setVisible(false);
    this.title = this.createText("", "11px", RuntimeTheme.textAccent).setVisible(false);
    this.text = this.createText("", "10px", RuntimeTheme.textPrimary).setVisible(false);
  }

  getObjects(): Phaser.GameObjects.GameObject[] {
    return [this.panel, this.title, this.text];
  }

  containsScreenPoint(screenX: number, screenY: number): boolean {
    return this.panel.visible &&
      screenX >= this.panel.x &&
      screenX <= this.panel.x + this.panel.width &&
      screenY >= this.panel.y &&
      screenY <= this.panel.y + this.panel.height;
  }

  hide(): void {
    this.setVisible(false);
  }

  renderInventory(descriptor: RuntimeInventorySlotDescriptor): void {
    const height = this.scene.scale.height;
    this.place(12, height - 116);
    this.title
      .setPosition(18, height - 112)
      .setText(descriptor.label.toUpperCase());
    this.text
      .setPosition(18, height - 96)
      .setText([descriptor.summary, descriptor.detail ?? "", `x${descriptor.quantity}`].filter(Boolean).join("\n"));
    this.setVisible(true);
  }

  renderWorld(
    pointerTile: RuntimePointerTile,
    focusedObject: RuntimeWorldObjectDescriptor | null,
    action: RuntimeCombinedInteraction | RuntimeWorldObjectInteraction | null,
    bindingLabel: (binding: string) => string
  ): void {
    const camera = this.scene.cameras.main;
    const screenX = Phaser.Math.Clamp(
      pointerTile.x * RuntimeAssetLibrary.tileSize * camera.zoom - camera.worldView.x * camera.zoom + 26,
      8,
      this.scene.scale.width - 196
    );
    const screenY = Phaser.Math.Clamp(
      pointerTile.y * RuntimeAssetLibrary.tileSize * camera.zoom - camera.worldView.y * camera.zoom + 18,
      88,
      this.scene.scale.height - 48
    );
    this.place(screenX, screenY);
    this.title
      .setPosition(screenX + 6, screenY + 4)
      .setText(focusedObject?.label.toUpperCase() ?? `TILE ${pointerTile.x},${pointerTile.y}`);
    this.text
      .setPosition(screenX + 6, screenY + 20)
      .setText(action ? `${bindingLabel(action.binding)} ${action.label}` : focusedObject?.summary ?? "NO ACTION");
    this.setVisible(true);
  }

  private place(x: number, y: number): void {
    this.panel.setPosition(x, y);
  }

  private createText(text: string, fontSize: string, color: string): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, text, {
      fontFamily: "monospace",
      fontSize,
      color
    }).setScrollFactor(0).setDepth(1003);
  }

  private setVisible(visible: boolean): void {
    this.panel.setVisible(visible);
    this.title.setVisible(visible);
    this.text.setVisible(visible);
  }
}
