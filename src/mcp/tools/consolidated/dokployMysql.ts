import { z } from "zod";
import { ResponseFormatter } from "../../../utils/responseFormatter.js";
import { createTool } from "../toolFactory.js";
import { enforceProjectLock } from "../../../utils/projectLockEnforcer.js";

// Import all individual MySQL tool schemas for reuse
import { mysqlChangeStatus } from "../mysql/mysqlChangeStatus.js";
import { mysqlCreate } from "../mysql/mysqlCreate.js";
import { mysqlDeploy } from "../mysql/mysqlDeploy.js";
import { mysqlMove } from "../mysql/mysqlMove.js";
import { mysqlOne } from "../mysql/mysqlOne.js";
import { mysqlRebuild } from "../mysql/mysqlRebuild.js";
import { mysqlReload } from "../mysql/mysqlReload.js";
import { mysqlRemove } from "../mysql/mysqlRemove.js";
import { mysqlSaveEnvironment } from "../mysql/mysqlSaveEnvironment.js";
import { mysqlSaveExternalPort } from "../mysql/mysqlSaveExternalPort.js";
import { mysqlStart } from "../mysql/mysqlStart.js";
import { mysqlStop } from "../mysql/mysqlStop.js";
import { mysqlUpdate } from "../mysql/mysqlUpdate.js";

export const dokployMysql = createTool({
  name: "dokploy_mysql",
  description:
    "Consolidated tool for managing Dokploy MySQL databases. Supports multiple actions: create, remove, deploy, start, stop, update, get, rebuild, reload, move, changeStatus, saveEnvironment, saveExternalPort.",
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
        `The action to perform on MySQL databases.\n\n` +
        `• create: Create new MySQL database (requires: name, appName, databaseName, databaseUser, databasePassword, databaseRootPassword, environmentId)\n` +
        `• get: Get database details (requires: mysqlId)\n` +
        `• update: Update database config (requires: mysqlId)\n` +
        `• remove: Delete database (requires: mysqlId)\n` +
        `• deploy: Deploy database (requires: mysqlId)\n` +
        `• start/stop: Start/stop database (requires: mysqlId)\n` +
        `• rebuild: Rebuild database (requires: mysqlId)\n` +
        `• reload: Reload database (requires: mysqlId)\n` +
        `• move: Move to different environment (requires: mysqlId, environmentId)\n` +
        `• changeStatus: Change database status (requires: mysqlId, applicationStatus)\n` +
        `• saveEnvironment: Save env variables (requires: mysqlId)\n` +
        `• saveExternalPort: Configure external port (requires: mysqlId, externalPort)`
      ),
    params: z
      .record(z.any())
      .optional()
      .describe(
        `Parameters for the specified action.\n\n` +
        `COMMON PARAMETERS:\n` +
        `• mysqlId: The unique identifier of the MySQL database (required for most operations)\n` +
        `• name: Database display name (required for create)\n` +
        `• appName: Application name (required for create)\n` +
        `• databaseName: Database name (required for create)\n` +
        `• databaseUser: Database username (required for create)\n` +
        `• databasePassword: Database user password (required for create)\n` +
        `• databaseRootPassword: Database root password (required for create)\n` +
        `• environmentId: Environment ID (required for create, move)\n\n` +
        `EXAMPLE USAGE:\n` +
        `Create MySQL: {"action": "create", "params": {"name": "MySQL DB", "appName": "myapp", "databaseName": "mydb", "databaseUser": "user", "databasePassword": "userpass", "databaseRootPassword": "rootpass", "environmentId": "env-123"}}\n` +
        `Get MySQL: {"action": "get", "params": {"mysqlId": "mysql-123"}}`
      ),
  }),
  annotations: {
    title: "Manage Dokploy MySQL Database",
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
      create: mysqlCreate,
      remove: mysqlRemove,
      deploy: mysqlDeploy,
      start: mysqlStart,
      stop: mysqlStop,
      update: mysqlUpdate,
      get: mysqlOne,
      rebuild: mysqlRebuild,
      reload: mysqlReload,
      move: mysqlMove,
      changeStatus: mysqlChangeStatus,
      saveEnvironment: mysqlSaveEnvironment,
      saveExternalPort: mysqlSaveExternalPort,
    };

    const tool = actionMap[action];

    if (!tool) {
      return ResponseFormatter.error(
        "Invalid action",
        `Action "${action}" is not supported for MySQL database`
      );
    }

    // Call the corresponding tool handler with the provided params
    try {
      return await tool.handler(params);
    } catch (error) {
      return ResponseFormatter.error(
        `Failed to execute MySQL action "${action}"`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  },
});
