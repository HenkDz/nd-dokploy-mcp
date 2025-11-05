import { z } from "zod";
import apiClient from "../../../utils/apiClient.js";
import { createTool } from "../toolFactory.js";
import { ResponseFormatter } from "../../../utils/responseFormatter.js";

export const applicationOne = createTool({
  name: "application-one", 
  description: "Gets detailed information about a specific application in Dokploy.\n\n" +
    "REQUIRED PARAMETERS:\n" +
    "• applicationId: The unique identifier of the application to retrieve\n\n" +
    "USAGE EXAMPLES:\n" +
    '• Get application: {"applicationId": "app-123"}\n' +
    '• Note: Use dokploy_application tool with {"action": "get", "params": {"applicationId": "app-123"}} for better functionality\n\n' +
    "RESPONSE: Returns comprehensive application details including status, configuration, and metadata.",
  schema: z.object({
    applicationId: z
      .string()
      .min(1, "applicationId is required and cannot be empty")
      .describe(
        "The unique ID of the application to retrieve. " +
        "This is typically a string like 'app-123', 'application-456', etc. " +
        "Find this ID in your Dokploy dashboard or by listing applications first."
      ),
  }),
  annotations: {
    title: "Get Application Details",
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: true,
  },
  handler: async (input) => {
    const application = await apiClient.get(
      `/application.one?applicationId=${input.applicationId}`
    );

    if (!application?.data) {
      return ResponseFormatter.error(
        "Failed to fetch application",
        `Application with ID "${input.applicationId}" not found`
      );
    }

    return ResponseFormatter.success(
      `Successfully fetched application "${input.applicationId}"`,
      application.data
    );
  },
});
