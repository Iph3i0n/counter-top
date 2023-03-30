import {
  IsObject,
  IsString,
  Optional,
  DoNotCare,
  Assert,
} from "../deps/type_guard.ts";
import { Directory, Schema } from "../deps/fs_db.ts";
import OsSchema from "./OsSchema.ts";

const IsAppStartup = IsObject({
  location: IsObject({
    entry_point: IsString,
    ui_main: IsString,
    global_state: IsString,
    user_state: IsString,
    system_state: Optional(IsString),
  }),
  args: Optional(DoNotCare),
});

export default abstract class CounterTopApp {
  readonly #global_state_dir: string;
  readonly #user_state_dir: string;
  readonly #system_state_dir: string | null | undefined;

  constructor(data: unknown) {
    Assert(IsAppStartup, data);
    this.#global_state_dir = data.location.global_state;
    this.#user_state_dir = data.location.user_state;
    this.#system_state_dir = data.location.system_state;
  }

  get OsStore() {
    if (!this.#system_state_dir)
      throw new Error(
        "Attempting to access system state without admin privileges"
      );
    return new Directory(OsSchema, this.#system_state_dir);
  }

  GlobalState<TSchema extends Schema>(schema: TSchema) {
    return new Directory(schema, this.#global_state_dir);
  }

  UserState<TSchema extends Schema>(schema: TSchema) {
    return new Directory(schema, this.#user_state_dir);
  }
}
