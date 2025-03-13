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
		stores_Q: Set<() => boolean>;
		status: 'init' | 'connecting' | 'connected' | 'upgrading';
	}
>();

window.dbsMap = dbsMap;

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

	#db_Q = new Set<() => void>();

	async #runStores_Q() {
		const item = dbsMap.get(this.#db_name)!;

		console.log('runStores_Q', this.#db_name, this.#storeName);
		for (const fn of item.stores_Q) {
			const v = fn();
			if (v === false) {
				console.log('false', this.#db_name, this.#storeName);
				break;
			} else {
				item.stores_Q.delete(fn);
			}
		}
	}

	#update_db(idb: IDBDatabase) {
		dbsMap.get(this.#db_name)!.db = idb;
		if (this.#db_name === 'cohesiv-db') {
			console.log('#update_db', this.#storeName);
		}
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

		if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
			console.log('#updateDBinMap', idb.objectStoreNames, idb.objectStoreNames.length, idb.version);
		}

		this.#update_db(idb);
	}

	#markObjectStoreConnected(): boolean {
		this.#hasObjectStore = true;
		this.#isBumpingVersion = false;

		if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
			console.log('#connected');
		}
		this.#db_Q.forEach((fn) => fn());
		this.#db_Q.clear();

		const value = dbsMap.get(this.#db_name)!;
		if (value.status !== 'connected') {
			value.status = 'connected';
			dbsMap.set(this.#db_name, value);
		}

		return true;
	}

	#setupRequests(req: IDBOpenDBRequest) {
		if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
			console.log('setup');
		}

		const item = dbsMap.get(this.#db_name)!;
		item.status = 'connecting';
		dbsMap.set(this.#db_name, item);

		if (req.readyState === 'done') {
			if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
				console.log('done');
			}

			this.#update_db(req.result);
			this.#markObjectStoreConnected();

			return;
		}

		req.onupgradeneeded = (event) => {
			if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
				console.log('onupgradeneeded');
			}

			const idb = (
				event.target as unknown as {
					result: IDBDatabase;
				}
			).result;

			if (!idb) return;

			if (idb.objectStoreNames.length === 0 || idb.objectStoreNames.contains(this.#storeName) === false) {
				idb.createObjectStore(this.#storeName);
				this.#isBumpingVersion = false;

				if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
					console.log('createObjectStore');
				}

				return;
			}
		};

		req.onsuccess = (event) => {
			if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
				console.log('onsuccess');
			}
			this.#updateDBinMap(event);
			this.#markObjectStoreConnected();
			this.#runStores_Q();
		};

		req.onerror = (event) => {
			if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
				console.log('onerror');
			}

			this.#updateDBinMap(event);
			this.#objectStoreExists();
		};
	}

	#bumpVersion() {
		this.#isBumpingVersion = true;

		const item = dbsMap.get(this.#db_name)!;
		const idb = item?.db;
		if (!idb) {
			return;
		}
		item.status = 'upgrading';
		console.log('bumping', this.#db_name, idb.version);
		idb.close();
		dbsMap.set(this.#db_name, item);

		const req = indexedDB.open(this.#db_name, idb.version + 1);
		this.#setupRequests(req);
	}

	#objectStoreExists(): boolean {
		const item = dbsMap.get(this.#db_name);
		const idb = item?.db;
		if (!idb) {
			this.#pre_init();
			return false;
		}

		if (idb.objectStoreNames.contains(this.#storeName) === false) {
			item.stores_Q.add(() => {
				const dbItem = dbsMap.get(this.#db_name);
				const idb = dbItem?.db;
				if (!idb) {
					return false;
				}
				if (idb.objectStoreNames.contains(this.#storeName) === false) {
					idb.createObjectStore(this.#storeName);
					dbItem.db = idb;
					dbsMap.set(this.#db_name, dbItem);
					this.#markObjectStoreConnected();
				}
				return true;
			});

			this.#bumpVersion();
			return false;
		} else {
			this.#markObjectStoreConnected();
			return true;
		}
	}

	#handleRetry(err: unknown, cb: () => void, retryCount: number, reject: Reject) {
		if (retryCount < 5 && err instanceof DOMException) {
			if (
				err.message.includes('database connection is closing') ||
				err.message.includes('the specified object stores was not found')
			) {
				this.#db_Q.add(cb);
				const item = dbsMap.get(this.#db_name)!;
				item.status = 'upgrading';
				dbsMap.set(this.#db_name, item);

				this.#objectStoreExists();
			} else {
				reject(err as unknown as Event);
			}
		} else {
			reject(err as Event);
		}
	}

	#handleNoDB(cb: () => void, retryCount: number, reject: Reject) {
		if (retryCount < 5) {
			this.#db_Q.add(cb);
			this.#objectStoreExists();
		} else {
			reject(new Event('Database not found'));
		}
	}

	#process_get<T>(resolve: (value: T) => void, reject: Reject, key: IDBValidKey, retryCount = -1) {
		try {
			const idb = dbsMap.get(this.#db_name)?.db;
			if (!idb) {
				retryCount = retryCount + 1;
				return this.#handleNoDB(() => this.#process_get(resolve, reject, key, retryCount), retryCount, reject);
			}

			const req = idb.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).get(key);

			req.onsuccess = () => resolve(req.result);
			req.onerror = (e) => reject(e);
		} catch (err) {
			// @ts-expect-error SHUT IT
			console.log(this.#db_name, this.#storeName, err.message);

			retryCount = retryCount + 1;
			console.log(retryCount, key);

			this.#handleRetry(err, () => this.#process_get(resolve, reject, key, retryCount), retryCount, reject);
		}
	}

	#process_get_all<T>(resolve: (value: T) => void, reject: Reject, retryCount = -1) {
		try {
			const idb = dbsMap.get(this.#db_name)?.db;
			if (!idb) {
				return this.#handleNoDB(() => this.#process_get_all(resolve, reject, retryCount), retryCount, reject);
			}

			const req = idb.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).getAll();
			req.onsuccess = () => resolve(req.result as T);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get_all(resolve, reject, retryCount), retryCount, reject);
		}
	}

	#process_get_keys(resolve: (value: Array<IDBValidKey>) => void, reject: Reject, retryCount = -1) {
		try {
			const idb = dbsMap.get(this.#db_name)?.db;
			if (!idb) {
				return this.#handleNoDB(() => this.#process_get_keys(resolve, reject, retryCount), retryCount, reject);
			}

			const req = idb.transaction([this.#storeName], 'readonly').objectStore(this.#storeName).getAllKeys();
			req.onsuccess = () => resolve(req.result);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_get_keys(resolve, reject, retryCount), retryCount, reject);
		}
	}

	#process_set(resolve: (value: true) => void, reject: Reject, key: IDBValidKey, value: unknown, retryCount = -1) {
		try {
			const idb = dbsMap.get(this.#db_name)?.db;
			if (!idb) {
				return this.#handleNoDB(
					() => this.#process_set(resolve, reject, key, value, retryCount),
					retryCount,
					reject
				);
			}

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
		try {
			const idb = dbsMap.get(this.#db_name)?.db;
			if (!idb) {
				return this.#handleNoDB(
					() => this.#process_set_multiple(resolve, reject, items, retryCount),
					retryCount,
					reject
				);
			}

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
		try {
			const idb = dbsMap.get(this.#db_name)?.db;
			if (!idb) {
				return this.#handleNoDB(
					() => this.#process_delete(resolve, reject, key, retryCount),
					retryCount,
					reject
				);
			}
			const req = idb.transaction([this.#storeName], 'readwrite').objectStore(this.#storeName).delete(key);
			req.onsuccess = () => resolve(true);
			req.onerror = (e) => reject(e);
		} catch (err) {
			retryCount = retryCount + 1;
			this.#handleRetry(err, () => this.#process_delete(resolve, reject, key, retryCount), retryCount, reject);
		}
	}

	#process_db_clear(resolve: (value: true) => void, reject: Reject, retryCount = -1) {
		try {
			const idb = dbsMap.get(this.#db_name)?.db;
			if (!idb) {
				return this.#handleNoDB(() => this.#process_db_clear(resolve, reject, retryCount), retryCount, reject);
			}

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
			req = indexedDB.open(this.#db_name, 1);
		} else {
			const item = dbsMap.get(this.#db_name)!;
			if (item.status !== 'init') {
				if (item.status === 'connected') {
					return this.#objectStoreExists();
				}
				item.stores_Q.add(() => this.#objectStoreExists());
				return;
			} else {
				has_db = dbs.find((db) => db.name === this.#db_name);
				if (has_db) {
					if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
						console.log(item);
					}
					has_db = undefined;
					req = indexedDB.open(this.#db_name);
				} else {
					req = indexedDB.open(this.#db_name, 1);
				}
			}
		}

		if (!has_db) {
			const item = dbsMap.get(this.#db_name)!;
			item.req = req;
			dbsMap.set(this.#db_name, item);

			if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
				console.log('init 2');
			}

			this.#setupRequests(req);
			return;
		}
	}

	#pre_init() {
		if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
			console.log('actual init');
		}
		const item = dbsMap.get(this.#db_name);
		if (!item) {
			dbsMap.set(this.#db_name, {
				db: undefined,
				// @ts-expect-error this is fine for now
				req: undefined,
				stores_Q: new Set(),
				status: 'init'
			});
		}
		this.#init();
	}

	/**
	 * Creates a new IDB instance to interact with IndexedDB
	 * @param db_name - The name of the IndexedDB database to connect to
	 * @param storeName - The name of the object store to use within the database
	 */
	constructor(db_name: DB_Name, storeName: string) {
		this.#db_name = db_name;
		this.#storeName = storeName;

		this.#pre_init();
	}

	#runOrQueue(fn: () => void) {
		const item = dbsMap.get(this.#db_name);
		if (this.#db_name === 'cohesiv-db' && this.#storeName === 'store') {
			console.log(item?.status);
		}
		if (
			(item && item.status !== 'connected') ||
			this.#hasObjectStore === false ||
			this.#isBumpingVersion === true
		) {
			this.#db_Q.add(fn);
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
			console.log('drop', this.#db_name, this.#storeName);
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
