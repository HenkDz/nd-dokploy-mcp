import { ResponseFormatter, FormattedResponse } from "./responseFormatter.js";
import {
  validateProjectId,
  validateEnvironmentBelongsToProject,
  getEffectiveProjectId,
  getProjectLockManager,
} from "./projectLock.js";
import { createLogger } from "./logger.js";

const logger = createLogger("ProjectLockEnforcer");

/**
 * Enforces project lock restrictions on tool parameters.
 * This function should be called by consolidated tool handlers before executing actions.
 *
 * @param params - The parameters object from the tool call
 * @returns null if validation passes, or an error response object if validation fails
 */
export async function enforceProjectLock(
  params: Record<string, any>
): Promise<FormattedResponse | null> {
  const lockManager = getProjectLockManager();
  const config = lockManager.getConfig();

  // If project lock is not enabled, allow all operations
  if (!config.isEnabled || !config.lockedProjectId) {
    return null;
  }

  // Check if params contain a projectId that doesn't match the locked project
  if (params.projectId) {
    const projectIdError = validateProjectId(params.projectId);
    if (projectIdError) {
      logger.warn(
        `Project lock violation: Attempted to use projectId "${params.projectId}" when locked to "${config.lockedProjectId}"`
      );
      return ResponseFormatter.error("Project lock violation", projectIdError);
    }
  }

  // If params don't have a projectId but lock is enabled, inject it
  if (!params.projectId && config.lockedProjectId) {
    logger.debug(
      `Injecting locked projectId "${config.lockedProjectId}" into params`
    );
    params.projectId = config.lockedProjectId;
  }

  // Check if params contain an environmentId
  if (params.environmentId) {
    logger.debug(
      `Validating environmentId "${params.environmentId}" belongs to locked project "${config.lockedProjectId}"`
    );
    const envError = await validateEnvironmentBelongsToProject(
      params.environmentId
    );
    if (envError) {
      logger.warn(`Environment validation failed: ${envError}`);
      return ResponseFormatter.error("Environment validation failed", envError);
    }
  }

  // Check if params contain targetEnvironmentId (for move operations)
  if (params.targetEnvironmentId) {
    logger.debug(
      `Validating targetEnvironmentId "${params.targetEnvironmentId}" belongs to locked project "${config.lockedProjectId}"`
    );
    const envError = await validateEnvironmentBelongsToProject(
      params.targetEnvironmentId
    );
    if (envError) {
      logger.warn(`Target environment validation failed: ${envError}`);
      return ResponseFormatter.error(
        "Target environment validation failed",
        envError
      );
    }
  }

  return null; // All validations passed
}

/**
 * Gets the effective project ID, using the locked project if set
 */
export function getProjectIdForParams(projectId?: string): string | undefined {
  return getEffectiveProjectId(projectId);
}
