// src/contracts/HandlerPlugin.ts
import ExtendedClient from "../core/client/ExtendedClient";

/**
 * Contrat d'un module optionnel (status auto, gestion d'erreurs process, etc.).
 * Chaque plugin est une factory qui retourne cet objet, pour rester configurable.
 */
export interface HandlerPlugin {
  name: string;
  onLoad?(client: ExtendedClient): void | Promise<void>;
  onReady?(client: ExtendedClient): void | Promise<void>;
  onUnload?(client: ExtendedClient): void | Promise<void>;
}
