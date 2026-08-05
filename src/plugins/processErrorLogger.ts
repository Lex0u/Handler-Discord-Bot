// src/plugins/processErrorLogger.ts
import ExtendedClient from "../core/client/ExtendedClient";
import { HandlerPlugin } from "../contracts/HandlerPlugin";
import { LogLevel, LogTag } from "../core/shared/enums";

/** Capture uncaughtException/unhandledRejection et les logue au lieu de crasher silencieusement. */
export function processErrorLogger(): HandlerPlugin {
  let client: ExtendedClient;

  const onUncaught = (err: unknown) =>
    client.log(LogLevel.Error, `uncaughtException: ${err}`, LogTag.System);
  const onRejection = (reason: unknown) =>
    client.log(LogLevel.Error, `unhandledRejection: ${reason}`, LogTag.System);

  return {
    name: "process-error-logger",
    onLoad(c) {
      client = c;
      process.on("uncaughtException", onUncaught);
      process.on("unhandledRejection", onRejection);
    },
    onUnload() {
      process.off("uncaughtException", onUncaught);
      process.off("unhandledRejection", onRejection);
    },
  };
}
