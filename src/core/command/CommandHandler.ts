// src/core/CommandHandler.ts
import { readdirSync } from "fs";
import { join } from "path";
import { REST, Routes, ApplicationCommandData } from "discord.js";
import ExtendedClient from "../client/ExtendedClient";
import Command from "./ExtendedCommand";
import { CommandType } from "../shared/enums";
import { LogLevel, LogTag } from "../shared/enums";

interface LoadSummary {
  slash: number;
  message: number;
  contextMenu: number;
  errors: number;
}

/**
 * Charge récursivement les commandes depuis un dossier et les indexe
 * dans `client.commands` — une seule Collection, une seule source de vérité.
 */
export async function loadCommands(
  client: ExtendedClient,
  dir: string,
): Promise<LoadSummary> {
  const summary: LoadSummary = {
    slash: 0,
    message: 0,
    contextMenu: 0,
    errors: 0,
  };
  await loadRecursive(client, dir, summary);

  client.log(
    summary.errors > 0 ? LogLevel.Warning : LogLevel.Success,
    `${summary.slash} slash | ${summary.message} textuelles | ${summary.contextMenu} context-menu | ${summary.errors} erreurs`,
    LogTag.Commands,
  );

  return summary;
}

async function loadRecursive(
  client: ExtendedClient,
  dir: string,
  summary: LoadSummary,
): Promise<void> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await loadRecursive(client, filePath, summary);
      continue;
    }

    if (!entry.name.endsWith(".js") || entry.name.endsWith(".test.js"))
      continue;

    try {
      const { default: CommandClass } = await import(filePath);
      const command: Command = new CommandClass(client);

      if (client.commands.has(command.key)) {
        client.log(
          LogLevel.Warning,
          `Commande dupliquée ignorée: ${command.key}`,
          LogTag.Commands,
        );
        summary.errors++;
        continue;
      }

      client.commands.set(command.key, command);

      switch (command.type) {
        case CommandType.Message:
          summary.message++;
          break;
        case CommandType.Slash:
          summary.slash++;
          break;
        default:
          summary.contextMenu++;
          break;
      }
    } catch (error) {
      client.log(
        LogLevel.Error,
        `Erreur de chargement: ${filePath}`,
        LogTag.Commands,
        { error },
      );
      summary.errors++;
    }
  }
}

/**
 * Déploie sur Discord les commandes slash/context-menu déjà chargées dans `client.commands`.
 * Les commandes textuelles (CommandType.Message) sont ignorées : elles n'ont rien à déployer.
 */
export async function deployCommands(client: ExtendedClient): Promise<void> {
  const toDeploy = [...client.commands.values()].filter(
    (cmd) => cmd.type !== CommandType.Message,
  );
  if (!toDeploy.length) {
    client.log(
      LogLevel.Warning,
      "Aucune commande à déployer.",
      LogTag.Commands,
    );
    return;
  }

  const body: ApplicationCommandData[] = toDeploy.map(toApplicationCommandData);

  try {
    const rest = new REST({ version: "10" }).setToken(client.token ?? "");
    await rest.put(Routes.applicationCommands(client.user?.id ?? ""), { body });
    client.log(
      LogLevel.Success,
      `${toDeploy.length} commande(s) déployée(s).`,
      LogTag.Commands,
    );
  } catch (error) {
    client.log(
      LogLevel.Error,
      `Erreur lors du déploiement: ${error}`,
      LogTag.Commands,
    );
  }
}

function toApplicationCommandData(cmd: Command): ApplicationCommandData {
  const shared = {
    name: cmd.name,
    defaultMemberPermissions: cmd.userPermissions,
    dmPermission: cmd.channel !== "GUILD",
  };

  switch (cmd.type) {
    case CommandType.Slash:
      return {
        ...shared,
        type: 1,
        description: cmd.description,
        descriptionLocalizations: cmd.descriptionLocalizations,
        nameLocalizations: cmd.nameLocalizations,
        options: cmd.options,
      } as ApplicationCommandData;
    case CommandType.ContextUser:
      return { ...shared, type: 2 } as ApplicationCommandData;
    case CommandType.ContextMessage:
      return { ...shared, type: 3 } as ApplicationCommandData;
    default:
      throw new Error(`Type de commande non déployable: ${cmd.type}`);
  }
}
