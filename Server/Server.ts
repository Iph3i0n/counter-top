import CreateServer from "../deps/puristee.ts";
import OsSchema from "../Lib/OsSchema.ts";
import { StoreDir } from "../Lib/OsStore.ts";

export default CreateServer(StoreDir, OsSchema);
