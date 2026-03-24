import type {
  ContentSnapshot,
  ResourceNode,
  RuntimeActionResult,
  RuntimeSessionState
} from "@gamedemo/engine-core";
import { VanillaBreakRules } from "@gamedemo/vanilla-domain";
import { GatheringDomain } from "./gatheringDomain";

class GatheringBreakDomainModel {
  getBreakTarget(state: RuntimeSessionState, resourceNodeId: string): ResourceNode | null {
    return GatheringDomain.getResourceById(state, resourceNodeId);
  }

  canBreakTarget(state: RuntimeSessionState, target: ResourceNode | null): boolean {
    return GatheringDomain.canGatherTarget(state, target);
  }

  breakResource(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    resourceNodeId: string,
    selectedSlot: number | null | undefined
  ): RuntimeActionResult {
    const target = this.getBreakTarget(state, resourceNodeId);
    if (!target) {
      return { ok: false, message: "Nothing breakable is targeted." };
    }
    if (!this.canBreakTarget(state, target)) {
      return { ok: false, message: "Move closer to break that resource." };
    }
    const definition = GatheringDomain.getResourceDef(content, target.resourceId);
    if (!definition) {
      return { ok: false, message: `Unknown resource ${target.resourceId}.` };
    }

    const maxHits = Math.max(1, definition.maxHits ?? 1);
    const nextHits = Math.max(0, (target.hitsLeft ?? maxHits) - 1);
    target.hitsLeft = nextHits;
    if (nextHits > 0) {
      return {
        ok: true,
        message: `${definition.label} damaged. ${nextHits} hit${nextHits === 1 ? "" : "s"} left.`
      };
    }

    const breakProfile = VanillaBreakRules.forResource(content, state, target, selectedSlot);
    const rolledDrops = VanillaBreakRules.rollDrops(definition.drops, breakProfile.dropMultiplier);
    GatheringDomain.spawnDrops(state, target.x, target.y, rolledDrops);
    if (definition.bonusDrop && Math.random() < definition.bonusDrop.chance) {
      GatheringDomain.spawnDrops(state, target.x, target.y, [{
        itemId: definition.bonusDrop.itemId,
        quantity: definition.bonusDrop.quantity
      }]);
    }
    target.depleted = true;
    target.respawnAt = definition.respawnSeconds
      ? state.timeSeconds + definition.respawnSeconds
      : null;
    target.hitsLeft = maxHits;
    return {
      ok: true,
      message: `Broke ${definition.label.toLowerCase()}.`
    };
  }
}

const model = new GatheringBreakDomainModel();

export const GatheringBreakDomain = {
  createModel(): GatheringBreakDomainModel {
    return model;
  }
};
