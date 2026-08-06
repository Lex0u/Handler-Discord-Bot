// src/events/guild/guildCreate.ts
import Event, { EventBuilder } from "../../core/event/ExtendedEvent";
import ExtendedClient from "../../core/client/ExtendedClient";
import { Guild, APIEmbed } from "discord.js";
import { LogLevel } from "@lex0u/logger";
import { LogTag } from "../../core/shared/enums";

export default class GuildCreateEvent extends Event {
    constructor(client: ExtendedClient) {
        super(client, new EventBuilder().setName("guildCreate").setEmitter("client").build());
    }

    public async execute(guild: Guild): Promise<void> {
        // Les 4 fetch sont indépendants → parallélisés au lieu d'enchaînés séquentiellement
        const [members, owner, roles, channels] = await Promise.all([
            guild.members.fetch(),
            guild.fetchOwner(),
            guild.roles.fetch(),
            guild.channels.fetch(),
        ]);

        // Un seul passage sur la collection au lieu de deux .filter() séparés
        let botsCount = 0;
        let humansCount = 0;
        for (const member of members.values()) {
            if (member.user.bot) botsCount++;
            else humansCount++;
        }

        this.client.log(LogLevel.Information, `Un serveur a ajouté ${this.client.user?.username}`, LogTag.Events, {
            guildName: guild.name,
            guildId: guild.id,
            membersCount: humansCount,
            botsCount: botsCount,
            ownerId: `${owner.user.username} - ${owner.id}`,
            rolesCount: roles.size,
            channelsCount: channels.size,
        });

        const addbotChannelId = process.env.DISCORD_CHANNEL_ADDBOT;
        if (!addbotChannelId) return;

        const embed = this.buildJoinEmbed(guild, owner.user.username, owner.id, humansCount, botsCount, roles.size, channels.size);

        // Lit d'abord le cache (gratuit) avant de fetch (appel API) si absent
        const channel =
            this.client.channels.cache.get(addbotChannelId) ?? (await this.client.channels.fetch(addbotChannelId).catch(() => null));

        if (!channel?.isTextBased() || !channel.isSendable()) {
            this.client.log(LogLevel.Warning, `Channel ADDBOT introuvable ou non-textuel : ${addbotChannelId}`, LogTag.Events);
            return;
        }

        await channel
            .send({ embeds: [embed] })
            .catch((err) => this.client.log(LogLevel.Error, `Échec d'envoi de l'embed guildCreate: ${err}`, LogTag.Events));
    }

    private buildJoinEmbed(
        guild: Guild,
        ownerTag: string,
        ownerId: string,
        humansCount: number,
        botsCount: number,
        rolesCount: number,
        channelsCount: number,
    ): APIEmbed {
        return {
            title: "📥 Nouveau serveur",
            description: `**${guild.name}** vient d'ajouter le bot.`,
            color: 0x2ecc71,
            fields: [
                { name: "🆔 ID", value: guild.id, inline: true },
                { name: "👑 Propriétaire", value: `${ownerTag}\n${ownerId}`, inline: true },
                { name: "\u200b", value: "\u200b", inline: true },
                { name: "👥 Membres", value: `${humansCount}`, inline: true },
                { name: "🤖 Bots", value: `${botsCount}`, inline: true },
                { name: "📊 Total", value: `${humansCount + botsCount}`, inline: true },
                { name: "🎭 Rôles", value: `${rolesCount}`, inline: true },
                { name: "💬 Salons", value: `${channelsCount}`, inline: true },
                { name: "📈 Total serveurs", value: `${this.client.guilds.cache.size}`, inline: true },
            ],
            footer: { text: `Rejoint le ${new Date().toLocaleDateString("fr-FR")}` },
            timestamp: new Date().toISOString(),
        };
    }
}
