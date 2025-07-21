import {
	SQSClient,
	SendMessageCommand,
	SendMessageBatchCommand,
} from "@aws-sdk/client-sqs";
import {
	PublishBatchRequest,
	SQSBatchMessage,
} from "../../domain/models/SQSBatchMessage.js";

/**
 * SQS repository interface following Repository pattern
 * Abstracts SQS operations for batch processing
 */
export interface SQSRepository {
	publishBatch(request: PublishBatchRequest): Promise<string>;
	publishBatches(requests: PublishBatchRequest[]): Promise<string[]>;
}

/**
 * AWS SQS implementation of batch publishing
 * Used by ingestion lambda to send batches for processing
 *
 * Design:
 * 1. Receives batches of up to 100 items from ingestion lambda
 * 2. Publishes to SQS for processing lambda consumption
 * 3. Handles SQS batch limits (10 messages per batch)
 * 4. Provides error handling and retry logic
 */
export class SQSRepositoryImpl implements SQSRepository {
	private readonly sqsClient: SQSClient;

	// TODO: Get from environment variables
	private readonly queueUrl = process.env.BATCH_PROCESSING_QUEUE_URL ?? "";

	constructor(sqsClient?: SQSClient) {
		this.sqsClient =
			sqsClient ??
			new SQSClient({
				region: process.env.AWS_REGION ?? "us-east-1",
			});
	}

	/**
	 * Publish a single batch to SQS for processing
	 */
	async publishBatch(request: PublishBatchRequest): Promise<string> {
		try {
			console.log(
				`INFO: Publishing batch ${request.batchId} to SQS`,
				`with ${request.items.length.toString()} items`,
			);

			const messageBody = this.createSQSMessageBody(request);

			const command = new SendMessageCommand({
				QueueUrl: this.queueUrl,
				MessageBody: JSON.stringify(messageBody),
				MessageGroupId: request.batchId,
				MessageDeduplicationId: request.batchId,
				MessageAttributes: {
					BatchId: {
						StringValue: request.batchId,
						DataType: "String",
					},
					ItemCount: {
						StringValue: request.items.length.toString(),
						DataType: "Number",
					},
					Priority: {
						StringValue: request.priority ?? "standard",
						DataType: "String",
					},
				},
			});

			const result = await this.sqsClient.send(command);

			console.log(
				`INFO: Successfully published batch ${request.batchId} to SQS`,
				`MessageId: ${result.MessageId ?? "unknown"}`,
			);

			return result.MessageId ?? "unknown";
		} catch (error) {
			console.error(
				`ERROR: Failed to publish batch ${request.batchId} to SQS:`,
				error,
			);
			throw error;
		}
	}

	/**
	 * Publish multiple batches to SQS using batch operations
	 * Handles SQS batch limit of 10 messages per request
	 */
	async publishBatches(requests: PublishBatchRequest[]): Promise<string[]> {
		console.log(
			`INFO: Publishing ${requests.length.toString()} batches to SQS`,
		);

		const messageIds: string[] = [];

		// Split into chunks of 10 (SQS batch limit)
		const chunks = this.chunkArray(requests, 10);

		for (const chunk of chunks) {
			try {
				const batchResult = await this.publishBatchChunk(chunk);
				messageIds.push(...batchResult);
			} catch (error) {
				console.error("ERROR: Failed to publish batch chunk:", error);
				// TODO: Implement partial failure handling
				throw error;
			}
		}

		console.log(
			`INFO: Successfully published ${messageIds.length.toString()} messages to SQS`,
		);
		return messageIds;
	}

	/**
	 * Publish a chunk of up to 10 batches using SQS batch operation
	 */
	private async publishBatchChunk(
		requests: PublishBatchRequest[],
	): Promise<string[]> {
		const entries = requests.map((request, index) => ({
			Id: `${request.batchId}-${index.toString()}`,
			MessageBody: JSON.stringify(this.createSQSMessageBody(request)),
			MessageGroupId: request.batchId,
			MessageDeduplicationId: request.batchId,
			MessageAttributes: {
				BatchId: {
					StringValue: request.batchId,
					DataType: "String",
				},
				ItemCount: {
					StringValue: request.items.length.toString(),
					DataType: "Number",
				},
			},
		}));

		const command = new SendMessageBatchCommand({
			QueueUrl: this.queueUrl,
			Entries: entries,
		});

		const result = await this.sqsClient.send(command);

		// TODO: Handle partial failures from result.Failed
		return result.Successful?.map((msg) => msg.MessageId ?? "unknown") ?? [];
	}

	/**
	 * Create SQS message body from batch request
	 */
	private createSQSMessageBody(
		request: PublishBatchRequest,
	): Omit<SQSBatchMessage, "messageId"> {
		return {
			batchId: request.batchId,
			items: request.items,
			retryCount: 0,
			timestamp: new Date(),
		};
	}

	/**
	 * Utility to chunk arrays for batch processing
	 */
	private chunkArray<T>(array: T[], chunkSize: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}

	// TODO: Implement these methods for complete SQS integration:
	// - configureDLQ()
	// - setupRetryPolicy()
	// - enableMetrics()
	// - handleMessageVisibilityTimeout()
}
