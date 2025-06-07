import { IDB } from './idb';
export type { MultiSetItem } from './idb';
declare function getDB(db_name: string, tableName: string): IDB;
export { getDB, IDB };
