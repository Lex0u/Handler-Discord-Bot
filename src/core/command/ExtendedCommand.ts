// src/core/ExtendedCommand.ts
import {
  APIEmbed,
  APIApplicationCommandOption,
  AutocompleteInteraction,
  BaseInteraction,
  ButtonInteraction,
  Channel,
  ChatInputCommandInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  Guild,
  GuildBasedChannel,
  GuildMember,
  InteractionReplyOptions,
  LocalizationMap,
  Message,
  ModalSubmitInteraction,
  PermissionResolvable,
  Role,
  Snowflake,
  StringSelectMenuInteraction,
  User,
} from "discord.js";
import ExtendedClient from "../client/ExtendedClient";
import { CommandChannel, CommandType } from "../shared/enums";
import {
  CommandData,
  MessageCommandData,
  SlashCommandData,
} from "../shared/types";
import { Interfaces } from "../shared/interfaces";

/**
 * Contexte unifié pour une commande, qu'elle vienne d'un message texte
 * ou d'une interaction (slash, bouton, select, modal...).
 */
export class CommandContext<
  T extends Message | BaseInteraction = Message | BaseInteraction,
> {
  protected readonly event: T;

  constructor(event: T) {
    this.event = event;
  }

  isMessage(): this is CommandContext<Message> {
    return this.event instanceof Message;
  }

  isInteraction(): this is CommandContext<BaseInteraction> {
    return this.event instanceof BaseInteraction;
  }

  isChatInput(): this is CommandContext<ChatInputCommandInteraction> {
    return (
      this.event instanceof CommandInteraction &&
      this.event.isChatInputCommand()
    );
  }

  isContextMenu(): this is CommandContext<ContextMenuCommandInteraction> {
    return (
      this.event instanceof CommandInteraction &&
      !this.event.isChatInputCommand()
    );
  }

  get message(): Message | null {
    return this.isMessage() ? this.event : null;
  }

  get interaction(): ChatInputCommandInteraction | null {
    return this.isChatInput() ? this.event : null;
  }

  get channel(): Channel | null {
    return this.event.channel ?? null;
  }

  get user(): User | null {
    return this.isMessage()
      ? this.event.author
      : this.isInteraction()
        ? this.event.user
        : null;
  }

  get guild(): Guild | null {
    return this.event.guild ?? null;
  }

  get subCommand(): string | null {
    return this.isChatInput()
      ? (this.event.options.getSubcommand(false) ?? null)
      : null;
  }

  get subCommandGroup(): string | null {
    return this.isChatInput()
      ? (this.event.options.getSubcommandGroup(false) ?? null)
      : null;
  }

  private get options(): ChatInputCommandInteraction["options"] | null {
    return this.isChatInput() ? this.event.options : null;
  }

  getOptionString(name: string): string | null {
    return (this.options?.get(name, false)?.value as string) ?? null;
  }

  getOptionNumber(name: string): number | null {
    return (this.options?.get(name, false)?.value as number) ?? null;
  }

  getOptionBoolean(name: string): boolean | null {
    return (this.options?.get(name, false)?.value as boolean) ?? null;
  }

  getOptionUser(name: string): User | null {
    return (this.options?.get(name, false)?.user as User) ?? null;
  }

  getOptionMember(name: string): GuildMember | null {
    return (this.options?.get(name, false)?.member as GuildMember) ?? null;
  }

  getOptionChannel(name: string): GuildBasedChannel | null {
    return (
      (this.options?.get(name, false)?.channel as GuildBasedChannel) ?? null
    );
  }

  getOptionRole(name: string): Role | null {
    return (this.options?.get(name, false)?.role as Role) ?? null;
  }

  /** Récupère un argument de commande texte, par index ou par nom. */
  getArg<V = unknown>(
    args: Interfaces.CommandMessageArgsResolved[],
    key: string | number,
  ): V | undefined {
    if (!this.isMessage()) return undefined;

    if (typeof key === "number") {
      const item = args[key];
      if (!item) return undefined;
      return Object.values(item).find((v) => v !== undefined) as V;
    }

    for (const item of args) {
      if (Object.prototype.hasOwnProperty.call(item, key))
        return item[key] as V;
    }
    return undefined;
  }

  /** Reply/followUp/editReply automatique selon l'état de l'interaction ou le type de message. */
  async replyOrFollowUp(
    payload:
      | (InteractionReplyOptions & { flags?: ("Ephemeral" | string)[] })
      | { content?: string; embeds?: APIEmbed[] },
    i?:
      | ButtonInteraction
      | StringSelectMenuInteraction
      | CommandInteraction
      | ModalSubmitInteraction
      | Message,
  ) {
    const target = i ?? this.event;

    if (target instanceof Message) {
      const { flags: _flags, ...clean } = payload as any;
      return target.reply(clean);
    }

    if (
      target instanceof ButtonInteraction ||
      target instanceof ModalSubmitInteraction ||
      target instanceof StringSelectMenuInteraction ||
      target instanceof CommandInteraction
    ) {
      if (target.replied || target.deferred) {
        return target.followUp(payload as InteractionReplyOptions).catch(() =>
          target.editReply({
            embeds: (payload as InteractionReplyOptions).embeds ?? [],
            content: (payload as InteractionReplyOptions).content ?? null,
          }),
        );
      }
      return target.reply(payload as InteractionReplyOptions);
    }

    throw new Error(
      `replyOrFollowUp() appelé avec un type inconnu : ${target.constructor.name}`,
    );
  }
}

