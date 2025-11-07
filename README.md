# bases-client

Javascript client to interact with databases uploaded to [Datasketch](https://datasketch.co). This client is written in TypeScript and provides type definitions out of the box.

```sh
npm i @datasketch/bases-client
```

## Usage

### Importing

```js
import { BasesClient } from '@datasketch/bases-client'
```

### Instantiation

Create a new instance of `BasesClient` with a JWT token:

```js
// You need a pre-generated JWT token that contains your organization, database, and table information

const client = new BasesClient({
    token: 'your-jwt-token', // Required: JWT token with org, db, and tbl claims
    tbl: 'initial-table'     // Optional: Override table from token
})
```

**Note:** The JWT token should contain the following claims:

- `org`: Your organization name
- `db`: Your database name
- `tbl`: Your table name (optional, can be set via `setTable()`)

## API

`setTable(tbl: string): Promise<void>`

Sets the current table for subsequent operations.

```js
await client.setTable('new-table');
```

`getRecords<T>(props?: { mapValues?: boolean }): Promise<{ data: T[], fields: Field[] }>`

Retrieves all records from the current table. Returns both the data and field definitions.

```js
const result = await client.getRecords();
console.log(result.data);    // Array of records
console.log(result.fields);  // Array of field definitions

// With mapValues option (default: true)
// When true, field IDs are mapped to field labels
const result = await client.getRecords({ mapValues: true });
// When false, returns raw data with field IDs
const rawResult = await client.getRecords({ mapValues: false });
```

`getRecord<T>(props: { id: string, mapValues?: boolean }): Promise<{ data: T | null, fields: Field[] | null }>`

Retrieves a single record by its ID. Returns both the record data and field definitions.

```js
const result = await client.getRecord({ id: 'record-id' });
if (result.data) {
  console.log(result.data);    // The record
  console.log(result.fields);  // Field definitions
} else {
  console.log('Record not found');
}
```

`insertRecord<T>(data: T): Promise<{ success: boolean }>`

Inserts a single record into the current table.

```js
const newRecord = { name: 'John Doe', age: 30 };
const result = await client.insertRecord(newRecord);
console.log(`Inserted record: ${result.success}`);
```

`insertRecords<T>(data: T[]): Promise<{ success: boolean }>`

Inserts multiple records into the current table.

```js
const newRecords = [
  { name: 'John Doe', age: 30 },
  { name: 'Jane Smith', age: 25 }
];
const result = await client.insertRecords(newRecords);
console.log(`Inserted records: ${result.success}`);
```

`updateRecord<T>(id: string, data: T): Promise<{ success: boolean }>`

Updates an existing record in the current table.

```js
const result = await client.updateRecord('record-id', { age: 31 });
console.log(`Updated record: ${result.success}`);
```

`updateRecords<T>(data: T[]): Promise<{ success: boolean }>`

Updates multiple records in the current table. Records should include an `id` field.

```js
const updates = [
  { id: 'record-id-1', name: 'John Doe Updated' },
  { id: 'record-id-2', age: 32 }
];
const result = await client.updateRecords(updates);
console.log(`Updated records: ${result.success}`);
```

`getFields<T>(): Promise<Field[]>`

Retrieves all field definitions for the current table.

```js
const fields = await client.getFields();
console.log(fields); // Array of field definitions
```

`deleteRecord(id: string): Promise<{ success: boolean }>`

Deletes a record from the current table.

```js
const result = await client.deleteRecord('record-id');
console.log(`Deleted record: ${result.success}`);
```

### Example

```js
// Create a client with JWT token
// The token should contain org, db, and optionally tbl claims
const client = new BasesClient({
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Your JWT token
});

// Set initial table (if not specified in token)
await client.setTable('users');

// Get all records
const result = await client.getRecords();
console.log('All users:', result.data);
console.log('Field definitions:', result.fields);

// Get a single record
const recordResult = await client.getRecord({ id: 'user-id-123' });
if (recordResult.data) {
  console.log('User:', recordResult.data);
  console.log('Fields:', recordResult.fields);
}

// Get field definitions
const fields = await client.getFields();
console.log('Available fields:', fields);

// Insert a single record
let insertResult = await client.insertRecord({ 
  name: 'Alice', 
  email: 'alice@example.com' 
});
console.log(`Record inserted: ${insertResult.success}`);

// Insert multiple records
insertResult = await client.insertRecords([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Sam', email: 'sam@example.com' }
]);
console.log(`Multiple records inserted: ${insertResult.success}`);

// Update a record
const updateResult = await client.updateRecord('user-id-123', { 
  name: 'Alice Smith' 
});
console.log(`Record updated: ${updateResult.success}`);

// Update multiple records
const updateManyResult = await client.updateRecords([
  { id: 'user-id-123', name: 'Alice Smith Updated' },
  { id: 'user-id-456', age: 32 }
]);
console.log(`Records updated: ${updateManyResult.success}`);

// Delete a record
const deleteResult = await client.deleteRecord('user-id-123');
console.log(`Record deleted: ${deleteResult.success}`);

// Switch to a different table
await client.setTable('products');

// Now operations will be performed on the 'products' table
const productsResult = await client.getRecords();
console.log('All products:', productsResult.data);
```

## Migration from v2.x

If you're upgrading from version 2.x, note the following breaking changes:

1. **Config structure changed**: The `org` and `db` fields are no longer required. Only `token` (JWT) is needed:

   ```js
   // Old (v2.x)
   new BasesClient({ org: 'org', db: 'db', token: 'token' })
   
   // New (v3.x)
   new BasesClient({ token: 'jwt-token' })
   ```

2. **Response structure**: `getRecords()` and `getRecord()` now return objects with `data` and `fields`:

   ```js
   // Old (v2.x)
   const records = await client.getRecords(); // T[]
   
   // New (v3.x)
   const result = await client.getRecords(); // { data: T[], fields: Field[] }
   const records = result.data;
   ```

3. **JWT tokens**: You must use pre-generated JWT tokens instead of API tokens. The JWT should contain `org`, `db`, and optionally `tbl` claims.
