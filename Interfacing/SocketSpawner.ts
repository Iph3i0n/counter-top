import {
  Command,
  IsCommand,
  IsResponse,
  Response,
  StartCommand,
} from "./MessageTypes.ts";
import { DoNotCare, PatternMatch } from "../deps/type_guard.ts";

export default async function SpawnSocket(
  url: string,
  starting_data: any,
  commands?: Record<string, (...data: any) => any>
) {
  const socket = new WebSocket(url);

  if (socket.readyState !== socket.OPEN)
    await new Promise((res, rej) => {
      socket.onopen = res;
      socket.onerror = rej;
    });

  return await new Promise<{
    Send(command: string, ...args: any): Promise<any>;
    Close(): void;
  }>((res, rej) => {
    const respond = (data: Response) => socket.send(JSON.stringify(data));

    if (commands)
      socket.addEventListener("message", async (event) => {
        const data_raw = event.data;
        if (typeof data_raw !== "string") return;
        const data = JSON.parse(data_raw);

        try {
          await PatternMatch(IsCommand, DoNotCare)(
            async (data) => {
              const handler = commands[data.command];
              if (!handler)
                respond({
                  request_id: data.request_id,
                  response: "not found",
                });
              else {
                const response = await handler(...data.args);
                respond({
                  request_id: data.request_id,
                  response: response,
                });
              }
            },
            () => {}
          )(data);
        } catch (err) {
          console.error(err);
          respond({
            request_id: data.request_id ?? "unknown",
            response: "unknown error",
          });
        }
      });

    const timeout = setTimeout(() => {
      socket.close();
      rej("Failed to start worker");
    }, 50000);

    const send = (
      data: Omit<StartCommand | Command | Response, "request_id">
    ) =>
      new Promise<any>((res) => {
        const request_id = crypto.randomUUID();
        const final = { ...data, request_id };

        const listener = (event: MessageEvent) => {
          const data_raw = event.data;
          if (typeof data_raw !== "string") return;
          const data = JSON.parse(data_raw);
          try {
            if (!IsResponse(data) || data.request_id !== request_id) return;
            socket.removeEventListener("message", listener);
            res(data.response);
          } catch (err) {
            console.error(err);
          }
        };

        socket.addEventListener("message", listener);
        socket.send(JSON.stringify(final));
      });

    setTimeout(async () => {
      const response = await send({ type: "start", context: starting_data });
      clearTimeout(timeout);
      if (response !== "started") {
        socket.close();
        rej(response);
        return;
      }

      res({
        Send(command, ...args) {
          return send({ command, args });
        },
        Close() {
          socket.close();
        },
      });
    }, 100);
  });
}
