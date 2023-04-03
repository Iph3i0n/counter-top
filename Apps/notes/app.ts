import CreateAppServer from "../../Interfacing/AppServer.ts";
import { Struct, UTF8, DateTime } from "../../deps/moulding_tin.ts";

const Server = CreateAppServer(
  {
    notes: new Struct({
      name: new UTF8(),
      created: new DateTime(),
      modified: new DateTime(),
      text: new UTF8(),
    }),
  },
  {},
  (c) => {
    c.OpenWindow("index.html", "Notes", {
      top: "50px",
      left: "50px",
      width: "800px",
      height: "600px",
    }).then(() => c.EndApp());
    return c;
  }
);

Server.CreateHandler("create_note", ({ UserState }, _, name: string) => {
  const id = crypto.randomUUID();
  UserState.Write({
    notes: {
      [id]: {
        name,
        created: new Date(),
        modified: new Date(),
        text: "",
      },
    },
  });

  return id;
});

Server.CreateHandler(
  "update_note",
  ({ UserState }, _, id: string, name: string, text: string) => {
    const existing = UserState.Model.notes[id];
    if (!existing) return "not found";

    UserState.Write({
      notes: {
        [id]: {
          name,
          created: existing.modified,
          modified: new Date(),
          text,
        },
      },
    });
  }
);

Server.CreateHandler("delete_note", ({ UserState }, _, id: string) => {
  const existing = UserState.Model.notes[id];
  if (!existing) return "not found";

  UserState.Write({ notes: { [id]: undefined } });
});

Server.CreateHandler("notes_list", ({ UserState }, _) => {
  const result = [];
  for (const [id, value] of UserState.Model.notes)
    result.push({ id, name: value.name, modified: value.modified });

  return result;
});

Server.CreateHandler("note_text", ({ UserState }, _, id: string) => {
  const existing = UserState.Model.notes[id];
  if (!existing) return "not found";

  return existing.text;
});
