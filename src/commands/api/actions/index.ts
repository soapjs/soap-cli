import { CliPackageManager, Config, Texts } from "@soapjs/soap-cli-common";
import chalk from "chalk";
import {
  CommandConfig,
  CompilationConfig,
  PluginConfigService,
  PluginMapService,
  ProjectConfigService,
} from "../../../core";
import { newController } from "./new-controller";
import { newEntity } from "./new-entity";
import { newMapper } from "./new-mapper";
import { newModel } from "./new-model";
import { newRepository } from "./new-repository";
import { newRoute } from "./new-route";
import { newCollection } from "./new-collection";
import { newService } from "./new-service";
import { newToolset } from "./new-toolset";
import { newUseCase } from "./new-use-case";
import { CliConfigService } from "../../../core/config/cli.config.service";
import { fromJson } from "./new-from-json";
import RootConfig from "../../../defaults/root.config.json";

export * from "./new-controller";
export * from "./new-entity";
export * from "./new-from-json";
export * from "./new-mapper";
export * from "./new-model";
export * from "./new-repository";
export * from "./new-service";
export * from "./new-route";
export * from "./new-collection";
export * from "./new-toolset";
export * from "./new-use-case";
export * from "./new-router";
export * from "./new-launcher";
export * from "./new-container";

export const newComponent = async (options: any, type?: string) => {
  const texts = Texts.load();
  const cliConfig = await new CliConfigService().sync();
  const command = CommandConfig.create(options, cliConfig);
  const compilation = CompilationConfig.create(cliConfig);
  const { content: projectConfig, failure } = await new ProjectConfigService(
    RootConfig.local_project_config_path
  ).get();

  if (failure) {
    console.log(
      chalk.yellow(texts.get("no_config_found___init_or_new_project_first"))
    );
    process.exit(0);
  }

  const pluginConfigService = new PluginConfigService(
    RootConfig.local_plugin_config_path
  );

  const { content: pluginConfig } = await pluginConfigService.getLocal();

  const pluginMapService = new PluginMapService(
    RootConfig.plugin_map_url,
    RootConfig.local_plugin_map_path
  );

  const pluginMap = await pluginMapService.sync();

  const config = Config.create(pluginConfig, projectConfig);
  const cliPluginPackageName = pluginMap.getLanguage(
    config.code.alias
  ).cli_plugin;

  const packageManager = new CliPackageManager();

  if (packageManager.hasPackage(cliPluginPackageName) === false) {
    await packageManager.installPackage(cliPluginPackageName);
  }

  switch (type) {
    case "controller":
      return newController(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "entity":
      return newEntity(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "mapper":
      return newMapper(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "model":
      return newModel(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "repository":
      return newRepository(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "service":
      return newService(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "route":
      return newRoute(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "collection":
      return newCollection(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "toolset":
      return newToolset(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    case "use-case":
      return newUseCase(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
    default:
      return fromJson(
        options,
        config,
        command,
        compilation,
        cliPluginPackageName
      );
  }
};
