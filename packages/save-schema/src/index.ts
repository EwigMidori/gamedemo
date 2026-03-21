import type {
  RuntimeProfile,
  RuntimeSessionState
} from "@gamedemo/engine-core";

export const SAVE_SCHEMA_VERSION = 1;

export interface GameSaveEnvelope {
  version: number;
  profile: RuntimeProfile;
  session: RuntimeSessionState;
}

export const SaveSchema = {
  createEnvelope(
    profile: RuntimeProfile,
    session: RuntimeSessionState
  ): GameSaveEnvelope {
    return {
      version: SAVE_SCHEMA_VERSION,
      profile,
      session
    };
  }
};
