import { InitStoryboard } from "./init.storyboard";
import {
  CliPackageManager,
  ConfigJsonParser,
  ConfigService,
  PluginFacade,
  PluginMap,
  Strategy,
  Texts,
} from "@soapjs/soap-cli-common";
import RootConfig from "../../../../defaults/root.config.json";

export class InitInteractiveStrategy extends Strategy {
  constructor(private pluginMap: PluginMap) {
    super();
  }

  public readonly name = "new_project";
  public async apply() {
    const texts = Texts.load();
    const { pluginMap } = this;

    const newProjectStoryboard = new InitStoryboard(texts, pluginMap);
    const { content: project, failure } = await newProjectStoryboard.run();

    if (failure) {
      console.log(failure.error);
      process.exit(1);
    }
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
