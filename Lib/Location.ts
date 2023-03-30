import * as Path from "../deps/path.ts";

const __dirname = Path.dirname(Path.fromFileUrl(import.meta.url));

export const DataDir = Path.resolve(Deno.cwd(), ".counter-top");

export const ClientDir = Path.resolve(__dirname, "..", "Client");

export const DefaultAppsDir = Path.resolve(__dirname, "..", "apps");

export const CoreMain = Path.resolve(__dirname, "..", "core", "main.ts");
