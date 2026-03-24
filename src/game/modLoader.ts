import { createModApi, installMod, type GameMod } from './content';
import { builtinMods } from '../mods';

const MOD_IDS_QUERY = 'mods';
const MOD_URLS_QUERY = 'modUrls';
const MOD_IDS_STORAGE_KEY = 'frontier.enabledMods';
const MOD_URLS_STORAGE_KEY = 'frontier.enabledModUrls';

type ModModuleLike = {
    default?: GameMod | ((api: ReturnType<typeof createModApi>) => void);
    mod?: GameMod;
    install?: (api: ReturnType<typeof createModApi>) => void;
};

function parseCsv(value: string | null): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function unique(values: string[]): string[] {
    return [...new Set(values)];
}

function normalizeExternalModule(url: string, moduleValue: ModModuleLike): GameMod {
    if (moduleValue.mod) return moduleValue.mod;
    if (typeof moduleValue.default === 'function') {
        return { id: `external:${url}`, install: moduleValue.default };
    }
    if (moduleValue.default && typeof moduleValue.default === 'object') {
        return moduleValue.default;
    }
    if (typeof moduleValue.install === 'function') {
        return { id: `external:${url}`, install: moduleValue.install };
    }
    throw new Error(`External mod ${url} does not export a GameMod or install(api) function.`);
}

export function getRequestedBuiltinModIds(search: URLSearchParams = new URLSearchParams(window.location.search)): string[] {
    const queryIds = parseCsv(search.get(MOD_IDS_QUERY));
    const storedIds = parseCsv(localStorage.getItem(MOD_IDS_STORAGE_KEY));
    return unique([...storedIds, ...queryIds]);
}

export function getRequestedExternalModUrls(search: URLSearchParams = new URLSearchParams(window.location.search)): string[] {
    const queryUrls = parseCsv(search.get(MOD_URLS_QUERY));
    const storedUrls = parseCsv(localStorage.getItem(MOD_URLS_STORAGE_KEY));
    return unique([...storedUrls, ...queryUrls]);
}

export async function loadConfiguredMods(log?: (line: string, forceVisible?: boolean) => void): Promise<void> {
    const builtinIds = getRequestedBuiltinModIds();
    const externalUrls = getRequestedExternalModUrls();

    for (const modId of builtinIds) {
        const mod = builtinMods[modId];
        if (!mod) {
            throw new Error(`Unknown builtin mod: ${modId}`);
        }
        installMod(mod);
        log?.(`[mod] installed builtin ${modId}`);
    }

    for (const url of externalUrls) {
        const moduleValue = await import(/* @vite-ignore */ url) as ModModuleLike;
        const mod = normalizeExternalModule(url, moduleValue);
        installMod(mod);
        log?.(`[mod] installed external ${mod.id}`);
    }
}

export function setEnabledBuiltinMods(modIds: string[]): void {
    localStorage.setItem(MOD_IDS_STORAGE_KEY, unique(modIds).join(','));
}

export function setEnabledExternalModUrls(urls: string[]): void {
    localStorage.setItem(MOD_URLS_STORAGE_KEY, unique(urls).join(','));
}
