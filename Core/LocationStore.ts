import * as Path from "../deps/path.ts";
import Store, { StoreDir } from "../Lib/OsStore.ts";
import { DataDir } from "../Lib/Location.ts";

export type AppLocation = {
  entry_point: string;
  ui_main: string;
  global_state: string;
  user_state: string;
  system_state?: string;
};

export default class LocationStore {
  readonly #user_id: string;

  constructor(user_id: string) {
    this.#user_id = user_id;
  }

  App(app_id: string): AppLocation {
    const entry = Store.Model.apps[app_id];
    if (!entry) throw new Error(`App ${app_id} was not found`);
    return {
      entry_point: entry.entry_point,
      ui_main: entry.ui_dir,
      global_state: Path.resolve(DataDir, "app-data", app_id, "global"),
      user_state: Path.resolve(DataDir, "app-data", app_id, this.#user_id),
      system_state: entry.admin ? Path.resolve(StoreDir) : undefined,
    };
  }
}
