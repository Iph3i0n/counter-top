import CreateAppServer from "../../Interfacing/AppServer.ts";
import { decode } from "../../deps/base64.ts";
import * as Path from "../../deps/path.ts";
import * as Zip from "../../deps/zipjs.ts";
import {
  IsObject,
  IsString,
  Assert,
  Optional,
  IsArray,
} from "../../deps/type_guard.ts";
import * as BCrypt from "../../deps/bcrypt.ts";
import { ASCII, Struct, UTF8, Array } from "../../deps/moulding_tin.ts";
import { marky } from "../../deps/markdown.ts";

const IsManifest = IsObject({
  name: IsString,
  main: IsString,
});

const Server = CreateAppServer(
  {
    commits: new ASCII(),
    apps: new Struct({
      name: new UTF8(),
      website: new ASCII(),
      release_url: new ASCII(),
      icon_url: new ASCII(),
      readme_url: new ASCII(),
      short_description: new UTF8(),
      author: new UTF8(),
      current_version: new ASCII(),
      tags: new Array(new ASCII()),
    }),
  },
  {},
  async ({
    UserState,
    GlobalDir,
    OpenWindow,
    OsStore,
    UserId,
    UserIsAdmin,
  }) => {
    const [{ sha: current_commit }] = await fetch(
      "https://api.github.com/repos/counter-top-os/counter-top-apps/commits"
    ).then((r) => r.json());

    if (UserState.Model.commits.CURRENT !== current_commit) {
      const apps_data: Record<string, any> = {};
      const items = await fetch(
        "https://api.github.com/repos/counter-top-os/counter-top-apps/contents/apps"
      ).then((r) => r.json());

      for (const item of items) {
        const data = await fetch(item.download_url)
          .then((r) => r.text())
          .then((d) => JSON.parse(d));
        apps_data[item.name.replace(".json", "")] = data;
      }

      UserState.Write({
        commits: { CURRENT: current_commit },
        apps: apps_data,
      });
    }

    const ManualDir = Path.join(GlobalDir, "manual");

    function ManualAppPath(app_id: string) {
      return Path.join(ManualDir, app_id);
    }

    function StoreAppPath(app_id: string) {
      return Path.join(GlobalDir, "store", app_id);
    }

    return {
      OsStore,
      OpenWindow,
      UserState,
      GlobalDir,
      ManualDir,
      UserId,
      UserIsAdmin,
      async ManualAppExists(app_id: string) {
        try {
          const stat = await Deno.stat(ManualAppPath(app_id));

          return stat.isDirectory;
        } catch {
          return false;
        }
      },
      async StoreAppExists(app_id: string) {
        try {
          const stat = await Deno.stat(StoreAppPath(app_id));

          return stat.isDirectory;
        } catch {
          return false;
        }
      },
      ManualAppPath,
      StoreAppPath,
      async InstallApp(app_id: string, app_dir: string, zip: Uint8Array) {
        try {
          const reader = new Zip.ZipReader(new Zip.Uint8ArrayReader(zip));
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
                release: "manual",
              },
            },
          });
        } catch (err) {
          console.error(err);
          await Deno.remove(app_dir, { recursive: true });
          return "install_failed";
        }
      },
    };
  }
);

Server.CreateHandler("system:focus", ({ OpenWindow }) => {
  OpenWindow("index.html", "Settings", {
    top: "50px",
    left: "50px",
    width: "800px",
    height: "600px",
  });
});

const IsUserModel = IsObject({
  email: Optional(IsString),
  password: Optional(IsString),
  wallpaper: Optional(IsString),
  startup_apps: Optional(IsArray(IsString)),
});

Server.CreateHandler("update_user", ({ OsStore, UserId }, sender, model) => {
  if (sender !== "client") return "denied";
  Assert(IsUserModel, model);
  const existing = OsStore.Model.users[UserId];
  if (!existing) return "not found";

  OsStore.Write({
    users: {
      [UserId]: {
        version: "v2",
        email: model.email ?? existing.email,
        password: model.password
          ? BCrypt.hashSync(model.password)
          : existing.password,
        is_admin: existing.is_admin,
        wallpaper: model.wallpaper ?? existing.wallpaper,
        startup_apps:
          model.startup_apps ??
          (existing.version === "v2" ? existing.startup_apps : []),
      },
    },
  });
});

Server.CreateHandler("get_user", ({ OsStore, UserId }, sender) => {
  if (sender !== "client") return "denied";

  const existing = OsStore.Model.users[UserId];
  if (!existing) return "not found";

  return {
    email: existing.email,
    wallpaper: existing.wallpaper,
    startup_apps: existing.version === "v2" ? existing.startup_apps : [],
  };
});

Server.CreateHandler("apps_list", ({ OsStore }, sender) => {
  if (sender !== "client") return "denied";

  const result = [];
  for (const [id, value] of OsStore.Model.apps)
    result.push({ id, name: value.name });
  return result;
});

