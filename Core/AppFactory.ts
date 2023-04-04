import CreateServer from "../Interfacing/WorkerServer.ts";
import SpawnServer, { SpawnedWorker } from "../Interfacing/WorkerSpawner.ts";
import { IsObject, IsString, Assert } from "../deps/type_guard.ts";
import LocationStore from "./LocationStore.ts";
import Store from "../Lib/OsStore.ts";

const IsContext = IsObject({
  user_id: IsString,
});

const Server = CreateServer((context) => {
  Assert(IsContext, context);
  return { loc: new LocationStore(context.user_id), user_id: context.user_id };
});

const RunningApps: Record<string, SpawnedWorker> = {};

Server.CreateHandler(
  "load_app",
  ({ loc, user_id }, app_id: string, ...args: Array<unknown>) => {
    const location = loc.App(app_id);
    const privileges = [location.global_state, location.user_state];
    if (location.system_state) privileges.push(location.system_state);
    RunningApps[app_id] = SpawnServer(
      location.entry_point,
      {
        type: "module",
        name: app_id,
        deno: {
          permissions: {
            read: privileges,
            write: privileges,
          },
        },
      },
      {
        location,
        args,
        user_id,
      },
      {
        execute: async (
          app: string,
          command: string,
          ...args: Array<unknown>
        ) => {
          const instance = await RunningApps[app];
          if (!instance) return "not running";

          return instance.Send(command, app_id, ...args);
        },
        open_window: (location: string, name: string, bounds: unknown) => {
          return Server.Postback("open_window", app_id, location, name, bounds);
        },
        close_app: async () => {
          const instance = await RunningApps[app_id];
          if (!instance) return "not running";

          instance.Close();
        },
      }
    );
  }
);

Server.CreateHandler(
  "execute",
  async (_, app_id: string, command: string, ...args: Array<unknown>) => {
    const instance = await RunningApps[app_id];
    if (!instance) return "not running";

    return instance.Send(command, "client", ...args);
  }
);

Server.CreateHandler("is_running", async (_, app_id: string) => {
  return !!(await RunningApps[app_id]);
});

Server.CreateHandler("list_apps", (_) => {
  const result: Array<[string, string]> = [];
  for (const [id, value] of Store.Model.apps) result.push([id, value.name]);
  return result;
});

Server.CreateHandler("close_app", async (_, app_id: string) => {
  const instance = await RunningApps[app_id];
  if (!instance) return "not running";

  return instance.Close();
});

Server.CreateHandler("session", ({ user_id }) => {
  const existing = Store.Model.users[user_id];
  return {
    email: existing.email,
    is_admin: existing.is_admin,
    wallpaper: existing.wallpaper,
  };
});
