// src/plugins/uptimeTracker.ts
import ExtendedClient from "../core/client/ExtendedClient";
import { HandlerPlugin } from "../contracts/HandlerPlugin";
import { BotSession, BotSessionDocument } from "../models/BotSession";
import { LogLevel, LogTag } from "../core/shared/enums";

export function uptimeTracker(): HandlerPlugin {
    let session: BotSessionDocument | null = null;
    let heartbeat: NodeJS.Timeout | undefined;

    return {
        name: "uptime-tracker",
        async onReady(client: ExtendedClient) {
            if (!client.database?.isConnected()) {
                client.log(LogLevel.Warning, "uptime-tracker désactivé: pas de base de données connectée.", LogTag.Plugins);
                return;
            }

            const shardId = client.shard?.ids[0] ?? 0;
            session = await BotSession.create({ shardId, startedAt: new Date(), lastSeenAt: new Date() });

            heartbeat = setInterval(async () => {
                if (session) await BotSession.findByIdAndUpdate(session._id, { lastSeenAt: new Date() }).catch(() => null);
            }, 60_000);
        },
        async onUnload() {
            if (heartbeat) clearInterval(heartbeat);
            if (session) {
                await BotSession.findByIdAndUpdate(session._id, { endedAt: new Date(), graceful: true }).catch(() => null);
            }
        },
    };
}
