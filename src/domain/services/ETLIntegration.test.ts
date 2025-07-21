import { describe, expect, it } from "vitest";
import { readFile } from "fs/promises";
import { join } from "path";
import { CsvParsingRepositoryImpl } from "../../infrastructure/CsvParsingRepository.js";
import { ItemTransformationService } from "./ItemTransformationService.js";
import { CreateItemRequest } from "../models/Item.js";

describe("ETL Integration Test with Real CSV File", () => {
	const csvParsingRepository = new CsvParsingRepositoryImpl();
	const transformationService = new ItemTransformationService();

	it("should process nike-products.csv file end-to-end", async () => {
		// Read the actual CSV file from test-data directory
		const csvFilePath = join(process.cwd(), "test-data", "nike-products.csv");
		const csvContent = await readFile(csvFilePath, "utf-8");

		// Step 1: Parse CSV
		const csvRows = await csvParsingRepository.parseCsvContent(csvContent);

		// Verify we got the expected number of rows
		expect(csvRows).toHaveLength(17); // 6 families + 11 options

		// Step 2: Transform to items
		const transformedItems =
			transformationService.transformCsvRowsToItems(csvRows);
		expect(transformedItems).toHaveLength(17);

		// Step 3: Ensure family items exist (should not create additional families since all are present)
		const itemsWithFamilies = transformationService.ensureFamilyItemsExist(
			transformedItems,
			csvRows,
		);
		expect(itemsWithFamilies).toHaveLength(17); // No additional families needed

		// Verify family items
		const familyItems = itemsWithFamilies.filter((item: CreateItemRequest) =>
			item.roles.includes("family"),
		);
		const optionItems = itemsWithFamilies.filter((item: CreateItemRequest) =>
			item.roles.includes("option"),
		);

		expect(familyItems).toHaveLength(6); // Nike Air Max, Air Jordan, Nike Dunk, Nike Blazer, Nike React, Nike Pegasus
		expect(optionItems).toHaveLength(11); // Various specific models

		// Verify specific family products
		const airMaxFamily = familyItems.find(
			(item) => item.federatedId === "nike-air-max",
		);
		expect(airMaxFamily).toBeDefined();
		expect(airMaxFamily?.name).toBe("Nike Air Max");
		expect(airMaxFamily?.description).toBe(
			"Classic athletic footwear line with visible air cushioning technology",
		);

		const jordanFamily = familyItems.find(
			(item) => item.federatedId === "nike-jordan",
		);
		expect(jordanFamily).toBeDefined();
		expect(jordanFamily?.name).toBe("Air Jordan");
		expect(jordanFamily?.description).toBe(
			"Premium basketball shoe collection designed by Michael Jordan",
		);

		// Verify specific option products
		const airMax90 = optionItems.find(
			(item) => item.federatedId === "air-max-90",
		);
		expect(airMax90).toBeDefined();
		expect(airMax90?.name).toBe("Nike Air Max 90");
		expect(airMax90?.roles).toEqual(["option"]);

		const jordan1 = optionItems.find(
			(item) => item.federatedId === "jordan-1-retro",
		);
		expect(jordan1).toBeDefined();
		expect(jordan1?.name).toBe("Air Jordan 1 Retro High");
		expect(jordan1?.roles).toEqual(["option"]);

		// Verify all Air Max variants belong to the nike-air-max family
		const airMaxVariants = csvRows.filter(
			(row) =>
				row.familyFederatedId === "nike-air-max" && row.optionFederatedId,
		);
		expect(airMaxVariants).toHaveLength(3); // Air Max 90, 270, 97

		// Verify all Jordan variants belong to the nike-jordan family
		const jordanVariants = csvRows.filter(
			(row) => row.familyFederatedId === "nike-jordan" && row.optionFederatedId,
		);
		expect(jordanVariants).toHaveLength(3); // Jordan 1, 4, 11

		// Verify transformation maintains data integrity
		transformedItems.forEach((item) => {
			expect(item.name).toBeTruthy();
			expect(item.description).toBeTruthy();
			expect(item.federatedId).toBeTruthy();
			expect(item.roles).toHaveLength(1);
			expect(["family", "option"].includes(item.roles[0])).toBe(true);
		});
	});

	it("should handle missing family scenario", async () => {
		// Create test data where an option references a family that doesn't exist as a separate row
		const csvContentWithMissingFamily = `familyFederatedId,optionFederatedId,title,details
nike-air-force,,Nike Air Force 1,Classic basketball shoe turned lifestyle sneaker
nike-missing-family,missing-option-1,Missing Family Option 1,This option's family doesn't exist as a separate row
nike-missing-family,missing-option-2,Missing Family Option 2,Another option without explicit family row`;

		// Parse and transform
		const csvRows = await csvParsingRepository.parseCsvContent(
			csvContentWithMissingFamily,
		);
		const transformedItems =
			transformationService.transformCsvRowsToItems(csvRows);
		const itemsWithFamilies = transformationService.ensureFamilyItemsExist(
			transformedItems,
			csvRows,
		);

		// Should have original 3 items + 1 auto-generated family = 4 total
		expect(itemsWithFamilies).toHaveLength(4);

		// Verify auto-generated family was created
		const familyItems = itemsWithFamilies.filter((item) =>
			item.roles.includes("family"),
		);
		expect(familyItems).toHaveLength(2); // nike-air-force + auto-generated nike-missing-family

		const autoGeneratedFamily = familyItems.find(
			(item) => item.federatedId === "nike-missing-family",
		);
		expect(autoGeneratedFamily).toBeDefined();
		expect(autoGeneratedFamily?.name).toBe("Family nike-missing-family");
		expect(autoGeneratedFamily?.description).toBe(
			"Auto-generated family for nike-missing-family",
		);
		expect(autoGeneratedFamily?.roles).toEqual(["family"]);
	});

	it("should validate CSV structure and provide meaningful errors", async () => {
		// Test invalid CSV structure
		const invalidCsv = `title,details
Nike Shoe,Great shoe`; // Missing required familyFederatedId column

		await expect(
			csvParsingRepository.parseCsvContent(invalidCsv),
		).rejects.toThrow("CSV missing required columns: familyFederatedId");

		// Test empty CSV
		const emptyCsv = `familyFederatedId,title,details`;
		await expect(
			csvParsingRepository.parseCsvContent(emptyCsv),
		).rejects.toThrow("CSV contains no data rows");

		// Test CSV with missing required field values
		const csvWithEmptyFields = `familyFederatedId,optionFederatedId,title,details
nike-test,,Nike Test,
nike-test,test-option,,Good description`;

		await expect(
			csvParsingRepository.parseCsvContent(csvWithEmptyFields),
		).rejects.toThrow("Row 2: details is required");
	});
});
