import { describe, expect, it, vi } from "vitest";
import { BatchProcessingService } from "./BatchProcessingService.js";
import { ItemTransformationService } from "./ItemTransformationService.js";
import {
	CsvParsingRepository,
	ItemServiceRepository,
	BatchRepository,
} from "../repositories/Repositories.js";
import { Batch, CreateBatchRequest } from "../models/Batch.js";

describe("BatchProcessingService", () => {
	// Mock repositories
	const mockCsvParsingRepository: CsvParsingRepository = {
		parseCsvContent: vi.fn(),
	};

	const mockItemServiceRepository: ItemServiceRepository = {
		lookupItemsByFederatedIds: vi.fn(),
		createItemsBatch: vi.fn(),
		updateItemsBatch: vi.fn(),
	};

	const mockBatchRepository: BatchRepository = {
		saveBatch: vi.fn(),
		getBatchById: vi.fn(),
		updateBatch: vi.fn(),
	};

	const transformationService = new ItemTransformationService();

	const batchProcessingService = new BatchProcessingService(
		mockCsvParsingRepository,
		mockItemServiceRepository,
		mockBatchRepository,
		transformationService,
	);

	describe("processBatch", () => {
		it("should process a simple CSV batch successfully", async () => {
			// Setup mocks
			const csvRows = [
				{
					familyFederatedId: "family123",
					title: "Test Product",
					details: "Test description",
				},
			];

			const initialBatch: Batch = {
				id: "test-batch-id",
				status: "pending",
				totalItems: 0,
				processedItems: 0,
				failedItems: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				errors: [],
			};

			const updatedBatch: Batch = {
				...initialBatch,
				status: "completed",
				totalItems: 1,
				processedItems: 1,
				failedItems: 0,
			};

			vi.mocked(mockCsvParsingRepository.parseCsvContent).mockResolvedValue(
				csvRows,
			);
			vi.mocked(mockBatchRepository.saveBatch).mockResolvedValue(initialBatch);
			vi.mocked(mockBatchRepository.updateBatch).mockResolvedValue(
				updatedBatch,
			);
			vi.mocked(
				mockItemServiceRepository.lookupItemsByFederatedIds,
			).mockResolvedValue(new Map());
			vi.mocked(mockItemServiceRepository.createItemsBatch).mockResolvedValue([
				"item-id-1",
			]);

			// Execute
			const request: CreateBatchRequest = {
				csvContent:
					"familyFederatedId,title,details\nfamily123,Test Product,Test description",
			};

			const result = await batchProcessingService.processBatch(request);

			// Verify
			expect(result.status).toBe("completed");
			expect(result.totalItems).toBe(1);
			expect(result.processedItems).toBe(1);
			expect(result.failedItems).toBe(0);
			expect(result.errors).toHaveLength(0);

			// Verify repository calls
			expect(mockCsvParsingRepository.parseCsvContent).toHaveBeenCalledWith(
				request.csvContent,
			);
			expect(
				mockItemServiceRepository.lookupItemsByFederatedIds,
			).toHaveBeenCalledWith(["family123"]);
			expect(mockItemServiceRepository.createItemsBatch).toHaveBeenCalledWith([
				{
					name: "Test Product",
					description: "Test description",
					federatedId: "family123",
					roles: ["family"],
				},
			]);
		});

		it("should handle CSV parsing errors", async () => {
			// Setup mocks
			const error = new Error("Invalid CSV format");
			vi.mocked(mockCsvParsingRepository.parseCsvContent).mockRejectedValue(
				error,
			);

			const initialBatch: Batch = {
				id: "test-batch-id",
				status: "pending",
				totalItems: 0,
				processedItems: 0,
				failedItems: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				errors: [],
			};

			vi.mocked(mockBatchRepository.saveBatch).mockResolvedValue(initialBatch);
			vi.mocked(mockBatchRepository.updateBatch).mockResolvedValue({
				...initialBatch,
				status: "failed",
			});

			// Execute and verify
			const request: CreateBatchRequest = {
				csvContent: "invalid,csv,content",
			};

			await expect(
				batchProcessingService.processBatch(request),
			).rejects.toThrow("Invalid CSV format");

			// Verify error handling
			expect(mockBatchRepository.updateBatch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					status: "failed",
					errors: expect.arrayContaining([
						expect.objectContaining({
							itemFederatedId: "batch",
							error: "Invalid CSV format",
						}),
					]),
				}),
			);
		});
	});

	describe("getBatchStatus", () => {
		it("should return batch status from repository", async () => {
			const batch: Batch = {
				id: "test-batch-id",
				status: "completed",
				totalItems: 5,
				processedItems: 5,
				failedItems: 0,
				createdAt: new Date(),
				updatedAt: new Date(),
				errors: [],
			};

			vi.mocked(mockBatchRepository.getBatchById).mockResolvedValue(batch);

			const result =
				await batchProcessingService.getBatchStatus("test-batch-id");

			expect(result).toEqual(batch);
			expect(mockBatchRepository.getBatchById).toHaveBeenCalledWith(
				"test-batch-id",
			);
		});

		it("should return null for non-existent batch", async () => {
			vi.mocked(mockBatchRepository.getBatchById).mockResolvedValue(null);

			const result =
				await batchProcessingService.getBatchStatus("non-existent-id");

			expect(result).toBeNull();
		});
	});
});
