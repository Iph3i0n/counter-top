import { Directory } from "../deps/fs_db.ts";
import * as Path from "../deps/path.ts";
import { DataDir, DefaultAppsDir } from "./Location.ts";
import { AdminUsers } from "./Env.ts";
import OsSchema from "./OsSchema.ts";
import * as BCrypt from "../deps/bcrypt.ts";

export const StoreDir = Path.resolve(DataDir, "os-data", "core");

const result = new Directory(OsSchema, StoreDir);

let initialise = true;

for (const _ of result.Model.apps) {
  initialise = false;
  break;
}

if (initialise)
  result.Write({
    apps: {
      "file-explorer": {
        version: "v1",
        name: "File Explorer",
        entry_point: Path.resolve(DefaultAppsDir, "file-explorer", "app.ts"),
        ui_dir: Path.resolve(DefaultAppsDir, "file-explorer"),
        admin: false,
        system: true,
      },
    },
  });

result.Write({
  users:
    AdminUsers?.reduce(
      (c, n, i) => ({
        ...c,
        [`ADMIN_USER_${i}`]: {
          version: "v1",
          email: n.email,
          password: BCrypt.hashSync(n.password),
          is_admin: true,
          wallpaper: "open-photo.jpeg",
        },
      }),
      {} as any
    ) ?? {},
});

console.log(AdminUsers);
export default result;
