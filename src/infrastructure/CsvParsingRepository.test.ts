import { describe, expect, it } from "vitest";
import { CsvParsingRepositoryImpl } from "./CsvParsingRepository.js";

describe("CsvParsingRepositoryImpl", () => {
	const csvParsingRepository = new CsvParsingRepositoryImpl();

	describe("parseCsvContent", () => {
		it("should parse valid CSV with all columns", async () => {
			const csvContent = `familyFederatedId,optionFederatedId,title,details
family123,option456,Test Product,Product description
family789,,Family Product,Family description`;

			const result = await csvParsingRepository.parseCsvContent(csvContent);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				familyFederatedId: "family123",
				optionFederatedId: "option456",
				title: "Test Product",
				details: "Product description",
			});
			expect(result[1]).toEqual({
				familyFederatedId: "family789",
				optionFederatedId: undefined,
				title: "Family Product",
				details: "Family description",
			});
		});

		it("should parse CSV without optional optionFederatedId column", async () => {
			const csvContent = `familyFederatedId,title,details
family123,Test Product,Product description
family789,Family Product,Family description`;

			const result = await csvParsingRepository.parseCsvContent(csvContent);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				familyFederatedId: "family123",
				optionFederatedId: undefined,
				title: "Test Product",
				details: "Product description",
			});
			expect(result[1]).toEqual({
				familyFederatedId: "family789",
				optionFederatedId: undefined,
				title: "Family Product",
				details: "Family description",
			});
		});

		it("should handle CSV with quotes and commas in values", async () => {
			const csvContent = `familyFederatedId,title,details
family123,"Product, with comma","Description with ""quotes"" and details"`;

			const result = await csvParsingRepository.parseCsvContent(csvContent);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				familyFederatedId: "family123",
				optionFederatedId: undefined,
				title: "Product, with comma",
				details: 'Description with "quotes" and details',
			});
		});

		it("should trim whitespace from all fields", async () => {
			const csvContent = `familyFederatedId,title,details
  family123  ,  Test Product  ,  Product description  `;

			const result = await csvParsingRepository.parseCsvContent(csvContent);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				familyFederatedId: "family123",
				optionFederatedId: undefined,
				title: "Test Product",
				details: "Product description",
			});
		});

		it("should throw error for missing required columns", async () => {
			const csvContent = `familyFederatedId,title
family123,Test Product`;

			await expect(
				csvParsingRepository.parseCsvContent(csvContent),
			).rejects.toThrow("CSV missing required columns: details");
		});

		it("should throw error for empty required fields", async () => {
			const csvContent = `familyFederatedId,title,details
,Test Product,Product description`;

			await expect(
				csvParsingRepository.parseCsvContent(csvContent),
			).rejects.toThrow("Row 2: familyFederatedId is required");
		});

		it("should throw error for empty CSV content", async () => {
			const csvContent = `familyFederatedId,title,details`;

			await expect(
				csvParsingRepository.parseCsvContent(csvContent),
			).rejects.toThrow("CSV contains no data rows");
		});

		it("should throw error for malformed CSV", async () => {
			const csvContent = `familyFederatedId,title,details
family123,Test Product`; // Missing column

			await expect(
				csvParsingRepository.parseCsvContent(csvContent),
			).rejects.toThrow("CSV parsing failed");
		});

		it("should handle empty optionFederatedId values correctly", async () => {
			const csvContent = `familyFederatedId,optionFederatedId,title,details
family123,,Test Product,Product description
family789,option456,Test Variant,Variant description`;

			const result = await csvParsingRepository.parseCsvContent(csvContent);

			expect(result).toHaveLength(2);
			expect(result[0].optionFederatedId).toBeUndefined();
			expect(result[1].optionFederatedId).toBe("option456");
		});

		it("should skip empty lines", async () => {
			const csvContent = `familyFederatedId,title,details
family123,Test Product,Product description

family789,Family Product,Family description`;

			const result = await csvParsingRepository.parseCsvContent(csvContent);

			expect(result).toHaveLength(2);
			expect(result[0].familyFederatedId).toBe("family123");
			expect(result[1].familyFederatedId).toBe("family789");
		});
	});
});
