import { describe, it, expect, vi } from "vitest";
import { main } from "./handlers/handler.js";
import {
	createMockAPIGatewayEvent,
	createMockLambdaContext,
} from "./test-utils.js";

// Mock the batches handler
vi.mock("./routes/batches.js", () => ({
	handleBatches: vi.fn(() =>
		Promise.resolve({
			statusCode: 201,
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				batchId: "batch_1735689600000",
				status: "pending",
				message: "Batch upload initiated successfully",
			}),
		}),
	),
}));

describe("Batch Test", () => {
	it("should create a batch when posting CSV data", async () => {
		const csvData =
			"familyFederatedId,title,details\nnike-air-max,Nike Air Max,Classic sneaker";
		const event = createMockAPIGatewayEvent({
			method: "POST",
			rawPath: "/batches",
			body: csvData,
			headers: { "content-type": "text/csv" },
		});
		const context = createMockLambdaContext();

		const result = await main(event, context);

		expect(result.statusCode).toBe(201);
		const body = JSON.parse(result.body);
		expect(body.batchId).toBeDefined();
		expect(body.status).toBe("pending");
	});
});
