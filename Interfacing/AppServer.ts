import {
  DoNotCare,
  IsObject,
  IsString,
  Optional,
  Assert,
} from "../deps/type_guard.ts";
import CreateServer from "./WorkerServer.ts";
import { Directory, Schema } from "../deps/fs_db.ts";
import OsSchema from "../Lib/OsSchema.ts";

const IsAppStartup = IsObject({
  location: IsObject({
    entry_point: IsString,
    ui_main: IsString,
    global_state: IsString,
    user_state: IsString,
    system_state: Optional(IsString),
  }),
  user_id: IsString,
  args: Optional(DoNotCare),
});

type Bounds = { top: string; left: string; width: string; height: string };

type BasicContext<TLocal extends Schema, TGlobal extends Schema> = {
  readonly OsStore: Directory<typeof OsSchema>;
  readonly UserState: Directory<TLocal>;
  readonly GlobalState: Directory<TGlobal>;
  OpenWindow(location: string, name: string, bounds?: Bounds): Promise<void>;
  EndApp(): Promise<void>;
  readonly UserId: string;
};

export default function CreateAppServer<
  TLocal extends Schema,
  TGlobal extends Schema,
  TContext = BasicContext<TLocal, TGlobal>
>(
  local_schema: TLocal,
  global_schema: TGlobal,
  startup?: (ctx: BasicContext<TLocal, TGlobal>) => TContext | Promise<TContext>
) {
  const result = CreateServer<TContext>(async (ctx) => {
    Assert(IsAppStartup, ctx);

    const context = {
      get OsStore() {
        if (!ctx.location.system_state)
          throw new Error(
            "Attempting to access system state without admin privileges"
          );
        return new Directory(OsSchema, ctx.location.system_state);
      },

      get UserState() {
        return new Directory(local_schema, ctx.location.user_state);
      },

      get GlobalState() {
        return new Directory(global_schema, ctx.location.global_state);
      },

      OpenWindow(
        location: string,
        name: string,
        bounds?: Bounds
      ): Promise<void> {
        return result.Postback("open_window", location, name, bounds);
      },

      EndApp(): Promise<void> {
        return result.Postback("close_app");
      },

      get UserId() {
        return ctx.user_id;
      },
    };

    const final_context = startup ? await startup(context) : context;

    return final_context as any;
  });

  return result;
}
