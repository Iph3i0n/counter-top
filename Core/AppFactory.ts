import CreateServer from "../Interfacing/WorkerServer.ts";
import SpawnServer, {
  WorkerServerInstance,
} from "../Interfacing/WorkerSpawner.ts";
import { IsObject, IsString, Assert } from "../deps/type_guard.ts";
import LocationStore from "./LocationStore.ts";
import Store from "../Lib/OsStore.ts";

const IsContext = IsObject({
  user_id: IsString,
});

const RunningApps: Record<string, WorkerServerInstance> = {};

const Server = CreateServer((context) => {
  Assert(IsContext, context);
  return {
    loc: new LocationStore(context.user_id),
    user_id: context.user_id,
    IsRunning(id: string) {
      return !!RunningApps[id];
    },
  };
});

Server.CreateHandler(
  "load_app",
  async (
    { loc, user_id, IsRunning },
    app_id: string,
    ...args: Array<unknown>
  ) => {
    if (!IsRunning(app_id)) {
      console.log("opening app " + app_id);
      const location = loc.App(app_id);
      const privileges = [location.global_state, location.user_state];
      if (location.system_state) privileges.push(location.system_state);
      RunningApps[app_id] = await SpawnServer(
        location.entry_point,
        {
          type: "module",
          name: app_id,
          deno: {
            permissions: {
              read: privileges,
              write: privileges,
              net: "inherit",
            },
          },
        },
        {
          location,
          args,
          user_id,
          user_is_admin: Store.Model.users[user_id].is_admin,
        },
        {
          execute: (app: string, command: string, ...args: Array<unknown>) => {
            const instance = RunningApps[app];
            if (!instance) return "not running";

            return instance.Send(command, app_id, ...args);
          },
          open_window: (location: string, name: string, bounds: unknown) => {
            return Server.Postback(
              "open_window",
              app_id,
              location,
              name,
              bounds
            );
          },
          close_app: () => {
            const instance = RunningApps[app_id];
            if (!instance) return "not running";
            console.log("closing app" + app_id);

            instance.Close();
            delete RunningApps[app_id];
          },
          notify: (title: string, text: string) => {
            const existing = Store.Model.notifications[user_id] ?? [];
            Store.Write({
              notifications: {
                [user_id]: [
                  ...existing,
                  {
                    id: crypto.randomUUID(),
                    app: app_id,
                    stamp: new Date(),
                    title,
                    text,
                  },
                ],
              },
            });

            Server.Postback(
              "notifications",
              Store.Model.notifications[user_id]
            );
          },
        }
      );
    }

    const instance = RunningApps[app_id];
    instance.SendNoResponse("system:focus", "system");
  }
);

Server.CreateHandler(
  "execute",
  (_, app_id: string, command: string, ...args: Array<unknown>) => {
    const instance = RunningApps[app_id];
    if (!instance) return "not running";

    return instance.Send(command, "client", ...args);
  }
);

Server.CreateHandler("notifications", ({ user_id }) => {
  return Store.Model.notifications[user_id];
});

Server.CreateHandler("clear_notification", ({ user_id }, id: string) => {
  const existing = Store.Model.notifications[user_id];
  if (!existing) return "not found";

  Store.Write({
    notifications: {
      [user_id]: existing.filter((e) => e.id !== id),
    },
  });
});

Server.CreateHandler("list_apps", ({ IsRunning }) => {
  const result: Array<{ id: string; name: string; running: boolean }> = [];
  for (const [id, value] of Store.Model.apps)
    result.push({
      id,
      name: value.name,
      running: IsRunning(id),
    });
  return result;
});

Server.CreateHandler("close_app", (_, app_id: string) => {
  const instance = RunningApps[app_id];
  if (!instance) return "not running";
  console.log("closing app " + app_id);

  instance.Close();
  delete RunningApps[app_id];
});

Server.CreateHandler("session", ({ user_id }) => {
  const existing = Store.Model.users[user_id];
  return {
    email: existing.email,
    is_admin: existing.is_admin,
    wallpaper: existing.wallpaper,
  };
});
