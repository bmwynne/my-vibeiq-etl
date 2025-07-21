import { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { z } from "zod";
import { CreateBatchCommand } from "../../../application/commands/CreateBatchCommand.js";
import { GetBatchQuery } from "../../../application/queries/GetBatchQuery.js";
import {
	CreateBatchRequest,
	Batch,
	BatchError,
} from "../../../domain/models/Batch.js";
import {
	DomainError,
	ValidationError,
	NotFoundError,
} from "../../../domain/common/Errors.js";

// Strong typing for request validation
const BatchUploadSchema = z.object({
	csvContent: z.string().min(1, "CSV content is required and cannot be empty"),
});

type BatchUploadRequest = z.infer<typeof BatchUploadSchema>;

// Strongly typed API response interfaces
interface ApiBatchResponse {
	readonly batchId: string;
	readonly status: string;
	readonly totalItems: number;
	readonly processedItems: number;
	readonly failedItems: number;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly errors: readonly ApiBatchError[];
}

interface ApiBatchError {
	readonly itemId: string;
	readonly message: string;
	readonly timestamp: string;
}

interface ApiErrorResponse {
	error: string;
	message: string;
	details?: unknown;
}

// HTTP Status Codes as constants for type safety
const HTTP_STATUS = {
	OK: 200,
	CREATED: 201,
	BAD_REQUEST: 400,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	INTERNAL_SERVER_ERROR: 500,
} as const;

type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// Standard HTTP response headers
const JSON_HEADERS = {
	"Content-Type": "application/json",
} as const;

function createErrorResponse(
	statusCode: HttpStatusCode,
	error: string,
	message: string,
	details?: unknown,
): APIGatewayProxyResult {
	const errorResponse: ApiErrorResponse = {
		error,
		message,
		...(details !== undefined && { details }),
	};

	return {
		statusCode,
		headers: JSON_HEADERS,
		body: JSON.stringify(errorResponse),
	};
}

function createSuccessResponse(
	statusCode: HttpStatusCode,
	data: unknown,
): APIGatewayProxyResult {
	return {
		statusCode,
		headers: JSON_HEADERS,
		body: JSON.stringify(data),
	};
}

// Type-safe domain to API mapping
function mapBatchToApiResponse(batch: Batch): ApiBatchResponse {
	return {
		batchId: batch.id,
		status: batch.status,
		totalItems: batch.totalItems,
		processedItems: batch.processedItems,
		failedItems: batch.failedItems,
		createdAt: batch.createdAt.toISOString(),
		updatedAt: batch.updatedAt.toISOString(),
		errors: batch.errors.map(mapBatchErrorToApiError),
	};
}

function mapBatchErrorToApiError(error: BatchError): ApiBatchError {
	return {
		itemId: error.itemFederatedId,
		message: error.error,
		timestamp: error.timestamp.toISOString(),
	};
}

// TODO: Initialize use cases with proper dependencies
// For now, using mock until infrastructure is ready
const createBatchCommand: CreateBatchCommand | null = null;
const getBatchQuery: GetBatchQuery | null = null;

/**
 * Infrastructure layer HTTP handler for batch operations
 */
export async function handleBatches(
	event: APIGatewayProxyEventV2,
	batchId?: string,
): Promise<APIGatewayProxyResult> {
	const method = event.requestContext.http.method;

	try {
		// POST /batches - Create new batch
		if (method === "POST") {
			return await handleCreateBatch(event);
		}

		// GET /batches/{batchId} - Get batch status
		if (method === "GET" && batchId) {
			return await handleGetBatchStatus(batchId);
		}

		return createErrorResponse(
			HTTP_STATUS.METHOD_NOT_ALLOWED,
			"Method Not Allowed",
			`${method} is not supported for this endpoint`,
		);
	} catch (error: unknown) {
		console.error("ERROR: Error in handleBatches:", error);
		return createErrorResponse(
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			"Internal Server Error",
			error instanceof Error ? error.message : "Unknown error occurred",
		);
	}
}

/**
 * Handle POST /batches - Delegates to CreateBatchCommand
 */
async function handleCreateBatch(
	event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
	try {
		// Parse and validate request body
		const body: unknown = event.body ? JSON.parse(event.body) : {};
		const validatedData: BatchUploadRequest = BatchUploadSchema.parse(body);

		console.log(
			"INFO: HTTP request to create batch with CSV content length:",
			validatedData.csvContent.length,
		);

		// Create domain request
		const createBatchRequest: CreateBatchRequest = {
			csvContent: validatedData.csvContent,
		};

		if (!createBatchCommand) {
			// TODO: Remove this mock once DI container is ready
			console.log(
				"INFO: Using mock response - application command not initialized",
			);
			const batchTimestamp = Date.now();
			return createSuccessResponse(HTTP_STATUS.CREATED, {
				batchId: `batch_${batchTimestamp.toString()}`,
				status: "pending",
				totalItems: 0,
				processedItems: 0,
				failedItems: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				errors: [],
			} as ApiBatchResponse);
		}

		// Delegate to application layer
		const batchResult = await createBatchCommand.execute(createBatchRequest);

		// Map domain result to API response
		const response = {
			batchId: batchResult.batchId,
			status: batchResult.status,
			totalItems: batchResult.totalItems,
			processedItems: batchResult.processedItems,
			failedItems: batchResult.failedItems,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			errors: batchResult.errors.map((error) => ({
				itemId: error.itemFederatedId,
				message: error.error,
				timestamp: error.timestamp.toISOString(),
			})),
		};

		return createSuccessResponse(HTTP_STATUS.CREATED, response);
	} catch (error: unknown) {
		// Handle validation errors from Zod
		if (error instanceof z.ZodError) {
			return createErrorResponse(
				HTTP_STATUS.BAD_REQUEST,
				"Bad Request",
				"Invalid request body",
				error.issues,
			);
		}

		// Handle JSON parsing errors
		if (error instanceof SyntaxError) {
			return createErrorResponse(
				HTTP_STATUS.BAD_REQUEST,
				"Bad Request",
				"Invalid JSON in request body",
			);
		}

		// Handle domain-specific errors
		if (error instanceof ValidationError) {
			return createErrorResponse(
				HTTP_STATUS.BAD_REQUEST,
				"Validation Error",
				error.message,
				error.details,
			);
		}

		if (error instanceof DomainError) {
			return createErrorResponse(
				HTTP_STATUS.BAD_REQUEST,
				"Domain Error",
				error.message,
				error.details,
			);
		}

		return createErrorResponse(
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			"Internal Server Error",
			"An unexpected error occurred",
		);
	}
}

/**
 * Handle GET /batches/{batchId} - Delegates to GetBatchQuery
 */
async function handleGetBatchStatus(
	batchId: string,
): Promise<APIGatewayProxyResult> {
	try {
		console.log("INFO: HTTP request to get batch status for:", batchId);

		if (!getBatchQuery) {
			// TODO: Remove this mock once DI container is ready
			console.log(
				"INFO: Using mock response - application query not initialized",
			);

			const mockBatch: Batch = {
				id: batchId,
				status: "completed",
				totalItems: 150,
				processedItems: 150,
				failedItems: 0,
				createdAt: new Date(Date.now() - 300000), // 5 minutes ago
				updatedAt: new Date(),
				errors: [],
			};

			const response = mapBatchToApiResponse(mockBatch);
			return createSuccessResponse(HTTP_STATUS.OK, response);
		}

		// Delegate to application layer
		const batch = await getBatchQuery.execute(batchId);
		const response = mapBatchToApiResponse(batch);
		return createSuccessResponse(HTTP_STATUS.OK, response);
	} catch (error: unknown) {
		// Handle domain-specific errors with clear error messages
		if (error instanceof NotFoundError) {
			return createErrorResponse(
				HTTP_STATUS.NOT_FOUND,
				"Not Found",
				error.message,
			);
		}

		if (error instanceof DomainError) {
			return createErrorResponse(
				HTTP_STATUS.BAD_REQUEST,
				"Domain Error",
				error.message,
				error.details,
			);
		}

		console.error("ERROR: Error getting batch status:", error);
		return createErrorResponse(
			HTTP_STATUS.INTERNAL_SERVER_ERROR,
			"Internal Server Error",
			error instanceof Error ? error.message : "Failed to get batch status",
		);
	}
}
