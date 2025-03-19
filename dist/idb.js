var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _IDB_instances, _IDB_db_name, _IDB_storeName, _IDB_hasObjectStore, _IDB_db_Q, _IDB_runStores_Q, _IDB_update_db_status, _IDB_update_db, _IDB_updateDBinMap, _IDB_markObjectStoreConnected, _IDB_setupRequests, _IDB_bumpVersion, _IDB_objectStoreExists, _IDB_checkDBexists, _IDB_handleRetry, _IDB_handleNoDB, _IDB_process_get, _IDB_process_get_all, _IDB_process_get_keys, _IDB_process_set, _IDB_process_set_multiple, _IDB_process_delete, _IDB_process_db_clear, _IDB_init, _IDB_pre_init, _IDB_runOrQueue;
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
        _IDB_instances.add(this);
        _IDB_db_name.set(this, void 0);
        _IDB_storeName.set(this, void 0);
        _IDB_hasObjectStore.set(this, false);
        _IDB_db_Q.set(this, new Set());
        __classPrivateFieldSet(this, _IDB_db_name, db_name, "f");
        __classPrivateFieldSet(this, _IDB_storeName, storeName, "f");
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_pre_init).call(this);
    }
    /**
     * Retrieves a value from the database by its key
     * @template T - The type of value to be returned
     * @param key - The key to look up in the database
     * @returns A promise that resolves to the value of type T associated with the key
     */
    get(key) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get).call(this, resolve, reject, key), reject);
        });
    }
    /**
     * Retrieves all values stored in the database
     * @template T - The type of array to be returned, must extend Array
     * @returns A promise that resolves to an array of all values in the database
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getValues() {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_all).call(this, resolve, reject), reject);
        });
    }
    /**
     * Retrieves all keys stored in the database
     * @returns A promise that resolves to an array of all keys in the database
     */
    getKeys() {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_keys).call(this, resolve, reject), reject);
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
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set).call(this, resolve, reject, key, value), reject);
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
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set_multiple).call(this, resolve, reject, items), reject);
        });
    }
    /**
     * Deletes a value from the database by its key
     * @param key - The key of the value to delete
     * @returns A promise that resolves to true when the value has been deleted
     */
    del(key) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_delete).call(this, resolve, reject, key), reject);
        });
    }
    /**
     * Clears all data from the current object store
     * @returns A promise that resolves to true when the store has been cleared
     */
    clearStore() {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runOrQueue).call(this, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_db_clear).call(this, resolve, reject), reject);
        });
    }
    /**
     * Deletes the entire database
     * @returns A promise that resolves to true when the database has been deleted
     * @throws Event if the database cannot be dropped because it is currently bumping version
     */
    dropDB() {
        return new Promise((resolve, reject) => {
            const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
            if (item.status === 'upgrading') {
                reject(new Event('Cannot drop DB while bumping version'));
                return;
            }
            const idb = item === null || item === void 0 ? void 0 : item.db;
            console.log('drop', __classPrivateFieldGet(this, _IDB_db_name, "f"), __classPrivateFieldGet(this, _IDB_storeName, "f"));
            idb === null || idb === void 0 ? void 0 : idb.close();
            const deleteRequest = indexedDB.deleteDatabase(__classPrivateFieldGet(this, _IDB_db_name, "f"));
            deleteRequest.onsuccess = () => {
                const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
                if (!item) {
                    return;
                }
                resolve(true);
                if ((idb === null || idb === void 0 ? void 0 : idb.objectStoreNames.length) === 0) {
                    dbsMap.delete(__classPrivateFieldGet(this, _IDB_db_name, "f"));
                }
            };
            deleteRequest.onerror = (e) => reject(e);
        });
    }
}
_IDB_db_name = new WeakMap(), _IDB_storeName = new WeakMap(), _IDB_hasObjectStore = new WeakMap(), _IDB_db_Q = new WeakMap(), _IDB_instances = new WeakSet(), _IDB_runStores_Q = function _IDB_runStores_Q() {
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    for (const fn of item.stores_Q) {
        const v = fn();
        if (v === false) {
            break;
        }
        else {
            item.stores_Q.delete(fn);
        }
    }
}, _IDB_update_db_status = function _IDB_update_db_status(s) {
    const i = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    i.status = s;
    dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), i);
}, _IDB_update_db = function _IDB_update_db(idb) {
    const i = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    i.db = idb;
    dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), i);
}, _IDB_updateDBinMap = function _IDB_updateDBinMap(evnt) {
    const idb = evnt.target.result;
    if (!idb) {
        return;
    }
    __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_update_db).call(this, idb);
}, _IDB_markObjectStoreConnected = function _IDB_markObjectStoreConnected() {
    __classPrivateFieldSet(this, _IDB_hasObjectStore, true, "f");
    for (const fn of __classPrivateFieldGet(this, _IDB_db_Q, "f")) {
        __classPrivateFieldGet(this, _IDB_db_Q, "f").delete(fn);
        fn();
    }
    __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_update_db_status).call(this, 'connected');
    return true;
}, _IDB_setupRequests = function _IDB_setupRequests(req) {
    __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_update_db_status).call(this, 'connecting');
    if (req.readyState === 'done') {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_update_db).call(this, req.result);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_markObjectStoreConnected).call(this);
        return;
    }
    req.onupgradeneeded = (event) => {
        const idb = event.target.result;
        if (!idb)
            return;
        if (idb.objectStoreNames.length === 0 || idb.objectStoreNames.contains(__classPrivateFieldGet(this, _IDB_storeName, "f")) === false) {
            idb.createObjectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"));
            return;
        }
    };
    req.onsuccess = (event) => {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_updateDBinMap).call(this, event);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_markObjectStoreConnected).call(this);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_runStores_Q).call(this);
    };
    req.onerror = (event) => {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_updateDBinMap).call(this, event);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_objectStoreExists).call(this);
    };
}, _IDB_bumpVersion = function _IDB_bumpVersion() {
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    const idb = item === null || item === void 0 ? void 0 : item.db;
    if (!idb) {
        return;
    }
    item.status = 'upgrading';
    idb.close();
    dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), item);
    const req = indexedDB.open(__classPrivateFieldGet(this, _IDB_db_name, "f"), idb.version + 1);
    __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_setupRequests).call(this, req);
}, _IDB_objectStoreExists = function _IDB_objectStoreExists() {
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    const idb = item === null || item === void 0 ? void 0 : item.db;
    if (!idb) {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_pre_init).call(this);
        return false;
    }
    if (idb.objectStoreNames.contains(__classPrivateFieldGet(this, _IDB_storeName, "f")) === false) {
        item.stores_Q.add(() => {
            const dbItem = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
            const idb = dbItem === null || dbItem === void 0 ? void 0 : dbItem.db;
            if (!idb) {
                return false;
            }
            if (idb.objectStoreNames.contains(__classPrivateFieldGet(this, _IDB_storeName, "f")) === false) {
                idb.createObjectStore(__classPrivateFieldGet(this, _IDB_storeName, "f"));
                dbItem.db = idb;
                dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), dbItem);
                __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_markObjectStoreConnected).call(this);
            }
            return true;
        });
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_bumpVersion).call(this);
        return false;
    }
    else {
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_markObjectStoreConnected).call(this);
        return true;
    }
}, _IDB_checkDBexists = function _IDB_checkDBexists() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbs = yield indexedDB.databases();
        const has_db = dbs.find((db) => db.name === __classPrivateFieldGet(this, _IDB_db_name, "f"));
        if (!has_db) {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_update_db_status).call(this, 'init');
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_init).call(this);
        }
        else {
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_objectStoreExists).call(this);
        }
    });
}, _IDB_handleRetry = function _IDB_handleRetry(err, cb, retryCount, reject) {
    if (retryCount < 5 && err instanceof DOMException) {
        if (err.message.includes('database connection is closing') ||
            err.message.includes('the specified object stores was not found')) {
            __classPrivateFieldGet(this, _IDB_db_Q, "f").add(cb);
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_update_db_status).call(this, 'upgrading');
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_checkDBexists).call(this);
        }
        else {
            reject(err);
        }
    }
    else {
        reject(err);
    }
}, _IDB_handleNoDB = function _IDB_handleNoDB(cb, retryCount, reject) {
    if (retryCount < 5) {
        __classPrivateFieldGet(this, _IDB_db_Q, "f").add(cb);
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_checkDBexists).call(this);
    }
    else {
        reject(new Event('Database not found'));
    }
}, _IDB_process_get = function _IDB_process_get(resolve, reject, key, retryCount = -1) {
    var _a;
    try {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.db;
        const req = idb.transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], 'readonly').objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f")).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get).call(this, resolve, reject, key, retryCount), retryCount, reject);
    }
}, _IDB_process_get_all = function _IDB_process_get_all(resolve, reject, retryCount = -1) {
    var _a;
    try {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.db;
        const req = idb.transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], 'readonly').objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f")).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_all).call(this, resolve, reject, retryCount), retryCount, reject);
    }
}, _IDB_process_get_keys = function _IDB_process_get_keys(resolve, reject, retryCount = -1) {
    var _a;
    try {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.db;
        const req = idb.transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], 'readonly').objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f")).getAllKeys();
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_get_keys).call(this, resolve, reject, retryCount), retryCount, reject);
    }
}, _IDB_process_set = function _IDB_process_set(resolve, reject, key, value, retryCount = -1) {
    var _a;
    try {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.db;
        const req = idb.transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], 'readwrite').objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f")).put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set).call(this, resolve, reject, key, value, retryCount), retryCount, reject);
    }
}, _IDB_process_set_multiple = function _IDB_process_set_multiple(resolve, reject, items, retryCount = -1) {
    var _a;
    try {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.db;
        const tx = idb.transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], 'readwrite');
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
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_set_multiple).call(this, resolve, reject, items, retryCount), retryCount, reject);
    }
}, _IDB_process_delete = function _IDB_process_delete(resolve, reject, key, retryCount = -1) {
    var _a;
    try {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.db;
        const req = idb.transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], 'readwrite').objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f")).delete(key);
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_delete).call(this, resolve, reject, key, retryCount), retryCount, reject);
    }
}, _IDB_process_db_clear = function _IDB_process_db_clear(resolve, reject, retryCount = -1) {
    var _a;
    try {
        const idb = (_a = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"))) === null || _a === void 0 ? void 0 : _a.db;
        const req = idb.transaction([__classPrivateFieldGet(this, _IDB_storeName, "f")], 'readwrite').objectStore(__classPrivateFieldGet(this, _IDB_storeName, "f")).clear();
        req.onsuccess = () => resolve(true);
        req.onerror = (e) => reject(e);
    }
    catch (err) {
        retryCount = retryCount + 1;
        __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleRetry).call(this, err, () => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_process_db_clear).call(this, resolve, reject, retryCount), retryCount, reject);
    }
}, _IDB_init = function _IDB_init() {
    return __awaiter(this, void 0, void 0, function* () {
        let req;
        let has_db;
        const dbs = yield indexedDB.databases();
        if (dbs.length === 0) {
            req = indexedDB.open(__classPrivateFieldGet(this, _IDB_db_name, "f"), 1);
        }
        else {
            const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
            if (item.status !== 'init') {
                if (item.status === 'connected') {
                    return __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_objectStoreExists).call(this);
                }
                item.stores_Q.add(() => __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_objectStoreExists).call(this));
                return;
            }
            else {
                has_db = dbs.find((db) => db.name === __classPrivateFieldGet(this, _IDB_db_name, "f"));
                if (has_db) {
                    has_db = undefined;
                    req = indexedDB.open(__classPrivateFieldGet(this, _IDB_db_name, "f"));
                }
                else {
                    req = indexedDB.open(__classPrivateFieldGet(this, _IDB_db_name, "f"), 1);
                }
            }
        }
        if (!has_db) {
            const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
            item.req = req;
            dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), item);
            __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_setupRequests).call(this, req);
        }
    });
}, _IDB_pre_init = function _IDB_pre_init() {
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    if (!item) {
        dbsMap.set(__classPrivateFieldGet(this, _IDB_db_name, "f"), {
            db: undefined,
            // @ts-expect-error this is fine for now
            req: undefined,
            stores_Q: new Set(),
            status: 'init'
        });
    }
    __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_init).call(this);
}, _IDB_runOrQueue = function _IDB_runOrQueue(fn, reject) {
    const item = dbsMap.get(__classPrivateFieldGet(this, _IDB_db_name, "f"));
    if ((item && item.status !== 'connected') || __classPrivateFieldGet(this, _IDB_hasObjectStore, "f") === false) {
        __classPrivateFieldGet(this, _IDB_db_Q, "f").add(fn);
    }
    else if (!(item === null || item === void 0 ? void 0 : item.db)) {
        return __classPrivateFieldGet(this, _IDB_instances, "m", _IDB_handleNoDB).call(this, fn, 1, reject);
    }
    else {
        fn();
    }
};
