import { existsSync, readFileSync } from "fs";
import { PrintConfigOptions } from "./print-config.types";
import { getConfigValue } from "../common/config.tools";

import Config from "../../../defaults/root.config.json";

export const printConfig = (options: PrintConfigOptions) => {
  const { key } = options;

  const storedConfig = existsSync(Config.local_config_path)
    ? readFileSync(Config.local_config_path, "utf-8")
    : null;

  if (storedConfig && key) {
    console.log(`{ ${key}: ${getConfigValue(JSON.parse(storedConfig), key)} }`);
  } else if (storedConfig) {
    console.dir(storedConfig, { depth: null });
  } else {
    console.log("");
  }
};
