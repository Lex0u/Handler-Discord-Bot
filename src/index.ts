// src/index.ts
import "dotenv/config";
import { GatewayIntentBits } from "discord.js";
import { join } from "path";
import ExtendedClient from "./core/client/ExtendedClient";
import { loadCommands, deployCommands } from "./core/command/CommandHandler";
import { loadEvents } from "./core/event/EventHandler";
import { autoStatus } from "./plugins/autoStatus";
import { processErrorLogger } from "./plugins/processErrorLogger";
import { createLex0uLogger } from "./adapters/lex0uLogger"; // wrapper autour de @lex0u/logger
import { createMongooseAdapter } from "./adapters/mongoose";
import { latencyMonitor } from "./plugins/latencyMonitor";
import { apiResilience } from "./plugins/apiResilience";
import { gracefulShutdown } from "./plugins/gracefulShutdown";
import { uptimeTracker } from "./plugins/uptimeTracker";

const logger = createLex0uLogger({
    console: { enabled: true },
    file: { enabled: true, folderPath: "./logs" },
});

async function main() {
    const client = new ExtendedClient({
        token: process.env.DISCORD_TOKEN ?? "",
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences,
            GatewayIntentBits.MessageContent,
        ],
        logger,
        database: createMongooseAdapter(process.env.MONGO_URI!),
        plugins: [
            processErrorLogger(),
            autoStatus({
                interval: 15 * 1000, // 15 secondes
                description: "Bot de gestion des publicités, sécurité et modération -- {members} utilisateurs",
                statuses: [
                    { name: "Prêt à gérer les pubs", presence: "dnd" },
                    { name: `Présent pour {members} membres !`, presence: "online" },
                ],
            }),
            latencyMonitor({ threshold: 500 }),
            apiResilience(),
            gracefulShutdown(),
            uptimeTracker(),
        ],
    });

    await loadEvents(client, join(__dirname, "events"));
    await loadCommands(client, join(__dirname, "commands"));
    await client.start();
    await deployCommands(client);

    client.once("clientReady", () => logger.setDiscordClient(client));
}

main().catch((err) => {
    console.error("Erreur fatale au démarrage:", err);
    process.exit(1);
});
