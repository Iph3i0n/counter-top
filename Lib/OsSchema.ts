import {
  Struct,
  UTF8,
  ASCII,
  Bool,
  Union,
  Literal,
} from "../deps/moulding_tin.ts";

export default {
  apps: new Union(
    new Struct({
      version: new Literal("v1"),
      name: new UTF8(),
      entry_point: new ASCII(),
      ui_dir: new ASCII(),
      admin: new Bool(),
      system: new Bool(),
    })
  ),
  users: new Union(
    new Struct({
      version: new Literal("v1"),
      email: new UTF8(),
      password: new ASCII(),
      is_admin: new Bool(),
      wallpaper: new UTF8(),
    })
  ),
};
