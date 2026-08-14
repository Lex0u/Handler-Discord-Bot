// src/plugins/autoStatus.ts
import { ActivityType, PresenceStatusData } from "discord.js";
import ExtendedClient from "../core/client/ExtendedClient";
import { HandlerPlugin } from "../contracts/HandlerPlugin";
import { LogLevel, LogTag } from "../core/shared/enums";

export interface AutoStatusEntry {
    /** Supporte les placeholders {servers}, {members}, {channels}. */
    name: string;
    type?: ActivityType;
    presence?: PresenceStatusData;
}

export interface AutoStatusOptions {
    interval?: number;
    statuses: AutoStatusEntry[];
    /**
     * Description de l'application (visible dans l'écran d'invitation et l'App Directory).
     * Supporte les mêmes placeholders que `statuses[].name`.
     * Mise à jour une seule fois au démarrage, pas à chaque tick — contrairement au statut,
     * ce n'est pas fait pour changer en boucle.
     */
    description?: string;
}

function resolvePlaceholders(template: string, client: ExtendedClient): string {
    const servers = client.guilds.cache.size;
    const members = client.guilds.cache.reduce((total, g) => total + g.memberCount, 0);
    const channels = client.channels.cache.size;

    return template
        .replace(/{servers}/g, servers.toLocaleString("fr-FR"))
        .replace(/{members}/g, members.toLocaleString("fr-FR"))
        .replace(/{channels}/g, channels.toLocaleString("fr-FR"));
}

export function autoStatus(options: AutoStatusOptions): HandlerPlugin {
    let timer: NodeJS.Timeout | undefined;
    let index = 0;

    return {
        name: "auto-status",
        async onReady(client: ExtendedClient) {
            if (options.description) {
                try {
                    await client.application?.fetch();
                    await client.application?.edit({
                        description: resolvePlaceholders(options.description, client),
                    });
                } catch (err) {
                    client.log(LogLevel.Warning, `Échec de mise à jour de la description: ${err}`, LogTag.Plugins);
                }
            }

            const tick = () => {
                if (!client.isApiHealthy()) return;
                const status = options.statuses[index % options.statuses.length];
                if (!status) return;

                client.user?.setPresence({
                    activities: [{ name: resolvePlaceholders(status.name, client), type: status.type ?? ActivityType.Playing }],
                    status: status.presence ?? "online",
                });

                index++;
            };
            tick();
            timer = setInterval(tick, options.interval ?? 300_000);
        },
        onUnload() {
            if (timer) clearInterval(timer);
        },
    };
}
