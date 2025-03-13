/**
 * Object representing a key-value pair for batch operations
 * @template T - The type of the value being stored
 */
export type MultiSetItem<T> = {
	/** The key to store the value under */
	key: IDBValidKey;
	/** The value to store */
	value: T;
};
// storesMap: Map<string, IDBObjectStore>;
type DB_Name = string;
const dbsMap = new Map<
	DB_Name,
	{
		req: IDBOpenDBRequest;
		db: IDBDatabase | undefined;
		dbs_Q: Record<string, () => void>;
	}
>();

type Reject = (err: Event) => void;

/**
 * A class for interacting with IndexedDB through a simple key-value interface
 *
 * This class provides a Promise-based API for storing and retrieving data from
 * IndexedDB, with automatic retry logic and connection management.
 *
 * @example
 * ```typescript
 * const db = new IDB('myDatabase', 'myStore');
 *
 * // Store a value
 * await db.set('key1', { data: 'example' });
 *
 * // Retrieve a value
 * const data = await db.get<{ data: string }>('key1');
 * ```
 */
export class IDB {
	#db_name: DB_Name;
	#storeName: string;

	#isBumpingVersion = false;
	#hasObjectStore = false;
	#isReconnecting = false; //  prevent duplicate reconnections

	#db_Q = new Set<() => void>();

	#update_db(idb: IDBDatabase) {
		dbsMap.get(this.#db_name)!.db = idb;
	}

	#updateDBinMap(evnt: Event) {
		const idb = (
			evnt.target as unknown as {
				result: IDBDatabase;
			}
		).result;

		if (!idb) {
			return;
		}

		if (idb.version === 0) {
			this.#isBumpingVersion = true;
		}

