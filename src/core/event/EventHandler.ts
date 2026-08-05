// src/core/EventHandler.ts
import { readdirSync } from "fs";
import { join } from "path";
import ExtendedClient from "../client/ExtendedClient";
import Event from "./ExtendedEvent";
import { LogLevel, LogTag } from "../shared/enums";

/** Charge et enregistre récursivement tous les events d'un dossier. */
export async function loadEvents(
  client: ExtendedClient,
  dir: string,
): Promise<void> {
  let loaded = 0;
  let errors = 0;

  await loadRecursive(client, dir, (ok) => (ok ? loaded++ : errors++));

  client.log(
    errors > 0 ? LogLevel.Warning : LogLevel.Success,
    `${loaded} event(s) enregistré(s) | ${errors} erreur(s)`,
    LogTag.Events,
  );
}

async function loadRecursive(
  client: ExtendedClient,
  dir: string,
  report: (ok: boolean) => void,
): Promise<void> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const filePath = join(dir, entry.name);

    if (entry.isDirectory()) {
      await loadRecursive(client, filePath, report);
      continue;
    }

    if (!entry.name.endsWith(".js") || entry.name.endsWith(".test.js"))
      continue;

    try {
      const { default: EventClass } = await import(filePath);
      const event: Event = new EventClass(client);
      event.register();
      report(true);
    } catch (error) {
      client.log(
        LogLevel.Error,
        `Erreur de chargement: ${filePath}`,
        LogTag.Events,
        { error },
      );
      report(false);
    }
  }
}
