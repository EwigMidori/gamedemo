/**
 * ModAssertions - Assertion helpers for mod testing
 * 
 * Provides convenient assertions for common mod verification tasks.
 * 
 * @module mod-test-utils/modAssertions
 */

import type { ModTestHarness } from "./modTestHarness";
import type { HeightClassification } from "@gamedemo/mod-api";

export const ModAssertions = {
  /**
   * Assert that a visual pack exists for a content ID.
   * 
   * @param contentId - Content ID to check
   * @param harness - Test harness
   * @throws Error if visual pack not found
   */
  hasVisualPack(contentId: string, harness: ModTestHarness): void {
    const packs = harness.getVisualPacks();
    if (!packs.some(p => p.contentId === contentId)) {
      throw new Error(`Missing visual pack for ${contentId}`);
    }
  },

  /**
   * Assert that a content ID has a specific height classification.
   * 
   * @param contentId - Content ID to check
   * @param classification - Expected height classification
   * @param harness - Test harness
   * @throws Error if classification doesn't match
   */
  hasHeightClassification(
    contentId: string,
    classification: HeightClassification,
    harness: ModTestHarness
  ): void {
    const pack = harness.getVisualPacks().find(p => p.contentId === contentId);
    if (!pack) {
      throw new Error(`Missing visual pack for ${contentId}`);
    }
    if (pack.heightClassification !== classification) {
      throw new Error(
        `${contentId} has classification ${pack.heightClassification}, expected ${classification}`
      );
    }
  },

  /**
   * Assert that a tall object has canOccludePlayer enabled.
   * 
   * @param contentId - Content ID to check
   * @param harness - Test harness
   * @throws Error if tall object doesn't occlude
   */
  tallObjectOccludes(contentId: string, harness: ModTestHarness): void {
    const pack = harness.getVisualPacks().find(p => p.contentId === contentId);
    if (!pack) {
      throw new Error(`Missing visual pack for ${contentId}`);
    }
    if (pack.heightClassification === "tall" && !pack.canOccludePlayer) {
      throw new Error(
        `Tall object ${contentId} should have canOccludePlayer=true`
      );
    }
  },

  /**
   * Assert that content was registered.
   * 
   * @param harness - Test harness
   * @throws Error if no content registered
   */
  hasContent(harness: ModTestHarness): void {
    const content = harness.getRegisteredContent();
    const totalContent = 
      content.items.length + 
      content.structures.length + 
      content.resources.length +
      content.recipes.length;
    
    if (totalContent === 0) {
      throw new Error("No content registered");
    }
  },

  /**
   * Assert that mod loaded successfully.
   * 
   * @param modId - Expected mod ID
   * @param harness - Test harness
   * @throws Error if mod not loaded
   */
  modLoaded(modId: string, harness: ModTestHarness): void {
    if (!harness.hasMod(modId)) {
      throw new Error(`Mod ${modId} not loaded`);
    }
  }
};
