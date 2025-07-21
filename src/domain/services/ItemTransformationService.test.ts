import { describe, expect, it } from "vitest";
import { ItemTransformationService } from "./ItemTransformationService.js";
import { CsvRow, CreateItemRequest } from "../models/Item.js";

describe("ItemTransformationService", () => {
	const transformationService = new ItemTransformationService();

	describe("transformCsvRowToItem", () => {
		it("should transform family row correctly", () => {
			const csvRow: CsvRow = {
				familyFederatedId: "family123",
				title: "Test Product",
				details: "A test product description",
			};

			const result = transformationService.transformCsvRowToItem(csvRow);

			expect(result).toEqual({
				name: "Test Product",
				description: "A test product description",
				federatedId: "family123",
				roles: ["family"],
			});
		});

		it("should transform option row correctly", () => {
			const csvRow: CsvRow = {
				familyFederatedId: "family123",
				optionFederatedId: "option456",
				title: "Test Variant",
				details: "A test variant description",
			};

			const result = transformationService.transformCsvRowToItem(csvRow);

			expect(result).toEqual({
				name: "Test Variant",
				description: "A test variant description",
				federatedId: "option456",
				roles: ["option"],
			});
		});
	});

	describe("ensureFamilyItemsExist", () => {
		it("should create missing family items for options", () => {
			const csvRows: CsvRow[] = [
				{
					familyFederatedId: "family123",
					optionFederatedId: "option456",
					title: "Variant A",
					details: "Description A",
				},
				{
					familyFederatedId: "family789", // This family doesn't exist as a separate row
					optionFederatedId: "option999",
					title: "Variant B",
					details: "Description B",
				},
			];

			const transformedItems =
				transformationService.transformCsvRowsToItems(csvRows);
			const result = transformationService.ensureFamilyItemsExist(
				transformedItems,
				csvRows,
			);

			expect(result).toHaveLength(4); // 2 options + 2 auto-generated families

			const familyItems = result.filter((item: CreateItemRequest) =>
				item.roles.includes("family"),
			);
			expect(familyItems).toHaveLength(2);

			const family123 = familyItems.find(
				(item: CreateItemRequest) => item.federatedId === "family123",
			);
			expect(family123).toBeDefined();
			expect(family123?.name).toBe("Family family123");

			const family789 = familyItems.find(
				(item: CreateItemRequest) => item.federatedId === "family789",
			);
			expect(family789).toBeDefined();
			expect(family789?.name).toBe("Family family789");
		});

		it("should not create duplicate family items if they already exist in CSV", () => {
			const csvRows: CsvRow[] = [
				{
					familyFederatedId: "family123",
					title: "Family Product",
					details: "Family description",
				},
				{
					familyFederatedId: "family123",
					optionFederatedId: "option456",
					title: "Variant A",
					details: "Variant description",
				},
			];

			const transformedItems =
				transformationService.transformCsvRowsToItems(csvRows);
			const result = transformationService.ensureFamilyItemsExist(
				transformedItems,
				csvRows,
			);

			expect(result).toHaveLength(2); // 1 family + 1 option, no duplicates

			const familyItems = result.filter((item: CreateItemRequest) =>
				item.roles.includes("family"),
			);
			expect(familyItems).toHaveLength(1);
			expect(familyItems[0].name).toBe("Family Product"); // Original name, not auto-generated
		});
	});
});
