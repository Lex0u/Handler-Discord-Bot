// src/models/BotConfig.ts
import { Schema, model, Document } from "mongoose";

export interface AutoStatusEntryDB {
    name: string;
    activityType?: number;
    presence?: "online" | "idle" | "dnd" | "invisible";
}

export interface BotConfigDocument extends Document {
    statuses: AutoStatusEntryDB[];
    statusInterval: number;
    maintenance: {
        enabled: boolean;
        reason?: string | undefined;
        since?: Date | undefined;
    };
}

const botConfigSchema = new Schema<BotConfigDocument>({
    statuses: [
        {
            name: { type: String, required: true },
            activityType: { type: Number, default: 0 },
            presence: { type: String, enum: ["online", "idle", "dnd", "invisible"], default: "online" },
        },
    ],
    statusInterval: { type: Number, default: 300_000 },
    maintenance: {
        enabled: { type: Boolean, default: false },
        reason: { type: String },
        since: { type: Date },
    },
});

export const BotConfig = model<BotConfigDocument>("BotConfig", botConfigSchema);

/** Un seul document existe jamais — le crée avec des valeurs par défaut s'il n'existe pas encore. */
export async function getBotConfig(): Promise<BotConfigDocument> {
    const existing = await BotConfig.findOne();
    if (existing) return existing;
    return BotConfig.create({ statuses: [], maintenance: { enabled: false } });
}