/**
 * Builder fluent pour configurer une commande sans passer par un objet littéral géant.
 * `build()` valide les champs obligatoires et lève une erreur explicite s'il en manque.
 */
export class CommandBuilder<T extends CommandType = CommandType> {
  private data: Partial<CommandData> & { type?: T } = {};

  setName(name: string): this {
    this.data.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  setType(type: T): this {
    this.data.type = type;
    return this;
  }

  setCategory(category: string): this {
    this.data.category = category;
    return this;
  }

  setChannel(channel: CommandChannel): this {
    this.data.channel = channel;
    return this;
  }

  setCooldown(seconds: number): this {
    this.data.cooldown = seconds;
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.data.enabled = enabled;
    return this;
  }

  setGuildId(guildId: Snowflake | Snowflake[]): this {
    this.data.guildId = guildId;
    return this;
  }

  setUserPermissions(permissions: PermissionResolvable[]): this {
    this.data.userPermissions = permissions;
    return this;
  }

  setClientPermissions(permissions: PermissionResolvable[]): this {
    this.data.clientPermissions = permissions;
    return this;
  }

  setCanUseWithoutDatabase(value: boolean): this {
    this.data.canUseWithoutDatabase = value;
    return this;
  }

  setExamples(examples: string | string[]): this {
    this.data.examples = examples;
    return this;
  }

  setUsage(usage: string | string[]): this {
    this.data.usage = usage;
    return this;
  }

  /** Uniquement pour les commandes slash. */
  setOptions(options: APIApplicationCommandOption[]): this {
    (this.data as SlashCommandData).options = options;
    return this;
  }

  setNameLocalizations(map: LocalizationMap): this {
    (this.data as SlashCommandData).nameLocalizations = map;
    return this;
  }

  setDescriptionLocalizations(map: LocalizationMap): this {
    (this.data as SlashCommandData).descriptionLocalizations = map;
    return this;
  }

  /** Uniquement pour les commandes texte. */
  setAliases(aliases: string[]): this {
    (this.data as MessageCommandData).aliases = aliases;
    return this;
  }

  setArgs(args: Interfaces.MessageCommandOptionData[]): this {
    (this.data as MessageCommandData).args = args;
    return this;
  }

  build(): CommandData {
    if (!this.data.name)
      throw new Error("CommandBuilder: 'name' est obligatoire.");
    if (!this.data.type)
      throw new Error("CommandBuilder: 'type' est obligatoire.");
    return {
      channel: CommandChannel.Guild,
      enabled: true,
      cooldown: 0,
      userPermissions: [],
      clientPermissions: [],
      ...this.data,
    } as CommandData;
  }
}

export default class Command {
  public readonly name: string;
  public readonly description: string;
  public readonly category: string;
  public readonly usage: string | string[];
  public readonly enabled: boolean;
  public readonly examples: string | string[];
  public readonly channel: CommandChannel;
  public readonly cooldown: number;
  public readonly userPermissions: PermissionResolvable[];
  public readonly clientPermissions: PermissionResolvable[];
  public readonly aliases: string[];
  public readonly options?: APIApplicationCommandOption[] | undefined;
  public readonly args: Interfaces.MessageCommandOptionData[];
  public readonly type: CommandType;
  public readonly nameLocalizations?: LocalizationMap | undefined;
  public readonly descriptionLocalizations?: LocalizationMap | undefined;
  public readonly guildId: Snowflake | Snowflake[];
  public readonly canUseWithoutDatabase: boolean;

