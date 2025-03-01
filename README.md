# keyval-db

A simple, type-safe wrapper for IndexedDB that eliminates the complexity of versions, upgrades, and store management the it was supposed to be.

## What is keyval-db?

`keyval-db` is a lightweight TypeScript library that simplifies working with IndexedDB by providing a Promise-based API. It automatically handles:

- Database connections and reconnections
- Object store creation
- Version management
- Upgrade processes
- Transaction retries on connection errors

With `keyval-db`, you can focus on storing and retrieving data without worrying about the complexities of IndexedDB's low-level API.

## Installation

### npm

```bash
npm install keyval-db
```

### pnpm

```bash
pnpm add keyval-db
```

### bun

```bash
bun add keyval-db
```

## API Reference

- [IDB Class](#idb-class)
- [get](#get)
- [getValues](#getvalues)
- [getKeys](#getkeys)
- [set](#set)
- [setMultiple](#setmultiple)
- [del](#del)
- [clearStore](#clearstore)
- [dropDB](#dropdb)

### IDB Class

The main class for interacting with IndexedDB through a key-value interface.

```typescript
import { IDB } from "keyval-db";

// Create a new database connection
const db = new IDB("myDatabase", "myStore");
```

#### Constructor Parameters

| Parameter | Type   | Description                                             |
| --------- | ------ | ------------------------------------------------------- |
| db_name   | string | The name of the IndexedDB database to connect to        |
| storeName | string | The name of the object store to use within the database |

### get

Retrieves a value from the database by its key.

```typescript
// With TypeScript generics for type safety
const user = await db.get<{ name: string; age: number }>("user-123");
console.log(user.name); // Type-safe access

// Using Promise chain
db.get<string>("settings-theme")
  .then((theme) => {
    console.log(`Current theme: ${theme}`);
  })
  .catch((err) => {
    console.error("Failed to get theme:", err);
  });

// Try-catch with await
try {
  const count = await db.get<number>("visit-count");
  console.log(`Visit count: ${count}`);
} catch (err) {
  console.error("Failed to get visit count:", err);
} finally {
  console.log("Get operation completed");
}
```

#### Parameters

| Parameter | Type        | Description                        |
| --------- | ----------- | ---------------------------------- |
| key       | IDBValidKey | The key to look up in the database |

#### Returns

`Promise<T>` - A promise that resolves to the value associated with the key

### getValues

Retrieves all values stored in the database.

```typescript
// Get all items as an array with type safety
const allItems = await db.getValues<Array<{ id: string; content: string }>>();
for (const item of allItems) {
  console.log(item.id, item.content);
}

// Using Promise chain
db.getValues<string[]>()
  .then((values) => {
    console.log(`Found ${values.length} values`);
  })
  .catch((err) => {
    console.error("Failed to get values:", err);
  });
```

#### Returns

`Promise<T extends Array<any>>` - A promise that resolves to an array of all values

### getKeys

Retrieves all keys stored in the database.

```typescript
// Get all keys
const allKeys = await db.getKeys();
console.log(`Found ${allKeys.length} keys in the store`);

// Using Promise chain
db.getKeys()
  .then((keys) => {
    keys.forEach((key) => console.log(`Key: ${key}`));
  })
  .catch((err) => {
    console.error("Failed to get keys:", err);
  });
```

#### Returns

`Promise<Array<IDBValidKey>>` - A promise that resolves to an array of all keys

### set

Stores a value in the database with the specified key.

```typescript
// Simple value
await db.set("settings-theme", "dark");

// Complex object
await db.set("user-profile", {
  name: "John Doe",
  email: "john@example.com",
  preferences: {
    notifications: true,
  },
});

// Using Promise chain with type checking
db.set("counter", 5)
  .then((result) => {
    // result is typed as true
    console.log("Value saved:", result);
  })
  .catch((err) => {
    console.error("Failed to save:", err);
  });

// Try-catch with await
try {
  const result = await db.set("last-login", new Date().toISOString());
  console.log("Login time saved:", result); // result is true
} catch (err) {
  console.error("Failed to save login time:", err);
}
```

#### Parameters

| Parameter | Type        | Description                      |
| --------- | ----------- | -------------------------------- |
| key       | IDBValidKey | The key to store the value under |
| value     | unknown     | The value to store               |

#### Returns

`Promise<true>` - A promise that resolves to `true` when the operation is complete

### setMultiple

Stores multiple key-value pairs in the database in a single transaction.

```typescript
// Store multiple items in one transaction
await db.setMultiple([
  { key: "item-1", value: { name: "Item 1", price: 10 } },
  { key: "item-2", value: { name: "Item 2", price: 20 } },
  { key: "item-3", value: { name: "Item 3", price: 30 } },
]);

// With type safety
type Product = { name: string; price: number };
const products: Array<{ key: string; value: Product }> = [
  { key: "product-1", value: { name: "Product 1", price: 9.99 } },
  { key: "product-2", value: { name: "Product 2", price: 19.99 } },
];
const result = await db.setMultiple<Product>(products);
console.log("Products saved:", result); // result is true

// Using Promise chain
db.setMultiple([
  { key: "setting-1", value: "value-1" },
  { key: "setting-2", value: "value-2" },
])
  .then((result) => {
    console.log("All settings saved:", result);
  })
  .catch((err) => {
    console.error("Failed to save settings:", err);
  });
```

#### Parameters

| Parameter | Type                                  | Description                                             |
| --------- | ------------------------------------- | ------------------------------------------------------- |
| items     | Array<{ key: IDBValidKey, value: T }> | An array of objects containing key-value pairs to store |

#### Returns

`Promise<true>` - A promise that resolves to `true` when all items have been stored

### del

Deletes a value from the database by its key.

```typescript
// Delete an item
await db.del("temporary-data");

// Using Promise chain to check result
db.del("session-token")
  .then((result) => {
    console.log("Token deleted:", result); // result is true
  })
  .catch((err) => {
    console.error("Failed to delete token:", err);
  });

// Try-catch with await
try {
  const result = await db.del("cache-item-123");
  console.log("Cache item deleted:", result); // result is true
} catch (err) {
  console.error("Failed to delete cache item:", err);
}
```

#### Parameters

| Parameter | Type        | Description                    |
| --------- | ----------- | ------------------------------ |
| key       | IDBValidKey | The key of the value to delete |

#### Returns

`Promise<true>` - A promise that resolves to `true` when the value has been deleted

### clearStore

Clears all data from the current object store.

```typescript
// Clear all data from the store
await db.clearStore();

// Using Promise chain
db.clearStore()
  .then((result) => {
    console.log("Store cleared:", result); // result is true
  })
  .catch((err) => {
    console.error("Failed to clear store:", err);
  });

// Try-catch with await
try {
  const result = await db.clearStore();
  console.log("All data cleared:", result); // result is true
} catch (err) {
  console.error("Failed to clear data:", err);
}
```

#### Returns

`Promise<true>` - A promise that resolves to `true` when the store has been cleared

### dropDB

Deletes the entire database.

```typescript
// Delete the entire database
await db.dropDB();

// Using Promise chain
db.dropDB()
  .then((result) => {
    console.log("Database deleted:", result); // result is true
  })
  .catch((err) => {
    console.error("Failed to delete database:", err);
  });

// Try-catch with await
try {
  const result = await db.dropDB();
  console.log("Database deleted successfully:", result); // result is true
} catch (err) {
  console.error("Failed to delete database:", err);
}
```

#### Returns

`Promise<true>` - A promise that resolves to `true` when the database has been deleted

## Complete Example

```typescript
import { IDB } from "keyval-db";

// Define your data types
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

// Create a database connection
const userDB = new IDB("myApp", "users");

// Store a user
async function saveUser(user: User) {
  try {
    await userDB.set(user.id, user);
    console.log(`User ${user.name} saved successfully!`);
  } catch (error) {
    console.error("Failed to save user:", error);
  }
}

// Retrieve a user
async function getUser(userId: string) {
  try {
    const user = await userDB.get<User>(userId);
    console.log(`Found user: ${user.name}`);
    return user;
  } catch (error) {
    console.error(`Failed to get user ${userId}:`, error);
    return null;
  }
}

// Delete a user
async function deleteUser(userId: string) {
  try {
    await userDB.del(userId);
    console.log(`User ${userId} deleted successfully!`);
  } catch (error) {
    console.error(`Failed to delete user ${userId}:`, error);
  }
}

// Get all users
async function getAllUsers() {
  try {
    const users = await userDB.getValues<User[]>();
    console.log(`Found ${users.length} users`);
    return users;
  } catch (error) {
    console.error("Failed to get users:", error);
    return [];
  }
}
```
