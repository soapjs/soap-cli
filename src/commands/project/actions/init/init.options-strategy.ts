import chalk from "chalk";
import { InitOptions } from "./types";
import {
  CliPackageManager,
  ConfigJsonParser,
  ConfigService,
  PluginFacade,
  PluginMap,
  ProjectDescription,
  Strategy,
  Texts,
} from "@soapjs/soap-cli-common";
import { CliOptionsTools } from "../../../../core";

import RootConfig from "../../../../defaults/root.config.json";

export class InitOptionsStrategy extends Strategy {
  constructor(private pluginMap: PluginMap) {
    super();
  }

  public async apply(options: InitOptions) {
    const { pluginMap } = this;
    const texts = await Texts.load();
    const project: ProjectDescription = {
      name: "",
      database: ["memory"],
      language: "",
      source_dir: "",
      ioc: "",
    };
    let failed = false;

    if (!options.lang) {
      failed = true;
      console.log(chalk.red(texts.get("missing_project_language")));
    } else {
      project.language = options.lang;
    }

    if (!options.source) {
      failed = true;
      console.log(chalk.red(texts.get("missing_project_source_path")));
    } else {
      project.source_dir = options.source;
    }

    if (options.di) {
      project.ioc = options.di;
    }

    if (failed) {
      process.exit(1);
    }

    CliOptionsTools.splitArrayOption(options.database).forEach((db) => {
      if (project.database.includes(db) === false) {
        project.database.push(db);
      }
    });

    const languagePlugin = pluginMap.getLanguage(
      project.language.toLowerCase()
    );

    if (!languagePlugin) {
      throw Error(
        `not_supported_language_###`.replace("###", project.language)
      );
    }

    const packageManager = new CliPackageManager();
    const [cli_module] = languagePlugin.soap_cli_modules;

    if (packageManager.hasPackage(cli_module) === false) {
      await packageManager.installPackage(cli_module);
    }
    const plugin = packageManager.requirePackage<PluginFacade>(cli_module);

    await new ConfigService(RootConfig.local_config_path).set(
      ConfigJsonParser.parse(project, plugin.default_config)
    );

    const templatesSetup = await plugin.setupTemplates(project);

    if (templatesSetup.isFailure) {
      console.log(templatesSetup.failure.error);
      process.exit(1);
    }

    const result = await plugin.initProject(
      texts,
      pluginMap,
      templatesSetup.content,
      project
    );

    if (result.isFailure) {
      console.log(result.failure.error);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}
