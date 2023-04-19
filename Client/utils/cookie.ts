const name = "counter_top_auth_token";

export function SetCookie(value: string, days: number) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

export function GetCookie() {
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
