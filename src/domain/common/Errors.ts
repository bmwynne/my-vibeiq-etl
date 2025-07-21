/**
 * Domain-specific error types
 */
export class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: unknown,
	) {
		super(message);
		this.name = "DomainError";
	}
}

export class ValidationError extends DomainError {
	constructor(message: string, details?: unknown) {
		super(message, "VALIDATION_ERROR", details);
		this.name = "ValidationError";
	}
}

export class NotFoundError extends DomainError {
	constructor(resource: string, id: string) {
		super(`${resource} not found: ${id}`, "NOT_FOUND");
		this.name = "NotFoundError";
	}
}

export class BusinessRuleError extends DomainError {
	constructor(message: string, details?: unknown) {
		super(message, "BUSINESS_RULE_VIOLATION", details);
		this.name = "BusinessRuleError";
	}
}

export class ExternalServiceError extends DomainError {
	constructor(service: string, message: string, details?: unknown) {
		super(`${service} error: ${message}`, "EXTERNAL_SERVICE_ERROR", details);
		this.name = "ExternalServiceError";
	}
}
