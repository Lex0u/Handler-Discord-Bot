// src/plugins/latencyMonitor.ts
import ExtendedClient from "../core/client/ExtendedClient";
import { HandlerPlugin } from "../contracts/HandlerPlugin";
import { LogLevel, LogTag } from "../core/shared/enums";

export interface LatencyMonitorOptions {
    /** ms entre chaque vérification. Défaut 60s. */
    interval?: number;
    /** ping (ms) au-dessus duquel on considère la latence dégradée. Défaut 500ms. */
    threshold?: number;
}

export function latencyMonitor(options: LatencyMonitorOptions = {}): HandlerPlugin {
    const interval = options.interval ?? 60_000;
    const threshold = options.threshold ?? 500;

    let timer: NodeJS.Timeout | undefined;
    let wasHealthy = true;

    return {
        name: "latency-monitor",
        onReady(client: ExtendedClient) {
            const check = () => {
                const ping = client.ws.ping;
                const healthy = ping >= 0 && ping <= threshold; // ping vaut -1 tant qu'aucun heartbeat n'a eu lieu

                client.isLatencyHealthy = () => healthy;

                // Ne logue qu'au changement d'état, pas à chaque tick — évite le spam
                if (healthy !== wasHealthy) {
                    client.log(
                        healthy ? LogLevel.Success : LogLevel.Warning,
                        healthy ? `Latence redevenue normale (${ping}ms)` : `Latence élevée détectée (${ping}ms, seuil: ${threshold}ms)`,
                        LogTag.System,
                    );
                    wasHealthy = healthy;
                }
            };

            check();
            timer = setInterval(check, interval);
        },
        onUnload() {
            if (timer) clearInterval(timer);
        },
    };
}
