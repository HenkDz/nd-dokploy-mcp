import { z } from "zod";
import { ResponseFormatter } from "../../../utils/responseFormatter.js";
import { createTool } from "../toolFactory.js";
import { enforceProjectLock } from "../../../utils/projectLockEnforcer.js";

// Import all individual application tool schemas for reuse
import { applicationCancelDeployment } from "../application/applicationCancelDeployment.js";
import { applicationCleanQueues } from "../application/applicationCleanQueues.js";
import { applicationCreate } from "../application/applicationCreate.js";
import { applicationDelete } from "../application/applicationDelete.js";
import { applicationDeploy } from "../application/applicationDeploy.js";
import { applicationDisconnectGitProvider } from "../application/applicationDisconnectGitProvider.js";
import { applicationMarkRunning } from "../application/applicationMarkRunning.js";
import { applicationMove } from "../application/applicationMove.js";
import { applicationOne } from "../application/applicationOne.js";
import { applicationReadAppMonitoring } from "../application/applicationReadAppMonitoring.js";
import { applicationReadTraefikConfig } from "../application/applicationReadTraefikConfig.js";
import { applicationRedeploy } from "../application/applicationRedeploy.js";
import { applicationRefreshToken } from "../application/applicationRefreshToken.js";
import { applicationReload } from "../application/applicationReload.js";
import { applicationSaveBitbucketProvider } from "../application/applicationSaveBitbucketProvider.js";
import { applicationSaveBuildType } from "../application/applicationSaveBuildType.js";
import { applicationSaveDockerProvider } from "../application/applicationSaveDockerProvider.js";
import { applicationSaveEnvironment } from "../application/applicationSaveEnvironment.js";
import { applicationSaveGitProvider } from "../application/applicationSaveGitProvider.js";
import { applicationSaveGiteaProvider } from "../application/applicationSaveGiteaProvider.js";
import { applicationSaveGithubProvider } from "../application/applicationSaveGithubProvider.js";
import { applicationSaveGitlabProvider } from "../application/applicationSaveGitlabProvider.js";
import { applicationStart } from "../application/applicationStart.js";
import { applicationStop } from "../application/applicationStop.js";
import { applicationUpdate } from "../application/applicationUpdate.js";
import { applicationUpdateTraefikConfig } from "../application/applicationUpdateTraefikConfig.js";

// Import all individual domain tool schemas for reuse
import { domainByApplicationId } from "../domain/domainByApplicationId.js";
import { domainByComposeId } from "../domain/domainByComposeId.js";
import { domainCanGenerateTraefikMeDomains } from "../domain/domainCanGenerateTraefikMeDomains.js";
import { domainCreate } from "../domain/domainCreate.js";
import { domainDelete } from "../domain/domainDelete.js";
import { domainGenerateDomain } from "../domain/domainGenerateDomain.js";
import { domainOne } from "../domain/domainOne.js";
import { domainUpdate } from "../domain/domainUpdate.js";
import { domainValidateDomain } from "../domain/domainValidateDomain.js";

