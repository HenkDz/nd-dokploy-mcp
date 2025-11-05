import { z } from "zod";
import { ResponseFormatter } from "../../../utils/responseFormatter.js";
import { createTool } from "../toolFactory.js";
import { enforceProjectLock } from "../../../utils/projectLockEnforcer.js";

// Import all individual tool schemas for reuse
import { projectAll } from "../project/projectAll.js";
import { projectCreate } from "../project/projectCreate.js";
import { projectDuplicate } from "../project/projectDuplicate.js";
import { projectOne } from "../project/projectOne.js";
import { projectRemove } from "../project/projectRemove.js";
import { projectUpdate } from "../project/projectUpdate.js";

export const dokployProject = createTool({
  name: "dokploy_project",
  description:
    "Consolidated tool for managing Dokploy projects. Supports multiple actions: list, create, get, update, remove, duplicate.",
  schema: z.object({
    action: z
      .enum(["list", "create", "get", "update", "remove", "duplicate"])
      .describe(
        `The action to perform on projects. Required for all operations.\n\n` +
        `• list: List all projects (no parameters required)\n` +
        `• get: Get specific project details (requires: projectId)\n` +
        `• create: Create new project (requires: name)\n` +
        `• update: Update project config (requires: projectId)\n` +
        `• remove: Delete project (requires: projectId)\n` +
        `• duplicate: Duplicate existing project (requires: sourceProjectId, name)`
      ),
    params: z
      .record(z.any())
      .optional()
      .describe(
        `Parameters for the specified action.\n\n` +
        `COMMON PARAMETERS:\n` +
        `• projectId: The unique identifier of the project (required for get, update, remove, duplicate)\n` +
        `• name: Project name (required for create, duplicate)\n` +
        `• sourceProjectId: Source project to duplicate from (required for duplicate)\n\n` +
        `EXAMPLE USAGE:\n` +
        `List all projects: {"action": "list", "params": {}}\n` +
        `Get project: {"action": "get", "params": {"projectId": "proj-123"}}\n` +
        `Create project: {"action": "create", "params": {"name": "My Project"}}`
      ),
  }),
  annotations: {
    title: "Manage Dokploy Project",
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
      list: projectAll,
      create: projectCreate,
      get: projectOne,
      update: projectUpdate,
      remove: projectRemove,
      duplicate: projectDuplicate,
    };

    const tool = actionMap[action];
    if (!tool) {
      return ResponseFormatter.error(
        "Invalid action",
        `Action "${action}" is not supported for project management`
      );
    }

    // Call the corresponding tool handler with the provided params
    try {
      return await tool.handler(params);
    } catch (error) {
      return ResponseFormatter.error(
        `Failed to execute project action "${action}"`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  },
});
