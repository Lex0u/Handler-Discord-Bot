// src/core/event/EventHandler.ts
import { readdirSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import ExtendedClient from "../client/ExtendedClient";
import Event from "./ExtendedEvent";
import { LogLevel, LogTag } from "../shared/enums";
import { serializeError } from "../shared/errors";

export async function loadEvents(client: ExtendedClient, dir: string): Promise<void> {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    let loaded = 0;
    let errors = 0;

    loadRecursive(client, dir, (ok) => (ok ? loaded++ : errors++));

    client.log(errors > 0 ? LogLevel.Warning : LogLevel.Success, `${loaded} event(s) enregistré(s) | ${errors} erreur(s)`, LogTag.Events);
}

function loadRecursive(client: ExtendedClient, dir: string, report: (ok: boolean) => void): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const filePath = join(dir, entry.name);

        if (entry.isDirectory()) {
            loadRecursive(client, filePath, report);
            continue;
        }

        const isLoadable =
            (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) &&
            !entry.name.endsWith(".d.ts") &&
            !entry.name.endsWith(".test.ts") &&
            !entry.name.endsWith(".test.js");
        if (!isLoadable) continue;

        try {
            const EventClass = require(filePath).default;
            const event: Event = new EventClass(client);
            event.register();
            report(true);
        } catch (error) {
            client.log(LogLevel.Error, `Erreur de chargement: ${filePath}`, LogTag.Events, serializeError(error));
            report(false);
        }
    }
}
