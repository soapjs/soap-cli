import { NewModelOptions } from "./types";
import { CliOptionsTools } from "../../../../core/tools";
import { ApiJsonParser } from "../../common/api-json.parser";
import { ApiGenerator } from "../../common/api-generator";
import { Config, ModelJson, Strategy, Texts } from "@soapjs/soap-cli-common";
import { CommandConfig, CompilationConfig } from "../../../../core";

export class NewModelOptionsStrategy extends Strategy {
  public readonly name = "new_model_options_strategy";

  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }

  public async apply(options: NewModelOptions, cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    const { endpoint, name } = options;
    const extractedTypes = CliOptionsTools.splitArrayOption(options.type);
    const types: string[] =
      extractedTypes.length > 0 ? extractedTypes : ["json"];
    const props = CliOptionsTools.splitArrayOption(options.props);

    const model: ModelJson = {
      name,
      endpoint,
      types,
      props,
    };

    const schema = new ApiJsonParser(config, command, texts).build({
      models: [model],
    });

    const result = await new ApiGenerator(
      config,
      compilation,
      cliPluginPackageName
    ).generate(schema);

    if (result.isFailure) {
      console.log(result.failure.error);
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}
