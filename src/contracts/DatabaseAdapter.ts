// src/contracts/DatabaseAdapter.ts
export type DatabaseEvent = "connected" | "disconnected" | "error";

/**
 * Contrat que doit respecter n'importe quelle base de données pour être branchée
 * sur le handler. Le core ne dépend d'aucun ORM/driver en particulier.
 */
export interface DatabaseAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  on(event: DatabaseEvent, listener: (...args: unknown[]) => void): void;
}
