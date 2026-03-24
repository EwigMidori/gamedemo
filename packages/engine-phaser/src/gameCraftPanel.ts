import Phaser from "phaser";
import type { ContentSnapshot, RecipeDef, RuntimeSessionState } from "@gamedemo/engine-core";
import type { RuntimeSession } from "@gamedemo/engine-runtime";
import { RuntimeAssetLibrary } from "./runtimeAssets";
import { RuntimeTheme } from "./runtimeTheme";

interface GameCraftPanelOptions {
  isOpen(): boolean;
  onClose(): void;
  onCraftRecipe(recipeId: string): void;
}

interface RecipeRow {
  recipeId: string;
  background: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Image;
  title: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
  state: Phaser.GameObjects.Text;
}

export class GameCraftPanel {
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly panel: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly rows: RecipeRow[] = [];
  private panelBounds = new Phaser.Geom.Rectangle(0, 0, 0, 0);

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly session: RuntimeSession,
    private readonly content: ContentSnapshot,
    private readonly options: GameCraftPanelOptions
  ) {
    this.backdrop = this.scene.add.rectangle(0, 0, 10, 10, 0x000000, 0.42)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1200)
      .setInteractive()
      .on("pointerdown", () => this.options.onClose());
    this.panel = this.scene.add.rectangle(0, 0, 10, 10, RuntimeTheme.panelFill, 0.94)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1201)
      .setStrokeStyle(1, RuntimeTheme.panelBorder, 0.24);
    this.title = this.makeText("HANDCRAFT", "12px", RuntimeTheme.textMuted)
      .setDepth(1202);
    this.hint = this.makeText("E close  Click recipe to craft", "10px", RuntimeTheme.textMuted)
      .setDepth(1202);
    for (const recipe of this.handRecipes()) {
      this.rows.push(this.createRow(recipe));
    }
    this.setVisible(false);
  }

  render(): void {
    const open = this.options.isOpen();
    this.setVisible(open);
    if (!open) {
      return;
    }
    const snapshot = this.session.snapshot();
    this.layout();
    for (const row of this.rows) {
      const recipe = this.content.recipes.find((entry) => entry.id === row.recipeId) ?? null;
      if (!recipe) {
        continue;
      }
      const craftable = this.canCraft(snapshot, recipe);
      row.icon.setFrame(this.itemFrame(recipe.output.itemId));
      row.title.setText(`${recipe.label} x${recipe.output.quantity}`);
      row.cost.setText(this.describeCost(snapshot, recipe));
      row.state.setText(craftable ? "READY" : "MISS").setColor(craftable ? "#91c483" : RuntimeTheme.textMuted);
      row.background
        .setFillStyle(craftable ? 0x18261a : RuntimeTheme.slotFill, 0.96)
        .setStrokeStyle(1, craftable ? 0xf3c96b : RuntimeTheme.slotBorder, 1);
    }
  }

  getObjects(): Phaser.GameObjects.GameObject[] {
    return [
      this.backdrop,
      this.panel,
      this.title,
      this.hint,
      ...this.rows.flatMap((row) => [row.background, row.icon, row.title, row.cost, row.state])
    ];
  }

  containsScreenPoint(screenX: number, screenY: number): boolean {
    void screenX;
    void screenY;
    return this.options.isOpen();
  }

  private layout(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const compact = width < 760 || height < 460;
    const panelWidth = compact ? Math.min(284, width - 28) : Math.min(332, width - 48);
    const rowHeight = compact ? 34 : 38;
    const panelHeight = 38 + this.rows.length * rowHeight + 28;
    const x = Math.floor((width - panelWidth) * 0.5);
    const y = Math.max(18, Math.floor((height - panelHeight) * 0.5) - 18);
    this.panelBounds.setTo(x, y, panelWidth, panelHeight);
    this.backdrop.setPosition(0, 0).setSize(width, height);
    this.panel.setPosition(x, y).setSize(panelWidth, panelHeight);
    this.title.setPosition(x + 12, y + 8).setFontSize(compact ? "11px" : "12px");
    this.hint.setPosition(x + 12, y + panelHeight - 18).setFontSize(compact ? "9px" : "10px");
    this.rows.forEach((row, index) => {
      const rowY = y + 28 + index * rowHeight;
      row.background.setPosition(x + 10, rowY).setSize(panelWidth - 20, rowHeight - 4);
      row.icon.setPosition(x + 24, rowY + Math.floor((rowHeight - 4) * 0.5));
      row.title.setPosition(x + 38, rowY + 5).setFontSize(compact ? "10px" : "11px");
      row.cost.setPosition(x + 38, rowY + 18).setFontSize(compact ? "9px" : "10px");
      row.state.setPosition(x + panelWidth - 18, rowY + 10).setFontSize(compact ? "9px" : "10px");
    });
  }

  private createRow(recipe: RecipeDef): RecipeRow {
    const background = this.scene.add.rectangle(0, 0, 10, 10, RuntimeTheme.slotFill, 0.96)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(1202)
      .setStrokeStyle(1, RuntimeTheme.slotBorder, 1)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.options.onCraftRecipe(recipe.id));
    const icon = this.scene.add.image(0, 0, RuntimeAssetLibrary.uiKey, 0)
      .setScrollFactor(0)
      .setDepth(1203);
    const title = this.makeText("", "11px", RuntimeTheme.textPrimary)
      .setDepth(1203);
    const cost = this.makeText("", "10px", RuntimeTheme.textMuted)
      .setDepth(1203);
    const state = this.makeText("", "10px", RuntimeTheme.textMuted)
      .setOrigin(1, 0)
      .setDepth(1203);
    return { recipeId: recipe.id, background, icon, title, cost, state };
  }

  private handRecipes(): RecipeDef[] {
    return this.content.recipes.filter((entry) => !entry.stationId);
  }

  private canCraft(snapshot: RuntimeSessionState, recipe: RecipeDef): boolean {
    const counts = this.inventoryCounts(snapshot);
    return Object.entries(recipe.cost).every(([itemId, quantity]) => (counts.get(itemId) ?? 0) >= quantity);
  }

  private describeCost(snapshot: RuntimeSessionState, recipe: RecipeDef): string {
    const counts = this.inventoryCounts(snapshot);
    return Object.entries(recipe.cost)
      .map(([itemId, quantity]) => `${this.itemLabel(itemId)} ${counts.get(itemId) ?? 0}/${quantity}`)
      .join("  ");
  }

  private inventoryCounts(snapshot: RuntimeSessionState): Map<string, number> {
    const counts = new Map<string, number>();
    for (const entry of snapshot.inventory) {
      if (!entry.itemId || entry.quantity <= 0) {
        continue;
      }
      counts.set(entry.itemId, (counts.get(entry.itemId) ?? 0) + entry.quantity);
    }
    return counts;
  }

  private itemLabel(itemId: string): string {
    return this.content.items.find((entry) => entry.id === itemId)?.label ?? itemId;
  }

  private itemFrame(itemId: string): number {
    const item = this.content.items.find((entry) => entry.id === itemId) ?? null;
    return item?.iconFrame ?? RuntimeTheme.itemFrameFor(itemId);
  }

  private makeText(text: string, fontSize: string, color: string): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, text, {
      fontFamily: "monospace",
      fontSize,
      color
    }).setScrollFactor(0);
  }

  private setVisible(visible: boolean): void {
    for (const object of this.getObjects()) {
      object.setVisible(visible);
    }
  }
}
