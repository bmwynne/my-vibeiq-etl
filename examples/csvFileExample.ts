import { readFile } from "fs/promises";
import { join } from "path";
import { CsvParsingRepositoryImpl } from "../src/infrastructure/CsvParsingRepository.js";
import { ItemTransformationService } from "../src/domain/services/ItemTransformationService.js";
import { CreateItemRequest, CsvRow } from "../src/domain/models/Item.js";

/**
 * Demonstrating ETL processing with an external CSV file
 * This reads product data from test-data/nike-products.csv
 */
export async function processNikeProductsCsvFile() {
	// Initialize services
	const csvParsingRepository = new CsvParsingRepositoryImpl();
	const transformationService = new ItemTransformationService();

	try {
		console.log("INFO: Starting ETL process with external CSV file...\n");

		// Step 1: Read CSV file from disk
		const csvFilePath = join(process.cwd(), "test-data", "nike-products.csv");
		console.log(`INFO: Reading CSV file: ${csvFilePath}`);

		const csvContent = await readFile(csvFilePath, "utf-8");
		console.log(`INFO: File size: ${csvContent.length} characters\n`);

		// Step 2: Parse CSV content
		console.log("INFO: Parsing CSV content...");
		const csvRows = await csvParsingRepository.parseCsvContent(csvContent);
		console.log(`INFO: Successfully parsed ${csvRows.length} CSV rows\n`);

		// Step 3: Transform to items
		console.log("INFO: Transforming CSV rows to items...");
		const transformedItems =
			transformationService.transformCsvRowsToItems(csvRows);
		console.log(`INFO: Transformed ${transformedItems.length} items\n`);

		// Step 4: Ensure family integrity
		console.log("INFO: Ensuring family items exist...");
		const itemsWithFamilies = transformationService.ensureFamilyItemsExist(
			transformedItems,
			csvRows,
		);
		console.log(
			`INFO: Final item count: ${itemsWithFamilies.length} (including any auto-generated families)\n`,
		);

		// Step 5: Display results organized by family
		console.log("INFO: ETL TRANSFORMATION RESULTS:\n");
		console.log("=".repeat(50));

		// Group items by family for better display
		const familyItems = itemsWithFamilies.filter((item: CreateItemRequest) =>
			item.roles.includes("family"),
		);
		const optionItems = itemsWithFamilies.filter((item: CreateItemRequest) =>
			item.roles.includes("option"),
		);

		console.log(`\n PRODUCT FAMILIES (${familyItems.length}):`);
		console.log("-".repeat(30));
		familyItems.forEach((item: CreateItemRequest, index: number) => {
			console.log(`${index + 1}. ${item.name}`);
			console.log(`   ID: ${item.federatedId}`);
			console.log(`   Description: ${item.description}`);
			console.log("");
		});

		console.log(`\n PRODUCT VARIANTS/OPTIONS (${optionItems.length}):`);
		console.log("-".repeat(35));
		optionItems.forEach((item: CreateItemRequest, index: number) => {
			console.log(`${index + 1}. ${item.name}`);
			console.log(`   ID: ${item.federatedId}`);
			console.log(`   Description: ${item.description}`);
			console.log("");
		});

		// Step 6: Display family-option relationships
		console.log("\n FAMILY → OPTION RELATIONSHIPS:");
		console.log("-".repeat(40));

		const familyToOptionsMap = new Map<string, CreateItemRequest[]>();
		csvRows.forEach((row: CsvRow) => {
			if (row.optionFederatedId) {
				if (!familyToOptionsMap.has(row.familyFederatedId)) {
					familyToOptionsMap.set(row.familyFederatedId, []);
				}
				const option = optionItems.find(
					(opt: CreateItemRequest) => opt.federatedId === row.optionFederatedId,
				);
				if (option) {
					familyToOptionsMap.get(row.familyFederatedId)!.push(option);
				}
			}
		});

		familyToOptionsMap.forEach((options, familyId) => {
			const family = familyItems.find(
				(f: CreateItemRequest) => f.federatedId === familyId,
			);
			console.log(`INFO: ${family?.name || familyId}:`);
			options.forEach((option: CreateItemRequest) => {
				console.log(`   └── ${option.name} (${option.federatedId})`);
			});
			console.log("");
		});

		console.log("=".repeat(50));
		console.log("INFO: ETL processing completed successfully!");

		return itemsWithFamilies;
	} catch (error) {
		console.error("ERROR: ETL processing failed:", error);
		throw error;
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	processNikeProductsCsvFile()
		.then(() => console.log("\nINFO: Example completed successfully!"))
		.catch((error) => {
			console.error("\nERROR: Example failed:", error);
			process.exit(1);
		});
}
