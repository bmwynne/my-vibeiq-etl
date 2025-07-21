import { CreateItemRequest } from "../models/Item.js";
import {
	Batch,
	BatchStatus,
	BatchError,
	CreateBatchRequest,
	BatchProcessingResult,
} from "../models/Batch.js";
import {
	CsvParsingRepository,
	ItemServiceRepository,
	BatchRepository,
} from "../repositories/Repositories.js";
import { ItemTransformationService } from "./ItemTransformationService.js";

/**
 * Application service orchestrating the ETL batch processing workflow
 */
export class BatchProcessingService {
	private static readonly MAX_BATCH_SIZE = 100; // Limited by external API

	constructor(
		private readonly csvParsingRepository: CsvParsingRepository,
		private readonly itemServiceRepository: ItemServiceRepository,
		private readonly batchRepository: BatchRepository,
		private readonly transformationService: ItemTransformationService,
	) {}

	/**
	 * Processes a CSV batch upload end-to-end
	 */
	async processBatch(
		request: CreateBatchRequest,
	): Promise<BatchProcessingResult> {
		const batchId = this.generateBatchId();

		try {
			// 1. Create initial batch record
			const initialBatch = await this.createInitialBatch(batchId);

			// 2. Parse CSV content
			const csvRows = await this.csvParsingRepository.parseCsvContent(
				request.csvContent,
			);

			// 3. Transform rows to items
			const transformedItems =
				this.transformationService.transformCsvRowsToItems(csvRows);
			const itemsWithFamilies =
				this.transformationService.ensureFamilyItemsExist(
					transformedItems,
					csvRows,
				);

			// 4. Update batch with total count
			await this.batchRepository.updateBatch(batchId, {
				totalItems: itemsWithFamilies.length,
				status: "processing" as BatchStatus,
			});

			// 5. Process items in batches
			const result = await this.processItemsInBatches(
				batchId,
				itemsWithFamilies,
			);

			return result;
		} catch (error) {
			// Handle processing failure
			await this.batchRepository.updateBatch(batchId, {
				status: "failed" as BatchStatus,
				errors: [
					{
						itemFederatedId: "batch",
						error: error instanceof Error ? error.message : String(error),
						timestamp: new Date(),
					},
				],
			});

			throw error;
		}
	}

	/**
	 * Retrieves batch status and results for reporting
	 */
	async getBatchStatus(batchId: string): Promise<Batch | null> {
		return this.batchRepository.getBatchById(batchId);
	}

	/**
	 * Processes items in batches according to API limits
	 */
	private async processItemsInBatches(
		batchId: string,
		items: CreateItemRequest[],
	): Promise<BatchProcessingResult> {
		let processedItems = 0;
		let failedItems = 0;
		const errors: BatchError[] = [];

		// Split into batches of MAX_BATCH_SIZE
		const batches = this.chunkArray(
			items,
			BatchProcessingService.MAX_BATCH_SIZE,
		);

		for (const batch of batches) {
			try {
				await this.processSingleBatch(batch);
				processedItems += batch.length;
			} catch (error) {
				failedItems += batch.length;
				// Log errors for each item in the failed batch
				batch.forEach((item) => {
					errors.push({
						itemFederatedId: item.federatedId,
						error: error instanceof Error ? error.message : String(error),
						timestamp: new Date(),
					});
				});
			}
		}

		// Determine final status
		const status: BatchStatus =
			failedItems === 0
				? "completed"
				: processedItems === 0
					? "failed"
					: "partial";

		// Update final batch status
		const finalBatch = await this.batchRepository.updateBatch(batchId, {
			status,
			processedItems,
			failedItems,
			errors,
			updatedAt: new Date(),
		});

		return {
			batchId,
			status: finalBatch.status,
			totalItems: finalBatch.totalItems,
			processedItems: finalBatch.processedItems,
			failedItems: finalBatch.failedItems,
			errors: finalBatch.errors,
		};
	}

	/**
	 * Processes a single batch of items (up to 100)
	 * Implements lookup-then-create-or-update logic from design
	 */
	private async processSingleBatch(items: CreateItemRequest[]): Promise<void> {
		if (items.length > BatchProcessingService.MAX_BATCH_SIZE) {
			throw new Error(
				`Batch size ${items.length} exceeds maximum of ${BatchProcessingService.MAX_BATCH_SIZE}`,
			);
		}

		// 1. Lookup existing items
		const federatedIds = items.map((item) => item.federatedId);
		const existingItems =
			await this.itemServiceRepository.lookupItemsByFederatedIds(federatedIds);

		// 2. Separate into create vs update batches
		const itemsToCreate: CreateItemRequest[] = [];
		const itemsToUpdate: Array<CreateItemRequest & { id: string }> = [];

		items.forEach((item) => {
			const existingId = existingItems.get(item.federatedId);
			if (existingId) {
				itemsToUpdate.push({ ...item, id: existingId });
			} else {
				itemsToCreate.push(item);
			}
		});

		// 3. Execute create and update operations
		const promises: Promise<string[]>[] = [];

		if (itemsToCreate.length > 0) {
			promises.push(this.itemServiceRepository.createItemsBatch(itemsToCreate));
		}

		if (itemsToUpdate.length > 0) {
			promises.push(this.itemServiceRepository.updateItemsBatch(itemsToUpdate));
		}

		// Wait for all operations to complete
		await Promise.all(promises);
	}

	private async createInitialBatch(batchId: string): Promise<Batch> {
		const now = new Date();
		const batch: Batch = {
			id: batchId,
			status: "pending",
			totalItems: 0,
			processedItems: 0,
			failedItems: 0,
			createdAt: now,
			updatedAt: now,
			errors: [],
		};

		return this.batchRepository.saveBatch(batch);
	}

	private generateBatchId(): string {
		return `batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
	}

	private chunkArray<T>(array: T[], chunkSize: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}
}
