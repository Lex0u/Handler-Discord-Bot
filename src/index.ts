// src/index.ts
import { GatewayIntentBits } from "discord.js";
import { join } from "path";
import ExtendedClient from "./core/client/ExtendedClient";
import { loadCommands, deployCommands } from "./core/command/CommandHandler";
import { loadEvents } from "./core/event/EventHandler";
import { autoStatus } from "./plugins/autoStatus";
import { processErrorLogger } from "./plugins/processErrorLogger";
// import { createMongooseAdapter } from "./adapters/mongoose.example";
// import { createLex0uLogger } from "./adapters/lex0uLogger"; // wrapper autour de @lex0u/logger

async function main() {
  const client = new ExtendedClient({
    token: process.env.DISCORD_TOKEN ?? "",
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
    // logger: createLex0uLogger(),
    // database: createMongooseAdapter(process.env.MONGO_URI!),
    plugins: [
      processErrorLogger(),
      autoStatus({ statuses: [{ name: "prêt à démarrer 🚀" }] }),
    ],
  });

  await loadEvents(client, join(__dirname, "events"));
  await loadCommands(client, join(__dirname, "commands"));
  await client.start();
  await deployCommands(client);
}

main().catch((err) => {
  console.error("Erreur fatale au démarrage:", err);
  process.exit(1);
});
