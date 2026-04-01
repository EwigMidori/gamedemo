# Mod Assets

Third-party mods should ship their own spritesheets instead of committing files into the upstream
workspace.

## Manifest

Mods can declare spritesheets in `manifest.assets.spritesheets`:

```ts
import { MOD_API_VERSION } from "@gamedemo/engine-core";

export const myMod = {
  manifest: {
    id: "example:flora",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    assets: {
      spritesheets: [
        {
          key: "example-flora-world",
          url: new URL("./assets/flora-world.png", import.meta.url).toString(),
          frameWidth: 16,
          frameHeight: 16
        },
        {
          key: "example-flora-ui",
          url: new URL("./assets/flora-ui.png", import.meta.url).toString(),
          frameWidth: 16,
          frameHeight: 16
        }
      ]
    }
  },
  install(context) {
    context.content.registerResource({
      id: "example:flower",
      label: "Flower",
      frame: 0,
      textureKey: "example-flora-world",
      blocksMovement: false,
      drops: [{ itemId: "example:petal", min: 1, max: 2 }]
    });

    context.content.registerItem({
      id: "example:petal",
      label: "Petal",
      stackSize: 99,
      tags: ["resource"],
      iconFrame: 0,
      iconTextureKey: "example-flora-ui"
    });
  }
};
```

## Content Fields

- `TerrainDef.textureKey`
- `ResourceDef.textureKey`
- `StructureDef.textureKey`
- `ItemDef.iconTextureKey`

If a content definition omits these fields, the engine falls back to the built-in first-party
spritesheets.
