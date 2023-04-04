import SpawnSocket from "../../Interfacing/SocketSpawner.ts";
import OpenWindowEvent from "../utils/open_window_event.ts";

const name = "counter_top_auth_token";

function SetCookie(value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function GetCookie() {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let c of ca) {
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

export function ClearCookie() {
  SetCookie("", 0);
}

export function StartConnection(token: string) {
  return new Promise(async (res, rej) => {
    SetCookie(token, 7);
    const is_https = location.protocol === "https:";
    const protocol = is_https ? "wss:" : "ws:";
    const url = `${protocol}//${
      location.host
    }/os/session?token=${encodeURIComponent(token)}`;

    res(
      await SpawnSocket(
        url,
        {},
        {
          open_window: (app, location, name, bounds) => {
            return new Promise<void>((res) => {
              document.dispatchEvent(
                new OpenWindowEvent(app, location, name, res, bounds)
              );
            });
          },
        }
      ).catch(rej)
    );
  });
}

export async function TryStartConnection() {
  try {
    const cookie = GetCookie();
    if (cookie) return await StartConnection(cookie);
    return undefined;
  } catch {
    return undefined;
  }
}
