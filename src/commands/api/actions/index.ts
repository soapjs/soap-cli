import {
  CliPackageManager,
  ConfigService,
  Texts,
} from "@soapjs/soap-cli-common";
import chalk from "chalk";
import {
  CommandConfig,
  CompilationConfig,
  PluginMapService,
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
export * from "./new-config";

export const newComponent = async (options: any, type?: string) => {
  const texts = Texts.load();
  const cliConfig = await new CliConfigService().sync();
  const command = CommandConfig.create(options, cliConfig);
  const compilation = CompilationConfig.create(cliConfig);

  const { content: config, failure } = await new ConfigService(
    RootConfig.local_config_path
  ).get();

  if (failure) {
    console.log(
      chalk.yellow(texts.get("no_config_found___init_or_new_project_first"))
    );
    process.exit(0);
  }

  const pluginMapService = new PluginMapService(
    RootConfig.plugin_map_url,
    RootConfig.local_plugin_map_path
  );

  const pluginMap = await pluginMapService.sync();
  const [cli_module] = pluginMap.getLanguage(
    config.code.alias
  ).soap_cli_modules;

  const packageManager = new CliPackageManager();

  if (packageManager.hasPackage(cli_module) === false) {
    await packageManager.installPackage(cli_module);
  }

  switch (type) {
    case "controller":
      return newController(options, config, command, compilation, cli_module);
    case "entity":
      return newEntity(options, config, command, compilation, cli_module);
    case "mapper":
      return newMapper(options, config, command, compilation, cli_module);
    case "model":
      return newModel(options, config, command, compilation, cli_module);
    case "repository":
      return newRepository(options, config, command, compilation, cli_module);
    case "service":
      return newService(options, config, command, compilation, cli_module);
    case "route":
      return newRoute(options, config, command, compilation, cli_module);
    case "collection":
      return newCollection(options, config, command, compilation, cli_module);
    case "toolset":
      return newToolset(options, config, command, compilation, cli_module);
    case "use-case":
      return newUseCase(options, config, command, compilation, cli_module);
    default:
      return fromJson(options, config, command, compilation, cli_module);
  }
};
