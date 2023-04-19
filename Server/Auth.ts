import Server from "./Server.ts";
import { RequireBody, RequireParameters } from "../deps/puristee.ts";
import { IsObject, IsString } from "../deps/type_guard.ts";
import * as BCrypt from "../deps/bcrypt.ts";
import { Create } from "./Jwt.ts";
import { CanRegister } from "../Lib/Env.ts";

if (CanRegister)
  Server.CreateHandler("/api/auth/register", "POST")
    .With(
      RequireBody(
        IsObject({
          email: IsString,
          password: IsString,
        })
      )
    )
    .Register(async (_r, s, _, c) => {
      for (const [_id, value] of s.users)
        if (value.email === c.body.email) return { status: 409 };
      const id = crypto.randomUUID();

      return {
        state: {
          users: {
            [id]: {
              version: "v2",
              email: c.body.email,
              password: await BCrypt.hash(c.body.password),
              is_admin: false,
              wallpaper: "open-photo.jpeg",
              startup_apps: [],
            },
          },
        },
        response: {
          status: 201,
          body: {
            token: await Create(id),
          },
        },
      };
    });

Server.CreateHandler("/api/auth/token", "GET")
  .With(RequireParameters({ email: IsString, password: IsString }))
  .Register(async (_r, s, _p, c) => {
    for (const [id, value] of s.users) {
      if (value.email !== c.parameters.email) continue;

      if (!(await BCrypt.compare(c.parameters.password, value.password)))
        continue;

      return {
        status: 200,
        body: {
          token: await Create(id),
        },
      };
    }

    return {
      status: 403,
    };
  });
