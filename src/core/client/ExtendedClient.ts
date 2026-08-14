// src/core/client/ExtendedClient.ts
import { Client, ClientOptions, Collection } from "discord.js";
import { EventEmitter } from "events";
import Command from "../command/ExtendedCommand";
import { HandlerPlugin } from "../../contracts/HandlerPlugin";
import { DatabaseAdapter } from "../../contracts/DatabaseAdapter";
import { LoggerAdapter, ConsoleFallbackLogger } from "../../contracts/LoggerAdapter";
import { LogLevel, LogTag } from "../shared/enums";
import { Interfaces } from "../shared/interfaces";

export interface HandlerConfig extends ClientOptions {
    token: string;
    plugins?: HandlerPlugin[];
    database?: DatabaseAdapter;
    logger?: LoggerAdapter;
}

const SNOWFLAKE_REGEX = /^\d{17,20}$/;

export default class ExtendedClient extends Client {
    /** Source unique pour toutes les commandes, indexées par `name:type`. */
    public readonly commands = new Collection<string, Command>();

    /** Bus d'events internes au handler (pour emitter: "custom"). */
    public readonly eventEmitter = new EventEmitter();

    public readonly database?: DatabaseAdapter | undefined;
    public readonly logger: LoggerAdapter;
    private readonly plugins: HandlerPlugin[];

    /** Écrasé par le plugin apiResilience si utilisé — true par défaut si absent. */
    public isApiHealthy: () => boolean = () => true;
    /** Écrasé par le plugin latencyMonitor si utilisé — true par défaut si absent. */
    public isLatencyHealthy: () => boolean = () => true;
    public getLatency: () => number = () => this.ws.ping;

    public isMaintenance = false;
    public maintenanceReason: string | null = null;

    constructor(private readonly config: HandlerConfig) {
        super(config);

        this.database = config.database;
        this.logger = config.logger ?? new ConsoleFallbackLogger();
        this.plugins = config.plugins ?? [];

        this.once("clientReady", () => this.runPluginHook("onReady"));
        this.once("clientReady", () => this.log(LogLevel.Success, `Connecté en tant que ${this.user?.tag}`, LogTag.System));
    }

    /** Log unifié, quelle que soit la couche appelante. */
    public log(level: LogLevel, message: string, tag?: LogTag, meta?: Record<string, unknown>): void {
        void this.logger.log(level, message, tag, meta);
    }

    /**
     * Démarre le client : connexion DB optionnelle (avec rechargement de l'état de
     * maintenance persisté), plugins, puis login Discord.
     */
    public async start(): Promise<void> {
        if (this.database) {
            this.database.on("error", (err) => this.log(LogLevel.Error, `Erreur base de données: ${err}`, LogTag.Database));
            this.database.on("disconnected", () => this.log(LogLevel.Warning, "Base de données déconnectée.", LogTag.Database));
            await this.database.connect();
            this.log(LogLevel.Success, "Base de données connectée.", LogTag.Database);

            await this.loadPersistedMaintenance();
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

    private async runPluginHook(hook: "onLoad" | "onReady" | "onUnload"): Promise<void> {
        for (const plugin of this.plugins) {
            try {
                await plugin[hook]?.(this);
            } catch (err) {
                this.log(LogLevel.Error, `Erreur dans le plugin "${plugin.name}" (${hook}): ${err}`, LogTag.Plugins);
            }
        }
    }

    /**
     * Résout un salon par ID ou par nom, en vérifiant que son type correspond bien à celui attendu.
     * - Par ID : lit le cache d'abord, ne fetch que si absent (discord.js met en cache automatiquement).
     * - Par nom : cherche dans le cache d'une guild précise (guildId), puis fetch tous les salons de
     *   cette guild en une seule fois si rien n'est trouvé. Sans guildId, ne cherche que dans le cache
     *   de toutes les guilds déjà connues (aucun fetch réseau, pour éviter un balayage coûteux).
     *
     * @example
     * const salon = await client.resolveChannel("annonces", ChannelType.GuildText, guildId);
     * // salon est typé TextChannel | null — pas de cast nécessaire
     */
    public async resolveChannel<T extends keyof Interfaces.ChannelTypeMap>(
        query: string,
        type: T,
        guildId?: string,
    ): Promise<Interfaces.ChannelTypeMap[T] | null> {
        const channel = SNOWFLAKE_REGEX.test(query) ? await this.resolveById(query) : await this.resolveByName(query, guildId);

        if (!channel) return null;

        if (channel.type !== type) {
            this.log(
                LogLevel.Warning,
                `Salon "${query}" trouvé mais de mauvais type (attendu: ${type}, reçu: ${channel.type})`,
                LogTag.System,
            );
            return null;
        }

        return channel as Interfaces.ChannelTypeMap[T];
    }

    private async resolveById(id: string) {
        return this.channels.cache.get(id) ?? (await this.channels.fetch(id).catch(() => null));
    }

    private async resolveByName(name: string, guildId?: string) {
        if (guildId) {
            const guild = this.guilds.cache.get(guildId) ?? (await this.guilds.fetch(guildId).catch(() => null));
            if (!guild) return null;

            const cached = guild.channels.cache.find((c) => c.name === name);
            if (cached) return cached;

            // Rien en cache : un seul fetch complet des salons de CETTE guild,
            // qui alimente automatiquement guild.channels.cache pour les appels suivants.
            const all = await guild.channels.fetch().catch(() => null);
            return all?.find((c) => c?.name === name) ?? null;
        }

        for (const guild of this.guilds.cache.values()) {
            const found = guild.channels.cache.find((c) => c.name === name);
            if (found) return found;
        }
        return null;
    }

    /**
     * Active/désactive le mode maintenance. Les commandes sont bloquées tant qu'il est actif
     * (voir InteractionRunner). Persisté en base si une DB est connectée, pour survivre à un
     * redémarrage et se partager entre shards plus tard.
     */
    public async setMaintenance(enabled: boolean, reason: string | null = null): Promise<void> {
        this.isMaintenance = enabled;
        this.maintenanceReason = reason;

        if (this.database?.isConnected()) {
            const { getBotConfig } = await import("../../models/BotConfig.js");
            const config = await getBotConfig();
            config.maintenance = { enabled, reason: reason ?? undefined, since: enabled ? new Date() : undefined };
            await config.save();
        }

        this.log(
            enabled ? LogLevel.Warning : LogLevel.Success,
            enabled ? `Mode maintenance activé${reason ? `: ${reason}` : ""}` : "Mode maintenance désactivé",
            LogTag.System,
        );
    }

    /** Recharge l'état de maintenance depuis la base au démarrage (utile après un redémarrage). */
    private async loadPersistedMaintenance(): Promise<void> {
        const { getBotConfig } = await import("../../models/BotConfig.js");
        const config = await getBotConfig();
        this.isMaintenance = config.maintenance.enabled;
        this.maintenanceReason = config.maintenance.reason ?? null;
    }
}
