import CreateAppServer from "../../Interfacing/AppServer.ts";
import { decode } from "../../deps/base64.ts";
import * as Path from "../../deps/path.ts";
import * as Zip from "../../deps/zipjs.ts";
import { Assert, IsObject, IsString } from "../../deps/type_guard.ts";

const IsManifest = IsObject({
  name: IsString,
  main: IsString,
});

const Server = CreateAppServer({}, {}, (c) => {
  c.OpenWindow("index.html", "Apps", {
    top: "50px",
    left: "50px",
    width: "800px",
    height: "600px",
  }).then(() => c.EndApp());
  return c;
});

const ZIP_START = "data:application/zip;base64,";

async function WriteFile(path: string, data: Uint8Array) {
  try {
    await Deno.mkdir(Path.dirname(path), { recursive: true });
  } catch {
    // We do not care if it already exists
  }

  await Deno.writeFile(path, data);
}

Server.CreateHandler(
  "install_app",
  async ({ GlobalDir, OsStore }, sender, zip_file: string) => {
    if (sender !== "client") return "denied";
    if (!zip_file.startsWith(ZIP_START)) return "invalid zip";

    const app_id = crypto.randomUUID();
    const data_string = zip_file.replace(ZIP_START, "");

    const buffer = decode(data_string);

    const app_dir = Path.join(GlobalDir, app_id);

    try {
      const reader = new Zip.ZipReader(new Zip.Uint8ArrayReader(buffer));
      for await (const entry of reader.getEntriesGenerator())
        if (!entry.directory)
          await WriteFile(
            Path.join(app_dir, entry.filename),
            await entry.getData(new Zip.Uint8ArrayWriter())
          );

      await reader.close();

      const manifest = JSON.parse(
        await Deno.readTextFile(Path.join(app_dir, "app.manifest.json"))
      );
      Assert(IsManifest, manifest);

      OsStore.Write({
        apps: {
          [app_id]: {
            version: "v1",
            name: manifest.name,
            admin: false,
            system: false,
            entry_point: Path.join(app_dir, manifest.main),
            ui_dir: Path.join(app_dir),
          },
        },
      });
    } catch (err) {
      console.error(err);
      await Deno.remove(app_dir, { recursive: true });
      return "install_failed";
    }
  }
);

Server.CreateHandler("list_apps", async ({ GlobalDir, OsStore }, sender) => {
  if (sender !== "client") return "denied";

  const result = [];
  for await (const entry of Deno.readDir(GlobalDir)) {
    const store_item = OsStore.Model.apps[entry.name];
    result.push({
      name: store_item.name,
      admin: store_item.admin,
    });
  }

  return result;
});

Server.CreateHandler("elevate_app", ({ OsStore }, sender, app_id) => {
  if (sender !== "client") return "denied";

  const store_item = OsStore.Model.apps[app_id];
  OsStore.Write({
    apps: {
      [app_id]: {
        ...store_item,
        admin: true,
      },
    },
  });
});
