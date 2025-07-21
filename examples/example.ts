import { CsvParsingRepositoryImpl } from "../src/infrastructure/CsvParsingRepository.js";
import { ItemTransformationService } from "../src/domain/services/ItemTransformationService.js";

/**
 * Demonstrating how to use the ETL core functionality
 * This shows the basic workflow without AWS infrastructure
 */
export async function exampleETLWorkflow() {
	// Sample CSV data
	const csvContent = `familyFederatedId,optionFederatedId,title,details
nike-air-max,,Nike Air Max,Classic athletic footwear line with visible air cushioning
nike-air-max,air-max-90,Nike Air Max 90,Iconic running shoe with waffle outsole and Max Air unit
nike-air-max,air-max-270,Nike Air Max 270,Lifestyle shoe with largest heel Air unit in Nike history
nike-jordan,,Air Jordan,Premium basketball shoe collection designed by Michael Jordan
nike-jordan,jordan-1-retro,Air Jordan 1 Retro High,Classic high-top basketball shoe in original colorways
nike-dunk,,Nike Dunk,Versatile basketball shoe that became a streetwear staple
nike-dunk,dunk-low-panda,Nike Dunk Low Panda,Popular black and white colorway of the classic Dunk silhouette`;

	// Initialize services
	const csvParsingRepository = new CsvParsingRepositoryImpl();
	const transformationService = new ItemTransformationService();

	try {
		console.log("Parsing CSV content...");

		// Step 1: Parse CSV
		const csvRows = await csvParsingRepository.parseCsvContent(csvContent);
		console.log(`INFO: Parsed ${String(csvRows.length)} CSV rows`);

		// Step 2: Transform to items
		const transformedItems =
			transformationService.transformCsvRowsToItems(csvRows);
		console.log(`INFO:Transformed ${String(transformedItems.length)} items`);

		// Step 3: Ensure family items exist
		const itemsWithFamilies = transformationService.ensureFamilyItemsExist(
			transformedItems,
			csvRows,
		);
		console.log(
			`INFO: Final item count: ${String(itemsWithFamilies.length)} (including auto-generated families)`,
		);

		// Display results
		console.log("INFO: Transformation Results:");
		itemsWithFamilies.forEach((item, index) => {
			console.log(
				`${String(index + 1)}. ${item.name} (${item.roles.join(", ")}) - ID: ${item.federatedId}`,
			);
		});

		return itemsWithFamilies;
	} catch (error) {
		console.error("ERROR: ETL workflow failed:", error);
		throw error;
	}
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	exampleETLWorkflow()
		.then(() => {
			console.log("\n INFO: Example completed successfully!");
		})
		.catch((error: unknown) => {
			console.error("\nERROR: Example failed:", error);
			process.exit(1);
		});
}
