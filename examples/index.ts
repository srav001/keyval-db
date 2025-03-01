import { IDB } from "../src";

const idb = new IDB("db", "store");

idb
  .set("key", "value")
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
      val: "",
    },
    {
      key: "key2",
      val: "",
    },
  ])
  .then((v) => {
    console.log(v);
  });

