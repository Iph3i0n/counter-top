import "../deps/dotenv.ts";
import * as Path from "../deps/path.ts";

const __dirname = Path.dirname(Path.fromFileUrl(import.meta.url));

export const DataDir =
  Deno.env.get("DATA_DIR") || Path.resolve(Deno.cwd(), ".counter-top");

export const ClientDir = Path.resolve(__dirname, "..", "Client");

export const DefaultAppsDir = Path.resolve(__dirname, "..", "Apps");

export const CoreMain = Path.resolve(__dirname, "..", "Core", "main.ts");
