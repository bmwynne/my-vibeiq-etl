import { CsvRow, CreateItemRequest, ItemRole } from "../models/Item.js";

/**
 * Domain service responsible for transforming CSV rows to Item creation requests
 * Follows the transformation rules outlined in the design document
 */
export class ItemTransformationService {
	/**
	 * Transforms a CSV row into a CreateItemRequest according to business rules:
	 * - Maps title → name
	 * - Maps details → description
	 * - Uses optionFederatedId if present, otherwise familyFederatedId
	 * - Sets roles to ["option"] if optionFederatedId present, otherwise ["family"]
	 */
	transformCsvRowToItem(csvRow: CsvRow): CreateItemRequest {
		const federatedId = csvRow.optionFederatedId ?? csvRow.familyFederatedId;
		const roles: ItemRole[] = csvRow.optionFederatedId
			? ["option"]
			: ["family"];

		return {
			name: csvRow.title,
			description: csvRow.details,
			federatedId,
			roles,
		};
	}

	/**
	 * Transforms multiple CSV rows into CreateItemRequests
	 */
	transformCsvRowsToItems(csvRows: CsvRow[]): CreateItemRequest[] {
		return csvRows.map((row) => this.transformCsvRowToItem(row));
	}

	/**
	 * Creates family items for options that don't have corresponding family rows
	 * This ensures referential integrity as per the design requirements
	 */
	ensureFamilyItemsExist(
		transformedItems: CreateItemRequest[],
		csvRows: CsvRow[],
	): CreateItemRequest[] {
		const familyFederatedIds = new Set(
			csvRows
				.filter((row) => !row.optionFederatedId)
				.map((row) => row.familyFederatedId),
		);

		const optionFamilyIds = new Set(
			csvRows
				.filter((row) => row.optionFederatedId)
				.map((row) => row.familyFederatedId),
		);

		const missingFamilyIds = [...optionFamilyIds].filter(
			(id) => !familyFederatedIds.has(id),
		);

		const missingFamilyItems: CreateItemRequest[] = missingFamilyIds.map(
			(federatedId) => ({
				name: `Family ${federatedId}`,
				description: `Auto-generated family for ${federatedId}`,
				federatedId,
				roles: ["family"] as ItemRole[],
			}),
		);

		return [...transformedItems, ...missingFamilyItems];
	}
}
