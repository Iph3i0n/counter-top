import "../deps/dotenv.ts";

export const AdminUsers = Deno.env
  .get("ADMIN_USERS")
  ?.split(",")
  .map((s) => s.split(":"))
  .map(([email, password]) => ({ email, password }));

export const CanRegister = !!Deno.env.get("CAN_REGISTER");
