import apiClient from "./apiClient.js";
import { createLogger } from "./logger.js";

const logger = createLogger("ProjectLock");

export interface ProjectLockConfig {
  lockedProjectId: string | null;
  isEnabled: boolean;
}

class ProjectLockManager {
  private static instance: ProjectLockManager;
  private config: ProjectLockConfig | null = null;

  private constructor() {}

  static getInstance(): ProjectLockManager {
    if (!ProjectLockManager.instance) {
      ProjectLockManager.instance = new ProjectLockManager();
    }
    return ProjectLockManager.instance;
  }

  getConfig(): ProjectLockConfig {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  private loadConfig(): ProjectLockConfig {
    const lockedProjectId = process.env.DOKPLOY_LOCKED_PROJECT_ID || null;
    return {
      lockedProjectId,
      isEnabled: !!lockedProjectId,
    };
  }

  /**
   * Validates that the locked project exists by calling the Dokploy API
   * This should be called during server startup
   */
  async validateLockedProject(): Promise<void> {
    const config = this.getConfig();

    if (!config.isEnabled || !config.lockedProjectId) {
      logger.info("Project lock is not enabled");
      return;
    }

    try {
      logger.info(`Validating locked project: ${config.lockedProjectId}`);
      const response = await apiClient.get(
        `/project.one?projectId=${config.lockedProjectId}`
      );

      if (!response?.data) {
        throw new Error(
          `Project with ID "${config.lockedProjectId}" not found`
        );
      }

      logger.info(
        `Project lock validated successfully for project: ${response.data.name || config.lockedProjectId}`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `Failed to validate locked project "${config.lockedProjectId}": ${errorMessage}`
      );
      throw new Error(
        `Invalid DOKPLOY_LOCKED_PROJECT_ID: Project "${config.lockedProjectId}" does not exist or is not accessible. ${errorMessage}`
      );
    }
  }

  /**
   * Checks if an environmentId belongs to the locked project
   * Returns null if check passes, error message if it fails
   */
  async validateEnvironmentBelongsToProject(
    environmentId: string
  ): Promise<string | null> {
    const config = this.getConfig();

    if (!config.isEnabled || !config.lockedProjectId) {
      // No lock enabled, allow any environment
      return null;
    }

    try {
      // Get the project details to check environments
      const projectResponse = await apiClient.get(
        `/project.one?projectId=${config.lockedProjectId}`
      );

      if (!projectResponse?.data) {
        return `Locked project "${config.lockedProjectId}" not found`;
      }

      // Check if the environment belongs to this project
      // Note: The exact structure depends on Dokploy's API response
      // Assuming the project has an environments array
      const project = projectResponse.data;

      // If project has environments list, check if environmentId is in it
      if (project.environments && Array.isArray(project.environments)) {
        const environmentExists = project.environments.some(
          (env: any) =>
            env.id === environmentId || env.environmentId === environmentId
        );

        if (!environmentExists) {
          return `Access denied: Environment "${environmentId}" does not belong to locked project "${config.lockedProjectId}"`;
        }
      }
      // If we can't verify the environment list, we'll allow it but log a warning
      else {
        logger.warn(
          `Cannot verify environment ownership for project ${config.lockedProjectId}. Allowing operation.`
        );
      }

      return null; // Validation passed
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.error(
        `Failed to validate environment "${environmentId}": ${errorMessage}`
      );
      return `Failed to validate environment: ${errorMessage}`;
    }
  }

  /**
   * Validates that a projectId parameter matches the locked project
   * Returns null if check passes, error message if it fails
   */
  validateProjectId(projectId: string | undefined): string | null {
    const config = this.getConfig();

    if (!config.isEnabled || !config.lockedProjectId) {
      // No lock enabled, allow any project
      return null;
    }

    // If projectId is provided and doesn't match the locked project
    if (projectId && projectId !== config.lockedProjectId) {
      return `Access denied: This MCP instance is locked to project "${config.lockedProjectId}"`;
    }

    return null; // Validation passed
  }

  /**
   * Gets the locked project ID if one is set, otherwise returns the provided projectId
   */
  getEffectiveProjectId(projectId?: string): string | undefined {
    const config = this.getConfig();

    if (config.isEnabled && config.lockedProjectId) {
      return config.lockedProjectId;
    }

    return projectId;
  }
}

export function getProjectLockManager(): ProjectLockManager {
  return ProjectLockManager.getInstance();
}

export async function validateLockedProject(): Promise<void> {
  return getProjectLockManager().validateLockedProject();
}

export function validateProjectId(
  projectId: string | undefined
): string | null {
  return getProjectLockManager().validateProjectId(projectId);
}

export function getEffectiveProjectId(projectId?: string): string | undefined {
  return getProjectLockManager().getEffectiveProjectId(projectId);
}

export async function validateEnvironmentBelongsToProject(
  environmentId: string
): Promise<string | null> {
  return getProjectLockManager().validateEnvironmentBelongsToProject(
    environmentId
  );
}
