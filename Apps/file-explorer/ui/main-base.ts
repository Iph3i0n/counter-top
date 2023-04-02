import { ComponentBase } from "../../../deps/wholemeal.ts";

type ChildFolder = {
  name: string;
  created: Date;
  modified: Date;
  folders: Array<string>;
  parent: string;
  id: string;
};

type AppFile = {
  name: string;
  created: Date;
  modified: Date;
  blob: string;
  parent: string;
  id: string;
};

type Folder = {
  name: string;
  created: Date;
  modified: Date;
  folders: Array<ChildFolder>;
  files: Array<AppFile>;
  parent: string;
  id: string;
};

declare global {
  function Invoke(action: string, ...args: any[]): Promise<any>;
  function SetMenus(menus: Array<any>): void;
}

type Mode = "" | "creating_folder" | "creating_file";

export default abstract class Main extends ComponentBase {
  current_folder: Folder = undefined as any;
  breadcrumbs: Array<Folder> = [];
  mode: Mode = "";

  #toggle_mode(name: Mode) {
    return () => {
      if (this.mode === name) this.mode = "";
      else this.mode = name;
      this.should_render();
    };
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
            onclick: this.#toggle_mode("creating_folder"),
          },
          { name: "Upload Files", onclick: this.#toggle_mode("creating_file") },
          {
            name: "Download Zip",
            onclick: () => {
              debugger;
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
        actions: async () => {},
      },
      {
        icon: "file-info",
        actions: async () => {},
      },
      {
        icon: "delete-bin",
        actions: async () => {},
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
          this.mode = "";
          this.should_render();
        },
      },
      {
        icon: "edit",
        actions: async () => {},
      },
      {
        icon: "file-info",
        actions: async () => {},
      },
      {
        icon: "delete-bin",
        actions: async () => {},
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
      this.mode = "";
    };
  }

  #to_data_url(file: File) {
    return new Promise((res) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        res(reader.result);
      });
      reader.readAsDataURL(file);
    });
  }

  async create_folder(e: any) {
    const form = e.FormData;

    await window.Invoke("create_folder", form.name, this.current_folder.id);

    this.current_folder = await window.Invoke(
      "open_folder",
      this.current_folder.id
    );
    this.mode = "";
  }

  async create_file(e: any) {
    const form = e.FormData;
    for (const file of form.file_data)
      await window.Invoke(
        "upload_file",
        file.name,
        this.current_folder.id,
        await this.#to_data_url(file)
      );

    this.current_folder = await window.Invoke(
      "open_folder",
      this.current_folder.id
    );
    this.mode = "";
  }
}