		this.#update_db(idb);
		return idb;
	}

	#completeObjectStoreSetup() {
		this.#isReconnecting = false;
		this.#hasObjectStore = true;
		this.#isBumpingVersion = false;

		this.#db_Q.forEach((fn) => fn());
		this.#db_Q.clear();
	}

	#setupRequests(req?: IDBOpenDBRequest) {
		const item = dbsMap.get(this.#db_name)!;
		if (!req) {
			req = item.req;
		} else {
			item.req = req;
			dbsMap.set(this.#db_name, item);
		}

		if (!req) return;

		if (req.readyState === 'done') {
			this.#update_db(req.result);
			this.#completeObjectStoreSetup();

			return;
		}

		req.onupgradeneeded = (event) => {
			const idb = this.#updateDBinMap(event);

			if (!idb) return;

			if (idb.objectStoreNames.length === 0) {
				if (idb.objectStoreNames.contains(this.#storeName) === false) {
					idb.createObjectStore(this.#storeName);
				}
				this.#isBumpingVersion = false;
				return;
			}

			const item = dbsMap.get(this.#db_name)!;
			if (item.dbs_Q) {
				item.dbs_Q[this.#storeName]!();
			}
			this.#isBumpingVersion = false;
		};

		req.onsuccess = (event) => {
			this.#updateDBinMap(event);
			this.#completeObjectStoreSetup();
		};

		req.onerror = (event) => {
			this.#updateDBinMap(event);
			this.#objectStoreExists();
		};
	}

	#handleCloseError() {
		// safety measure: only one reconnection at a time.
		if (this.#isReconnecting) {
			return;
		}
		this.#isReconnecting = true;

		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) {
			return;
		}

		const idb_request = indexedDB.open(this.#db_name, idb.version + 1);
		this.#setupRequests(idb_request);
	}

	#handleRetry(err: unknown, cb: () => void, retryCount: number, reject: Reject) {
		if (retryCount < 5 && err instanceof DOMException) {
			if (err.message.includes('database connection is closing')) {
				this.#db_Q.add(cb);
				this.#handleCloseError();
			} else if (err.message.includes('the specified object stores was not found')) {
				this.#db_Q.add(cb);
				this.#objectStoreExists();
			} else {
				reject(err as unknown as Event);
			}
		} else {
			reject(err as Event);
		}
	}

	#objectStoreExists() {
		const item = dbsMap.get(this.#db_name);
		const idb = item?.db;
		if (!idb) {
			return;
		}

		if (idb.objectStoreNames.contains(this.#storeName) === false && item.dbs_Q) {
			item.dbs_Q[this.#storeName] = () => {
				const idb = dbsMap.get(this.#db_name)?.db;
				if (!idb) {
					return;
				}
				if (idb.objectStoreNames.contains(this.#storeName) === false) {
					idb.createObjectStore(this.#storeName);
				}
			};

			this.#bumpVersion();
		} else {
			this.#completeObjectStoreSetup();
		}
	}

	#bumpVersion() {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) {
			return;
		}

		this.#isBumpingVersion = true;
		idb.close();
		const req = indexedDB.open(this.#db_name, idb.version + 1);

		this.#setupRequests(req);
	}

	#process_get<T>(resolve: (value: T) => void, reject: Reject, key: IDBValidKey, retryCount = -1) {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) return;
		try {
			const req = idb.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).get(key);

			req.onsuccess = () => resolve(req.result);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get(resolve, reject, key, retryCount), retryCount, reject);
		}
	}

	#process_get_all<T>(resolve: (value: T) => void, reject: Reject, retryCount = -1) {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) return;
		try {
			const req = idb.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).getAll();
			req.onsuccess = () => resolve(req.result as T);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get_all(resolve, reject, retryCount), retryCount, reject);
		}
	}

	#process_get_keys(resolve: (value: Array<IDBValidKey>) => void, reject: Reject, retryCount = -1) {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) return;
		try {
			const req = idb.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).getAllKeys();
			req.onsuccess = () => resolve(req.result);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get_keys(resolve, reject, retryCount), retryCount, reject);
		}
	}

	#process_set(resolve: (value: true) => void, reject: Reject, key: IDBValidKey, value: unknown, retryCount = -1) {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) return;
		try {
			const req = idb.transaction([this.#storeName], 'readwrite').objectStore(this.#storeName).put(value, key);
			req.onsuccess = () => resolve(true);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(
				err,
				() => this.#process_set(resolve, reject, key, value, retryCount),
				retryCount,
				reject
			);
		}
	}

	#process_set_multiple<T extends MultiSetItem<unknown>>(
		resolve: (value: true) => void,
		reject: Reject,
		items: Array<T>,
		retryCount = -1
	) {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) return;

		try {
			const tx = idb.transaction([this.#storeName], 'readwrite');
			if (items.length > 0) {
				for (const item of items) {
					tx.objectStore(this.#storeName).put(item.value, item.key);
					tx.onerror = (e) => reject(e);
				}
				tx.oncomplete = () => resolve(true);
			}
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(
				err,
				() => this.#process_set_multiple(resolve, reject, items, retryCount),
				retryCount,
				reject
			);
		}
	}

	#process_delete(resolve: (value: true) => void, reject: Reject, key: IDBValidKey, retryCount = -1) {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) {
			return;
		}
		try {
			const req = idb.transaction([this.#storeName], 'readwrite').objectStore(this.#storeName).delete(key);
			req.onsuccess = () => resolve(true);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_delete(resolve, reject, key, retryCount), retryCount, reject);
		}
	}

	#process_db_clear(resolve: (value: true) => void, reject: Reject, retryCount = -1) {
		const idb = dbsMap.get(this.#db_name)?.db;
		if (!idb) {
			return;
		}

		try {
			const req = idb.transaction([this.#storeName], 'readwrite').objectStore(this.#storeName).clear();

			req.onsuccess = () => resolve(true);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_db_clear(resolve, reject, retryCount), retryCount, reject);
		}
	}

	async #init() {
		let req: IDBOpenDBRequest;
		let has_db: IDBDatabaseInfo | undefined;

		const dbs = await indexedDB.databases();
		if (dbs.length === 0) {
			req = indexedDB.open(this.#db_name, 0);
		} else {
			has_db = dbs.find((db) => db.name === this.#db_name);
			if (has_db) {
				req = indexedDB.open(this.#db_name);
			} else {
				req = indexedDB.open(this.#db_name, 0);
			}
		}

		dbsMap.set(this.#db_name, {
			db: undefined,
			req,
			dbs_Q: {}
		});

		if (!has_db) {
			this.#setupRequests();
			return;
		}

		this.#objectStoreExists();
	}

	/**
	 * Creates a new IDB instance to interact with IndexedDB
	 * @param db_name - The name of the IndexedDB database to connect to
	 * @param storeName - The name of the object store to use within the database
	 */
	constructor(db_name: DB_Name, storeName: string) {
		this.#db_name = db_name;
		this.#storeName = storeName;

		this.#init();
	}

	#runOrQueue(fn: () => void) {
		if (this.#hasObjectStore === false || this.#isBumpingVersion === true) {
			this.#db_Q.add(fn);
			if (this.#isBumpingVersion === false) {
				this.#setupRequests();
			}
		} else {
			fn();
		}
	}

	/**
	 * Retrieves a value from the database by its key
	 * @template T - The type of value to be returned
	 * @param key - The key to look up in the database
	 * @returns A promise that resolves to the value of type T associated with the key
	 */
	get<T>(key: IDBValidKey): Promise<T> {
		return new Promise((resolve, reject) => {
			this.#runOrQueue(() => this.#process_get(resolve, reject, key));
		});
	}

	/**
	 * Retrieves all values stored in the database
	 * @template T - The type of array to be returned, must extend Array
	 * @returns A promise that resolves to an array of all values in the database
	 */
	getValues<T extends Array<any>>(): Promise<T> {
		return new Promise((resolve, reject) => {
			this.#runOrQueue(() => this.#process_get_all(resolve, reject));
		});
	}

	/**
	 * Retrieves all keys stored in the database
	 * @returns A promise that resolves to an array of all keys in the database
	 */
	getKeys(): Promise<Array<IDBValidKey>> {
		return new Promise((resolve, reject) => {
			this.#runOrQueue(() => this.#process_get_keys(resolve, reject));
		});
	}

	/**
	 * Stores a value in the database with the specified key
	 * @param key - The key to store the value under
	 * @param value - The value to store
	 * @returns A promise that resolves to true when the operation is complete
	 */
	set(key: IDBValidKey, value: unknown): Promise<true> {
		return new Promise((resolve, reject) => {
			this.#runOrQueue(() => this.#process_set(resolve, reject, key, value));
		});
	}

	/**
	 * Stores multiple key-value pairs in the database in a single transaction
	 * @template T - The type of values being stored
	 * @param items - An array of objects containing key-value pairs to store
	 * @returns A promise that resolves to true when all items have been stored
	 */
	setMultiple<T>(items: Array<MultiSetItem<T>>): Promise<true> {
		return new Promise((resolve, reject) => {
			this.#runOrQueue(() => this.#process_set_multiple(resolve, reject, items));
		});
	}

	/**
	 * Deletes a value from the database by its key
	 * @param key - The key of the value to delete
	 * @returns A promise that resolves to true when the value has been deleted
	 */
	del(key: IDBValidKey): Promise<true> {
		return new Promise((resolve, reject) => {
			this.#runOrQueue(() => this.#process_delete(resolve, reject, key));
		});
	}

	/**
	 * Clears all data from the current object store
	 * @returns A promise that resolves to true when the store has been cleared
	 */
	clearStore(): Promise<true> {
		return new Promise((resolve, reject) => {
			this.#runOrQueue(() => this.#process_db_clear(resolve, reject));
		});
	}

	/**
	 * Deletes the entire database
	 * @returns A promise that resolves to true when the database has been deleted
	 * @throws Event if the database cannot be dropped because it is currently bumping version
	 */
	dropDB(): Promise<true> {
		return new Promise((resolve, reject) => {
			if (this.#isBumpingVersion === true) {
				reject(new Event('Cannot drop DB while bumping version'));
				return;
			}

			const idb = dbsMap.get(this.#db_name)?.db;
			idb?.close();

			const deleteRequest = indexedDB.deleteDatabase(this.#db_name);
			deleteRequest.onsuccess = () => {
				const item = dbsMap.get(this.#db_name);
				if (!item) {
					return;
				}
				resolve(true);

				if (idb?.objectStoreNames.length === 0) {
					dbsMap.delete(this.#db_name);
				}
			};
			deleteRequest.onerror = (e) => reject(e);
		});
	}
}
