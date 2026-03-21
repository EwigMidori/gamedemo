import {
  SAVE_SCHEMA_VERSION,
  SaveSchema,
  type GameSaveEnvelope
} from "@gamedemo/save-schema";
import type { AssembledRuntime, RuntimeSession } from "./runtimeTypes";

function serialize(
  runtime: AssembledRuntime,
  session: RuntimeSession
): GameSaveEnvelope {
  return SaveSchema.createEnvelope(runtime.profile, session.snapshot());
}

function restore(
  runtime: AssembledRuntime,
  envelope: GameSaveEnvelope
): RuntimeSession {
  if (envelope.version !== SAVE_SCHEMA_VERSION) {
    throw new Error(`Unsupported save schema version: ${envelope.version}`);
  }

  const expectedProfile = JSON.stringify(runtime.profile.mods);
  const actualProfile = JSON.stringify(envelope.profile.mods);

  if (expectedProfile !== actualProfile) {
    throw new Error("Save profile does not match the active mod profile.");
  }

  return runtime.createSession(envelope.session);
}

export const RuntimeSaves = {
  serialize,
  restore
};
