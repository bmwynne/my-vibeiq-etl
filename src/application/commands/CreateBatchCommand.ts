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
