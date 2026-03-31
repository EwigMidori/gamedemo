/**
 * Mod Test Utils
 * 
 * Testing utilities for mod development and compatibility verification.
 * 
 * @package @gamedemo/mod-test-utils
 */

export {
  ModTestHarness,
  createTestContainer
} from "./modTestHarness";

export type {
  TestContainer,
  MockRegistryType,
  LoadResult
} from "./modTestHarness";

export {
  ModCompatibilityTest,
  runModTests,
  MOD_COMPATIBILITY_CHECKS
} from "./modCompatibilityTest";

export type {
  CheckResult,
  ModTestResult,
  ModCompatibilityCheck
} from "./modCompatibilityTest";

export { ModAssertions } from "./modAssertions";
