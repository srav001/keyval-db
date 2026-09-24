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

const connections = new Map<string, Promise<IDBDatabase>>();
const releases = new WeakMap<IDBDatabase, () => void>();

function open(name: string, store: string, version?: number): Promise<IDBDatabase> {
	const connection = new Promise<IDBDatabase>((resolve, reject) => {
		const req = indexedDB.open(name, version);
		req.onupgradeneeded = () => {
			if (!req.result.objectStoreNames.contains(store)) req.result.createObjectStore(store);
		};
		req.onsuccess = () => {
			const db = req.result;
			// Another tab upgrading or deleting the database, or the browser closing the connection, must not
			// strand later operations on a dead handle; the next operation reopens and recreates what is missing.
			const release = () => {
				db.close();
				if (connections.get(name) === connection) connections.delete(name);
			};
			db.onversionchange = release;
			db.onclose = release;
			releases.set(db, release);
			resolve(db);
		};
		req.onerror = () => reject(req.error);
	});
	connections.set(name, connection);
	connection.catch(() => {
		if (connections.get(name) === connection) connections.delete(name);
	});
	return connection;
}

async function connect(name: string, store: string): Promise<IDBDatabase> {
	const connection = connections.get(name) ?? open(name, store);
	const db = await connection;
	if (db.objectStoreNames.contains(store)) return db;
	// Adding a store needs a version upgrade. Only the first caller to see this connection upgrades it; the
	// rest wait for the replacement and upgrade again only if their own store is still missing.
	if (connections.get(name) === connection) {
		db.close();
		void open(name, store, db.version + 1);
	}
	return connect(name, store);
}

const recoverable: readonly string[] = ['AbortError', 'InvalidStateError', 'NotFoundError', 'VersionError'];

/**
 * A class for interacting with IndexedDB through a simple key-value interface
 *
 * This class provides a Promise-based API for storing and retrieving data from
 * IndexedDB. Connections, object store creation, version upgrades and recovery
 * from a deleted or externally upgraded database are handled automatically.
 * Operations issued before the connection is ready wait for it, and every
 * operation runs in its own transaction, so reads run concurrently.
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
	#name: string;
	#store: string;

	/**
	 * Creates a new IDB instance to interact with IndexedDB
	 * @param db_name - The name of the IndexedDB database to connect to
	 * @param storeName - The name of the object store to use within the database
	 */
	constructor(db_name: string, storeName: string) {
		this.#name = db_name;
		this.#store = storeName;
		// Opening eagerly lets the first operation skip the connection wait; failures surface on that operation.
		connect(db_name, storeName).catch(() => undefined);
	}

	async #run<T>(
		mode: IDBTransactionMode,
		operation: (store: IDBObjectStore) => IDBRequest<T> | void,
		attempt = 0
	): Promise<T> {
		let db: IDBDatabase | undefined;
		try {
			const connected = (db = await connect(this.#name, this.#store));
			return await new Promise<T>((resolve, reject) => {
				const tx = connected.transaction(this.#store, mode);
				const req = operation(tx.objectStore(this.#store));
				// Reads resolve as soon as the value arrives; writes wait for the commit so success means durable.
				if (mode === 'readonly' && req) req.onsuccess = () => resolve(req.result);
				else tx.oncomplete = () => resolve(req?.result as T);
				tx.onabort = () => reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));
			});
		} catch (error) {
			if (attempt < 3 && error instanceof DOMException && recoverable.includes(error.name)) {
				if (db) releases.get(db)?.();
				return this.#run(mode, operation, attempt + 1);
			}
			throw error;
		}
	}

	/**
	 * Retrieves a value from the database by its key
	 * @template T - The type of value to be returned
	 * @param key - The key to look up in the database
	 * @returns A promise that resolves to the value of type T associated with the key
	 */
	get = <T>(key: IDBValidKey): Promise<T> => this.#run<T>('readonly', (store) => store.get(key));

	/**
	 * Retrieves all values stored in the database
	 * @template T - The type of array to be returned, must extend Array
	 * @returns A promise that resolves to an array of all values in the database
	 */
	getValues = <T extends Array<unknown>>(): Promise<T> =>
		this.#run('readonly', (store) => store.getAll()) as Promise<T>;

	/**
	 * Retrieves all keys stored in the database
	 * @returns A promise that resolves to an array of all keys in the database
	 */
	getKeys = (): Promise<Array<IDBValidKey>> => this.#run('readonly', (store) => store.getAllKeys());

	/**
	 * Stores a value in the database with the specified key
	 * @param key - The key to store the value under
	 * @param value - The value to store
	 * @returns A promise that resolves to true once the write is committed
	 */
	set = async (key: IDBValidKey, value: unknown): Promise<true> => {
		await this.#run('readwrite', (store) => store.put(value, key));
		return true;
	};

	/**
	 * Stores multiple key-value pairs in the database in a single transaction
	 * @template T - The type of values being stored
	 * @param items - An array of objects containing key-value pairs to store
	 * @returns A promise that resolves to true once all items are committed
	 */
	setMultiple = async <T>(items: Array<MultiSetItem<T>>): Promise<true> => {
		await this.#run('readwrite', (store) => {
			for (const item of items) store.put(item.value, item.key);
		});
		return true;
	};

	/**
	 * Deletes a value from the database by its key
	 * @param key - The key of the value to delete
	 * @returns A promise that resolves to true once the deletion is committed
	 */
	del = async (key: IDBValidKey): Promise<true> => {
		await this.#run('readwrite', (store) => store.delete(key));
		return true;
	};

	/**
	 * Clears all data from the current object store
	 * @returns A promise that resolves to true once the store is cleared
	 */
	clearStore = async (): Promise<true> => {
		await this.#run('readwrite', (store) => store.clear());
		return true;
	};

	/**
	 * Deletes the entire database. A later operation on any instance recreates it.
	 * @returns A promise that resolves to true when the database has been deleted
	 */
	dropDB = async (): Promise<true> => {
		const connection = connections.get(this.#name);
		connections.delete(this.#name);
		(await connection?.catch(() => undefined))?.close();
		return new Promise((resolve, reject) => {
			const req = indexedDB.deleteDatabase(this.#name);
			req.onsuccess = () => resolve(true);
			req.onerror = () => reject(req.error);
		});
	};
}
