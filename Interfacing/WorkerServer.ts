import { DoNotCare, PatternMatch } from "../deps/type_guard.ts";
import {
  Command,
  IsCommand,
  IsResponse,
  IsStartCommand,
  Response,
} from "./MessageTypes.ts";

type Handler<TContext> = (context: TContext, ...args: any) => any;

export default function CreateServer<TContext = any>(
  startup: (context: any) => TContext | Promise<TContext>
) {
  let context: TContext;

  const handlers: Record<string, Handler<TContext>> = {};

  const respond = (data: Response) => self.postMessage(data);
  const command = (data: Command) => self.postMessage(data);

  self.addEventListener("message", async (event) => {
    const data = event.data;
    try {
      await PatternMatch(IsStartCommand, IsCommand, DoNotCare)(
        async (data) => {
          context = await startup(data.context);
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
          const data = event.data;
          try {
            if (!IsResponse(data) || data.request_id !== request_id) return;
            self.removeEventListener("message", handler);
            res(data.response);
          } catch (err) {
            console.error(err);
          }
        };

        self.addEventListener("message", handler);
        command({
          request_id,
          command: command_name,
          args,
        });
      });
    },
  };
}
