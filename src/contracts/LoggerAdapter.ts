// src/contracts/LoggerAdapter.ts
import { LogLevel, LogTag } from "../core/shared/enums";

/**
 * Contrat unique de logging, respecté par toutes les couches du handler
 * (core, plugins, commandes, events). @lex0u/logger l'implémente nativement.
 */
export interface LoggerAdapter {
  log(
    level: LogLevel,
    message: string,
    tag?: LogTag,
    meta?: Record<string, unknown>,
  ): void | Promise<void>;
}

/** Fallback minimal si aucun logger n'est fourni à ExtendedClient. */
export class ConsoleFallbackLogger implements LoggerAdapter {
  log(level: LogLevel, message: string, tag?: LogTag): void {
    const prefix = tag ? `[${level}] [${tag}]` : `[${level}]`;
    console.log(`${prefix} ${message}`);
  }
}
