import * as consolidatedTools from "./consolidated/index.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("ToolLoader");

/**
 * Filters tools based on DOKPLOY_ENABLED_TOOLS environment variable.
 * If DOKPLOY_ENABLED_TOOLS is not set or empty, returns all tools.
 * If set, returns only the tools whose names are in the comma-separated list.
 */
function getEnabledTools() {
  const allToolsArray = Object.values(consolidatedTools);
  const enabledToolsEnv = process.env.DOKPLOY_ENABLED_TOOLS;

  // If not set or empty, load all tools
  if (!enabledToolsEnv || enabledToolsEnv.trim() === "") {
    logger.info(`Loading all ${allToolsArray.length} available tools`);
    return allToolsArray;
  }

  // Parse the comma-separated list
  const enabledToolNames = enabledToolsEnv
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  logger.info(
    `Filtering tools based on DOKPLOY_ENABLED_TOOLS: ${enabledToolNames.join(", ")}`
  );

  // Filter tools by name
  const filteredTools = allToolsArray.filter((tool) =>
    enabledToolNames.includes(tool.name)
  );

  // Log which tools were loaded
  const loadedToolNames = filteredTools.map((tool) => tool.name);
  logger.info(`Loaded ${filteredTools.length} tools: ${loadedToolNames.join(", ")}`);

  // Warn about tools that were specified but not found
  const notFoundTools = enabledToolNames.filter(
    (name) => !loadedToolNames.includes(name)
  );
  if (notFoundTools.length > 0) {
    logger.warn(
      `The following tools were specified in DOKPLOY_ENABLED_TOOLS but not found: ${notFoundTools.join(", ")}`
    );
  }

  return filteredTools;
}

export const allTools = getEnabledTools();
