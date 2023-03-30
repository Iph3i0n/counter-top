import { CoreMain } from "../Lib/Location.ts";
import CreateSocketServer from "../Interfacing/SocketServer.ts";
import SpawnServer from "../Interfacing/WorkerSpawner.ts";

export default function MakeConnection(socket: WebSocket, user_id: string) {
  const server = CreateSocketServer(socket, async (_, socket) => {
    const worker = await SpawnServer(
      CoreMain,
      {
        type: "module",
        deno: {
          permissions: "inherit",
        },
      },
      { user_id },
      {
        async open_window(app: string, location: string) {
          return await server.Postback("open_window", app, location);
        },
      }
    );

    socket.onclose = () => {
      worker.Close();
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
