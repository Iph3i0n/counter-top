import Server from "./Server.ts";
import { ServeFile, ServeDirectory } from "../deps/puristee.ts";
import * as Path from "../deps/path.ts";
import { ClientDir } from "../Lib/Location.ts";
import { RequireAuth } from "./Middleware.ts";

Server.CreateHandler("/", "GET").Register(
  ServeFile(Path.resolve(ClientDir, "index.html"))
);

Server.CreateHandler("/os/bundle.min.js", "GET").Register(
  ServeFile(Path.resolve(ClientDir, "dist", "bundle.min.js"))
);

Server.CreateHandler("/os/public/**", "GET")
  .With(RequireAuth)
  .Register(ServeDirectory(Path.resolve(ClientDir, "public")));
