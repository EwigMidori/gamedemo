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

    window.setInterval(() => {
      sessionController.tick(1);
    }, 1000);

    window.addEventListener("keydown", (event) => {
      sessionController.runKeyboardInput(event.code);
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
      onInventorySlotSelect: (slotIndex) => {
        sessionController.selectInventorySlot(slotIndex);
      },
      getSelectedTile: () => sessionController.getSelectedTile(),
      getSelectedTileMarker: () => sessionController.getSelectedTileMarker(),
      getCommandInput: () => sessionController.getCommandInput()
    });
  }
}

const host = new HostApplication(app, runtimeProfiles);
host.boot().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  HostShell.renderBootFailure(app, message);
});
