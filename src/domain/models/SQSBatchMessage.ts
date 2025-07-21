import { CreateItemRequest } from "./Item.js";

/**
 * SQS message structure for batch processing jobs
 * Contains all data needed for the processing lambda to handle a batch
 */
export interface SQSBatchMessage {
	/** SQS message identifier */
	readonly messageId: string;

	/** Batch identifier from the ingestion phase */
	readonly batchId: string;

	/** Array of transformed items ready for API integration */
	readonly items: readonly CreateItemRequest[];

	/** Number of previous processing attempts */
	readonly retryCount: number;

	/** Timestamp when message was created */
	readonly timestamp: Date;
}

/**
 * Request structure for SQS message publishing
 * Used when ingestion lambda publishes to SQS
 */
export interface PublishBatchRequest {
	readonly batchId: string;
	readonly items: readonly CreateItemRequest[];
	readonly priority?: "standard" | "high";
}

/**
 * SQS batch processing result
 * Returned after processing a batch via SQS
 */
export interface SQSBatchProcessingResult {
	readonly messageId: string;
	readonly batchId: string;
	readonly status: "success" | "failed" | "partial";
	readonly processedItems: number;
	readonly failedItems: number;
	readonly processingTimeMs: number;
	readonly errors: readonly string[];
}
