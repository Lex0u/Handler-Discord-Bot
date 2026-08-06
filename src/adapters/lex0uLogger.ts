// src/adapters/lex0uLogger.ts
import { Logger, LoggerConfig, IDiscordClient } from "@lex0u/logger";
import { LoggerAdapter } from "../contracts/LoggerAdapter";

/**
 * Wrapper autour de @lex0u/logger pour respecter le contrat LoggerAdapter du handler.
 * discordClient est optionnel à la création : injecte-le via setDiscordClient une fois
 * ton ExtendedClient prêt si tu utilises la sortie Discord.
 */
export function createLex0uLogger(
  config: LoggerConfig,
  discordClient?: IDiscordClient,
): LoggerAdapter & { setDiscordClient(client: IDiscordClient): void } {
  const logger = new Logger(config, discordClient);

  return {
    log(level, message, tag, meta) {
      return logger.log(level, message, tag, meta ?? null);
    },
    setDiscordClient(client: IDiscordClient) {
      logger.setDiscordClient(client);
    },
  };
}
