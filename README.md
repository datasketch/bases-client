# @datasketch/bases-client

A TypeScript client library for interacting with the Bases API service. This library provides a simple and type-safe interface for managing tables, records, fields, and views.

## Installation

```bash
npm install @datasketch/bases-client
```

## Quick Start

```typescript
import BasesClient from '@datasketch/bases-client';

// Initialize the client with your token
const client = new BasesClient({
  token: 'your-api-token',
  tbl: 'your-table-id' // Optional: can be set later
});

// If table wasn't set in constructor, set it before making requests
await client.setTable('your-table-id');

// Fetch all records
const { data, fields } = await client.getRecords();
console.log(data); // Array of records
console.log(fields); // Array of field definitions
```

## Configuration

The `BasesClient` constructor accepts a `Config` object:

```typescript
type Config = {
  token: string;  // Required: Your API authentication token
  tbl?: string;   // Optional: Table ID (can be set later with setTable())
};
```

## API Reference

### Constructor

```typescript
new BasesClient(config: Config)
```

Creates a new BasesClient instance. If a table ID is provided in the config, authentication will happen automatically on the first request.

### Methods

#### `setTable(tbl: string): Promise<void>`

Sets the active table for subsequent operations. If the table changes, the authentication token will be invalidated and a new one will be requested.

```typescript
await client.setTable('new-table-id');
```

#### `getRecords<T>(props?: getRecordsProps): Promise<{ data: T[], fields: Field[] }>`

Fetches all records from the current table.

**Parameters:**
- `props.mapValues` (optional, default: `true`): If `true`, maps field IDs to their labels in the returned data.

**Returns:** An object containing:
- `data`: Array of records of type `T`
- `fields`: Array of field definitions

**Example:**
```typescript
// With field mapping (default)
const { data, fields } = await client.getRecords<MyRecordType>();
// data will have keys as field labels

// Without field mapping
const { data, fields } = await client.getRecords<MyRecordType>({ mapValues: false });
// data will have keys as field IDs
```

#### `getRecord<T>(props: getRecordProps): Promise<{ data: T | null, fields: Field[] | null }>`

Fetches a single record by ID.

**Parameters:**
- `props.id` (required): The ID of the record to fetch
- `props.mapValues` (optional, default: `true`): If `true`, maps field IDs to their labels

**Returns:** An object containing:
- `data`: The record of type `T`, or `null` if not found
- `fields`: Array of field definitions, or `null` if record not found

**Example:**
```typescript
const { data, fields } = await client.getRecord<MyRecordType>({ 
  id: 'record-id-123' 
});
```

#### `getFields<T>(): Promise<Field[]>`

Fetches all field definitions for the current table.

**Returns:** Array of field objects with the following structure:
```typescript
type Field = {
  id: string;
  label: string;
  type: string;
  tbl: string;
  fld___id: string;
};
```

**Example:**
```typescript
const fields = await client.getFields();
console.log(fields); // Array of field definitions
```

#### `insertRecord<T>(data: T): Promise<{ success: boolean }>`

Inserts a single record into the table.

**Parameters:**
- `data`: The record data to insert (type `T`)

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.insertRecord({
  name: 'John Doe',
  email: 'john@example.com'
});
console.log(result.success); // true if successful
```

#### `insertRecords<T>(data: T[]): Promise<{ success: boolean }>`

Bulk inserts multiple records into the table.

**Parameters:**
- `data`: Array of records to insert (type `T[]`)

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.insertRecords([
  { name: 'John Doe', email: 'john@example.com' },
  { name: 'Jane Smith', email: 'jane@example.com' }
]);
```

#### `updateRecord<T>(id: string, data: T): Promise<{ success: boolean }>`

Updates a single record by ID.

**Parameters:**
- `id`: The ID of the record to update
- `data`: The updated record data (type `T`)

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.updateRecord('record-id-123', {
  name: 'Updated Name',
  email: 'updated@example.com'
});
```

#### `updateRecords<T>(data: T[]): Promise<{ success: boolean }>`

Bulk updates multiple records.

**Parameters:**
- `data`: Array of records to update (type `T[]`). Each record should include an `id` field.

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.updateRecords([
  { id: 'record-1', name: 'Updated Name 1' },
  { id: 'record-2', name: 'Updated Name 2' }
]);
```

#### `deleteRecord(id: string): Promise<{ success: boolean }>`

Deletes a single record by ID.

**Parameters:**
- `id`: The ID of the record to delete

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.deleteRecord('record-id-123');
```

#### `createView(id: string, table: string, type: string, config: object): Promise<{ success: boolean }>`

Creates a new view for a table.

**Parameters:**
- `id`: The view ID
- `table`: The table ID
- `type`: The view type
- `config`: View configuration object

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.createView(
  'view-id-123',
  'table-id-456',
  'chart',
  { xAxis: 'date', yAxis: 'value' }
);
```

#### `updateView(id: string, config: object): Promise<{ success: boolean }>`

Updates an existing view's configuration.

**Parameters:**
- `id`: The view ID
- `config`: Updated view configuration object

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.updateView('view-id-123', {
  xAxis: 'new-date',
  yAxis: 'new-value'
});
```

#### `deleteView(id: string): Promise<{ success: boolean }>`

Deletes a view by ID.

**Parameters:**
- `id`: The view ID

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.deleteView('view-id-123');
```

#### `getView(id: string): Promise<{ success: boolean }>`

Fetches a view by ID.

**Parameters:**
- `id`: The view ID

**Returns:** An object with a `success` boolean

**Example:**
```typescript
const result = await client.getView('view-id-123');
```

## Error Handling

The library throws two types of errors:

### `AuthenticationError`

Thrown when authentication fails (invalid credentials, missing token, etc.).

```typescript
import { AuthenticationError } from '@datasketch/bases-client';

try {
  await client.getRecords();
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
  }
}
```

### `BasesClientError`

Thrown for general API errors (HTTP errors, invalid responses, etc.).

```typescript
import { BasesClientError } from '@datasketch/bases-client';

try {
  await client.getRecords();
} catch (error) {
  if (error instanceof BasesClientError) {
    console.error('API error:', error.message);
  }
}
```

## Field Mapping

By default, the `getRecords()` and `getRecord()` methods map field IDs to their human-readable labels. This means:

- **With `mapValues: true` (default)**: Record keys use field labels (e.g., `"Full Name"`, `"Email Address"`)
- **With `mapValues: false`**: Record keys use field IDs (e.g., `"fld123"`, `"fld456"`)

```typescript
// Field labels as keys
const { data } = await client.getRecords({ mapValues: true });
// data[0] = { "Full Name": "John", "Email": "john@example.com" }

// Field IDs as keys
const { data } = await client.getRecords({ mapValues: false });
// data[0] = { "fld123": "John", "fld456": "john@example.com" }
```

## TypeScript Support

This library is written in TypeScript and provides full type definitions. You can use generic types to ensure type safety:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const client = new BasesClient({ token: 'your-token' });
await client.setTable('users-table');

// Type-safe record fetching
const { data } = await client.getRecords<User>();
// data is typed as User[]

// Type-safe record operations
await client.insertRecord<User>({
  id: '123',
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Authentication

The client automatically handles authentication using Bearer token authentication. When you make your first request (or when the table changes), the client will:

1. Send a POST request to `/auth/generate` with your credentials
2. Receive an authentication token
3. Use this token in the `Authorization` header for subsequent requests

The token is cached and reused until the table changes or the client is reinitialized.

## License

ISC

