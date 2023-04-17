import Server from "./Server.ts";
import { RequireParameters } from "../deps/puristee.ts";
import { IsString } from "../deps/type_guard.ts";
import { Decode } from "./Jwt.ts";
import MakeConnection from "./Connection.ts";

Server.CreateHandler("/os/session", "GET")
  .With(RequireParameters({ token: IsString }))
  .Register(async (r, s, _, c) => {
    try {
      const { user_id } = await Decode(c.parameters.token);
      const user = s.users[user_id];
      if (!user) return { status: 403 };
      if (!r.IsUpgradable) return { status: 400 };

      const { socket, response } = r.Upgrade();
      MakeConnection(socket, user_id);
      return response;
    } catch {
      return { status: 403 };
    }
  });
