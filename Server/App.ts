import Server from "./Server.ts";
import { ServeDirectory, RequireParameters } from "../deps/puristee.ts";
import { IsString, IsUnion, IsArray } from "../deps/type_guard.ts";
import { RequireAuth } from "./Middleware.ts";

Server.CreateHandler("/apps/:app_id/**", "GET")
  .With(RequireAuth)
  .With(
    RequireParameters({
      app_id: IsString,
      slug: IsUnion(IsString, IsArray(IsString)),
    })
  )
  .Register((r, s, _p, c) => {
    const app = s.apps[c.parameters.app_id];
    if (!app) return { status: 404 };

    return ServeDirectory(app.ui_dir)(r);
  });