  constructor(
    protected readonly client: ExtendedClient,
    data: CommandData,
  ) {
    this.name = data.name;
    this.description = data.description ?? "Pas de description fournie";
    this.category = data.category ?? "Hors Catégorie";
    this.usage = data.usage ?? "Sans information";
    this.enabled = data.enabled ?? true;
    this.examples = data.examples ?? [];
    this.channel = data.channel ?? CommandChannel.Guild;
    this.cooldown = data.cooldown ?? 0;
    this.guildId = data.guildId ?? [];
    this.userPermissions = data.userPermissions ?? [];
    this.clientPermissions = data.clientPermissions ?? [];
    this.type = data.type;
    this.canUseWithoutDatabase = data.canUseWithoutDatabase ?? false;

    this.aliases =
      data.type === CommandType.Message ? (data.aliases ?? []) : [];
    this.args = data.type === CommandType.Message ? (data.args ?? []) : [];
    this.options = data.type === CommandType.Slash ? data.options : undefined;
    this.nameLocalizations =
      data.type === CommandType.Slash ? data.nameLocalizations : undefined;
    this.descriptionLocalizations =
      data.type === CommandType.Slash
        ? data.descriptionLocalizations
        : undefined;
  }

  /** Clé unique utilisée par le CommandHandler pour l'indexation. */
  public get key(): string {
    return `${this.name}:${this.type}`;
  }

  /** À override obligatoirement dans chaque commande. */
  public execute(
    _ctx: CommandContext<CommandInteraction | Message>,
  ): Promise<unknown> | unknown {
    throw new Error(`La commande "${this.name}" n'implémente pas execute().`);
  }

  /** No-op par défaut, à override si la commande gère l'autocomplete. */
  public async onAutoComplete(
    _interaction: AutocompleteInteraction,
  ): Promise<void> {
    return;
  }

  public async hasUserPermissions(
    ctx: CommandContext<CommandInteraction | Message>,
  ): Promise<{ canExecute: boolean; missing: string[] }> {
    if (!ctx.guild || !ctx.user) return { canExecute: true, missing: [] };
    const member = await ctx.guild.members.fetch(ctx.user.id);
    const missing = member.permissions.missing(this.userPermissions);
    return { canExecute: missing.length === 0, missing };
  }

  public hasClientPermissions(
    ctx: CommandContext<CommandInteraction | Message>,
  ): { canExecute: boolean; missing: string[] } {
    const me = ctx.guild?.members.me;
    if (!me) return { canExecute: true, missing: [] };
    const missing = me.permissions.missing(this.clientPermissions);
    return { canExecute: missing.length === 0, missing };
  }

  public async sendError(
    ctx: CommandContext<CommandInteraction | Message>,
    message?: string,
    ephemeral = true,
  ) {
    const embed: APIEmbed = {
      title: "❌ Une erreur est survenue",
      description:
        message ??
        "Une erreur inattendue est survenue. Veuillez réessayer ultérieurement.",
      color: 0xe74c3c,
      timestamp: new Date().toISOString(),
    };
    await ctx.replyOrFollowUp({
      embeds: [embed],
      flags: ephemeral ? ["Ephemeral"] : [],
    });
  }

  public async sendSuccess(
    ctx: CommandContext<CommandInteraction | Message>,
    message?: string,
    ephemeral = true,
  ) {
    const embed: APIEmbed = {
      title: "✅ Succès",
      description: message ?? "La commande a été exécutée avec succès.",
      color: 0x32cd32,
      timestamp: new Date().toISOString(),
    };
    await ctx.replyOrFollowUp({
      embeds: [embed],
      flags: ephemeral ? ["Ephemeral"] : [],
    });
  }
}
