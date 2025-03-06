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

type IDB_Item = {
	idb: IDBDatabase;
	req: IDBOpenDBRequest;
	upgrade_Q: Record<string, () => void>;
};

type DB_Name = string;
const dbsMap = new Map<DB_Name, IDB_Item>();

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
	#index_db: IDBDatabase | null = null;
	#idb_request: IDBOpenDBRequest | null = null;
	#isBumpingVersion = false;
	#isReconnecting = false; //  prevent duplicate reconnections
	#db_prep_Q = new Set<() => void>();
	#hasObjectStore = false;

	#updateDBinMap(evnt: Event) {
		this.#index_db = (
			evnt.target as unknown as {
				result: IDBDatabase;
			}
		).result;

		if (!this.#index_db) return;

		if (this.#index_db.version === 0) {
			this.#isBumpingVersion = true;
		}
		const item = dbsMap.get(this.#db_name)!;
		dbsMap.set(this.#db_name, {
			idb: this.#index_db,
			req: item.req,
			upgrade_Q: item.upgrade_Q
		});
	}

	#completeObjectStoreSetup() {
		if (!this.#index_db) {
			return;
		}
		this.#isReconnecting = false; // reset reconnect flag on success
		this.#hasObjectStore = true;
		this.#isBumpingVersion = false;

		this.#db_prep_Q.forEach((fn) => fn());
		this.#db_prep_Q.clear();
	}

	#setupRequests() {
		if (!this.#idb_request) return;

		if (this.#idb_request.readyState === 'done') {
			this.#index_db = this.#idb_request.result;
			this.#completeObjectStoreSetup();
			const item = dbsMap.get(this.#db_name)!;
			dbsMap.set(this.#db_name, {
				idb: this.#index_db,
				req: this.#idb_request,
				upgrade_Q: item.upgrade_Q
			});

			return;
		}

		this.#idb_request.onupgradeneeded = (event) => {
			this.#updateDBinMap(event);
			if (this.#index_db && this.#index_db.objectStoreNames.length === 0) {
				if (!this.#index_db.objectStoreNames.contains(this.#storeName)) {
					this.#index_db.createObjectStore(this.#storeName);
					delete dbsMap.get(this.#db_name)!.upgrade_Q[this.#storeName];
				}
				this.#isBumpingVersion = false;
				return;
			}
			const q = dbsMap.get(this.#db_name)?.upgrade_Q;
			if (q && this.#storeName in q) {
				q[this.#storeName]!();
				delete q[this.#storeName];
			}
			this.#isBumpingVersion = false;
		};

		this.#idb_request.onsuccess = (event) => {
			this.#updateDBinMap(event);
			this.#completeObjectStoreSetup();
		};

		this.#idb_request.onerror = (event) => {
			this.#updateDBinMap(event);
			this.#objectStoreExists();
		};
	}

	#handleCloseError() {
		// safety measure: only one reconnection at a time.
		if (this.#isReconnecting) return;
		this.#isReconnecting = true;

		if (!this.#index_db) return;
		this.#idb_request = indexedDB.open(this.#db_name, this.#index_db.version + 1);

		const item = dbsMap.get(this.#db_name)!;
		dbsMap.set(this.#db_name, {
			idb: this.#index_db,
			req: this.#idb_request,
			upgrade_Q: item.upgrade_Q
		});
		this.#setupRequests();
	}

	#handleRetry(err: unknown, cb: () => void, retryCount: number) {
		if (retryCount < 3 && err instanceof DOMException) {
			if (err.message.includes('The database connection is closing')) {
				this.#db_prep_Q.add(cb);
				this.#handleCloseError();
			} else if (err.message.includes('One of the specified object stores was not found')) {
				this.#db_prep_Q.add(cb);
				this.#objectStoreExists();
			}
		}
	}

	#process_get<T>(resolve: (value: T) => void, reject: Reject, key: IDBValidKey, retryCount = -1) {
		if (!this.#index_db) return;
		try {
			const req = this.#index_db.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).get(key);

			req.onsuccess = () => resolve(req.result);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get(resolve, reject, key, retryCount), retryCount);
		}
	}

	#process_get_all<T>(resolve: (value: T) => void, reject: Reject, retryCount = -1) {
		if (!this.#index_db) return;
		try {
			const req = this.#index_db.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).getAll();
			req.onsuccess = () => resolve(req.result as T);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get_all(resolve, reject, retryCount), retryCount);
		}
	}

	#process_get_keys(resolve: (value: Array<IDBValidKey>) => void, reject: Reject, retryCount = -1) {
		if (!this.#index_db) return;
		try {
			const req = this.#index_db
				.transaction([this.#storeName], 'readonly')
				.objectStore(this.#storeName)
				.getAllKeys();
			req.onsuccess = () => resolve(req.result);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get_keys(resolve, reject, retryCount), retryCount);
		}
	}

	#process_set(resolve: (value: true) => void, reject: Reject, key: IDBValidKey, value: unknown, retryCount = -1) {
		if (!this.#index_db) return;
		try {
			const req = this.#index_db
				.transaction([this.#storeName], 'readwrite')
				.objectStore(this.#storeName)
				.put(value, key);
			req.onsuccess = () => resolve(true);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_set(resolve, reject, key, value, retryCount), retryCount);
		}
	}

	#process_set_multiple<T extends MultiSetItem<unknown>>(
		resolve: (value: true) => void,
		reject: Reject,
		items: Array<T>,
		retryCount = -1
	) {
		if (!this.#index_db) return;

		try {
			const tx = this.#index_db.transaction([this.#storeName], 'readwrite');
			if (items.length > 0) {
				for (const item of items) {
					tx.objectStore(this.#storeName).put(item.value, item.key);
					tx.onerror = (e) => reject(e);
				}
				tx.oncomplete = () => resolve(true);
			}
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_set_multiple(resolve, reject, items, retryCount), retryCount);
		}
	}

	#process_delete(resolve: (value: true) => void, reject: Reject, key: IDBValidKey, retryCount = -1) {
		if (!this.#index_db) {
			return;
		}
		try {
			const req = this.#index_db
				.transaction([this.#storeName], 'readwrite')
				.objectStore(this.#storeName)
				.delete(key);
			req.onsuccess = () => resolve(true);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_delete(resolve, reject, key, retryCount), retryCount);
		}
	}

	#process_db_clear(resolve: (value: true) => void, reject: Reject, retryCount = -1) {
		if (!this.#index_db) {
			return;
		}

		try {
			const req = this.#index_db.transaction([this.#storeName], 'readwrite').objectStore(this.#storeName).clear();

			req.onsuccess = () => resolve(true);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_db_clear(resolve, reject, retryCount), retryCount);
		}
	}

	#objectStoreExists() {
		if (!this.#index_db) {
			const idb = dbsMap.get(this.#db_name)?.idb;
			if (!idb) {
				return;
			}
			this.#index_db = idb;
		}

		if (this.#index_db.objectStoreNames.contains(this.#storeName) === false) {
			const item = dbsMap.get(this.#db_name)!;

			if (item.upgrade_Q) {
				item.upgrade_Q[this.#storeName] = () => {
					if (this.#index_db!.objectStoreNames.contains(this.#storeName) === false) {
						this.#index_db!.createObjectStore(this.#storeName);
					}
				};

				this.#bumpVersion();
			}
		} else {
			this.#completeObjectStoreSetup();
		}
	}

	#bumpVersion() {
		if (!this.#index_db) {
			return;
		}

		this.#isBumpingVersion = true;
		this.#index_db.close();
		this.#idb_request = indexedDB.open(this.#db_name, this.#index_db.version + 1);

		const item = dbsMap.get(this.#db_name)!;
		dbsMap.set(this.#db_name, {
			idb: this.#index_db,
			req: this.#idb_request,
			upgrade_Q: item.upgrade_Q
		});

		this.#setupRequests();
	}

	/**
	 * Creates a new IDB instance to interact with IndexedDB
	 * @param db_name - The name of the IndexedDB database to connect to
	 * @param storeName - The name of the object store to use within the database
	 */
	constructor(db_name: DB_Name, storeName: string) {
		this.#db_name = db_name;
		this.#storeName = storeName;
		this.#index_db = dbsMap.get(db_name)?.idb as IDBDatabase;
		this.#idb_request = dbsMap.get(db_name)?.req as IDBOpenDBRequest;

		if (!this.#idb_request) {
			this.#idb_request = indexedDB.open(db_name);
			dbsMap.set(db_name, {
				idb: this.#index_db!,
				req: this.#idb_request,
				upgrade_Q: {}
			});
			this.#setupRequests();
		} else {
			this.#objectStoreExists();
		}
	}

	#runOrQueue(fn: () => void) {
		if (this.#hasObjectStore === false || this.#isBumpingVersion === true) {
			this.#db_prep_Q.add(fn);
			if (this.#hasObjectStore === false && this.#isBumpingVersion === false) {
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

			this.#index_db?.close();

			const deleteRequest = indexedDB.deleteDatabase(this.#db_name);

			deleteRequest.onsuccess = () => {
				this.#index_db = null;
				this.#idb_request = null;
				dbsMap.set(this.#db_name, {
					idb: this.#index_db!,
					req: this.#idb_request!,
					upgrade_Q: {}
				});
				resolve(true);
			};

			deleteRequest.onerror = (e) => reject(e);
		});
	}
}
