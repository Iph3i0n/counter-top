import SpawnSocket, { Connection } from "../../Interfacing/SocketSpawner.ts";
import { ClearCookie, GetCookie, SetCookie } from "./cookie.ts";
import AppWindow, { Bounding } from "./app_window.ts";
import StateEngine from "./state_engine.ts";

type Session = {
  email: string;
  is_admin: boolean;
  wallpaper: string;
};

type InstalledApp = {
  id: string;
  name: string;
  running: boolean;
};

type Notification = {
  id: string;
  app: string;
  title: string;
  stamp: Date;
  text: string;
};

const Engine = StateEngine(
  {
    connection: null as null | Connection,
    session: null as null | Session,
    windows: [] as Array<AppWindow>,
    installed_apps: [] as Array<InstalledApp>,
    notifications: [] as Array<Notification>,
  },
  {
    async Connect(token: string | null) {
      try {
        if (!token) token = GetCookie();
        if (token) {
          SetCookie(token, 7);
          const is_https = location.protocol === "https:";
          const protocol = is_https ? "wss:" : "ws:";
          const url = `${protocol}//${
            location.host
          }/os/session?token=${encodeURIComponent(token)}`;

          const connection = await SpawnSocket(
            url,
            {},
            {
              open_window: (
                app: string,
                location: string,
                name: string,
                bounds: Bounding
              ) => {
                return new Promise<void>((res) => {
                  Engine.Perform(
                    "OpenWindow",
                    app,
                    location,
                    name,
                    res,
                    bounds
                  );
                });
              },
              notifications: (data: any) => {
                Engine.Perform(
                  "SetNotifications",
                  data.map((d: any) => ({
                    app: d.app,
                    title: d.title,
                    stamp: new Date(d.stamp),
                    text: d.text,
                  }))
                );
              },
            }
          );

          connection.OnClose = () => Engine.Perform("CloseConnection");

          return {
            connection,
            session: await connection.Send("execute", "session"),
            installed_apps: await connection.Send("execute", "list_apps"),
            notifications:
              (await connection.Send("execute", "notifications")) ?? [],
          };
        }
        return { connection: null };
      } catch {
        return { connection: null };
      }
    },
    Logout() {
      ClearCookie();
      this.connection?.Close();
      return { connection: null };
    },
    CloseConnection() {
      return { connection: null };
    },
    OpenWindow(
      app: string,
      location: string,
      name: string,
      on_close: () => void,
      bounds: Bounding
    ) {
      return {
        windows: [
          ...this.windows,
          new AppWindow(app, location, name, on_close, bounds),
        ],
      };
    },
    CloseWindow(window: AppWindow) {
      window.OnClose();
      return {
        windows: this.windows.filter((w) => w !== window),
      };
    },
    async LaunchApp(app_id: string) {
      if (!this.connection) throw new Error("Not connected");
      await this.connection.Send("execute", "load_app", app_id);
      return {
        installed_apps: this.installed_apps.map((i) =>
          i.id === app_id ? { ...i, running: true } : i
        ),
      };
    },
    async CloseApp(app_id: string) {
      if (!this.connection) throw new Error("Not connected");
      await this.connection.Send("execute", "close_app", app_id);
      return {
        installed_apps: this.installed_apps.map((i) =>
          i.id === app_id ? { ...i, running: false } : i
        ),
      };
    },
    SetNotifications(data: Array<Notification>) {
      return {
        notifications: data ?? [],
      };
    },
    async CloseNotification(notification: Notification) {
      await this.connection?.Send(
        "execute",
        "clear_notification",
        notification.id
      );

      return {
        notifications: this.notifications.filter(
          (n) => n.id !== notification.id
        ),
      };
    },
  }
);

export default Engine;
