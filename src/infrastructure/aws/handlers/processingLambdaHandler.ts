import { SQSEvent, SQSHandler, SQSRecord } from "aws-lambda";
import middy from "@middy/core";
import { ProcessBatchCommand } from "../../../application/commands/ProcessBatchCommand.js";
import { SQSBatchMessage } from "../../../domain/models/SQSBatchMessage.js";
import { CreateItemRequest } from "../../../domain/models/Item.js";
import { DomainError } from "../../../domain/common/Errors.js";

/**
 * Processing Lambda handler for SQS-triggered batch processing
 * This is Step 2 of the ETL pipeline - processes individual batches from SQS
 *
 * Architecture:
 * 1. Receives SQS messages containing batch processing jobs
 * 2. Delegates to ProcessBatchCommand (Application Layer)
 * 3. Updates batch status and results in DynamoDB
 * 4. Handles errors and retries via SQS DLQ
 */

// TODO: Initialize with proper DI container
const processBatchCommand: ProcessBatchCommand | null = null;

async function processingLambdaHandlerInternal(event: SQSEvent): Promise<void> {
	// Process each SQS message (batch job) independently
	const promises = event.Records.map(async (record) => {
		// TODO: Implement proper error handling for production
		await processSingleBatchMessage(record);
	});

	await Promise.all(promises);
}

/**
 * Processes a single SQS message containing batch job details
 */
async function processSingleBatchMessage(record: SQSRecord): Promise<void> {
	// Parse and validate SQS message
	const sqsMessage: SQSBatchMessage = parseSQSBatchMessage(record);

	if (!processBatchCommand) {
		// TODO: Remove once DI container is implemented
		await mockBatchProcessing();
		return;
	}

	// Delegate to application layer
	await processBatchCommand.execute({
		batchId: sqsMessage.batchId,
		items: sqsMessage.items,
		retryCount: sqsMessage.retryCount || 0,
	});
}

/**
 * Parse and validate SQS message structure
 */
function parseSQSBatchMessage(record: SQSRecord): SQSBatchMessage {
	const body = JSON.parse(record.body) as Record<string, unknown>;

	// TODO: Add proper schema validation with Zod
	if (!body.batchId || !Array.isArray(body.items)) {
		throw new DomainError(
			`Invalid SQS message format: missing batchId or items array`,
			"INVALID_SQS_MESSAGE",
			{ messageId: record.messageId, body: record.body },
		);
	}

	const retryCount = typeof body.retryCount === "number" ? body.retryCount : 0;
	const sentTimestamp = record.attributes.SentTimestamp;
	const timestamp = sentTimestamp
		? new Date(parseInt(sentTimestamp, 10))
		: new Date();

	return {
		messageId: record.messageId,
		batchId: body.batchId as string,
		items: body.items as CreateItemRequest[],
		retryCount,
		timestamp,
	};
}

/**
 * Mock processing for demonstration - TODO: Remove
 */
async function mockBatchProcessing(): Promise<void> {
	// Simulate processing time
	await new Promise((resolve) => setTimeout(resolve, 50));
}

/**
 * Export wrapped Lambda handler with Middy middleware
 */
export const processingLambdaHandler: SQSHandler =
	processingLambdaHandlerInternal;
export const main = middy(processingLambdaHandler);
// TODO: Add middleware for:
// - Error handling
// - Metrics/monitoring
// - Request/response logging
// - Timeout handling
