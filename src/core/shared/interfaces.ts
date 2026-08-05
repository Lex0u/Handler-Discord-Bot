// src/core/interfaces.ts
export namespace Interfaces {
  /** Description d'un argument pour une commande textuelle (CommandType.Message). */
  export interface MessageCommandOptionData {
    name: string;
    type?:
      | "string"
      | "number"
      | "boolean"
      | "user"
      | "member"
      | "channel"
      | "role";
    required?: boolean;
    description?: string;
  }

  /** Résultat du parsing des arguments d'une commande textuelle, par nom ou par index. */
  export type CommandMessageArgsResolved = Record<string, unknown>;
}
