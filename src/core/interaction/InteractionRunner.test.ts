// src/core/InteractionRunner.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CooldownManager } from "./InteractionRunner";

describe("CooldownManager", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("n'est pas en cooldown au premier appel", () => {
    // Arrange
    const cooldowns = new CooldownManager();

    // Act
    const result = cooldowns.check("command", "ping", "user-1", 10);

    // Assert
    expect(result.onCooldown).toBe(false);
    expect(result.timeLeft).toBe(0);
  });

  it("est en cooldown au second appel immédiat", () => {
    // Arrange
    const cooldowns = new CooldownManager();
    cooldowns.check("command", "ping", "user-1", 10);

    // Act
    const result = cooldowns.check("command", "ping", "user-1", 10);

    // Assert
    expect(result.onCooldown).toBe(true);
    expect(result.timeLeft).toBeGreaterThan(0);
    expect(result.timeLeft).toBeLessThanOrEqual(10);
  });

  it("ignore le cooldown si la durée est 0", () => {
    // Arrange
    const cooldowns = new CooldownManager();
    cooldowns.check("command", "ping", "user-1", 0);

    // Act
    const result = cooldowns.check("command", "ping", "user-1", 0);

    // Assert
    expect(result.onCooldown).toBe(false);
  });

  it("distingue les utilisateurs entre eux", () => {
    // Arrange
    const cooldowns = new CooldownManager();
    cooldowns.check("command", "ping", "user-1", 10);

    // Act
    const result = cooldowns.check("command", "ping", "user-2", 10);

    // Assert
    expect(result.onCooldown).toBe(false);
  });

  it("distingue les types de cooldown entre eux", () => {
    // Arrange
    const cooldowns = new CooldownManager();
    cooldowns.check("command", "ping", "user-1", 10);

    // Act
    const result = cooldowns.check("button", "ping", "user-1", 10);

    // Assert
    expect(result.onCooldown).toBe(false);
  });
});
