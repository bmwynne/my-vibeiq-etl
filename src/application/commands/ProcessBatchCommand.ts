import { CreateItemRequest } from "../../domain/models/Item.js";
import { SQSBatchProcessingResult } from "../../domain/models/SQSBatchMessage.js";
import { BatchProcessingService } from "../../domain/services/BatchProcessingService.js";
import {
	ItemServiceRepository,
	BatchRepository,
} from "../../domain/repositories/Repositories.js";

/**
 * Request for processing a batch via SQS
 */
export interface ProcessBatchRequest {
	readonly batchId: string;
	readonly items: readonly CreateItemRequest[];
	readonly retryCount: number;
}

/**
 * Application command for processing individual batches
 * This is Step 2 of the ETL pipeline - triggered by SQS messages
 *
 * Responsibilities:
 * 1. Process batches of up to 100 items
 * 2. Call Item Service API (lookup, create, update)
 * 3. Update batch status in DynamoDB
 * 4. Handle errors and partial failures
 */
export class ProcessBatchCommand {
	constructor(
		private readonly itemServiceRepository: ItemServiceRepository,
		private readonly batchRepository: BatchRepository,
		private readonly batchProcessingService: BatchProcessingService,
	) {}

	/**
	 * Execute batch processing for items received via SQS
	 */
	async execute(
		request: ProcessBatchRequest,
	): Promise<SQSBatchProcessingResult> {
		const startTime = Date.now();

		console.log(
			`INFO: ProcessBatchCommand executing for batch ${request.batchId}`,
			`with ${request.items.length.toString()} items (retry ${request.retryCount.toString()})`,
		);

		try {
			// TODO: Implement actual processing logic:
			// 1. Validate items from SQS message
			// 2. Call BatchProcessingService.processSingleBatch()
			// 3. Update batch status in DynamoDB
			// 4. Handle partial failures appropriately

			// Mock implementation for demonstration
			const result = await this.mockProcessBatch(request);

			const processingTime = Date.now() - startTime;
			console.log(
				`INFO: Batch ${request.batchId} processed in ${processingTime.toString()}ms`,
				`- Success: ${result.processedItems.toString()}, Failed: ${result.failedItems.toString()}`,
			);

			return {
				...result,
				processingTimeMs: processingTime,
			};
		} catch (error) {
			const processingTime = Date.now() - startTime;
			console.error(
				`ERROR: ProcessBatchCommand failed for batch ${request.batchId}:`,
				error,
			);

			// TODO: Update batch status to failed in DynamoDB
			// TODO: Add error details for reporting

			return {
				messageId: "unknown", // TODO: Get from SQS context
				batchId: request.batchId,
				status: "failed",
				processedItems: 0,
				failedItems: request.items.length,
				processingTimeMs: processingTime,
				errors: [error instanceof Error ? error.message : String(error)],
			};
		}
	}

	/**
	 * Mock processing implementation - TODO: Replace with actual logic
	 */
	private async mockProcessBatch(
		request: ProcessBatchRequest,
	): Promise<Omit<SQSBatchProcessingResult, "processingTimeMs">> {
		// Simulate API calls and processing
		await new Promise((resolve) =>
			setTimeout(resolve, 50 + Math.random() * 100),
		);

		// Mock some failures for demonstration
		const failureRate = 0.1; // 10% failure rate
		const failedItems = Math.floor(request.items.length * failureRate);
		const processedItems = request.items.length - failedItems;

		return {
			messageId: "mock-message-id", // TODO: Get from actual SQS message
			batchId: request.batchId,
			status:
				failedItems === 0
					? "success"
					: processedItems === 0
						? "failed"
						: "partial",
			processedItems,
			failedItems,
			errors:
				failedItems > 0
					? [`Mock error: ${failedItems.toString()} items failed`]
					: [],
		};
	}

	// TODO: Implement these private methods for actual processing:
	// - validateItemsForProcessing()
	// - processItemsBatch()
	// - updateBatchStatus()
	// - handlePartialFailures()
	// - retryFailedItems()
}
