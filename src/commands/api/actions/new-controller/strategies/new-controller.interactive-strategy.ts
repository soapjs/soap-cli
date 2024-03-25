import { CommandConfig, CompilationConfig } from "../../../../../core";
import { NewControllerStoryboard } from "../new-controler.storyboard";
import { ApiGenerator, ApiJsonParser } from "../../../common";
import {
  Config,
  Controller,
  Strategy,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";

export type NewControllerStoryboardResult = {
  writeMethod: WriteMethod;
  components: any[];
  controller: Controller;

  [key: string]: any;
};

export class NewControllerInteractiveStrategy extends Strategy {
  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected compilation: CompilationConfig
  ) {
    super();
  }

  public readonly name = "new_controller";
  public async apply(cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = Texts.load();

    const newControllerStoryboard = new NewControllerStoryboard(
      texts,
      config,
      command
    );
    const { content: json, failure } = await newControllerStoryboard.run();

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
