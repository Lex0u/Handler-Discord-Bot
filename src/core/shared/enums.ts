// src/core/enums.ts
export enum LogLevel {
  Information = "Information",
  Warning = "Warning",
  Error = "Error",
  Debug = "Debug",
  Success = "Success",
}

export enum LogTag {
  Authentication = "Authentication",
  Commands = "Commands",
  Errors = "Errors",
  Events = "Events",
  Database = "Database",
  System = "System",
  General = "General",
  Plugins = "Plugins",
}

export enum CommandType {
  Message = "MESSAGE_COMMAND",
  Slash = "SLASH_COMMAND",
  ContextMessage = "CONTEXT_MENU_MESSAGE",
  ContextUser = "CONTEXT_MENU_USER",
}

export enum CommandChannel {
  DM = "DM",
  Global = "GLOBAL",
  Guild = "GUILD",
}
