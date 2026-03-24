import type { RuntimeSystem } from "@gamedemo/engine-core";
import { BuildingDomain } from "./buildingDomain";

const growthSimulation: RuntimeSystem = {
  id: "building:growth-simulation",
  phase: "simulation",
  description: "Advances growable placed structures such as farm plots.",
  run({ content, deltaSeconds, state }) {
    const model = BuildingDomain.createModel();
    model.tickGrowth(content, state, deltaSeconds);
    model.tickDoors(content, state);
  }
};

export const BuildingSystems = {
  growthSimulation
};
