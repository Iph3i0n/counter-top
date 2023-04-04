import CreateAppServer from "../../Interfacing/AppServer.ts";

const Server = CreateAppServer({}, {}, (c) => {
  c.OpenWindow("index.html", "Settings", {
    top: "50px",
    left: "50px",
    width: "800px",
    height: "600px",
  }).then(() => c.EndApp());
  return c;
});
