import chalk from "chalk";
import { UseCaseJson, NewUseCaseOptions } from "./types";
import { ApiJsonParser } from "../../common/api-json.parser";
import { CliOptionsTools, Config } from "../../../../core";
import { ApiGenerator } from "../../common";
import { Strategy, Texts } from "@soapjs/soap-cli-common";

export class NewUseCaseOptionsStrategy extends Strategy {
  constructor(private config: Config) {
    super();
  }

  public async apply(options: NewUseCaseOptions, cliPluginPackageName: string) {
    const { config } = this;
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
    const schema = new ApiJsonParser(config, texts).build({
      models: [],
      entities: [],
      use_cases: [use_case],
    });
    const result = await new ApiGenerator(
      config,
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
