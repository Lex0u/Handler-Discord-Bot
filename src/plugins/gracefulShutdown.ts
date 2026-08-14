// src/plugins/gracefulShutdown.ts
import ExtendedClient from "../core/client/ExtendedClient";
import { HandlerPlugin } from "../contracts/HandlerPlugin";
import { LogLevel, LogTag } from "../core/shared/enums";

export interface GracefulShutdownOptions {
    /** ms max avant de forcer l'arrêt si stop() traîne. Défaut 10s. */
    timeout?: number;
}

export function gracefulShutdown(options: GracefulShutdownOptions = {}): HandlerPlugin {
    const timeout = options.timeout ?? 10_000;

    return {
        name: "graceful-shutdown",
        onLoad(client: ExtendedClient) {
            const shutdown = async (signal: string) => {
                client.log(LogLevel.Warning, `Signal ${signal} reçu, arrêt en cours...`, LogTag.System);

                const forceExit = setTimeout(() => {
                    client.log(LogLevel.Error, `stop() a dépassé ${timeout}ms, arrêt forcé.`, LogTag.System);
                    process.exit(1);
                }, timeout);

                try {
                    await client.stop();
                    clearTimeout(forceExit);
                    process.exit(0);
                } catch (err) {
                    clearTimeout(forceExit);
                    client.log(LogLevel.Error, `Erreur pendant l'arrêt: ${err}`, LogTag.System);
                    process.exit(1);
                }
            };

            process.once("SIGINT", () => void shutdown("SIGINT"));
            process.once("SIGTERM", () => void shutdown("SIGTERM"));
        },
    };
}
