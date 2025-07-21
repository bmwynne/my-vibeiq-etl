import { APIGatewayProxyEventV2, APIGatewayProxyResult } from "aws-lambda";
import { handleBatches } from "./routes/batches.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type RouteHandler = (
	event: APIGatewayProxyEventV2,
	params?: Record<string, string>,
) => Promise<APIGatewayProxyResult>;

interface Route {
	method: HttpMethod;
	pattern: RegExp;
	handler: RouteHandler;
	paramNames?: string[];
}

const routes: Route[] = [
	{
		method: "POST",
		pattern: /^\/batches$/,
		handler: handleBatches,
	},
	{
		method: "GET",
		pattern: /^\/batches\/([^/]+)$/,
		handler: (event, params) => handleBatches(event, params),
		paramNames: ["batchId"],
	},
	{
		method: "GET",
		pattern: /^\/health$/,
		handler: healthCheck,
	},
];

function healthCheck(): Promise<APIGatewayProxyResult> {
	return Promise.resolve({
		statusCode: 200,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			status: "healthy",
			timestamp: new Date().toISOString(),
			version: "1.0.0",
		}),
	});
}

function extractParams(
	path: string,
	pattern: RegExp,
	paramNames?: string[],
): Record<string, string> {
	const matches = path.match(pattern);
	if (!matches || !paramNames) return {};

	const params: Record<string, string> = {};
	paramNames.forEach((name, index) => {
		params[name] = matches[index + 1] || "";
	});
	return params;
}

/**
 * Router inspired by modern frameworks like-ish to Axum in Rust
 */
export async function router(
	event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResult> {
	const { rawPath, requestContext } = event;
	const method = requestContext.http.method as HttpMethod;

	// Find matching route
	for (const route of routes) {
		if (route.method === method && route.pattern.test(rawPath)) {
			const params = extractParams(rawPath, route.pattern, route.paramNames);
			return route.handler(event, params);
		}
	}

	// Route not found
	return {
		statusCode: 404,
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			error: "Not Found",
			message: `Route ${method} ${rawPath} not found`,
		}),
	};
}
