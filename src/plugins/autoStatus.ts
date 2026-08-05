// src/plugins/autoStatus.ts
import { ActivityType } from "discord.js";
import ExtendedClient from "../core/client/ExtendedClient";
import { HandlerPlugin } from "../contracts/HandlerPlugin";

export interface AutoStatusOptions {
  interval?: number; // ms, défaut 5 min
  statuses: Array<{ name: string; type?: ActivityType }>;
}

export function autoStatus(options: AutoStatusOptions): HandlerPlugin {
  let timer: NodeJS.Timeout | undefined;
  let index = 0;

  return {
    name: "auto-status",
    onReady(client: ExtendedClient) {
      // src/plugins/autoStatus.ts
      const tick = () => {
        const status = options.statuses[index % options.statuses.length];
        if (!status) return; // ← garde ajoutée, ne devrait jamais arriver mais TS l'exige
        client.user?.setActivity(status.name, {
          type: status.type ?? ActivityType.Playing,
        });
        index++;
      };
      tick();
      timer = setInterval(tick, options.interval ?? 300_000);
    },
    onUnload() {
      if (timer) clearInterval(timer);
    },
  };
}
