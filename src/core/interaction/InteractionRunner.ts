// src/core/InteractionRunner.ts
import { Collection, CommandInteraction, Message } from "discord.js";
import ExtendedClient from "../client/ExtendedClient";
import Command, { CommandContext } from "../command/ExtendedCommand";
import { LogLevel, LogTag } from "../shared/enums";

export type CooldownType = "command" | "button" | "selectMenu" | "modal";

/**
 * Cooldowns génériques pour tout type d'interaction (pas seulement les slash commands).
 * Clé de stockage: `${type}:${key}:${userId}`.
 */
export class CooldownManager {
  private readonly store = new Collection<string, number>();

  check(
    type: CooldownType,
    key: string,
    userId: string,
    seconds: number,
  ): { onCooldown: boolean; timeLeft: number } {
    if (seconds <= 0) return { onCooldown: false, timeLeft: 0 };

    const storeKey = `${type}:${key}:${userId}`;
    const expiresAt = this.store.get(storeKey);
    const now = Date.now();

    if (expiresAt && expiresAt > now) {
      return { onCooldown: true, timeLeft: (expiresAt - now) / 1000 };
    }

    this.store.set(storeKey, now + seconds * 1000);
    return { onCooldown: false, timeLeft: 0 };
  }
}

/**
 * Exécute une commande avec gestion d'erreur, permissions et cooldown centralisées.
 * Les commandes n'ont plus besoin de try/catch manuel ni de vérifier les permissions elles-mêmes.
 */
export async function runCommand(
  client: ExtendedClient,
  command: Command,
  ctx: CommandContext<CommandInteraction | Message>,
  cooldowns: CooldownManager,
): Promise<void> {
  if (!command.enabled) {
    return void command.sendError(
      ctx,
      "Cette commande est actuellement désactivée.",
    );
  }

  if (
    client.database &&
    !command.canUseWithoutDatabase &&
    !client.database.isConnected()
  ) {
    return void command.sendError(
      ctx,
      "La base de données est actuellement indisponible. Réessaie plus tard.",
    );
  }

  const userId = ctx.user?.id;
  if (userId) {
    const { onCooldown, timeLeft } = cooldowns.check(
      "command",
      command.key,
      userId,
      command.cooldown,
    );
    if (onCooldown) {
      return void command.sendError(
        ctx,
        `Cette commande est en cooldown. Patiente **${Math.ceil(timeLeft)}s**.`,
      );
    }
  }

  const clientPerms = command.hasClientPermissions(ctx);
  if (!clientPerms.canExecute) {
    return void command.sendError(
      ctx,
      `Il me manque les permissions : **${clientPerms.missing.join(", ")}**`,
    );
  }

  const userPerms = await command.hasUserPermissions(ctx);
  if (!userPerms.canExecute) {
    return void command.sendError(
      ctx,
      `Tu n'as pas les permissions : **${userPerms.missing.join(", ")}**`,
    );
  }

  try {
    await command.execute(ctx);
  } catch (error) {
    client.log(
      LogLevel.Error,
      `Erreur dans la commande "${command.name}": ${error}`,
      LogTag.Commands,
      { error },
    );
    await command.sendError(ctx).catch(() => undefined);
  }
}
