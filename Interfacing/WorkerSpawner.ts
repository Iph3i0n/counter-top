import * as Path from "../deps/path.ts";
import {
  Command,
  IsCommand,
  IsResponse,
  Response,
  StartCommand,
} from "./MessageTypes.ts";
import { DoNotCare, PatternMatch } from "../deps/type_guard.ts";

export default function SpawnServer(
  path: string,
  options: WorkerOptions,
  data: any,
  commands?: Record<string, (...data: any) => any>
) {
  return new Promise<{
    Send(command: string, ...args: any): Promise<any>;
    Close(): void;
  }>((res, rej) => {
    const worker = new Worker(Path.toFileUrl(path), {
      ...options,
      type: "module",
    });

    const respond = (data: Response) => worker.postMessage(data);

    if (commands)
      worker.addEventListener("message", async (event) => {
        const data = event.data;
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
      worker.terminate();
      rej("Failed to start worker");
    }, 50000);

    const send = (
      data: Omit<StartCommand | Command | Response, "request_id">
    ) =>
      new Promise<any>((res) => {
        const request_id = crypto.randomUUID();
        const final = { ...data, request_id };

        const listener = (event: MessageEvent) => {
          const data = event.data;
          try {
            if (!IsResponse(data) || data.request_id !== request_id) return;
            worker.removeEventListener("message", listener);
            res(data.response);
          } catch (err) {
            console.error(err);
          }
        };

        worker.addEventListener("message", listener);
        worker.postMessage(final);
      });

    setTimeout(async () => {
      const response = await send({ type: "start", context: data });
      clearTimeout(timeout);
      if (response !== "started") {
        worker.terminate();
        rej(response);
        return;
      }

      res({
        Send(command, ...args) {
          return send({ command, args });
        },
        Close() {
          worker.terminate();
        },
      });
    }, 100);
  });
}

export type SpawnedWorker = ReturnType<typeof SpawnServer>;
