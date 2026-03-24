import type { RuntimeSystem } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const growthSimulation: RuntimeSystem = {
  id: "building:growth-simulation",
  phase: "simulation",
  description: "Advances growable placed structures such as farm plots.",
  run({ content, deltaSeconds, state }) {
    BuildingDomain.createModel().tickGrowth(content, state, deltaSeconds);
  }
};

export const BuildingSystems = {
  growthSimulation
};
