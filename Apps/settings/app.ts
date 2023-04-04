import CreateAppServer from "../../Interfacing/AppServer.ts";
import { IsObject, IsString, Assert, Optional } from "../../deps/type_guard.ts";
import * as BCrypt from "../../deps/bcrypt.ts";

const Server = CreateAppServer({}, {}, (c) => {
  c.OpenWindow("index.html", "Settings", {
    top: "50px",
    left: "50px",
    width: "800px",
    height: "600px",
  }).then(() => c.EndApp());
  return c;
});

const IsUserModel = IsObject({
  email: Optional(IsString),
  password: Optional(IsString),
  wallpaper: Optional(IsString),
});

Server.CreateHandler("update_user", ({ OsStore, UserId }, sender, model) => {
  if (sender !== "client") return "denied";
  Assert(IsUserModel, model);
  const existing = OsStore.Model.users[UserId];
  if (!existing) return "not found";

  OsStore.Write({
    users: {
      [UserId]: {
        version: "v1",
        email: model.email ?? existing.email,
        password: model.password
          ? BCrypt.hashSync(model.password)
          : existing.password,
        is_admin: existing.is_admin,
        wallpaper: model.wallpaper ?? existing.wallpaper,
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
  };
});
