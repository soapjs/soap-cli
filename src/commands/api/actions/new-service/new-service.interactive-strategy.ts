import { Config, Strategy, Texts } from "@soapjs/soap-cli-common";

import { ApiGenerator } from "../../common/api-generator";
import { ApiJsonParser } from "../../common/api-json.parser";
import { NewServiceStoryboard } from "./new-service.storyboard";
import { CommandConfig, CompilationConfig } from "../../../../core";

export class NewServiceInteractiveStrategy extends Strategy {
  public readonly name = "new_service_interactive_strategy";

  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }

  public async apply(cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = Texts.load();

    const newModelStoryboard = new NewServiceStoryboard(texts, config, command);
    const { content: json, failure } = await newModelStoryboard.run();

    if (failure) {
      console.log(failure.error);
      process.exit(1);
    }

    const schema = new ApiJsonParser(config, command, texts).build(json);
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
