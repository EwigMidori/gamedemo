import Phaser from "phaser";
import type { GameModManifest, ModSpritesheetAsset } from "@gamedemo/mod-api";

const WORLD_TEXTURE_URL = new URL("../assets/generated/roguelike-world.png", import.meta.url).toString();
const UI_TEXTURE_URL = new URL("../assets/generated/roguelike-ui.png", import.meta.url).toString();
const PAWN_TEXTURE_URL = new URL("../assets/pawn.png", import.meta.url).toString();

interface RuntimeSpritesheetAsset extends ModSpritesheetAsset {
  sourceModId: string;
}

export class RuntimeAssetLibrary {
  static readonly tileSize = 16;
  static readonly worldKey = "runtime-world";
  static readonly uiKey = "runtime-ui";
  static readonly pawnKey = "runtime-pawn";

  static preload(scene: Phaser.Scene, manifests: ReadonlyArray<GameModManifest>): void {
    for (const asset of this.collectSpritesheets(manifests)) {
      this.loadSpritesheet(scene, asset);
    }
  }

  private static builtinSpritesheets(): RuntimeSpritesheetAsset[] {
    return [
      {
        key: this.worldKey,
        url: WORLD_TEXTURE_URL,
        frameWidth: this.tileSize,
        frameHeight: this.tileSize,
        sourceModId: "engine:phaser"
      },
      {
        key: this.uiKey,
        url: UI_TEXTURE_URL,
        frameWidth: this.tileSize,
        frameHeight: this.tileSize,
        sourceModId: "engine:phaser"
      },
      {
        key: this.pawnKey,
        url: PAWN_TEXTURE_URL,
        frameWidth: this.tileSize,
        frameHeight: this.tileSize,
        sourceModId: "engine:phaser"
      }
    ];
  }

  private static collectSpritesheets(
    manifests: ReadonlyArray<GameModManifest>
  ): RuntimeSpritesheetAsset[] {
    const assets = [...this.builtinSpritesheets()];
    const seenKeys = new Map<string, string>();

    for (const asset of assets) {
      seenKeys.set(asset.key, asset.sourceModId);
    }

    for (const manifest of manifests) {
      for (const spritesheet of manifest.assets?.spritesheets ?? []) {
        const owner = seenKeys.get(spritesheet.key);
        if (owner) {
          throw new Error(
            `Duplicate spritesheet key ${spritesheet.key} declared by ${manifest.id}; already owned by ${owner}.`
          );
        }
        seenKeys.set(spritesheet.key, manifest.id);
        assets.push({
          ...spritesheet,
          sourceModId: manifest.id
        });
      }
    }

    return assets;
  }

  private static loadSpritesheet(scene: Phaser.Scene, asset: RuntimeSpritesheetAsset): void {
    if (scene.textures.exists(asset.key)) {
      return;
    }
    scene.load.spritesheet(asset.key, asset.url, {
      frameWidth: asset.frameWidth,
      frameHeight: asset.frameHeight,
      startFrame: asset.startFrame,
      endFrame: asset.endFrame,
      margin: asset.margin,
      spacing: asset.spacing
    });
  }
}
