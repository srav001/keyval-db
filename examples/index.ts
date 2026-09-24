import { getDB } from '../src/index.js';

const db = getDB('db', 'store');

await db.set('key', 'value');
await db.setMultiple([
	{ key: 'key1', value: { data: 'one' } },
	{ key: 'key2', value: { data: 'two' } }
]);

console.log(await db.get<{ data: string }>('key1'));
console.log(await db.getKeys());

for (const value of await db.getValues()) console.log(value);

await db.del('key');
await db.clearStore();
