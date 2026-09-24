import { Data, Effect } from 'effect';

import { connect, drop, isRecoverable, transact, type MultiSetItem, type Operation } from './idb.js';

export type { MultiSetItem } from './idb.js';

/**
 * A failed IndexedDB operation.
 * `reason` is the `DOMException` name, such as `QuotaExceededError`, and `cause` is the original error.
 */
export class IDBError extends Data.TaggedError('IDBError')<{ readonly reason: string; readonly cause: unknown }> {}

function toError(cause: unknown): IDBError {
	return new IDBError({ reason: cause instanceof DOMException ? cause.name : 'UnknownError', cause });
}

/**
 * An Effect-native key-value interface over an IndexedDB object store.
 *
 * It shares connections, store creation, upgrades and recovery with the Promise API. Interrupting an
 * operation aborts its transaction, so an interrupted write is never committed.
 *
 * @example
 * ```typescript
 * const db = new IDB('myDatabase', 'myStore');
 *
 * const program = Effect.gen(function* () {
 * 	yield* db.set('key1', { data: 'example' });
 * 	return yield* db.get<{ data: string }>('key1');
 * });
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

	#run = <T>(mode: IDBTransactionMode, operation: Operation<T>): Effect.Effect<T, IDBError> =>
		Effect.tryPromise({ try: () => connect(this.#name, this.#store), catch: toError }).pipe(
			Effect.flatMap((db) =>
				Effect.callback<T, IDBError>((resume) => {
					const abort = transact(
						db,
						this.#store,
						mode,
						operation,
						(value) => resume(Effect.succeed(value)),
						(error) => resume(Effect.fail(toError(error)))
					);
					return Effect.sync(abort);
				})
			),
			Effect.retry({ times: 3, while: (error) => isRecoverable(error.cause) })
		);

	/**
	 * Retrieves a value from the database by its key
	 * @template T - The type of value to be returned
	 * @param key - The key to look up in the database
	 */
	get = <T>(key: IDBValidKey): Effect.Effect<T, IDBError> => this.#run<T>('readonly', (store) => store.get(key));

	/**
	 * Retrieves all values stored in the database
	 * @template T - The type of array to be returned
	 */
	getValues = <T extends Array<unknown>>(): Effect.Effect<T, IDBError> =>
		this.#run('readonly', (store) => store.getAll()) as Effect.Effect<T, IDBError>;

	/** Retrieves all keys stored in the database */
	getKeys = (): Effect.Effect<Array<IDBValidKey>, IDBError> => this.#run('readonly', (store) => store.getAllKeys());

	/**
	 * Stores a value in the database with the specified key; succeeds once the write is committed
	 * @param key - The key to store the value under
	 * @param value - The value to store
	 */
	set = (key: IDBValidKey, value: unknown): Effect.Effect<void, IDBError> =>
		Effect.asVoid(this.#run('readwrite', (store) => store.put(value, key)));

	/**
	 * Stores multiple key-value pairs in a single transaction; succeeds once all items are committed
	 * @param items - An array of objects containing key-value pairs to store
	 */
	setMultiple = <T>(items: Array<MultiSetItem<T>>): Effect.Effect<void, IDBError> =>
		this.#run<void>('readwrite', (store) => {
			for (const item of items) store.put(item.value, item.key);
		});

	/**
	 * Deletes a value from the database by its key; succeeds once the deletion is committed
	 * @param key - The key of the value to delete
	 */
	del = (key: IDBValidKey): Effect.Effect<void, IDBError> => this.#run('readwrite', (store) => store.delete(key));

	/** Clears all data from the current object store; succeeds once the store is cleared */
	clearStore = (): Effect.Effect<void, IDBError> => this.#run('readwrite', (store) => store.clear());

	/** Deletes the entire database. A later operation on any instance recreates it. */
	dropDB = (): Effect.Effect<void, IDBError> => Effect.tryPromise({ try: () => drop(this.#name), catch: toError });
}

const dbs = new Map<string, IDB>();

/**
 * Returns a cached Effect IDB instance for the database and store, creating it on first use.
 * @param db_name - The name of the IndexedDB database to connect to
 * @param tableName - The name of the object store to use within the database
 */
export function getDB(db_name: string, tableName: string): IDB {
	const key = `${db_name}:${tableName}`;
	let db = dbs.get(key);
	if (!db) dbs.set(key, (db = new IDB(db_name, tableName)));
	return db;
}
