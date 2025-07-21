import { Batch } from "../../domain/models/Batch.js";
import { BatchRepository } from "../../domain/repositories/Repositories.js";
import { NotFoundError } from "../../domain/common/Errors.js";

/**
 * Query for retrieving batch information
 * This is the application layer use case for read operations
 */
export class GetBatchQuery {
	constructor(private readonly batchRepository: BatchRepository) {}

	/**
	 * Execute the get batch query
	 */
	async execute(batchId: string): Promise<Batch> {
		console.log("INFO: Executing GetBatchQuery for batch:", batchId);

		try {
			const batch = await this.batchRepository.getBatchById(batchId);

			if (!batch) {
				console.log("INFO: Batch not found:", batchId);
				throw new NotFoundError("Batch", batchId);
			}

			console.log("INFO: Batch found:", batchId);
			return batch;
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error; // Re-throw domain errors as-is
			}

			console.error("ERROR: Failed to get batch:", error);
			throw error;
		}
	}
}
