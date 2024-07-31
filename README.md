## bases-client

Javascript client to interact with databases uploaded to [Datasketch](https://datasketch.co).

```sh
npm i @datasketch/bases-client
```

### Setup

```js
import { BasesClient } from '@datasketch/bases-client'

// Visit your settings page at datasketch to get the token
const client = new BasesClient({
    org: process.env.ORG_NAME,
    db: process.env.DB_NAME
    tbl: process.env.TBL_NAME
    token: process.env.TOKEN
})

client.getRecords().then(records => {
    console.log(records)
})
```

### Methods

- getRecords
- getRecord
- inserRecords
- updateRecord
- deleteRecord