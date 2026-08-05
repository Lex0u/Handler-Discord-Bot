// src/core/types.ts
import {
  APIApplicationCommandOption,
  LocalizationMap,
  PermissionResolvable,
  Snowflake,
} from "discord.js";
import { CommandChannel, CommandType } from "../shared/enums";
import { Interfaces } from "./interfaces";

/** Champs communs à toutes les commandes, qu'elles soient slash, message ou context-menu. */
export interface BaseCommandData {
  name: string;
  description?: string;
  category?: string;
  usage?: string | string[];
  enabled?: boolean;
  examples?: string | string[];
  channel?: CommandChannel;
  cooldown?: number;
  guildId?: Snowflake | Snowflake[];
  userPermissions?: PermissionResolvable[];
  clientPermissions?: PermissionResolvable[];
  canUseWithoutDatabase?: boolean;
}

export interface SlashCommandData extends BaseCommandData {
  type: CommandType.Slash;
  options?: APIApplicationCommandOption[];
  nameLocalizations?: LocalizationMap;
  descriptionLocalizations?: LocalizationMap;
}

export interface MessageCommandData extends BaseCommandData {
  type: CommandType.Message;
  aliases?: string[];
  args?: Interfaces.MessageCommandOptionData[];
}

export interface ContextMenuCommandData extends BaseCommandData {
  type: CommandType.ContextUser | CommandType.ContextMessage;
}

export type CommandData =
  | SlashCommandData
  | MessageCommandData
  | ContextMenuCommandData;
