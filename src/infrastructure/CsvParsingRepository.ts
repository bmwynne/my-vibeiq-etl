import { parse } from "csv-parse/sync";
import { CsvParsingRepository } from "../domain/repositories/Repositories.js";
import { CsvRow } from "../domain/models/Item.js";

/**
 * Professional CSV parsing implementation using csv-parse library
 * Provides robust parsing with proper error handling and validation
 */
export class CsvParsingRepositoryImpl implements CsvParsingRepository {
	parseCsvContent(csvContent: string): Promise<CsvRow[]> {
		try {
			// Parse CSV with headers, automatic type detection, and error handling
			const records = parse(csvContent, {
				columns: true, // Use first line as column headers
				skip_empty_lines: true,
				trim: true,
				cast: false, // Keep all values as strings for now
				relax_column_count: false, // Strict column count validation
				relax_quotes: true, // Allow flexible quote handling
			});

			// Validate that we have data
			if (records.length === 0) {
				return Promise.reject(
					new Error("CSV parsing failed: CSV contains no data rows"),
				);
			}

			// Validate required columns exist
			const requiredColumns = ["familyFederatedId", "title", "details"];
			const firstRecord = records[0];
			const availableColumns = Object.keys(firstRecord);

			const missingColumns = requiredColumns.filter(
				(col) => !availableColumns.includes(col),
			);
			if (missingColumns.length > 0) {
				return Promise.reject(
					new Error(
						`CSV parsing failed: CSV missing required columns: ${missingColumns.join(", ")}`,
					),
				);
			}

			// Transform records to domain objects
			const csvRows: CsvRow[] = records.map((record, index) => {
				// Type assertion for parsed CSV records
				const typedRecord = record as Record<string, string>;

				// Validate required fields are not empty
				if (!typedRecord.familyFederatedId.trim()) {
					throw new Error(
						`Row ${String(index + 2)}: familyFederatedId is required`,
					);
				}
				if (!typedRecord.title.trim()) {
					throw new Error(`Row ${String(index + 2)}: title is required`);
				}
				if (!typedRecord.details.trim()) {
					throw new Error(`Row ${String(index + 2)}: details is required`);
				}

				return {
					familyFederatedId: typedRecord.familyFederatedId.trim(),
					optionFederatedId: typedRecord.optionFederatedId
						? typedRecord.optionFederatedId.trim() || undefined
						: undefined,
					title: typedRecord.title.trim(),
					details: typedRecord.details.trim(),
				};
			});

			return Promise.resolve(csvRows);
		} catch (error) {
			// Wrap CSV parsing errors with more context
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return Promise.reject(new Error(`CSV parsing failed: ${errorMessage}`));
		}
	}
}
