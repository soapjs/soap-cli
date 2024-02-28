import { Config, Strategy, Texts } from "@soapjs/soap-cli-common";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { NewCollectionStoryboard } from "./new-collection.storyboard";
import { CommandConfig, CompilationConfig } from "../../../../core";

export class NewCollectionInteractiveStrategy extends Strategy {
  public readonly name = "new_collection_interactive_strategy";

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

    const newCollectionStoryboard = new NewCollectionStoryboard(
      texts,
      config,
      command
    );
    const { content: json, failure } = await newCollectionStoryboard.run();

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
