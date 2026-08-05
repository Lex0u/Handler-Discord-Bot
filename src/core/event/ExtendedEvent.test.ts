// src/core/ExtendedEvent.test.ts
import { describe, it, expect } from "vitest";
import { EventBuilder } from "./ExtendedEvent";

describe("EventBuilder", () => {
  it("construit un event client valide", () => {
    // Arrange
    const builder = new EventBuilder()
      .setName("clientReady")
      .setEmitter("client");

    // Act
    const data = builder.build();

    // Assert
    expect(data.name).toBe("clientReady");
    expect(data.emitter).toBe("client");
    expect(data.once).toBe(false);
    expect(data.active).toBe(true);
  });

  it("lève une erreur si le nom est manquant", () => {
    // Arrange
    const builder = new EventBuilder().setEmitter("client");

    // Act & Assert
    expect(() => builder.build()).toThrow("'name' est obligatoire");
  });

  it("lève une erreur si emitter est 'custom' sans customName", () => {
    // Arrange
    const builder = new EventBuilder().setName("myEvent").setEmitter("custom");

    // Act & Assert
    expect(() => builder.build()).toThrow("'customName' est obligatoire");
  });

  it("accepte un emitter 'custom' avec customName fourni", () => {
    // Arrange
    const builder = new EventBuilder()
      .setName("myEvent")
      .setEmitter("custom")
      .setCustomName("xpGained");

    // Act
    const data = builder.build();

    // Assert
    expect(data.customName).toBe("xpGained");
  });
});
