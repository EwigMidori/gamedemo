/**
 * ModTestHarness Tests
 * 
 * TDD test cases for mod testing utilities.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ModTestHarness, createTestContainer } from "./modTestHarness";
import type { GameModModule, ModInstallContext } from "@gamedemo/mod-api";

describe("createTestContainer", () => {
  it("should return ModInstallContext with all registries", () => {
    const container = createTestContainer();

    expect(container.content).toBeDefined();
    expect(container.systems).toBeDefined();
    expect(container.commands).toBeDefined();
    expect(container.commandResolvers).toBeDefined();
    expect(container.actions).toBeDefined();
    expect(container.worldObjects).toBeDefined();
    expect(container.worldObjectInteractions).toBeDefined();
    expect(container.inventorySelections).toBeDefined();
    expect(container.inventoryInteractions).toBeDefined();
    expect(container.combinedInteractions).toBeDefined();
    expect(container.worldgen).toBeDefined();
    expect(container.ui).toBeDefined();
    expect(container.session).toBeDefined();
  });

  it("should accept profile entries", () => {
    const profile = [
      { id: "test:mod1", version: "1.0.0" },
      { id: "test:mod2", version: "2.0.0" }
    ];

    const container = createTestContainer(profile);

    expect(container.profile).toHaveLength(2);
    expect(container.profile[0].id).toBe("test:mod1");
  });

  it("should have mock registry methods", () => {
    const container = createTestContainer();

    expect(typeof container.systems.getRegistrations).toBe("function");
    expect(typeof container.commands.getRegistrations).toBe("function");
    expect(typeof container.actions.getRegistrations).toBe("function");
  });
});

describe("ModTestHarness", () => {
  let harness: ModTestHarness;

  beforeEach(() => {
    harness = new ModTestHarness();
  });

  describe("getContainer", () => {
    it("should return the test container", () => {
      const container = harness.getContainer();

      expect(container).toBeDefined();
      expect(container.content).toBeDefined();
    });
  });

  describe("getRegisteredContent", () => {
    it("should return content snapshot", () => {
      const content = harness.getRegisteredContent();

      expect(content.items).toBeDefined();
      expect(content.structures).toBeDefined();
      expect(content.recipes).toBeDefined();
      expect(content.resources).toBeDefined();
      expect(content.terrains).toBeDefined();
    });
  });

  describe("getVisualPacks", () => {
    it("should return empty array initially", () => {
      const packs = harness.getVisualPacks();

      expect(packs).toHaveLength(0);
    });
  });

  describe("getErrors", () => {
    it("should return empty array initially", () => {
      const errors = harness.getErrors();

      expect(errors).toHaveLength(0);
    });
  });

  describe("hasMod", () => {
    it("should return false for unloaded mod", () => {
      expect(harness.hasMod("test:unloaded")).toBe(false);
    });
  });

  describe("getLoadedModIds", () => {
    it("should return empty array initially", () => {
      const ids = harness.getLoadedModIds();

      expect(ids).toHaveLength(0);
    });
  });

  describe("clear", () => {
    it("should clear loaded mods", () => {
      // This test verifies the method exists and doesn't throw
      harness.clear();

      expect(harness.getLoadedModIds()).toHaveLength(0);
      expect(harness.getErrors()).toHaveLength(0);
    });
  });

  describe("mock registries", () => {
    it("should track system registrations", () => {
      const container = harness.getContainer();
      const mockSystem = { name: "test-system", tick: () => {} };

      container.systems.register(mockSystem);

      const registrations = container.systems.getRegistrations();
      expect(registrations).toHaveLength(1);
      expect(registrations[0]).toBe(mockSystem);
    });

    it("should track command registrations", () => {
      const container = harness.getContainer();
      const mockCommand = { id: "test:command", execute: () => {} };

      container.commands.register(mockCommand);

      const registrations = container.commands.getRegistrations();
      expect(registrations).toHaveLength(1);
      expect(registrations[0]).toBe(mockCommand);
    });

    it("should track action registrations", () => {
      const container = harness.getContainer();
      const mockAction = { id: "test:action", perform: () => {} };

      container.actions.register(mockAction);

      const registrations = container.actions.getRegistrations();
      expect(registrations).toHaveLength(1);
      expect(registrations[0]).toBe(mockAction);
    });
  });
});
