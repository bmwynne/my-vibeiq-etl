import { ItemRole } from "./Item.js";

/**
 * Domain model representing a batch processing job
 */
export interface Batch {
	/** UUID v4 identifier for the batch */
	readonly id: string;
	readonly status: BatchStatus;
	readonly totalItems: number;
	readonly processedItems: number;
	readonly failedItems: number;
	readonly createdAt: Date;
	readonly updatedAt: Date;
	readonly errors: BatchError[];
}

export type BatchStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed"
	| "partial";

/**
 * Error details for batch processing
 */
export interface BatchError {
	readonly itemFederatedId: string;
	readonly error: string;
	readonly timestamp: Date;
}

/**
 * Request to create a new batch
 */
export interface CreateBatchRequest {
	readonly csvContent: string;
}

/**
 * Batch processing result
 */
export interface BatchProcessingResult {
	/** UUID v4 identifier for the batch */
	readonly batchId: string;
	readonly status: BatchStatus;
	readonly totalItems: number;
	readonly processedItems: number;
	readonly failedItems: number;
	readonly errors: BatchError[];
}
