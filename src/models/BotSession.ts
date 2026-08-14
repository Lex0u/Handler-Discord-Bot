// src/models/BotSession.ts
import { Schema, model, Document } from "mongoose";

export interface BotSessionDocument extends Document {
    shardId: number;
    startedAt: Date;
    endedAt?: Date;
    /** Mis à jour périodiquement pendant que le shard tourne — permet de détecter un crash
     *  (endedAt jamais posé) en comparant lastSeenAt à maintenant. */
    lastSeenAt: Date;
    graceful: boolean;
}

const botSessionSchema = new Schema<BotSessionDocument>({
    shardId: { type: Number, required: true, index: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    lastSeenAt: { type: Date, required: true },
    graceful: { type: Boolean, default: false },
});

export const BotSession = model<BotSessionDocument>("BotSession", botSessionSchema);

/**
 * Calcule le pourcentage de temps en ligne sur une fenêtre donnée (défaut 7 jours).
 * Traite une session sans endedAt comme "en cours" si lastSeenAt est récent (<5min),
 * sinon comme crashée à la date de son dernier lastSeenAt connu.
 */
export async function computeUptimePercentage(windowMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const windowStart = new Date(Date.now() - windowMs);
    const sessions = await BotSession.find({
        $or: [{ endedAt: { $gte: windowStart } }, { endedAt: null }],
        startedAt: { $lte: new Date() },
    });

    const now = Date.now();
    const crashThreshold = 5 * 60 * 1000;

    let onlineMs = 0;
    for (const session of sessions) {
        const effectiveEnd = session.endedAt
            ? session.endedAt.getTime()
            : now - session.lastSeenAt.getTime() < crashThreshold
              ? now
              : session.lastSeenAt.getTime();

        const start = Math.max(session.startedAt.getTime(), windowStart.getTime());
        const end = Math.min(effectiveEnd, now);
        if (end > start) onlineMs += end - start;
    }

    const totalMs = Math.min(windowMs, now - windowStart.getTime());
    return totalMs > 0 ? Math.round((onlineMs / totalMs) * 10000) / 100 : 0;
}
