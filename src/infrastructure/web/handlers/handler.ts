import middy from "@middy/core";
import { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { router } from "../router.js";

/**
 * Main API Gateway Lambda handler
 * Uses Middy middleware for common concerns like error handling, cors, etc.
 */
export const main = middy(
	async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResult> => {
		try {
			return await router(event);
		} catch (error) {
			console.error("Unhandled error in API handler:", error);
			return {
				statusCode: 500,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					error: "Internal Server Error",
					message:
						error instanceof Error ? error.message : "Unknown error occurred",
				}),
			};
		}
	},
);
