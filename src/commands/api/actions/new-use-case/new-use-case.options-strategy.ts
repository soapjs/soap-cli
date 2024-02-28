import chalk from "chalk";
import { Config, Strategy, Texts, UseCaseJson } from "@soapjs/soap-cli-common";
import { ApiJsonParser, ApiGenerator } from "../../common";
import { NewUseCaseOptions } from "./types";
import {
  CliOptionsTools,
  CommandConfig,
  CompilationConfig,
} from "../../../../core";

export class NewUseCaseOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }

  public async apply(options: NewUseCaseOptions, cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.components.use_case.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }
    const { endpoint, name, output } = options;
    const input = CliOptionsTools.splitArrayOption(options.input);
    const use_case: UseCaseJson = {
      name,
      endpoint,
      input,
      output,
    };
    const schema = new ApiJsonParser(config, command, texts).build({
      models: [],
      entities: [],
      use_cases: [use_case],
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

    return result;
  }
}
