import { DoNotCare, PatternMatch } from "../deps/type_guard.ts";
import {
  Command,
  IsCommand,
  IsResponse,
  IsStartCommand,
  Response,
} from "./MessageTypes.ts";

type Handler<TContext> = (context: TContext, ...args: any) => any;

export default function CreateSocketServer<TContext = any>(
  socket: WebSocket,
  startup: (context: any, socket: WebSocket) => TContext | Promise<TContext>
) {
  let context: TContext;
  const handlers: Record<string, Handler<TContext>> = {};

  const respond = (data: Response) => socket.send(JSON.stringify(data));
  const command = (data: Command) => socket.send(JSON.stringify(data));

  socket.addEventListener("message", async (event) => {
    const data_raw = event.data;
    if (typeof data_raw !== "string") return;
    const data = JSON.parse(data_raw);

    try {
      await PatternMatch(IsStartCommand, IsCommand, DoNotCare)(
        async (data) => {
          context = await startup(data.context, socket);
          respond({
            request_id: data.request_id,
            response: "started",
          });
        },
        async (data) => {
          const handler = handlers[data.command];
          if (!handler)
            respond({
              request_id: data.request_id,
              response: "not found",
            });
          else {
            const response = await handler(context, ...data.args);
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
      if (socket.readyState === socket.OPEN)
        respond({
          request_id: data.request_id ?? "unknown",
          response: "unknown error",
        });
    }
  });

  return {
    CreateHandler(name: string, handler: Handler<TContext>) {
      handlers[name] = handler;
    },
    Postback(command_name: string, ...args: any) {
      return new Promise<any>((res) => {
        const request_id = crypto.randomUUID();

        const handler = (event: MessageEvent) => {
          const data_raw = event.data;
          if (typeof data_raw !== "string") return;
          const data = JSON.parse(data_raw);
          try {
            if (!IsResponse(data) || data.request_id !== request_id) return;
            socket.removeEventListener("message", handler);
            res(data.response);
          } catch (err) {
            console.error(err);
          }
        };

        socket.addEventListener("message", handler);
        command({
          request_id,
          command: command_name,
          args,
        });
      });
    },
  };
}
