import { z } from "zod";
import { ResponseFormatter } from "../../../utils/responseFormatter.js";
import { createTool } from "../toolFactory.js";
import { enforceProjectLock } from "../../../utils/projectLockEnforcer.js";

// Import all individual PostgreSQL tool schemas for reuse
import { postgresChangeStatus } from "../postgres/postgresChangeStatus.js";
import { postgresCreate } from "../postgres/postgresCreate.js";
import { postgresDeploy } from "../postgres/postgresDeploy.js";
import { postgresMove } from "../postgres/postgresMove.js";
import { postgresOne } from "../postgres/postgresOne.js";
import { postgresRebuild } from "../postgres/postgresRebuild.js";
import { postgresReload } from "../postgres/postgresReload.js";
import { postgresRemove } from "../postgres/postgresRemove.js";
import { postgresSaveEnvironment } from "../postgres/postgresSaveEnvironment.js";
import { postgresSaveExternalPort } from "../postgres/postgresSaveExternalPort.js";
import { postgresStart } from "../postgres/postgresStart.js";
import { postgresStop } from "../postgres/postgresStop.js";
import { postgresUpdate } from "../postgres/postgresUpdate.js";

export const dokployPostgres = createTool({
  name: "dokploy_postgres",
  description:
    "Consolidated tool for managing Dokploy PostgreSQL databases. Supports multiple actions: create, remove, deploy, start, stop, update, get, rebuild, reload, move, changeStatus, saveEnvironment, saveExternalPort.",
  schema: z.object({
    action: z
      .enum([
        "create",
        "remove",
        "deploy", 
        "start",
        "stop",
        "update",
        "get",
        "rebuild",
        "reload",
        "move",
        "changeStatus",
        "saveEnvironment",
        "saveExternalPort",
      ])
      .describe(
        `The action to perform on PostgreSQL databases.\n\n` +
        `• create: Create new PostgreSQL database (requires: name, appName, databaseName, databaseUser, databasePassword, environmentId)\n` +
        `• get: Get database details (requires: postgresId)\n` +
        `• update: Update database config (requires: postgresId)\n` +
        `• remove: Delete database (requires: postgresId)\n` +
        `• deploy: Deploy database (requires: postgresId)\n` +
        `• start/stop: Start/stop database (requires: postgresId)\n` +
        `• rebuild: Rebuild database (requires: postgresId)\n` +
        `• reload: Reload database (requires: postgresId)\n` +
        `• move: Move to different environment (requires: postgresId, environmentId)\n` +
        `• changeStatus: Change database status (requires: postgresId, applicationStatus)\n` +
        `• saveEnvironment: Save env variables (requires: postgresId)\n` +
        `• saveExternalPort: Configure external port (requires: postgresId, externalPort)`
      ),
    params: z
      .record(z.any())
      .optional()
      .describe(
        `Parameters for the specified action.\n\n` +
        `COMMON PARAMETERS:\n` +
        `• postgresId: The unique identifier of the PostgreSQL database (required for most operations)\n` +
        `• name: Database display name (required for create)\n` +
        `• appName: Application name (required for create)\n` +
        `• databaseName: Database name (required for create)\n` +
        `• databaseUser: Database username (required for create)\n` +
        `• databasePassword: Database password (required for create)\n` +
        `• environmentId: Environment ID (required for create, move)\n\n` +
        `EXAMPLE USAGE:\n` +
        `Create DB: {"action": "create", "params": {"name": "Prod DB", "appName": "myapp", "databaseName": "mydb", "databaseUser": "user", "databasePassword": "pass", "environmentId": "env-123"}}\n` +
        `Get DB: {"action": "get", "params": {"postgresId": "pg-123"}}`
      ),
  }),
  annotations: {
    title: "Manage Dokploy PostgreSQL Database",
    destructiveHint: false, // Will be dynamically set based on action
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async (input) => {
    const { action, params = {} } = input;

    // Enforce project lock restrictions before executing the action
    const lockError = await enforceProjectLock(params);
    if (lockError) {
      return lockError;
    }

    // Map actions to their corresponding tool handlers
    const actionMap: Record<string, any> = {
      create: postgresCreate,
      remove: postgresRemove,
      deploy: postgresDeploy,
      start: postgresStart,
      stop: postgresStop,
      update: postgresUpdate,
      get: postgresOne,
      rebuild: postgresRebuild,
      reload: postgresReload,
      move: postgresMove,
      changeStatus: postgresChangeStatus,
      saveEnvironment: postgresSaveEnvironment,
      saveExternalPort: postgresSaveExternalPort,
    };

    const tool = actionMap[action];

    if (!tool) {
      return ResponseFormatter.error(
        "Invalid action",
        `Action "${action}" is not supported for PostgreSQL database`
      );
    }

    // Call the corresponding tool handler with the provided params
    try {
      return await tool.handler(params);
    } catch (error) {
      return ResponseFormatter.error(
        `Failed to execute PostgreSQL action "${action}"`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  },
});
