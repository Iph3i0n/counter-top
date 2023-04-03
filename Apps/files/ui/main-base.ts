import { ComponentBase, CreateRef } from "../../../deps/wholemeal.ts";

type ChildFolder = {
  name: string;
  created: string;
  modified: string;
  folders: Array<string>;
  parent: string;
  id: string;
};

type AppFile = {
  name: string;
  created: string;
  modified: string;
  blob: string;
  parent: string;
  id: string;
};

type Folder = {
  name: string;
  created: string;
  modified: string;
  folders: Array<ChildFolder>;
  files: Array<AppFile>;
  parent: string;
  id: string;
};

declare global {
  function Invoke(action: string, ...args: any[]): Promise<any>;
  function SetMenus(menus: Array<any>): void;
}

export default abstract class Main extends ComponentBase {
  current_folder: Folder = undefined as any;
  breadcrumbs: Array<Folder> = [];

  info_item: AppFile | Folder | undefined = undefined;

  confirm_dialogue: { res: () => void; rej: () => void } | undefined =
    undefined;

  name_picker_ref = CreateRef<
    HTMLElement & {
      get_name: (start: string) => Promise<string>;
    }
  >();

  file_uploader_ref = CreateRef<
    HTMLElement & {
      get_files: () => Promise<Array<{ name: string; data: string }>>;
    }
  >();

  get name_picker() {
    const instance = this.name_picker_ref.current;
    if (!instance) throw new Error("Ref not set");
    return instance;
  }

  get file_uploader() {
    const instance = this.file_uploader_ref.current;
    if (!instance) throw new Error("Ref not set");
    return instance;
  }

  async confirm() {
    await new Promise<void>((res, rej) => {
      this.confirm_dialogue = {
        res: () => {
          this.confirm_dialogue = undefined;
          this.should_render();
          res();
        },
        rej: () => {
          this.confirm_dialogue = undefined;
          this.should_render();
          rej();
        },
      };
      this.refresh();
    });
  }

  format(date: string) {
    const final = new Date(date);
    return final.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "long",
    });
  }

  async refresh() {
    this.current_folder = await window.Invoke(
      "open_folder",
      this.current_folder.id
    );
    this.should_render();
  }

  async StartUp() {
    this.current_folder = await Invoke("open_folder");
    this.breadcrumbs = [this.current_folder];

    SetMenus([
      {
        name: "Folder",
        items: [
          {
            name: "Create Folder",
            onclick: async () => {
              const name = await this.name_picker.get_name("");
              await window.Invoke(
                "create_folder",
                name,
                this.current_folder.id
              );
              await this.refresh();
            },
          },
          {
            name: "Upload Files",
            onclick: async () => {
              const files = await this.file_uploader.get_files();
              for (const file of files)
                await window.Invoke(
                  "upload_file",
                  file.name,
                  this.current_folder.id,
                  file.data
                );

              await this.refresh();
            },
          },
        ],
      },
    ]);
  }

  file_actions(file: AppFile) {
    return [
      {
        icon: "download-cloud",
        action: async () => {
          const data = await Invoke("file-content", file.id);
          const link = document.createElement("a");
          link.download = file.name;
          link.href = data;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        },
      },
      {
        icon: "edit",
        action: async () => {
          const new_name = await this.name_picker.get_name(file.name);
          await Invoke("rename_file", file.id, new_name);
          await this.refresh();
        },
      },
      {
        icon: "file-info",
        action: () => {
          this.info_item = file;
          this.should_render();
        },
      },
      {
        icon: "delete-bin",
        action: async () => {
          await this.confirm();

          await Invoke("delete_file", file.id);
          await this.refresh();
        },
      },
    ];
  }

  folder_actions(folder: Folder) {
    return [
      {
        icon: "door-open",
        action: async () => {
          this.current_folder = await window.Invoke("open_folder", folder.id);
          this.breadcrumbs.push(this.current_folder);
          this.should_render();
        },
      },
      {
        icon: "edit",
        action: async () => {
          const new_name = await this.name_picker.get_name(folder.name);
          await Invoke("rename_folder", folder.id, new_name);
          await this.refresh();
        },
      },
      {
        icon: "folder-info",
        action: () => {
          this.info_item = folder;
          this.should_render();
        },
      },
      {
        icon: "delete-bin",
        action: async () => {
          await this.confirm();

          await Invoke("delete_folder", folder.id);
          await this.refresh();
        },
      },
    ];
  }

  open_breadcrumbs(folder: Folder) {
    return async () => {
      const new_crumbs = [];
      for (const page of this.breadcrumbs) {
        new_crumbs.push(page);
        if (page === folder) break;
      }

      this.current_folder = await window.Invoke("open_folder", folder.id);
      this.breadcrumbs = new_crumbs;
    };
  }
}
