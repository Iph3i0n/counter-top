import { CoreMain } from "../Lib/Location.ts";
import CreateSocketServer from "../Interfacing/SocketServer.ts";
import SpawnServer from "../Interfacing/WorkerSpawner.ts";
import Store from "../Lib/OsStore.ts";
const instances: Record<string, ReturnType<typeof SpawnServer>> = {};

for (const [id] of Store.Model.users)
  instances[id] = SpawnServer(
    CoreMain,
    {
      type: "module",
      deno: {
        permissions: "inherit",
      },
    },
    { user_id: id }
  );

export default function MakeConnection(socket: WebSocket, user_id: string) {
  const server = CreateSocketServer(socket, async (_, socket) => {
    let windows: Array<() => void> = [];
    const worker = await instances[user_id];
    if (!worker) {
      throw new Error("No worker found for user " + user_id);
    }

    worker.AddPostback(
      "open_window",
      (app: string, location: string, name: string, bounds: unknown) => {
        return new Promise<void>((res, rej) => {
          server
            .Postback("open_window", app, location, name, bounds)
            .then(() => {
              windows = windows.filter((w) => w !== res);
              res();
            })
            .catch(() => {
              windows = windows.filter((w) => w !== res);
              rej();
            });

          windows.push(res);
        });
      }
    );
    socket.onclose = () => {
      for (const close of windows) close();
      worker.ClearPostbacks();
      console.log(`Session closed for ${user_id}`);
    };

    return worker;
  });

  server.CreateHandler(
    "execute",
    (context, command: string, ...args: any[]) => {
      return context.Send(command, ...args);
    }
  );
}
