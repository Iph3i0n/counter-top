import { Directory } from "../deps/fs_db.ts";
import * as Path from "../deps/path.ts";
import { DataDir, DefaultAppsDir } from "./Location.ts";
import { AdminUsers } from "./Env.ts";
import OsSchema from "./OsSchema.ts";
import * as BCrypt from "../deps/bcrypt.ts";

export const StoreDir = Path.resolve(DataDir, "os-data", "core");

const result = new Directory(OsSchema, StoreDir);

result.Write({
  apps: {
    files: {
      version: "v1",
      name: "File Explorer",
      entry_point: Path.resolve(DefaultAppsDir, "files", "app.ts"),
      ui_dir: Path.resolve(DefaultAppsDir, "files"),
      admin: false,
      system: true,
      release: "system",
    },
    settings: {
      version: "v1",
      name: "Settings",
      entry_point: Path.resolve(DefaultAppsDir, "settings", "app.ts"),
      ui_dir: Path.resolve(DefaultAppsDir, "settings"),
      admin: true,
      system: true,
      release: "system",
    },
  },
  users:
    AdminUsers?.reduce((c, n, i) => {
      const id = `ADMIN_USER_${i}`;
      const existing = result.Model.users[id];
      if (existing)
        return {
          ...c,
          [id]: existing,
        };

      return {
        ...c,
        [id]: {
          version: "v2",
          email: n.email,
          password: BCrypt.hashSync(n.password),
          is_admin: true,
          wallpaper: "open-photo.jpeg",
          startup_apps: [],
        },
      };
    }, {} as any) ?? {},
});

export default result;
