import * as Path from "./deps/path.ts";
import { Directory } from "./deps/fs_db.ts";
import OsSchema from "./Lib/OsSchema.ts";

function Execute(command: string) {
  return Deno.run({
    cmd: command.split(" "),
    stdout: "inherit",
    stderr: "inherit",
  });
}

const APP_KEY = "DEVELOPMENT_APP";
const DATA_DIR = Path.resolve("./test_data");

const store = new Directory(
  OsSchema,
  Path.resolve(DATA_DIR, "os-data", "core")
);

const data = JSON.parse(await Deno.readTextFile("app.manifest.json"));

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

const pull = Execute("docker pull iph3i0n/counter-top:latest");
await pull.status();
const run = Execute(
  `docker run --name counter_top_test -p 3000:3000 -v ${DATA_DIR}:/data:rw -e ADMIN_USERS=test@test.com:test123 iph3i0n/counter-top:latest`
);

await run.status();
