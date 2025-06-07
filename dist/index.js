var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { IDB } from './idb';
const dbMap = new Map();
function getDB(db_name, tableName) {
    const key = `${db_name}:${tableName}`;
    if (!dbMap.has(key)) {
        const idb = new IDB(db_name, tableName);
        const v = {
            get: idb.get.bind(idb),
            set: idb.set.bind(idb),
            del: idb.del.bind(idb),
            clearStore: idb.clearStore.bind(idb),
            getValues: idb.getValues.bind(idb),
            getKeys: idb.getKeys.bind(idb),
            setMultiple: idb.setMultiple.bind(idb),
            dropDB: () => __awaiter(this, void 0, void 0, function* () {
                dbMap.delete(key);
                return yield idb.dropDB();
            })
        };
        dbMap.set(key, v);
    }
    return dbMap.get(key);
}
export { getDB, IDB };
