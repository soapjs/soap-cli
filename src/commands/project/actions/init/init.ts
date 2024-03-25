import { dirname } from "path";
import { existsSync } from "fs";
import { InitOptions } from "./types";
import { InitInteractiveStrategy } from "./init.interactive-strategy";
import { InitOptionsStrategy } from "./init.options-strategy";
import { PluginMapService } from "../../../../core/config/plugin-map.service";
import Config from "../../../../defaults/root.config.json";
import { readdir, unlink } from "fs/promises";
import { Texts } from "@soapjs/soap-cli-common";
import chalk from "chalk";
import { InteractionPrompts } from "@soapjs/soap-cli-interactive";

export const init = async (options: InitOptions) => {
  const texts = Texts.load();
  const configExists = existsSync(Config.local_config_path);
  let shouldContinue = true;

  if (!options.force && configExists) {
    shouldContinue =
      (await InteractionPrompts.continue(
        texts.get("configuration_file_detected_do_you_want_to_overwrite_it")
      )) === true; //fix

    if (!shouldContinue) {
      process.exit(0);
    }
  }

  if (shouldContinue && configExists) {
    try {
      const dir = dirname(Config.local_config_path);
      const files = await readdir(dir);
      const unlinkPromises = files.map((filename) =>
        unlink(`${dir}/${filename}`)
      );
      return Promise.all(unlinkPromises);
    } catch (err) {
      console.log(err);
      process.exit(1);
    }
  }

  const pluginMapService = new PluginMapService(
    Config.plugin_map_url,
    Config.local_plugin_map_path
  );

  const pluginMap = await pluginMapService.sync();

  if (Object.keys(options).length === 0) {
    new InitInteractiveStrategy(pluginMap).apply().catch((error) => {
      if (error) {
        console.log(chalk.yellow(error));
      }
    });
  } else {
    new InitOptionsStrategy(pluginMap).apply(options);
  }
};
