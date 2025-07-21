import { describe, expect, it, vi, beforeEach } from "vitest";
import { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { main } from "./handler.js";
import * as routerModule from "../router.js";

// Mock the router module
vi.mock("../router.js", () => ({
	router: vi.fn(),
}));

describe("Lambda Handler", () => {
	const mockRouter = vi.mocked(routerModule.router);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockEvent = (
		method: string = "GET",
		rawPath: string = "/health",
	): APIGatewayProxyEventV2 => ({
		version: "2.0",
		routeKey: "$default",
		rawPath,
		rawQueryString: "",
		headers: {
			"content-type": "application/json",
		},
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
		body: undefined,
		isBase64Encoded: false,
	});

	const createMockContext = (): Context => ({
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
	});

	it("should delegate to router and return response", async () => {
		// Arrange
		const mockEvent = createMockEvent();
		const mockContext = createMockContext();
		const expectedResponse = {
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: "healthy" }),
		};
		mockRouter.mockResolvedValue(expectedResponse);

		// Act
		const result = await main(mockEvent, mockContext);

		// Assert
		expect(mockRouter).toHaveBeenCalledWith(mockEvent);
		expect(result).toEqual(expectedResponse);
	});

	it("should handle errors and return 500", async () => {
		// Arrange
		const mockEvent = createMockEvent();
		const mockContext = createMockContext();
		mockRouter.mockRejectedValue(new Error("Test error"));

		// Act
		const result = await main(mockEvent, mockContext);

		// Assert
		expect(result.statusCode).toBe(500);
		expect(result.headers).toEqual({ "Content-Type": "application/json" });
		const responseBody = JSON.parse(result.body);
		expect(responseBody.error).toBe("Internal Server Error");
	});
});
