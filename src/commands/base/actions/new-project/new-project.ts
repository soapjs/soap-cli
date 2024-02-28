import { NewProjectOptions } from "./types";
import { NewProjectInteractiveStrategy } from "./new-project.interactive-strategy";
import { NewProjectOptionsStrategy } from "./new-project.options-strategy";
import { PluginMapService } from "../../../../core/config/plugin-map.service";
import Config from "../../../../defaults/root.config.json";
import chalk from "chalk";
import { Texts } from "@soapjs/soap-cli-common";
import { existsSync } from "fs";

export const newProject = async (options: NewProjectOptions) => {
  const texts = Texts.load();

  if (existsSync(Config.local_project_config_path)) {
    console.log(
      chalk.yellow(
        texts.get("configuration_file_detected__can_not_create_new_project")
      )
    );
    process.exit(0);
  }

  const pluginMapService = new PluginMapService(
    Config.plugin_map_url,
    Config.local_plugin_map_path
  );

  const pluginMap = await pluginMapService.sync();

  if (Object.keys(options).length === 0) {
    new NewProjectInteractiveStrategy(pluginMap).apply().catch((error) => {
      if (error) {
        console.log(chalk.yellow(error));
      }
    });
  } else {
    new NewProjectOptionsStrategy(pluginMap).apply(options);
  }
};
