import "./style.css";
import {
  ExternalMods,
  ModCatalogs,
  RuntimeProfiles,
  type RuntimeProfileDefinition
} from "@gamedemo/mod-loader";
import { RuntimeKernel } from "@gamedemo/engine-runtime";
import { HostSessionController } from "./sessionController";
import { HostShell } from "./hostShell";
import { runtimeProfiles, workspaceModCatalog } from "./workspaceCatalog";

const app = document.querySelector<HTMLDivElement>("#app");
const EXTERNAL_MOD_URLS_KEY = "gamedemo.runtime.externalModUrls";
const PROFILE_STORAGE_KEY = "gamedemo.runtime.profile";
const SAVE_KEY = "gamedemo.runtime.save.v1";
const DEBUG_PATH = "/debug";

if (!app) {
  throw new Error("Missing #app root element");
}

class HostApplication {
  constructor(
    private readonly root: HTMLDivElement,
    private readonly profiles: RuntimeProfileDefinition[]
  ) {}

  private readSelectedProfileId(): string {
    return localStorage.getItem(PROFILE_STORAGE_KEY) ?? this.profiles[0]?.id ?? "vanilla";
  }

  private readExternalModUrls(): string[] {
    return (localStorage.getItem(EXTERNAL_MOD_URLS_KEY) ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  private startSessionLoop(sessionController: HostSessionControllerType): void {
    let lastFrameTime = performance.now();
    const step = (frameTime: number) => {
      const deltaSeconds = Math.min(0.05, Math.max(0, (frameTime - lastFrameTime) / 1000));
      lastFrameTime = frameTime;
      sessionController.tick(deltaSeconds);
      window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  async boot(): Promise<void> {
    const mode = window.location.pathname === DEBUG_PATH ? "debug" : "game";
    const selectedProfileId = this.readSelectedProfileId();
    const externalModUrls = this.readExternalModUrls();
    const profile = RuntimeProfiles.getDefinition(this.profiles, selectedProfileId);
    const externalMods = await ExternalMods.load(externalModUrls);
    const combinedCatalog = ModCatalogs.merge(
      workspaceModCatalog,
      ModCatalogs.createExternal(externalMods)
    );
    const profileModules = ModCatalogs.resolveProfileModules(combinedCatalog, profile);
    const runtime = await RuntimeKernel.assembleProfile([...profileModules, ...externalMods]);
    const refs = HostShell.render(
      this.root,
      runtime,
      this.profiles,
      profile,
      externalModUrls,
      externalMods.length,
      mode
    );
    const sessionController = HostSessionController.create(runtime, refs, { saveKey: SAVE_KEY });

    sessionController.render();

    if (mode === "debug") {
      refs.saveSessionButton.addEventListener("click", () => {
        sessionController.save();
      });
      refs.loadSessionButton.addEventListener("click", () => {
        sessionController.load();
      });
      refs.runtimeProfileSelect.addEventListener("change", () => {
        localStorage.setItem(PROFILE_STORAGE_KEY, refs.runtimeProfileSelect.value);
        window.location.reload();
      });
      refs.applyExternalModsButton.addEventListener("click", () => {
        localStorage.setItem(
          EXTERNAL_MOD_URLS_KEY,
          refs.externalModUrlsInput.value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean)
            .join(",")
        );
        window.location.reload();
      });
    }

    this.startSessionLoop(sessionController);

    window.addEventListener("keydown", (event) => {
      sessionController.setMovementKey(event.code, true);
      if (event.code === "KeyE") {
        sessionController.toggleHandcraftPanel();
        return;
      }
      if (event.code === "Escape" && sessionController.isHandcraftOpen()) {
        sessionController.closeHandcraftPanel();
        return;
      }
      sessionController.runKeyboardInput(event.code);
    });
    window.addEventListener("keyup", (event) => {
      sessionController.setMovementKey(event.code, false);
    });

    refs.previewRoot.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    const { RuntimePreview } = await import("@gamedemo/engine-phaser");
    RuntimePreview.mount(refs.previewRoot, runtime, sessionController.createPreviewSession(), {
      onPointerTileChange: (tile) => {
        sessionController.setPointerTile(tile);
        sessionController.render();
      },
      onPointerPrimaryAction: (tile) => {
        sessionController.runPointerPrimaryAction(tile);
      },
      onPointerHoldAction: (tile) => {
        sessionController.runPointerHoldAction(tile);
      },
      onPointerHoldCancel: () => {
        sessionController.cancelPointerHoldAction();
      },
      onInventorySlotSelect: (slotIndex) => {
        sessionController.selectInventorySlot(slotIndex);
      },
      onHandcraftRecipeCraft: (recipeId) => {
        sessionController.craftHandRecipe(recipeId);
      },
      onHandcraftClose: () => {
        sessionController.closeHandcraftPanel();
      },
      getPointerHoldSpec: (tile) => sessionController.getPointerHoldSpec(tile),
      getSelectedTile: () => sessionController.getSelectedTile(),
      getSelectedTileMarker: () => sessionController.getSelectedTileMarker(),
      getHandcraftOpen: () => sessionController.isHandcraftOpen(),
      getCommandInput: () => sessionController.getCommandInput()
    });
  }
}

type HostSessionControllerType = ReturnType<typeof HostSessionController.create>;

const host = new HostApplication(app, runtimeProfiles);
host.boot().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  HostShell.renderBootFailure(app, message);
});
