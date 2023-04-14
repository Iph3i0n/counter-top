import * as Path from "./deps/path.ts";
import { Directory } from "./deps/fs_db.ts";
import OsSchema from "./Lib/OsSchema.ts";

const APP_KEY = "DEVELOPMENT_APP";

const counter_top_data_dir = prompt(
  "Where is the Counter Top data directory. By default it will be in the working directory for the OS with the name '.counter-top'."
);

if (!counter_top_data_dir) {
  console.log("No data directory provide a valid file path");
  Deno.exit(1);
}

const store = new Directory(
  OsSchema,
  Path.resolve(counter_top_data_dir, "os-data", "core")
);
const data = JSON.parse(await Deno.readTextFile("app.manifest.json"));

if (!data.name || !data.main) {
  console.log("Cannot find the name or the main in the manifest file.");
  Deno.exit(1);
}

if (store.Model.apps[APP_KEY]) {
  console.log(
    "A development app has already been found. Removing it. Run this again to add this one."
  );

  store.Write({
    apps: {
      [APP_KEY]: undefined,
    },
  });
} else {
  store.Write({
    apps: {
      [APP_KEY]: {
        version: "v1",
        name: data.name,
        entry_point: Path.resolve(data.main),
        ui_dir: Path.resolve("."),
        admin: false,
        system: false,
        release: "Development",
      },
    },
  });
}
