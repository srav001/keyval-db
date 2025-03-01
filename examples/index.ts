import { IDB } from "../src";

const idb = new IDB("db", "store");

idb.get<{ data: string }>('key1').then((v) => {
  console.log(v);
}).catch((e) => { 
  console.log(e);
}).finally(() => {
  console.log('finally');
});

idb
  .set("key", "value")
  .then((v) => {
    console.log(v);
  })
  .catch((e) => {
    console.log(e);
  });

idb
  .get("key")
  .then((v) => {
    console.log(v);
  })
  .catch((e) => {
    console.log(e);
  });

idb
  .setMultiple([
    {
      key: "key",
      value: "",
    },
    {
      key: "key2",
      value: "",
    },
  ])
  .then((v) => {
    console.log(v);
  });

idb.getValues().then((v) => {
  for (const val of v) {
    console.log(val);
  }
});