export const dokployApplication = createTool({
  name: "dokploy_application",
  description:
    "Consolidated tool for managing Dokploy applications and domains. Supports multiple actions for applications: create, delete, deploy, start, stop, update, get, redeploy, reload, move, cancelDeployment, cleanQueues, disconnectGitProvider, markRunning, readAppMonitoring, readTraefikConfig, refreshToken, saveBitbucketProvider, saveBuildType, saveDockerProvider, saveEnvironment, saveGitProvider, saveGiteaProvider, saveGithubProvider, saveGitlabProvider, updateTraefikConfig. Supports domain actions: domainCreate, domainDelete, domainUpdate, domainGet, domainByApplicationId, domainByComposeId, domainGenerateDomain, domainCanGenerateTraefikMeDomains, domainValidate.",
  schema: z.object({
    action: z
      .enum([
        "create",
        "delete", 
        "deploy",
        "start",
        "stop",
        "update",
        "get",
        "redeploy",
        "reload",
        "move",
        "cancelDeployment",
        "cleanQueues",
        "disconnectGitProvider",
        "markRunning",
        "readAppMonitoring",
        "readTraefikConfig",
        "refreshToken",
        "saveBitbucketProvider",
        "saveBuildType",
        "saveDockerProvider",
        "saveEnvironment",
        "saveGitProvider",
        "saveGiteaProvider",
        "saveGithubProvider",
        "saveGitlabProvider",
        "updateTraefikConfig",
        "domainCreate",
        "domainDelete",
        "domainUpdate",
        "domainGet",
        "domainByApplicationId",
        "domainByComposeId",
        "domainGenerateDomain",
        "domainCanGenerateTraefikMeDomains",
        "domainValidate",
      ])
      .describe(
        `The action to perform. Required for all operations.\n\n` +
        `APPLICATION ACTIONS:\n` +
        `• create: Creates new application (requires: name, environmentId)\n` +
        `• get: Gets application details (requires: applicationId)\n` +
        `• update: Updates application config (requires: applicationId)\n` +
        `• delete: Deletes application (requires: applicationId)\n` +
        `• deploy: Deploys application (requires: applicationId)\n` +
        `• start/stop: Start/stop application (requires: applicationId)\n` +
        `• redeploy: Redeploys application (requires: applicationId)\n` +
        `• reload: Reloads application (requires: applicationId)\n` +
        `• move: Move to different environment (requires: applicationId, environmentId)\n` +
        `• cancelDeployment: Cancel ongoing deployment (requires: applicationId)\n` +
        `• cleanQueues: Clean deployment queues (requires: applicationId)\n` +
        `• refreshToken: Refresh access token (requires: applicationId)\n\n` +
        `DOMAIN ACTIONS:\n` +
        `• domainCreate: Create domain (requires: host, applicationId OR composeId)\n` +
        `• domainGet: Get domain details (requires: domainId)\n` +
        `• domainByApplicationId: List domains for app (requires: applicationId)\n` +
        `• domainByComposeId: List domains for compose (requires: composeId)`
      ),
    params: z
      .record(z.any())
      .optional()
      .describe(
        `Parameters for the specified action. Required for all actions except list-type operations.\n\n` +
        `COMMON REQUIRED PARAMETERS:\n` +
        `• applicationId: The unique identifier of the application (required for get, update, delete, deploy, start, stop, etc.)\n` +
        `• name: Application name (required for create)\n` +
        `• environmentId: Environment ID where app operates (required for create, move)\n` +
        `• host: Domain hostname (required for domainCreate)\n\n` +
        `EXAMPLE USAGE:\n` +
        `Get application: {"action": "get", "params": {"applicationId": "app-123"}}\n` +
        `Create app: {"action": "create", "params": {"name": "My App", "environmentId": "env-456"}}\n` +
        `Deploy app: {"action": "deploy", "params": {"applicationId": "app-123"}}`
      ),
  }),
  annotations: {
    title: "Manage Dokploy Application",
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
      create: applicationCreate,
      delete: applicationDelete,
      deploy: applicationDeploy,
      start: applicationStart,
      stop: applicationStop,
      update: applicationUpdate,
      get: applicationOne,
      redeploy: applicationRedeploy,
      reload: applicationReload,
      move: applicationMove,
      cancelDeployment: applicationCancelDeployment,
      cleanQueues: applicationCleanQueues,
      disconnectGitProvider: applicationDisconnectGitProvider,
      markRunning: applicationMarkRunning,
      readAppMonitoring: applicationReadAppMonitoring,
      readTraefikConfig: applicationReadTraefikConfig,
      refreshToken: applicationRefreshToken,
      saveBitbucketProvider: applicationSaveBitbucketProvider,
      saveBuildType: applicationSaveBuildType,
      saveDockerProvider: applicationSaveDockerProvider,
      saveEnvironment: applicationSaveEnvironment,
      saveGitProvider: applicationSaveGitProvider,
      saveGiteaProvider: applicationSaveGiteaProvider,
      saveGithubProvider: applicationSaveGithubProvider,
      saveGitlabProvider: applicationSaveGitlabProvider,
      updateTraefikConfig: applicationUpdateTraefikConfig,
      domainCreate: domainCreate,
      domainDelete: domainDelete,
      domainUpdate: domainUpdate,
      domainGet: domainOne,
      domainByApplicationId: domainByApplicationId,
      domainByComposeId: domainByComposeId,
      domainGenerateDomain: domainGenerateDomain,
      domainCanGenerateTraefikMeDomains: domainCanGenerateTraefikMeDomains,
      domainValidate: domainValidateDomain,
    };

    const tool = actionMap[action];
    if (!tool) {
      return ResponseFormatter.error(
        "Invalid action",
        `Action "${action}" is not supported`
      );
    }

    // Call the corresponding tool handler with the provided params
    try {
      return await tool.handler(params);
    } catch (error) {
      return ResponseFormatter.error(
        `Failed to execute action "${action}"`,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  },
});
