import path from "path";
import Config from "../../../defaults/root.config.json";

export const localSessionPath = path.join(
  process.cwd(),
  Config.local_cli_session_path
);
