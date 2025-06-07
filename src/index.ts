import { IDB } from './idb';
export type { MultiSetItem } from './idb';

const dbMap = new Map<string, IDB>();
function getDB(db_name: string, tableName: string): IDB {
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
			dropDB: async () => {
				dbMap.delete(key);
				return await idb.dropDB();
			}
		} as unknown as InstanceType<typeof IDB>;
		dbMap.set(key, v);
	}

	return dbMap.get(key)!;
}

export { getDB, IDB };
