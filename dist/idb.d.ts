/**
 * Object representing a key-value pair for batch operations
 * @template T - The type of the value being stored
 */
type MultiSetItem<T> = {
    /** The key to store the value under */
    key: IDBValidKey;
    /** The value to store */
    value: T;
};
type DB_Name = string;
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
export declare class IDB {
    #private;
    /**
     * Creates a new IDB instance to interact with IndexedDB
     * @param db_name - The name of the IndexedDB database to connect to
     * @param storeName - The name of the object store to use within the database
     */
    constructor(db_name: DB_Name, storeName: string);
    /**
     * Retrieves a value from the database by its key
     * @template T - The type of value to be returned
     * @param key - The key to look up in the database
     * @returns A promise that resolves to the value of type T associated with the key
     */
    get<T>(key: IDBValidKey): Promise<T>;
    /**
     * Retrieves all values stored in the database
     * @template T - The type of array to be returned, must extend Array
     * @returns A promise that resolves to an array of all values in the database
     */
    getValues<T extends Array<any>>(): Promise<T>;
    /**
     * Retrieves all keys stored in the database
     * @returns A promise that resolves to an array of all keys in the database
     */
    getKeys(): Promise<Array<IDBValidKey>>;
    /**
     * Stores a value in the database with the specified key
     * @param key - The key to store the value under
     * @param value - The value to store
     * @returns A promise that resolves to true when the operation is complete
     */
    set(key: IDBValidKey, value: unknown): Promise<true>;
    /**
     * Stores multiple key-value pairs in the database in a single transaction
     * @template T - The type of values being stored
     * @param items - An array of objects containing key-value pairs to store
     * @returns A promise that resolves to true when all items have been stored
     */
    setMultiple<T>(items: Array<MultiSetItem<T>>): Promise<true>;
    /**
     * Deletes a value from the database by its key
     * @param key - The key of the value to delete
     * @returns A promise that resolves to true when the value has been deleted
     */
    del(key: IDBValidKey): Promise<true>;
    /**
     * Clears all data from the current object store
     * @returns A promise that resolves to true when the store has been cleared
     */
    clearStore(): Promise<true>;
    /**
     * Deletes the entire database
     * @returns A promise that resolves to true when the database has been deleted
     * @throws Event if the database cannot be dropped because it is currently bumping version
     */
    dropDB(): Promise<true>;
}
export {};
