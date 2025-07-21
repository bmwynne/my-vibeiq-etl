import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { vi } from "vitest";

/**
 * Test utilities for creating mock AWS Lambda events and contexts
 * Provides consistent mock data across all tests
 */

export interface MockEventOptions {
	method?: string;
	rawPath?: string;
	body?: string;
	headers?: Record<string, string>;
	queryStringParameters?: Record<string, string>;
	rawQueryString?: string;
}

/**
 * Creates a mock API Gateway Proxy Event V2 for testing
 */
export function createMockAPIGatewayEvent(
	options: MockEventOptions = {},
): APIGatewayProxyEventV2 {
	const {
		method = "GET",
		rawPath = "/health",
		body,
		headers = { "content-type": "application/json" },
		queryStringParameters,
		rawQueryString = "",
	} = options;

	return {
		version: "2.0",
		routeKey: "$default",
		rawPath,
		rawQueryString,
		headers,
		requestContext: {
			accountId: "123456789",
			apiId: "test-api-id",
			domainName: "test.amazonaws.com",
			domainPrefix: "test",
			routeKey: "$default",
			http: {
				method,
				path: rawPath,
				protocol: "HTTP/1.1",
				sourceIp: "127.0.0.1",
				userAgent: "test-agent",
			},
			requestId: "test-request-id",
			stage: "test",
			time: "01/Jan/2025:00:00:00 +0000",
			timeEpoch: 1735689600,
		},
		queryStringParameters,
		body: body ?? undefined,
		isBase64Encoded: false,
	};
}

/**
 * Creates a mock Lambda context for testing
 */
export function createMockLambdaContext(
	overrides: Partial<Context> = {},
): Context {
	return {
		callbackWaitsForEmptyEventLoop: false,
		functionName: "test-function",
		functionVersion: "$LATEST",
		invokedFunctionArn:
			"arn:aws:lambda:us-east-1:123456789:function:test-function",
		memoryLimitInMB: "128",
		awsRequestId: "test-request-id",
		logGroupName: "/aws/lambda/test-function",
		logStreamName: "2025/01/01/[$LATEST]test-stream",
		getRemainingTimeInMillis: () => 30000,
		done: vi.fn(),
		fail: vi.fn(),
		succeed: vi.fn(),
		...overrides,
	};
}

/**
 * Common test data for CSV content - Nike products themed
 */
export const TEST_CSV_DATA = {
	VALID_CSV:
		"familyFederatedId,optionFederatedId,title,details\\nnike-air-max,air-max-270,Nike Air Max 270,Classic athletic footwear with Max Air cushioning\\nnike-apparel,,Nike Dri-FIT Shirt,Moisture-wicking performance apparel",
	EMPTY_CSV: "",
	SINGLE_ROW_CSV:
		"familyFederatedId,title,details\\nnike-revolution,,Nike Revolution 6,Comfortable everyday running shoe",
	MALFORMED_CSV: "familyFederatedId,title,details\\nnike-court-vision,,", // Missing required details field value
};

/**
 * Common test data for batch responses - Nike products themed
 */
export const TEST_BATCH_DATA = {
	PENDING_BATCH: {
		batchId: "batch_1735689600000",
		status: "pending",
		totalItems: 0,
		processedItems: 0,
		failedItems: 0,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		errors: [],
	},
	COMPLETED_BATCH: {
		batchId: "batch_1735689600001",
		status: "completed",
		totalItems: 150,
		processedItems: 150,
		failedItems: 0,
		createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
		updatedAt: new Date().toISOString(),
		errors: [],
	},
	FAILED_BATCH: {
		batchId: "batch_1735689600002",
		status: "failed",
		totalItems: 100,
		processedItems: 85,
		failedItems: 15,
		createdAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
		updatedAt: new Date().toISOString(),
		errors: [
			{
				itemId: "nike_air_max_270",
				message: "Missing required field: details for Nike Air Max 270",
				timestamp: new Date().toISOString(),
			},
			{
				itemId: "nike_dri_fit_shirt",
				message: "Invalid familyFederatedId format for Nike Dri-FIT Shirt",
				timestamp: new Date().toISOString(),
			},
		],
	},
};

/**
 * Common HTTP response expectations
 */
export const HTTP_RESPONSES = {
	HEALTH_CHECK: {
		statusCode: 200,
		headers: { "Content-Type": "application/json" },
		body: {
			status: "healthy",
			version: "1.0.0",
		},
	},
	NOT_FOUND: {
		statusCode: 404,
		headers: { "Content-Type": "application/json" },
		body: {
			error: "Not Found",
		},
	},
	BAD_REQUEST: {
		statusCode: 400,
		headers: { "Content-Type": "application/json" },
		body: {
			error: "Bad Request",
		},
	},
	INTERNAL_SERVER_ERROR: {
		statusCode: 500,
		headers: { "Content-Type": "application/json" },
		body: {
			error: "Internal Server Error",
		},
	},
};

/**
 * Creates a mock Zod validation error for testing validation scenarios
 */
export function createMockZodError(field: string, message: string) {
	return {
		issues: [
			{
				code: "custom",
				path: [field],
				message,
			},
		],
		name: "ZodError",
	};
}

/**
 * Helper to create consistent error response expectations
 */
export function parseErrorResponse(result: {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
}) {
	const responseBody = JSON.parse(result.body) as Record<string, unknown>;
	return {
		statusCode: result.statusCode,
		headers: result.headers,
		error: responseBody.error as string,
		message: responseBody.message as string,
		details: responseBody.details,
		responseBody,
	};
}

/**
 * Helper to create consistent success response expectations
 */
export function parseSuccessResponse(result: {
	statusCode: number;
	headers: Record<string, string>;
	body: string;
}) {
	const responseBody = JSON.parse(result.body) as Record<string, unknown>;
	return {
		statusCode: result.statusCode,
		headers: result.headers,
		responseBody,
	};
}
