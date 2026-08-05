// src/core/ExtendedClient.ts
import { Client, ClientOptions, Collection } from "discord.js";
import { EventEmitter } from "events";
import Command from "../command/ExtendedCommand";
import { HandlerPlugin } from "../../contracts/HandlerPlugin";
import { DatabaseAdapter } from "../../contracts/DatabaseAdapter";
import {
  LoggerAdapter,
  ConsoleFallbackLogger,
} from "../../contracts/LoggerAdapter";
import { LogLevel, LogTag } from "../shared/enums";

export interface HandlerConfig extends ClientOptions {
  token: string;
  plugins?: HandlerPlugin[];
  database?: DatabaseAdapter;
  logger?: LoggerAdapter;
}

export default class ExtendedClient extends Client {
  /** Source unique pour toutes les commandes, indexées par `name:type`. */
  public readonly commands = new Collection<string, Command>();

  /** Bus d'events internes au handler (pour emitter: "custom"). */
  public readonly eventEmitter = new EventEmitter();

  public readonly database?: DatabaseAdapter | undefined;
  public readonly logger: LoggerAdapter;
  private readonly plugins: HandlerPlugin[];

  constructor(private readonly config: HandlerConfig) {
    super(config);

    this.database = config.database;
    this.logger = config.logger ?? new ConsoleFallbackLogger();
    this.plugins = config.plugins ?? [];

    this.once("clientReady", () => this.runPluginHook("onReady"));
    this.once("clientReady", () =>
      this.log(
        LogLevel.Success,
        `Connecté en tant que ${this.user?.tag}`,
        LogTag.System,
      ),
    );
  }

  /** Log unifié, quelle que soit la couche appelante. */
  public log(
    level: LogLevel,
    message: string,
    tag?: LogTag,
    meta?: Record<string, unknown>,
  ): void {
    void this.logger.log(level, message, tag, meta);
  }

  /** Démarre le client : connexion DB optionnelle, plugins, puis login Discord. */
  public async start(): Promise<void> {
    if (this.database) {
      this.database.on("error", (err) =>
        this.log(
          LogLevel.Error,
          `Erreur base de données: ${err}`,
          LogTag.Database,
        ),
      );
      this.database.on("disconnected", () =>
        this.log(
          LogLevel.Warning,
          "Base de données déconnectée.",
          LogTag.Database,
        ),
      );
      await this.database.connect();
      this.log(LogLevel.Success, "Base de données connectée.", LogTag.Database);
    }

    await this.runPluginHook("onLoad");
    await this.login(this.config.token);
  }

  /** Arrêt propre : plugins puis DB. */
  public async stop(): Promise<void> {
    await this.runPluginHook("onUnload");
    if (this.database?.isConnected()) await this.database.disconnect();
    this.destroy();
  }

  private async runPluginHook(
    hook: "onLoad" | "onReady" | "onUnload",
  ): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        await plugin[hook]?.(this);
      } catch (err) {
        this.log(
          LogLevel.Error,
          `Erreur dans le plugin "${plugin.name}" (${hook}): ${err}`,
          LogTag.Plugins,
        );
      }
    }
  }
}
