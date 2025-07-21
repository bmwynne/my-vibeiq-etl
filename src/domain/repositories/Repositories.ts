import { CsvRow } from "../models/Item.js";

/**
 * Repository interface for CSV parsing operations
 * Follows dependency inversion principle by defining contracts
 */
export interface CsvParsingRepository {
	/**
	 * Parses CSV content into structured data
	 * @param csvContent Raw CSV string content
	 * @returns Promise resolving to array of parsed CSV rows
	 * @throws Error if CSV format is invalid
	 */
	parseCsvContent(csvContent: string): Promise<CsvRow[]>;
}

/**
 * Repository interface for Item Service API operations
 * Abstracts external API calls for better testability
 */
export interface ItemServiceRepository {
	/**
	 * Looks up existing items by their federated IDs
	 * @param federatedIds Array of federated IDs to look up
	 * @returns Promise resolving to map of federatedId -> internal system ID
	 */
	lookupItemsByFederatedIds(
		federatedIds: string[],
	): Promise<Map<string, string>>;

	/**
	 * Creates new items in batches (up to 100 per API limit)
	 * @param items Array of items to create
	 * @returns Promise resolving to array of created item IDs
	 * @throws Error if batch size exceeds limit or API call fails
	 */
	createItemsBatch(
		items: import("../models/Item.js").CreateItemRequest[],
	): Promise<string[]>;

	/**
	 * Updates existing items in batches (up to 100 per API limit)
	 * @param items Array of items to update with their IDs
	 * @returns Promise resolving to array of updated item IDs
	 * @throws Error if batch size exceeds limit or API call fails
	 */
	updateItemsBatch(
		items: (import("../models/Item.js").CreateItemRequest & { id: string })[],
	): Promise<string[]>;
}

/**
 * Repository interface for batch status persistence
 * Enables tracking and reporting of batch processing status
 */
export interface BatchRepository {
	/**
	 * Saves batch processing status and results
	 * @param batch Batch data to persist
	 * @returns Promise resolving to saved batch
	 */
	saveBatch(
		batch: import("../models/Batch.js").Batch,
	): Promise<import("../models/Batch.js").Batch>;

	/**
	 * Retrieves batch by ID
	 * @param batchId Unique batch identifier
	 * @returns Promise resolving to batch data or null if not found
	 */
	getBatchById(
		batchId: string,
	): Promise<import("../models/Batch.js").Batch | null>;

	/**
	 * Updates batch status and processing results
	 * @param batchId Unique batch identifier
	 * @param updates Partial batch data to update
	 * @returns Promise resolving to updated batch
	 */
	updateBatch(
		batchId: string,
		updates: Partial<import("../models/Batch.js").Batch>,
	): Promise<import("../models/Batch.js").Batch>;
}
