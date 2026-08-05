// src/events/interaction/chatInputCommand.ts
import { Interaction } from "discord.js";
import Event, { EventBuilder } from "../../core/event/ExtendedEvent";
import ExtendedClient from "../../core/client/ExtendedClient";
import { CommandContext } from "../../core/command/ExtendedCommand";
import { CommandType } from "../../core/shared/enums";
import {
  CooldownManager,
  runCommand,
} from "../../core/interaction/InteractionRunner";

const cooldowns = new CooldownManager();

export default class ChatInputCommandEvent extends Event {
  constructor(client: ExtendedClient) {
    super(
      client,
      new EventBuilder()
        .setName("interactionCreate")
        .setEmitter("client")
        .build(),
    );
  }

  public async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const command = this.client.commands.get(
      `${interaction.commandName}:${CommandType.Slash}`,
    );
    if (!command) return;

    const ctx = new CommandContext(interaction);
    await runCommand(this.client, command, ctx, cooldowns);
  }
}
