import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@gamedemo/engine-content": fileURLToPath(
        new URL("../../packages/engine-content/src/index.ts", import.meta.url)
      ),
      "@gamedemo/engine-core": fileURLToPath(
        new URL("../../packages/engine-core/src/index.ts", import.meta.url)
      ),
      "@gamedemo/engine-phaser": fileURLToPath(
        new URL("../../packages/engine-phaser/src/index.ts", import.meta.url)
      ),
      "@gamedemo/engine-runtime": fileURLToPath(
        new URL("../../packages/engine-runtime/src/index.ts", import.meta.url)
      ),
      "@gamedemo/vanilla-domain": fileURLToPath(
        new URL("../../packages/vanilla-domain/src/index.ts", import.meta.url)
      ),
      "@gamedemo/save-schema": fileURLToPath(
        new URL("../../packages/save-schema/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-api": fileURLToPath(
        new URL("../../packages/mod-api/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-loader": fileURLToPath(
        new URL("../../packages/mod-loader/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-base": fileURLToPath(
        new URL("../../mods/core-base/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-building": fileURLToPath(
        new URL("../../mods/core-building/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-crafting": fileURLToPath(
        new URL("../../mods/core-crafting/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-gathering": fileURLToPath(
        new URL("../../mods/core-gathering/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-inventory": fileURLToPath(
        new URL("../../mods/core-inventory/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-player": fileURLToPath(
        new URL("../../mods/core-player/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-survival": fileURLToPath(
        new URL("../../mods/core-survival/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-worldgen": fileURLToPath(
        new URL("../../mods/core-worldgen/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-core-ui-hud": fileURLToPath(
        new URL("../../mods/core-ui-hud/src/index.ts", import.meta.url)
      ),
      "@gamedemo/mod-vanilla-bundle": fileURLToPath(
        new URL("../../mods/vanilla-bundle/src/index.ts", import.meta.url)
      )
    }
  }
});
