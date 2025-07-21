# ETL Batch Loader

A TypeScript ETL system for processing CSV data into items via API Gateway and Lambda. This solution implements Domain-Driven Design with clean architecture for scalable batch processing.

## Architecture

- **API Gateway**: REST endpoints for batch operations
- **Lambda Functions**: Serverless processing with proper error handling
- **Domain-Driven Design**: Clean separation of concerns with domain, application, and infrastructure layers
- **TypeScript**: Strict typing with comprehensive validation

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone <repository-url>
cd my-vibeiq-etl
npm install
```

## Running the Application

### Build

```bash
npm run build
```

### Testing

Run all tests:

```bash
npm test
```

Run specific test files:

```bash
npm test batch.test.ts
npm test router.test.ts
```

### Development

Format code:

```bash
npm run format
```

Lint code:

```bash
npm run lint
```

Type checking:

```bash
npm run tsc
```

### Examples

Basic ETL workflow:

```bash
npm run example
```

Process Nike products CSV:

```bash
npm run example:csv
```

## API Endpoints

### POST /batches

Upload CSV data for batch processing.

**Request:**

```json
{
	"csvContent": "familyFederatedId,title,details\nnike-air-max,Nike Air Max,Classic sneaker"
}
```

**Response:**

```json
{
	"batchId": "batch_1735689600000",
	"status": "pending",
	"totalItems": 1,
	"processedItems": 0,
	"failedItems": 0
}
```

### GET /batches/{batchId}

Get batch processing status and results.

**Response:**

```json
{
	"batchId": "batch_1735689600000",
	"status": "completed",
	"totalItems": 1,
	"processedItems": 1,
	"failedItems": 0,
	"errors": []
}
```

## CSV Format

Expected CSV structure:

```csv
familyFederatedId,optionFederatedId,title,details
nike-air-max,,Nike Air Max,Classic athletic footwear
nike-air-max,air-max-270,Nike Air Max 270,Lifestyle shoe with Max Air unit
```

- `familyFederatedId`: Required family identifier
- `optionFederatedId`: Optional variant identifier
- `title`: Product name
- `details`: Product description

## Development Scripts

- `npm run build` - Build production bundle
- `npm run format` - Format code with Prettier
- `npm run lint` - Lint with ESLint
- `npm run test` - Run test suite
- `npm run tsc` - TypeScript compilation check
