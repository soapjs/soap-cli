import chalk from "chalk";
import { ApiJsonParser } from "../../common/api-json.parser";
import { ApiGenerator } from "../../common";
import { Config, Strategy, Texts, ToolsetJson } from "@soapjs/soap-cli-common";
import { NewToolsetOptions } from "./types";
import {
  CliOptionsTools,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";

export class NewToolsetOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }

  public async apply(options: NewToolsetOptions, cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.components.toolset.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    if (!options.layer) {
      console.log(chalk.red(texts.get("missing_layer")));
      process.exit(1);
    }

    const { endpoint, name, layer } = options;
    const methods = CliOptionsTools.splitArrayOption(options.methods);
    const toolset: ToolsetJson = {
      layer,
      name,
      endpoint,
      methods,
    };
    const schema = new ApiJsonParser(config, command, texts).build({
      models: [],
      entities: [],
      toolsets: [toolset],
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
