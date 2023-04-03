import CreateAppServer from "../../Interfacing/AppServer.ts";
import {
  Struct,
  ASCII,
  UTF8,
  DateTime,
  Array,
  Optional,
} from "../../deps/moulding_tin.ts";

const Server = CreateAppServer(
  {
    notes: new Struct({
      name: new UTF8(),
      created: new DateTime(),
      modified: new DateTime(),
      text: new UTF8(),
    }),
  },
  {},
  (c) => {
    c.OpenWindow("index.html", "File Explorer").then(() => c.EndApp());
    return c;
  }
);
