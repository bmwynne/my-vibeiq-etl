import { describe, expect, it, vi, beforeEach } from "vitest";
import { APIGatewayProxyEventV2 } from "aws-lambda";
import { router } from "./router.js";
import * as batchesModule from "./routes/batches.js";

// Mock the batches module
vi.mock("./routes/batches.js", () => ({
	handleBatches: vi.fn(),
}));

describe("Router", () => {
	const mockHandleBatches = vi.mocked(batchesModule.handleBatches);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockEvent = (
		method: string,
		rawPath: string,
		body?: string,
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
		body: body || undefined,
		isBase64Encoded: false,
	});

	it("should route POST /batches to handleBatches", async () => {
		// Arrange
		const mockEvent = createMockEvent(
			"POST",
			"/batches",
			'{"csvContent": "nike-data"}',
		);
		const expectedResponse = {
			statusCode: 201,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ batchId: "test-batch-id" }),
		};
		mockHandleBatches.mockResolvedValue(expectedResponse);

		// Act
		const result = await router(mockEvent);

		// Assert
		expect(mockHandleBatches).toHaveBeenCalledWith(mockEvent, {});
		expect(result).toEqual(expectedResponse);
	});

	it("should route GET /batches/{batchId} with params", async () => {
		// Arrange
		const mockEvent = createMockEvent("GET", "/batches/test-batch-123");
		const expectedResponse = {
			statusCode: 200,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ batchId: "test-batch-123" }),
		};
		mockHandleBatches.mockResolvedValue(expectedResponse);

		// Act
		const result = await router(mockEvent);

		// Assert
		expect(mockHandleBatches).toHaveBeenCalledWith(mockEvent, {
			batchId: "test-batch-123",
		});
		expect(result).toEqual(expectedResponse);
	});

	it("should handle GET /health", async () => {
		// Arrange
		const mockEvent = createMockEvent("GET", "/health");

		// Act
		const result = await router(mockEvent);

		// Assert
		expect(result.statusCode).toBe(200);
		const responseBody = JSON.parse(result.body);
		expect(responseBody.status).toBe("healthy");
	});

	it("should return 404 for unknown routes", async () => {
		// Arrange
		const mockEvent = createMockEvent("GET", "/unknown-route");

		// Act
		const result = await router(mockEvent);

		// Assert
		expect(result.statusCode).toBe(404);
		const responseBody = JSON.parse(result.body);
		expect(responseBody.error).toBe("Not Found");
	});
});
