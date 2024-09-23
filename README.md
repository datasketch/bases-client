## bases-client

Javascript client to interact with databases uploaded to [Datasketch](https://datasketch.co). This client is written in TypeScript and provides type definitions out of the box.

```sh
npm i @datasketch/bases-client
```

### Usage

#### Importing

```js
import { BasesClient } from '@datasketch/bases-client'
```

#### Instantiation

Create a new instance of `BasesClient`:

```js
// Visit your settings page at datasketch to get the token

const client = new BasesClient({
    org: 'your-organization',
    db: 'your-database',
    token: 'your-api-token',
    tbl: 'initial-table' // Optional
})
```
### API

`setTable(tbl: string): Promise<void>`

Sets the current table for subsequent operations. If the table is different from the current one, it will request a new authentication token.

```js
await client.setTable('new-table');
```

`getRecords<T>(): Promise<T[]>`

Retrieves all records from the current table.

```
const records = await client.getRecords();
console.log(records);
```

`getRecord<T>(id: string): Promise<T | null>`

Retrieves a single record by its ID.

```js
const record = await client.getRecord('record-id');
if (record) {
  console.log(record);
} else {
  console.log('Record not found');
}
```

`insertRecords<T>(data: T[]): Promise<{ inserted_ids: string[] }>`

Inserts new records into the current table.

```js
const newRecord = { name: 'John Doe', age: 30 };
const result = await client.insertRecords([newRecord]);
console.log(`Inserted record ID: ${result.inserted_ids[0]}`);
```

`updateRecord<T>(id: string, data: Partial<T>): Promise<void>`

Updates an existing record in the current table.

```js
await client.updateRecord('record-id', { age: 31 });
```

`deleteRecord(id: string): Promise<void>`

Deletes a record from the current table.

```js
await client.deleteRecord('record-id');
```

#### Example

```js
// Create a client
const client = new BasesClient({
  org: 'my-org',
  db: 'my-db',
  token: 'my-token'
});

// Set initial table
await client.setTable('users');

// Get all records
const allUsers = await client.getRecords();
console.log('All users:', allUsers);

// Retrieve the record
const user = await client.getRecord(userId);
console.log('User:', user);

// Switch to a different table
await client.setTable('products');

// Now operations will be performed on the 'products' table
const allProducts = await client.getRecords();
console.log('All products:', allProducts);

// Insert a record
const result = await client.insertRecord({ name: 'Alice', email: 'alice@example.com' });

const userId = result.inserted_ids[0]

// Insert a records
const result = await client.insertRecords([{ name: 'Alice', email: 'alice@example.com' },{ name: 'Sam', email: 'sam@example.com' }]);

// Update the record
await client.updateRecord(userId, { name: 'Alice Smith' });

// Delete the record
await client.deleteRecord(userId);


```