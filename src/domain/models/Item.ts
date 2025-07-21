/**
 * Domain model representing an Item in the target schema
 */
export interface Item {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly federatedId: string;
	readonly roles: ItemRole[];
}

export type ItemRole = "family" | "option";

/**
 * Value object for creating new items
 */
export interface CreateItemRequest {
	readonly name: string;
	readonly description: string;
	readonly federatedId: string;
	readonly roles: ItemRole[];
}

/**
 * Raw CSV row data before transformation
 */
export interface CsvRow {
	readonly familyFederatedId: string;
	readonly optionFederatedId?: string;
	readonly title: string;
	readonly details: string;
}
