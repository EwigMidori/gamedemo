import Phaser from "phaser";

const WORLD_TEXTURE_URL = new URL("../../../src/assets/generated/roguelike-world.png", import.meta.url).toString();
const UI_TEXTURE_URL = new URL("../../../src/assets/generated/roguelike-ui.png", import.meta.url).toString();
const PAWN_TEXTURE_URL = new URL("../../../src/assets/pawn.png", import.meta.url).toString();

export class RuntimeAssetLibrary {
  static readonly tileSize = 16;
  static readonly worldKey = "runtime-world";
  static readonly uiKey = "runtime-ui";
  static readonly pawnKey = "runtime-pawn";

  static preload(scene: Phaser.Scene): void {
    this.loadSpritesheet(scene, this.worldKey, WORLD_TEXTURE_URL);
    this.loadSpritesheet(scene, this.uiKey, UI_TEXTURE_URL);
    this.loadSpritesheet(scene, this.pawnKey, PAWN_TEXTURE_URL);
  }

  private static loadSpritesheet(
    scene: Phaser.Scene,
    key: string,
    url: string
  ): void {
    if (scene.textures.exists(key)) {
      return;
    }
    scene.load.spritesheet(key, url, {
      frameWidth: this.tileSize,
      frameHeight: this.tileSize
    });
  }
}
