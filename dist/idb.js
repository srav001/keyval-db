var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _IDB_instances, _IDB_db_name, _IDB_storeName, _IDB_index_db, _IDB_idb_request, _IDB_isBumpingVersion, _IDB_isReconnecting, _IDB_db_prep_Q, _IDB_hasObjectStore, _IDB_updateDBinMap, _IDB_completeObjectStoreSetup, _IDB_setupRequests, _IDB_handleCloseError, _IDB_handleRetry, _IDB_process_get, _IDB_process_get_all, _IDB_process_get_keys, _IDB_process_set, _IDB_process_set_multiple, _IDB_process_delete, _IDB_process_db_clear, _IDB_objectStoreExists, _IDB_bumpVersion, _IDB_runOrQueue;
const dbsMap = new Map();
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
    /**
     * Creates a new IDB instance to interact with IndexedDB
     * @param db_name - The name of the IndexedDB database to connect to
     * @param storeName - The name of the object store to use within the database
     */
    constructor(db_name, storeName) {
        var _a, _b;
        _IDB_instances.add(this);
        _IDB_db_name.set(this, void 0);
        _IDB_storeName.set(this, void 0);
        _IDB_index_db.set(this, null);
        _IDB_idb_request.set(this, null);
        _IDB_isBumpingVersion.set(this, false);
        _IDB_isReconnecting.set(this, false); //  prevent duplicate reconnections
        _IDB_db_prep_Q.set(this, new Set());
        _IDB_hasObjectStore.set(this, false);
        __classPrivateFieldSet(this, _IDB_db_name, db_name, "f");
        __classPrivateFieldSet(this, _IDB_storeName, storeName, "f");
        __classPrivateFieldSet(this, _IDB_index_db, (_a = dbsMap.get(db_name)) === null || _a === void 0 ? void 0 : _a.idb, "f");
        __classPrivateFieldSet(this, _IDB_idb_request, (_b = dbsMap.get(db_name)) === null || _b === void 0 ? void 0 : _b.req, "f");
        if (!__classPrivateFieldGet(this, _IDB_idb_request, "f")) {
            __classPrivateFieldSet(this, _IDB_idb_request, indexedDB.open(db_name), "f");
            dbsMap.set(db_name, {
                idb: __classPrivateFieldGet(this, _IDB_index_db, "f"),
                req: __classPrivateFieldGet(this, _IDB_idb_request, "f"),
                upgrade_Q: {},
            });
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_setupRequests).call(this);
        }
        else {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_objectStoreExists).call(this);
        }
    }
    /**
     * Retrieves a value from the database by its key
     * @template T - The type of value to be returned
     * @param key - The key to look up in the database
     * @returns A promise that resolves to the value of type T associated with the key
     */
    get(key) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get).call(this, resolve, reject, key));
        });
    }
    /**
     * Retrieves all values stored in the database
     * @template T - The type of array to be returned, must extend Array
     * @returns A promise that resolves to an array of all values in the database
     */
    getValues() {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_all).call(this, resolve, reject));
        });
    }
    /**
     * Retrieves all keys stored in the database
     * @returns A promise that resolves to an array of all keys in the database
     */
    getKeys() {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_keys).call(this, resolve, reject));
        });
    }
    /**
     * Stores a value in the database with the specified key
     * @param key - The key to store the value under
     * @param value - The value to store
     * @returns A promise that resolves to true when the operation is complete
     */
    set(key, value) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set).call(this, resolve, reject, key, value));
        });
    }
    /**
     * Stores multiple key-value pairs in the database in a single transaction
     * @template T - The type of values being stored
     * @param items - An array of objects containing key-value pairs to store
     * @returns A promise that resolves to true when all items have been stored
     */
    setMultiple(items) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set_multiple).call(this, resolve, reject, items));
        });
    }
    /**
     * Deletes a value from the database by its key
     * @param key - The key of the value to delete
     * @returns A promise that resolves to true when the value has been deleted
     */
    del(key) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_delete).call(this, resolve, reject, key));
        });
    }
    /**
     * Clears all data from the current object store
     * @returns A promise that resolves to true when the store has been cleared
     */
    clearStore() {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_db_clear).call(this, resolve, reject));
        });
    }
    /**
     * Deletes the entire database
     * @returns A promise that resolves to true when the database has been deleted
     * @throws Event if the database cannot be dropped because it is currently bumping version
     */
    dropDB() {
        return new Promise((resolve, reject) => {
            var _a;
            if (__classPrivateFieldGet(this, _IDB_isBumpingVersion, "f") === true) {
                reject(new Event("Cannot drop DB while bumping version"));
                return;
            }
            (_a = __classPrivateFieldGet(this, _IDB_index_db, "f")) === null || _a === void 0 ? void 0 : _a.close();
            const deleteRequest = indexedDB.deleteDatabase(__classPrivateFieldGet(this, _IDB_db_name, "f"));
            deleteRequest.onsuccess = () => {
                __classPrivateFieldSet(this, _IDB_index_db, null, "f");
                __classPrivateFieldSet(this, _IDB_idb_request, null, "f");
                dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), {
                    idb: __classPrivateFieldGet(this, _IDB_index_db, "f"),
                    req: __classPrivateFieldGet(this, _IDB_idb_request, "f"),
                    upgrade_Q: {},
                });
                resolve(true);
            };
            deleteRequest.onerror = (e) => reject(e);
        });
    }
}
_IDB_db_name = new WeakMap(), _IDB_storeName = new WeakMap(), _IDB_index_db = new WeakMap(), _IDB_idb_request = new WeakMap(), _IDB_isBumpingVersion = new WeakMap(), _IDB_isReconnecting = new WeakMap(), _IDB_db_prep_Q = new WeakMap(), _IDB_hasObjectStore = new WeakMap(), _IDB_instances = new WeakSet(), _IDB_updateDBinMap = function _IDB_updateDBinMap(evnt) {
    __classPrivateFieldSet(this, _IDB_index_db, evnt.target.result, "f");
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f"))
        return;
    if (__classPrivateFieldGet(this, _IDB_index_db, "f").version === 0) {
        __classPrivateFieldSet(this, _IDB_isBumpingVersion, true, "f");
    }
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), {
        idb: __classPrivateFieldGet(this, _IDB_index_db, "f"),
        req: item.req,
        upgrade_Q: item.upgrade_Q,
    });
}, _IDB_completeObjectStoreSetup = function _IDB_completeObjectStoreSetup() {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _IDB_isReconnecting, false, "f"); // reset reconnect flag on success
    __classPrivateFieldSet(this, _IDB_hasObjectStore, true, "f");
    __classPrivateFieldSet(this, _IDB_isBumpingVersion, false, "f");
    __classPrivateFieldGet(this, _IDB_db_prep_Q, "f").forEach((fn) => fn());
    __classPrivateFieldGet(this, _IDB_db_prep_Q, "f").clear();
}, _IDB_setupRequests = function _IDB_setupRequests() {
    if (!__classPrivateFieldGet(this, _IDB_idb_request, "f"))
        return;
    if (__classPrivateFieldGet(this, _IDB_idb_request, "f").readyState === "done") {
        __classPrivateFieldSet(this, _IDB_index_db, __classPrivateFieldGet(this, _IDB_idb_request, "f").result, "f");
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_completeObjectStoreSetup).call(this);
        const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
        dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), {
            idb: __classPrivateFieldGet(this, _IDB_index_db, "f"),
            req: __classPrivateFieldGet(this, _IDB_idb_request, "f"),
            upgrade_Q: item.upgrade_Q,
        });
        return;
    }
    __classPrivateFieldGet(this, _IDB_idb_request, "f").onupgradeneeded = (event) => {
        var _a;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_updateDBinMap).call(this, event);
        if (__classPrivateFieldGet(this, _IDB_index_db, "f") && __classPrivateFieldGet(this, _IDB_index_db, "f").objectStoreNames.length === 0) {
            if (!__classPrivateFieldGet(this, _IDB_index_db, "f").objectStoreNames.contains(__classPrivateFieldGet(this, _IDB_storeName, "f"))) {
                __classPrivateFieldGet(this, _IDB_index_db, "f").createObjectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"));
                delete dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f")).upgrade_Q[__classPrivateFieldGet(this, _IDB_storeName, "f")];
            }
            __classPrivateFieldSet(this, _IDB_isBumpingVersion, false, "f");
            return;
        }
        const q = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.upgrade_Q;
        if (q && __classPrivateFieldGet(this, _IDB_storeName, "f") in q) {
            q[__classPrivateFieldGet(this, _IDB_storeName, "f")]();
            delete q[__classPrivateFieldGet(this, _IDB_storeName, "f")];
        }
        __classPrivateFieldSet(this, _IDB_isBumpingVersion, false, "f");
    };
    __classPrivateFieldGet(this, _IDB_idb_request, "f").onsuccess = (event) => {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_updateDBinMap).call(this, event);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_completeObjectStoreSetup).call(this);
    };
    __classPrivateFieldGet(this, _IDB_idb_request, "f").onerror = (event) => {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_updateDBinMap).call(this, event);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_objectStoreExists).call(this);
    };
}, _IDB_handleCloseError = function _IDB_handleCloseError() {
    // safety measure: only one reconnection at a time.
    if (__classPrivateFieldGet(this, _IDB_isReconnecting, "f"))
        return;
    __classPrivateFieldSet(this, _IDB_isReconnecting, true, "f");
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f"))
        return;
    __classPrivateFieldSet(this, _IDB_idb_request, indexedDB.open(__classPrivateFieldGet(this, _IDB_db_name, "f"), __classPrivateFieldGet(this, _IDB_index_db, "f").version + 1), "f");
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), {
        idb: __classPrivateFieldGet(this, _IDB_index_db, "f"),
        req: __classPrivateFieldGet(this, _IDB_idb_request, "f"),
        upgrade_Q: item.upgrade_Q,
    });
    __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_setupRequests).call(this);
}, _IDB_handleRetry = function _IDB_handleRetry(err, cb, retryCount) {
    if (retryCount < 3 &&
        err instanceof DOMException &&
        err.message ===
            "Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.") {
        __classPrivateFieldGet(this, _IDB_db_prep_Q, "f").add(cb);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleCloseError).call(this);
    }
}, _IDB_process_get = function _IDB_process_get(resolve, reject, key, retryCount = -1) {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f"))
        return;
    try {
        const req = __classPrivateFieldGet(this, _IDB_index_db, "f")
            .transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], "readonly")
            .objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"))
            .get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get).call(this, resolve, reject, key, retryCount), retryCount);
    }
}, _IDB_process_get_all = function _IDB_process_get_all(resolve, reject, retryCount = -1) {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f"))
        return;
    try {
        const req = __classPrivateFieldGet(this, _IDB_index_db, "f")
            .transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], "readonly")
            .objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"))
            .getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_all).call(this, resolve, reject, retryCount), retryCount);
    }
}, _IDB_process_get_keys = function _IDB_process_get_keys(resolve, reject, retryCount = -1) {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f"))
        return;
    try {
        const req = __classPrivateFieldGet(this, _IDB_index_db, "f")
            .transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], "readonly")
            .objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"))
            .getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_keys).call(this, resolve, reject, retryCount), retryCount);
    }
}, _IDB_process_set = function _IDB_process_set(resolve, reject, key, value, retryCount = -1) {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f"))
        return;
    try {
        const req = __classPrivateFieldGet(this, _IDB_index_db, "f")
            .transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], "readwrite")
            .objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"))
            .put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set).call(this, resolve, reject, key, value, retryCount), retryCount);
    }
}, _IDB_process_set_multiple = function _IDB_process_set_multiple(resolve, reject, items, retryCount = -1) {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f"))
        return;
    try {
        const tx = __classPrivateFieldGet(this, _IDB_index_db, "f").transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], "readwrite");
        if (items.length > 0) {
            for (const item of items) {
                tx.objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f")).put(item.value, item.key);
                tx.onerror = (e) => reject(e);
            }
            tx.oncomplete = () => resolve(true);
        }
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set_multiple).call(this, resolve, reject, items, retryCount), retryCount);
    }
}, _IDB_process_delete = function _IDB_process_delete(resolve, reject, key, retryCount = -1) {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f")) {
        return;
    }
    try {
        const req = __classPrivateFieldGet(this, _IDB_index_db, "f")
            .transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], "readwrite")
            .objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"))
            .delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_delete).call(this, resolve, reject, key, retryCount), retryCount);
    }
}, _IDB_process_db_clear = function _IDB_process_db_clear(resolve, reject, retryCount = -1) {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f")) {
        return;
    }
    try {
        const req = __classPrivateFieldGet(this, _IDB_index_db, "f")
            .transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], "readwrite")
            .objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"))
            .clear();
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_db_clear).call(this, resolve, reject, retryCount), retryCount);
    }
}, _IDB_objectStoreExists = function _IDB_objectStoreExists() {
    var _a;
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f")) {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.idb;
        if (!idb) {
            return;
        }
        __classPrivateFieldSet(this, _IDB_index_db, idb, "f");
    }
    if (__classPrivateFieldGet(this, _IDB_index_db, "f").objectStoreNames.contains(__classPrivateFieldGet(this, _IDB_storeName, "f")) === false) {
        const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
        if (item.upgrade_Q) {
            item.upgrade_Q[__classPrivateFieldGet(this, _IDB_storeName, "f")] = () => {
                if (__classPrivateFieldGet(this, _IDB_index_db, "f").objectStoreNames.contains(__classPrivateFieldGet(this, _IDB_storeName, "f")) === false) {
                    __classPrivateFieldGet(this, _IDB_index_db, "f").createObjectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"));
                }
            };
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_bumpVersion).call(this);
        }
    }
    else {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_completeObjectStoreSetup).call(this);
    }
}, _IDB_bumpVersion = function _IDB_bumpVersion() {
    if (!__classPrivateFieldGet(this, _IDB_index_db, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _IDB_isBumpingVersion, true, "f");
    __classPrivateFieldGet(this, _IDB_index_db, "f").close();
    __classPrivateFieldSet(this, _IDB_idb_request, indexedDB.open(__classPrivateFieldGet(this, _IDB_db_name, "f"), __classPrivateFieldGet(this, _IDB_index_db, "f").version + 1), "f");
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), {
        idb: __classPrivateFieldGet(this, _IDB_index_db, "f"),
        req: __classPrivateFieldGet(this, _IDB_idb_request, "f"),
        upgrade_Q: item.upgrade_Q,
    });
    __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_setupRequests).call(this);
}, _IDB_runOrQueue = function _IDB_runOrQueue(fn) {
    if (__classPrivateFieldGet(this, _IDB_hasObjectStore, "f") === false || __classPrivateFieldGet(this, _IDB_isBumpingVersion, "f") === true) {
        __classPrivateFieldGet(this, _IDB_db_prep_Q, "f").add(fn);
        if (__classPrivateFieldGet(this, _IDB_hasObjectStore, "f") === false && __classPrivateFieldGet(this, _IDB_isBumpingVersion, "f") === false) {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_setupRequests).call(this);
        }
    }
    else {
        fn();
    }
};
