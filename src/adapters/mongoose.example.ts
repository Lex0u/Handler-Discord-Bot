// src/adapters/mongoose.example.ts
import mongoose from "mongoose";
import { DatabaseAdapter, DatabaseEvent } from "../contracts/DatabaseAdapter";

/**
 * Exemple d'adapter Mongoose — pas une dépendance du core.
 * Copie ce fichier dans ton bot et installe `mongoose` toi-même si tu en as besoin.
 */
export function createMongooseAdapter(uri: string): DatabaseAdapter {
  return {
    async connect() {
      await mongoose.connect(uri);
    },
    async disconnect() {
      await mongoose.disconnect();
    },
    isConnected() {
      return mongoose.connection.readyState === 1;
    },
    on(event: DatabaseEvent, listener: (...args: unknown[]) => void) {
      const eventMap: Record<DatabaseEvent, string> = {
        connected: "connected",
        disconnected: "disconnected",
        error: "error",
      };
      mongoose.connection.on(eventMap[event], listener);
    },
  };
}
