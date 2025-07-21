import { parse } from "csv-parse/sync";
import { CsvParsingRepository } from "../domain/repositories/Repositories.js";
import { CsvRow } from "../domain/models/Item.js";

/**
 * Professional CSV parsing implementation using csv-parse library
 * Provides robust parsing with proper error handling and validation
 */
export class CsvParsingRepositoryImpl implements CsvParsingRepository {
	async parseCsvContent(csvContent: string): Promise<CsvRow[]> {
		try {
			// Parse CSV with headers, automatic type detection, and error handling
			const records = parse(csvContent, {
				columns: true, // Use first line as column headers
				skip_empty_lines: true,
				trim: true,
				cast: false, // Keep all values as strings for now
				relax_column_count: false, // Strict column count validation
				relax_quotes: true, // Allow flexible quote handling
			}) as Record<string, string>[];

			// Validate that we have data
			if (records.length === 0) {
				throw new Error("CSV contains no data rows");
			}

			// Validate required columns exist
			const requiredColumns = ["familyFederatedId", "title", "details"];
			const firstRecord = records[0];
			const availableColumns = Object.keys(firstRecord);

			const missingColumns = requiredColumns.filter(
				(col) => !availableColumns.includes(col),
			);
			if (missingColumns.length > 0) {
				throw new Error(
					`CSV missing required columns: ${missingColumns.join(", ")}`,
				);
			}

			// Transform records to domain objects
			const csvRows: CsvRow[] = records.map((record, index) => {
				// Validate required fields are not empty
				if (!record.familyFederatedId?.trim()) {
					throw new Error(`Row ${index + 2}: familyFederatedId is required`);
				}
				if (!record.title?.trim()) {
					throw new Error(`Row ${index + 2}: title is required`);
				}
				if (!record.details?.trim()) {
					throw new Error(`Row ${index + 2}: details is required`);
				}

				return {
					familyFederatedId: record.familyFederatedId.trim(),
					optionFederatedId: record.optionFederatedId?.trim() || undefined,
					title: record.title.trim(),
					details: record.details.trim(),
				};
			});

			return csvRows;
		} catch (error) {
			// Wrap CSV parsing errors with more context
			if (error instanceof Error) {
				throw new Error(`CSV parsing failed: ${error.message}`);
			}
			throw new Error(`CSV parsing failed: ${String(error)}`);
		}
	}
}
