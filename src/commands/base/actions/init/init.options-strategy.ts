import chalk from "chalk";
import { InitOptions } from "./types";
import {
  CliPackageManager,
  LanguageStrategyProvider,
  PluginMap,
  ProjectDescription,
  Strategy,
  Texts,
} from "@soapjs/soap-cli-common";
import {
  CliOptionsTools,
  PluginConfigService,
  ProjectConfigService,
} from "../../../../core";

import RootConfig from "../../../../defaults/root.config.json";

export class InitOptionsStrategy extends Strategy {
  constructor(private pluginMap: PluginMap) {
    super();
  }

  public async apply(options: InitOptions) {
    const { pluginMap } = this;
    const texts = await Texts.load();
    const description: ProjectDescription = {
      name: "",
      database: ["memory"],
      language: "",
      source: "",
      ioc: "",
    };
    let failed = false;

    if (!options.lang) {
      failed = true;
      console.log(chalk.red(texts.get("missing_project_language")));
    } else {
      description.language = options.lang;
    }

    if (!options.source) {
      failed = true;
      console.log(chalk.red(texts.get("missing_project_source_path")));
    } else {
      description.source = options.source;
    }

    if (options.di) {
      description.ioc = options.di;
    }

    if (failed) {
      process.exit(1);
    }

    CliOptionsTools.splitArrayOption(options.database).forEach((db) => {
      if (description.database.includes(db) === false) {
        description.database.push(db);
      }
    });

    const languagePlugin = pluginMap.getLanguage(
      description.language.toLowerCase()
    );

    if (!languagePlugin) {
      throw Error(
        `not_supported_language_###`.replace("###", description.language)
      );
    }

    const packageManager = new CliPackageManager();

    if (packageManager.hasPackage(languagePlugin.cli_plugin) === false) {
      await packageManager.installPackage(languagePlugin.cli_plugin);
    }
    const languageStrategies: LanguageStrategyProvider =
      packageManager.requirePackage(languagePlugin.cli_plugin);

    await new PluginConfigService(RootConfig.local_plugin_config_path).sync(
      languagePlugin.cli_plugin_config_url
    );

    await new ProjectConfigService(RootConfig.local_project_config_path).set(
      description
    );

    const result = await languageStrategies
      .createProjectInitStrategy(texts, pluginMap)
      .apply(description);

    if (result.isFailure) {
      console.log(result.failure.error);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}
