# Handler-Discord-Bot

<p align="center">

![license](https://img.shields.io/github/license/Lex0u/Handler-Discord-Bot)
![node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![build](https://img.shields.io/github/actions/workflow/status/Lex0u/Handler-Discord-Bot/ci.yml?branch=main&label=build)
![issues](https://img.shields.io/github/issues/Lex0u/Handler-Discord-Bot)
![stars](https://img.shields.io/github/stars/Lex0u/Handler-Discord-Bot?style=social)

</p>

---

Un template GitHub pour démarrer n'importe quel bot Discord rapidement, sans jamais avoir à modifier son cœur.
Commandes et events typés avec builders fluents, base de données et logger 100% agnostiques (branche ce que tu veux via une interface), et un système de plugins pour activer uniquement les modules dont ton bot a besoin.

## ✨ Fonctionnalités

- **Commandes en classes + builder** — `class MyCommand extends Command`, configurées via `CommandBuilder` (validation à la construction, pas d'objet littéral géant)
- **Events en classes + builder** — même logique avec `EventBuilder`, support de 3 émetteurs (`client`, `process`, `custom` via un bus d'events internes)
- **Contexte unifié** — `CommandContext` gère aussi bien les interactions (slash, boutons, menus, modals) que les messages texte classiques
- **Runner d'interaction centralisé** — gestion d'erreur, permissions (bot/user) et cooldowns génériques automatiques, aucune commande n'a besoin de `try/catch` manuel
- **Base de données agnostique** — implémente `DatabaseAdapter` pour brancher Mongoose, Prisma, ou autre chose ; aucune dépendance forcée dans le core
- **Logger agnostique** — implémente `LoggerAdapter` ; [`@lex0u/logger`](https://github.com/Lex0u/logger) fourni comme implémentation par défaut
- **Système de plugins** — modules opt-in (status automatique, capture d'erreurs process, etc.) activés via un simple tableau à l'instanciation du client

## 🚀 Démarrage rapide

1. Clique sur **Use this template** en haut de la page pour créer ton propre repo
2. Clone-le puis installe les dépendances :

```powershell
git clone https://github.com/<ton-compte>/<ton-bot>.git
cd <ton-bot>
npm install
```

3. Configure ton client dans `src/index.ts` :

```typescript
const client = new ExtendedClient({
  token: process.env.DISCORD_TOKEN ?? "",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  plugins: [
    processErrorLogger(),
    autoStatus({ statuses: [{ name: "prêt à démarrer 🚀" }] }),
  ],
});
```

4. Ajoute tes commandes dans `src/commands/` et tes events dans `src/events/` — le `CommandHandler`/`EventHandler` les charge automatiquement au démarrage

```powershell
npm run dev
```

## 📁 Structure
