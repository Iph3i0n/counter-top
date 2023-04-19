import CreateAppServer from "../../Interfacing/AppServer.ts";
import {
  Struct,
  ASCII,
  UTF8,
  DateTime,
  Array,
  Optional,
} from "../../deps/moulding_tin.ts";

const Server = CreateAppServer(
  {
    folders: new Struct({
      name: new UTF8(),
      created: new DateTime(),
      modified: new DateTime(),
      folders: new Array(new ASCII()),
      files: new Array(new ASCII()),
      parent: new Optional(new ASCII()),
    }),
    files: new Struct({
      name: new UTF8(),
      created: new DateTime(),
      modified: new DateTime(),
      blob: new ASCII(),
      parent: new ASCII(),
    }),
    blobs: new ASCII(),
  },
  {}
);

Server.CreateHandler("system:focus", ({ OpenWindow }) => {
  OpenWindow("index.html", "File Explorer");
});

Server.CreateHandler(
  "open_folder",
  ({ UserState }, _sender: string, folder_id: string) => {
    if (!folder_id) {
      if (!UserState.Model.folders.ROOT_DIRECTORY)
        UserState.Write({
          folders: {
            ROOT_DIRECTORY: {
              name: "Home",
              created: new Date(),
              modified: new Date(),
              folders: [],
              files: [],
              parent: null,
            },
          },
        });

      folder_id = "ROOT_DIRECTORY";
    }

    const subject = UserState.Model.folders[folder_id];
    return {
      id: folder_id,
      ...subject,
      folders: subject.folders.map((f) => ({
        id: f,
        ...UserState.Model.folders[f],
      })),
      files: subject.files.map((f) => ({
        id: f,
        ...UserState.Model.files[f],
      })),
    };
  }
);

Server.CreateHandler(
  "create_folder",
  ({ UserState }, _sender: string, name: string, parent_id: string) => {
    const id = crypto.randomUUID();

    const parent = UserState.Model.folders[parent_id];
    if (!parent) return "Not Found";

    UserState.Write({
      folders: {
        [parent_id]: {
          ...parent,
          folders: [...parent.folders, id],
          modified: new Date(),
        },
        [id]: {
          name,
          created: new Date(),
          modified: new Date(),
          folders: [],
          files: [],
          parent: parent_id,
        },
      },
    });
  }
);

Server.CreateHandler(
  "move_folder",
  (
    { UserState },
    _sender: string,
    id: string,
    old_parent_id: string,
    new_parent_id: string
  ) => {
    const existing = UserState.Model.folders[id];
    const old_parent = UserState.Model.folders[old_parent_id];
    const new_parent = UserState.Model.folders[new_parent_id];
    UserState.Write({
      folders: {
        [old_parent_id]: {
          ...old_parent,
          folders: old_parent.folders.filter((f) => f !== id),
          modified: new Date(),
        },
        [new_parent_id]: {
          ...new_parent,
          folders: [...new_parent.folders, id],
          modified: new Date(),
        },
        [id]: {
          ...existing,
          parent: new_parent_id,
        },
      },
    });
  }
);

Server.CreateHandler(
  "rename_folder",
  ({ UserState }, _sender: string, id: string, name: string) => {
    const existing = UserState.Model.folders[id];
    UserState.Write({
      folders: {
        [id]: {
          ...existing,
          name,
          modified: new Date(),
        },
      },
    });
  }
);

Server.CreateHandler(
  "delete_folder",
  ({ UserState }, _sender: string, id: string) => {
    const internal = (id: string) => {
      const existing = UserState.Model.folders[id];
      const parent = existing.parent
        ? UserState.Model.folders[existing.parent]
        : undefined;
      UserState.Write({
        folders: {
          [id]: undefined,
          ...(parent && existing.parent
            ? {
                [existing.parent]: {
                  ...parent,
                  folders: parent.folders.filter((f) => f !== id),
                },
              }
            : {}),
        },
      });

      new Promise<void>((res) => {
        for (const folder of existing.folders) internal(folder);
        for (const file of existing.files) {
          const existing = UserState.Model.files[file];
          const parent = UserState.Model.folders[existing.parent];
          UserState.Write({
            files: { [file]: undefined },
            blobs: { [existing.blob]: undefined },
            folders: {
              ...(parent
                ? {
                    [existing.parent]: {
                      ...parent,
                      files: parent.files.filter((f) => f !== id),
                    },
                  }
                : {}),
            },
          });
        }
        res();
      });
    };

    internal(id);
    return "Done";
  }
);

Server.CreateHandler(
  "upload_file",
  (
    { UserState },
    _sender: string,
    name: string,
    parent_id: string,
    data: string
  ) => {
    const id = crypto.randomUUID();
    const blob_id = crypto.randomUUID();

    const parent = UserState.Model.folders[parent_id];
    if (!parent) return "Not Found";

    UserState.Write({
      folders: {
        [parent_id]: {
          ...parent,
          files: [...parent.files, id],
          modified: new Date(),
        },
      },
      files: {
        [id]: {
          name,
          created: new Date(),
          modified: new Date(),
          blob: blob_id,
          parent: parent_id,
        },
      },
      blobs: {
        [blob_id]: data,
      },
    });
  }
);

Server.CreateHandler("delete_file", ({ UserState }, _: string, id: string) => {
  const existing = UserState.Model.files[id];
  const parent = UserState.Model.folders[existing.parent];
  UserState.Write({
    files: { [id]: undefined },
    blobs: { [existing.blob]: undefined },
    folders: {
      ...(parent
        ? {
            [existing.parent]: {
              ...parent,
              files: parent.files.filter((f) => f !== id),
            },
          }
        : {}),
    },
  });

  return "Done";
});

Server.CreateHandler(
  "move_file",
  (
    { UserState },
    _: string,
    id: string,
    old_parent_id: string,
    new_parent_id: string
  ) => {
    const existing = UserState.Model.files[id];
    const old_parent = UserState.Model.folders[old_parent_id];
    const new_parent = UserState.Model.folders[new_parent_id];
    UserState.Write({
      folders: {
        [old_parent_id]: {
          ...old_parent,
          files: old_parent.files.filter((f) => f !== id),
          modified: new Date(),
        },
        [new_parent_id]: {
          ...new_parent,
          files: [...new_parent.files, id],
          modified: new Date(),
        },
      },
      files: {
        [id]: {
          ...existing,
          parent: new_parent_id,
        },
      },
    });
  }
);

Server.CreateHandler(
  "rename_file",
  ({ UserState }, _: string, id: string, name: string) => {
    const existing = UserState.Model.files[id];
    UserState.Write({
      files: {
        [id]: {
          ...existing,
          name,
          modified: new Date(),
        },
      },
    });
  }
);

Server.CreateHandler(
  "file_content",
  ({ UserState }, _: string, file_id: string) => {
    const subject = UserState.Model.files[file_id];
    const blob = UserState.Model.blobs[subject.blob];

    return blob;
  }
);
