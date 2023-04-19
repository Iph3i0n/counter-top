import * as Jwt from "../deps/djwt.ts";

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

export async function Create(user_id: string) {
  return await Jwt.create(
    { alg: "HS512", typ: "JWT" },
    { user_id, exp: Jwt.getNumericDate(7 * 24 * 60 * 60) },
    key
  );
}

export async function Decode(jwt: string): Promise<{ user_id: string }> {
  return (await Jwt.verify(jwt, key)) as any;
}
