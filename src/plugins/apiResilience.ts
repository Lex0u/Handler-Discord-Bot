// src/plugins/apiResilience.ts
import ExtendedClient from "../core/client/ExtendedClient";
import { HandlerPlugin } from "../contracts/HandlerPlugin";
import { LogLevel, LogTag } from "../core/shared/enums";

export interface ApiResilienceOptions {
    /** Nombre d'échecs consécutifs avant de considérer l'API comme down. Défaut 5. */
    failureThreshold?: number;
    /** Délai avant de retenter après ouverture du circuit, en ms. Défaut 30s. */
    cooldown?: number;
}

/**
 * Surveille les rate limits (visibilité) et les échecs répétés de l'API Discord
 * (circuit breaker). N'intercepte aucune requête — discord.js gère déjà la file
 * d'attente des rate limits nativement. Ce plugin ajoute juste :
 * - un log dès qu'un rate limit survient (sinon totalement silencieux)
 * - un état consultable via client.isApiHealthy() pour que les commandes/events
 *   puissent éviter d'insister pendant une vraie panne API, plutôt que d'échouer
 *   en boucle sans le savoir.
 */
export function apiResilience(options: ApiResilienceOptions = {}): HandlerPlugin {
    const failureThreshold = options.failureThreshold ?? 5;
    const cooldown = options.cooldown ?? 30_000;

    let consecutiveFailures = 0;
    let circuitOpenUntil = 0;

    return {
        name: "api-resilience",
        onLoad(client: ExtendedClient) {
            client.rest.on("rateLimited", (info) => {
                client.log(LogLevel.Warning, `Rate limit atteint sur ${info.route} (retry dans ${info.timeToReset}ms)`, LogTag.System, {
                    route: info.route,
                    limit: info.limit,
                    timeToReset: info.timeToReset,
                });
            });

            client.rest.on("response", (_request, response) => {
                if (response.status >= 500) {
                    consecutiveFailures++;
                    if (consecutiveFailures >= failureThreshold && circuitOpenUntil < Date.now()) {
                        circuitOpenUntil = Date.now() + cooldown;
                        client.log(
                            LogLevel.Error,
                            `API Discord semble instable (${consecutiveFailures} erreurs consécutives) — pause de ${cooldown / 1000}s pour les appels non-critiques`,
                            LogTag.System,
                        );
                    }
                } else {
                    consecutiveFailures = 0;
                }
            });

            // Expose l'état sur le client lui-même, accessible partout
            client.isApiHealthy = () => Date.now() >= circuitOpenUntil;
        },
    };
}