Server.CreateHandler("is_admin", ({ UserIsAdmin }) => UserIsAdmin);

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
  "manual:install_app",
  async (
    { UserIsAdmin, ManualAppPath, InstallApp },
    sender,
    zip_file: string
  ) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!zip_file.startsWith(ZIP_START)) return "invalid zip";

    const app_id = crypto.randomUUID();
    const data_string = zip_file.replace(ZIP_START, "");
    const buffer = decode(data_string);
    const app_dir = ManualAppPath(app_id);
    await InstallApp(app_id, app_dir, buffer);
  }
);

Server.CreateHandler(
  "manual:list_apps",
  async ({ ManualDir, OsStore, UserIsAdmin }, sender) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";

    const result = [];
    try {
      for await (const entry of Deno.readDir(ManualDir)) {
        const store_item = OsStore.Model.apps[entry.name];
        result.push({
          id: entry.name,
          name: store_item.name,
          admin: store_item.admin,
        });
      }
    } catch (err) {
      console.error(err);
    }

    return result;
  }
);

Server.CreateHandler(
  "manual:elevate_app",
  async ({ OsStore, ManualAppExists, UserIsAdmin }, sender, app_id) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!(await ManualAppExists(app_id))) return "not found";

    const store_item = OsStore.Model.apps[app_id];
    OsStore.Write({
      apps: {
        [app_id]: {
          ...store_item,
          admin: true,
        },
      },
    });
  }
);

Server.CreateHandler(
  "manual:remove_app",
  async (
    { OsStore, ManualAppExists, ManualAppPath, UserIsAdmin },
    sender,
    app_id
  ) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!(await ManualAppExists(app_id))) return "not found";

    await Deno.remove(ManualAppPath(app_id), { recursive: true });
    OsStore.Write({
      apps: {
        [app_id]: undefined,
      },
    });
  }
);

Server.CreateHandler(
  "manual:demote_app",
  async ({ OsStore, ManualAppExists, UserIsAdmin }, sender, app_id) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!(await ManualAppExists(app_id))) return "not found";

    const store_item = OsStore.Model.apps[app_id];
    OsStore.Write({
      apps: {
        [app_id]: {
          ...store_item,
          admin: false,
        },
      },
    });
  }
);

Server.CreateHandler(
  "app_store:listing",
  async ({ UserState, StoreAppExists, UserIsAdmin }, sender) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    const result = [];
    for (const [id, value] of UserState.Model.apps)
      result.push({
        id,
        name: value.name,
        author: value.author,
        description: value.short_description,
        installed: await StoreAppExists(id),
        icon: value.icon_url,
      });

    return result;
  }
);

Server.CreateHandler(
  "app_store:details",
  async (
    { UserState, StoreAppExists, UserIsAdmin },
    sender,
    app_id: string
  ) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    const target = UserState.Model.apps[app_id];
    if (!target) return "not found";
    const readme_data = await fetch(target.readme_url).then((r) => r.text());
    return {
      id: app_id,
      name: target.name,
      website: target.website,
      icon: target.icon_url,
      readme: marky(readme_data),
      author: target.author,
      current_version: target.current_version,
      tags: target.tags,
      installed: await StoreAppExists(app_id),
    };
  }
);

Server.CreateHandler(
  "app_store:install",
  async (
    { UserState, StoreAppPath, InstallApp, UserIsAdmin },
    sender,
    app_store_id: string
  ) => {
    const data = UserState.Model.apps[app_store_id];
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!data) return "not found";

    const zip_data = await fetch(data.release_url).then((r) => r.arrayBuffer());
    const dir = StoreAppPath(app_store_id);
    await InstallApp(app_store_id, dir, new Uint8Array(zip_data));
  }
);

Server.CreateHandler(
  "app_store:elevate_app",
  async ({ OsStore, StoreAppExists, UserIsAdmin }, sender, app_id) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!(await StoreAppExists(app_id))) return "not found";

    const store_item = OsStore.Model.apps[app_id];
    OsStore.Write({
      apps: {
        [app_id]: {
          ...store_item,
          admin: true,
        },
      },
    });
  }
);

Server.CreateHandler(
  "app_store:remove_app",
  async (
    { OsStore, StoreAppExists, StoreAppPath, UserIsAdmin },
    sender,
    app_id
  ) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!(await StoreAppExists(app_id))) return "not found";

    await Deno.remove(StoreAppPath(app_id), { recursive: true });
    OsStore.Write({
      apps: {
        [app_id]: undefined,
      },
    });
  }
);

Server.CreateHandler(
  "app_store:demote_app",
  async ({ OsStore, StoreAppExists, UserIsAdmin }, sender, app_id) => {
    if (sender !== "client" || !UserIsAdmin) return "denied";
    if (!(await StoreAppExists(app_id))) return "not found";

    const store_item = OsStore.Model.apps[app_id];
    OsStore.Write({
      apps: {
        [app_id]: {
          ...store_item,
          admin: false,
        },
      },
    });
  }
);
