import type { RuntimeSystem } from "@gamedemo/engine-core";
import { SurvivalDomain } from "./survivalDomain";

const needsDecay: RuntimeSystem = {
  id: "survival:needs-decay",
  phase: "simulation",
  description: "Applies hunger decay and health regeneration or starvation damage.",
  run({ deltaSeconds, state }) {
    state.timeSeconds += deltaSeconds;
    SurvivalDomain.updateDay(state);

    const hungerDecayPerSecond = 100 / (SurvivalDomain.DAY_LENGTH_SECONDS * 2.75);
    state.needs.hunger = Math.max(0, state.needs.hunger - deltaSeconds * hungerDecayPerSecond);

    if (state.needs.hunger <= 0) {
      state.needs.health = Math.max(0, state.needs.health - deltaSeconds * 4.5);
      if (state.logs.at(-1) !== "Starvation damage active.") {
        state.logs.push("Starvation damage active.");
      }
      return;
    }

    state.needs.health = Math.min(100, state.needs.health + deltaSeconds * 0.8);
  }
};

export const SurvivalSystems = {
  needsDecay
};
