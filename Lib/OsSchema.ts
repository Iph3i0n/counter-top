import {
  Struct,
  UTF8,
  ASCII,
  Bool,
  Union,
  Literal,
  Array,
  DateTime,
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
      release: new ASCII(),
    })
  ),
  users: new Union(
    new Struct({
      version: new Literal("v1"),
      email: new UTF8(),
      password: new ASCII(),
      is_admin: new Bool(),
      wallpaper: new ASCII(),
    }),
    new Struct({
      version: new Literal("v2"),
      email: new UTF8(),
      password: new ASCII(),
      is_admin: new Bool(),
      wallpaper: new ASCII(),
      startup_apps: new Array(new ASCII()),
    })
  ),
  notifications: new Array(
    new Struct({
      app: new ASCII(),
      title: new UTF8(),
      stamp: new DateTime(),
      text: new UTF8(),
    })
  ),
};
