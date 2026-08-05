// src/core/ExtendedEvent.ts
import { ClientEvents } from "discord.js";
import ExtendedClient from "../client/ExtendedClient";
import { LogLevel, LogTag } from "../shared/enums";

export type EventEmitterTarget = "client" | "process" | "custom";

export interface EventData {
  name: keyof ClientEvents | NodeJS.Signals | string;
  emitter: EventEmitterTarget;
  once?: boolean;
  active?: boolean;
  /** Obligatoire si emitter === "custom" (events internes via client.eventEmitter). */
  customName?: string;
}

/**
 * Builder fluent pour configurer un event sans objet littéral géant.
 */
export class EventBuilder {
  private data: Partial<EventData> = {
    emitter: "client",
    once: false,
    active: true,
  };

  setName(name: EventData["name"]): this {
    this.data.name = name;
    return this;
  }

  setEmitter(emitter: EventEmitterTarget): this {
    this.data.emitter = emitter;
    return this;
  }

  setOnce(once: boolean): this {
    this.data.once = once;
    return this;
  }

  setActive(active: boolean): this {
    this.data.active = active;
    return this;
  }

  /** À utiliser avec setEmitter("custom") pour écouter un event interne au handler. */
  setCustomName(customName: string): this {
    this.data.customName = customName;
    return this;
  }

  build(): EventData {
    if (!this.data.name)
      throw new Error("EventBuilder: 'name' est obligatoire.");
    if (this.data.emitter === "custom" && !this.data.customName) {
      throw new Error(
        "EventBuilder: 'customName' est obligatoire quand emitter === 'custom'.",
      );
    }
    return this.data as EventData;
  }
}

export default class Event {
  public readonly name: EventData["name"];
  public readonly emitter: EventEmitterTarget;
  public readonly once: boolean;
  public readonly active: boolean;
  public readonly customName?: string | undefined;

  constructor(
    protected readonly client: ExtendedClient,
    data: EventData,
  ) {
    this.name = data.name;
    this.emitter = data.emitter;
    this.once = data.once ?? false;
    this.active = data.active ?? true;
    this.customName = data.customName;
  }

  /** À override obligatoirement dans chaque event. */
  public execute(..._args: unknown[]): void | Promise<void> {
    throw new Error(
      `L'event "${this.customName ?? this.name}" n'implémente pas execute().`,
    );
  }

  /** Enregistre l'event sur le bon émetteur. Appelé par l'EventHandler au chargement. */
  public register(): this {
    if (!this.active) return this;

    const listener = this.execute.bind(this);
    const method = this.once ? "once" : "on";

    switch (this.emitter) {
      case "client": {
        (this.client as any)[method](this.name, listener);

        // Rattrapage : si clientReady est déjà passé, on exécute quand même.
        if (this.name === "clientReady" && this.client.isReady()) {
          this.client.log(
            LogLevel.Debug,
            `clientReady déjà émis, exécution immédiate de ${this.constructor.name}`,
            LogTag.Events,
          );
          Promise.resolve(listener()).catch((err) =>
            this.client.log(
              LogLevel.Error,
              `Erreur lors de l'exécution différée de ${this.constructor.name}: ${err}`,
              LogTag.Events,
            ),
          );
        }
        break;
      }
      case "process": {
        (process as any)[method](this.name, listener);
        break;
      }
      case "custom": {
        (this.client.eventEmitter as any)[method](this.customName, listener);
        break;
      }
    }

    return this;
  }
}
