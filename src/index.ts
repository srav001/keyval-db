import { IDB } from './idb.js';
export type { MultiSetItem } from './idb.js';

const dbs = new Map<string, IDB>();

/**
 * Returns a cached IDB instance for the database and store, creating it on first use.
 * @param db_name - The name of the IndexedDB database to connect to
 * @param tableName - The name of the object store to use within the database
 */
function getDB(db_name: string, tableName: string): IDB {
	const key = `${db_name}:${tableName}`;
	let db = dbs.get(key);
	if (!db) dbs.set(key, (db = new IDB(db_name, tableName)));
	return db;
}

export { getDB, IDB };
