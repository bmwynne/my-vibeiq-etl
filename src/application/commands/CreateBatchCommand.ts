import {
	CreateBatchRequest,
	BatchProcessingResult,
} from "../../domain/models/Batch.js";
import { BatchProcessingService } from "../../domain/services/BatchProcessingService.js";

/**
 * Command for creating a new batch processing job
 * This is the application layer use case that orchestrates the domain business logic
 */
export class CreateBatchCommand {
	constructor(
		private readonly batchProcessingService: BatchProcessingService,
	) {}

	/**
	 * Execute the create batch command
	 *
	 * Step 1: Ingestion Lambda Flow (current implementation):
	 * 1. Parse and validate CSV content
	 * 2. Transform rows to CreateItemRequest objects
	 * 3. Split into processing batches (100 items each)
	 * 4. Create initial batch record in DynamoDB
	 * 5. TODO: Publish batches to SQS for async processing
	 * 6. Return batch ID and initial status to client
	 *
	 * Step 2: Processing via SQS (future implementation):
	 * - SQS triggers ProcessBatchCommand for each batch
	 * - ProcessBatchCommand calls Item Service API
	 * - Updates final batch status in DynamoDB
	 */
	async execute(request: CreateBatchRequest): Promise<BatchProcessingResult> {
		console.log(
			"INFO: Executing CreateBatchCommand with CSV length:",
			request.csvContent.length,
		);

		try {
			// Delegate to domain service for business logic
			const result = await this.batchProcessingService.processBatch(request);

			console.log("INFO: Batch created successfully:", result.batchId);
			return result;
		} catch (error) {
			console.error("ERROR: Failed to create batch:", error);
			throw error;
		}
	}
}
