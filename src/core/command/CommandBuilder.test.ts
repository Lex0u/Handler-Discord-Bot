// src/core/CommandBuilder.test.ts
import { describe, it, expect } from "vitest";
import { CommandBuilder } from "./ExtendedCommand";
import { CommandType, CommandChannel } from "../shared/enums";

describe("CommandBuilder", () => {
  it("construit une commande slash valide avec les valeurs par défaut", () => {
    // Arrange
    const builder = new CommandBuilder()
      .setName("ping")
      .setType(CommandType.Slash);

    // Act
    const data = builder.build();

    // Assert
    expect(data.name).toBe("ping");
    expect(data.type).toBe(CommandType.Slash);
    expect(data.channel).toBe(CommandChannel.Guild);
    expect(data.enabled).toBe(true);
    expect(data.cooldown).toBe(0);
  });

  it("respecte les valeurs explicitement définies", () => {
    // Arrange
    const builder = new CommandBuilder()
      .setName("rank")
      .setType(CommandType.Slash)
      .setCooldown(10)
      .setChannel(CommandChannel.DM)
      .setEnabled(false);

    // Act
    const data = builder.build();

    // Assert
    expect(data.cooldown).toBe(10);
    expect(data.channel).toBe(CommandChannel.DM);
    expect(data.enabled).toBe(false);
  });

  it("lève une erreur si le nom est manquant", () => {
    // Arrange
    const builder = new CommandBuilder().setType(CommandType.Slash);

    // Act & Assert
    expect(() => builder.build()).toThrow("'name' est obligatoire");
  });

  it("lève une erreur si le type est manquant", () => {
    // Arrange
    const builder = new CommandBuilder().setName("ping");

    // Act & Assert
    expect(() => builder.build()).toThrow("'type' est obligatoire");
  });
});
