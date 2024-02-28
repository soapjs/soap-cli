import { Config, Strategy, Texts } from "@soapjs/soap-cli-common";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { NewRepositoryStoryboard } from "./new-repository.storyboard";
import { CommandConfig, CompilationConfig } from "../../../../core";

export class NewRepositoryInteractiveStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }
  public readonly name = "new_repository_interactive_strategy";
  public async apply(cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = Texts.load();

    const newRepositoryStoryboard = new NewRepositoryStoryboard(
      texts,
      config,
      command
    );
    const { content: json, failure } = await newRepositoryStoryboard.run();

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
