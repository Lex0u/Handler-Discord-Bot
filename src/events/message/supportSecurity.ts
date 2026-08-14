// src/events/interaction/chatInputCommand.ts
import { Message } from "discord.js";
import Event, { EventBuilder } from "../../core/event/ExtendedEvent";
import ExtendedClient from "../../core/client/ExtendedClient";
import { LogLevel } from "@lex0u/logger";
import { LogTag } from "../../core/shared/enums";

export default class supportSecurityMessageEvent extends Event {
    constructor(client: ExtendedClient) {
        super(client, new EventBuilder().setName("messageCreate").setEmitter("client").build());
    }

    public async execute(message: Message): Promise<void> {
        const logChannelId = process.env.DISCORD_CHANNEL_LOG;
        if (!logChannelId)
            return this.client.log(LogLevel.Error, "Aucun ID transmis pour le salon de log.", LogTag.Plugins, {
                event: "supportSecurityMessageEvent",
            });
        const logChannel = await this.client.channels.fetch(logChannelId);
        if (!logChannel)
            return this.client.log(LogLevel.Error, "Impossible de communiquer avec le salon log", LogTag.Plugins, {
                event: "supportSecurityMessageEvent",
            });
        /**
         * SECURITÉ ANTI-SPAM & BOT DU SERVEUR SUPPORT
         */
        const SecurityChannelId = process.env.DISCORD_SECURITY_CHANNEL;
        if (SecurityChannelId) {
            const SecurityChannel = await this.client.channels.fetch(SecurityChannelId);
            if (!SecurityChannel) return;

            if (message.channelId == SecurityChannel.id) {
                try {
                    await message.member?.ban({
                        reason: "SECURITY - ANTIBOT",
                        deleteMessageSeconds: 604800, // 7 Jours
                    });
                    logChannel;
                } catch (e) {}
            }
        }
    }
}
