import {
    CategoryChannel,
    ChannelType,
    DMChannel,
    ForumChannel,
    MediaChannel,
    NewsChannel,
    StageChannel,
    TextChannel,
    ThreadChannel,
    VoiceChannel,
} from "discord.js";

// src/core/interfaces.ts
export namespace Interfaces {
    /** Description d'un argument pour une commande textuelle (CommandType.Message). */
    export interface MessageCommandOptionData {
        name: string;
        type?: "string" | "number" | "boolean" | "user" | "member" | "channel" | "role";
        required?: boolean;
        description?: string;
    }

    /** Résultat du parsing des arguments d'une commande textuelle, par nom ou par index. */
    export type CommandMessageArgsResolved = Record<string, unknown>;

    /** Associe chaque ChannelType discord.js à sa vraie classe — sert au typage du retour de ExtendedClient.resolveChannel(). */
    export interface ChannelTypeMap {
        [ChannelType.GuildText]: TextChannel;
        [ChannelType.GuildVoice]: VoiceChannel;
        [ChannelType.GuildCategory]: CategoryChannel;
        [ChannelType.GuildAnnouncement]: NewsChannel;
        [ChannelType.GuildStageVoice]: StageChannel;
        [ChannelType.GuildForum]: ForumChannel;
        [ChannelType.GuildMedia]: MediaChannel;
        [ChannelType.PublicThread]: ThreadChannel;
        [ChannelType.PrivateThread]: ThreadChannel;
        [ChannelType.AnnouncementThread]: ThreadChannel;
        [ChannelType.DM]: DMChannel;
    }
}
