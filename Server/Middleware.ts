import { Decode } from "./Jwt.ts";
import Server from "./Server.ts";

export const RequireAuth = Server.CreateMiddleware(async (r, s) => {
  const token = r.cookies.counter_top_auth_token;
  if (typeof token !== "string") return { status: 403 };

  const decoded = await Decode(token);
  if (!decoded || !s.users[decoded.user_id]) return { status: 403 };

  return {
    continue: true,
    context: { user_id: decoded.user_id },
  };
});
