import { Strategy, Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { Config } from "../../../../core";
import { ApiGenerator, ApiJsonParser } from "../../common";
import { NewRouteStoryboard } from "./new-route.storyboard";
import { Route } from "./types";

export type NewRouteStoryboardResult = {
  writeMethod: WriteMethod;
  components: any[];
  route: Route;

  [key: string]: any;
};

export class NewRouteInteractiveStrategy extends Strategy {
  public readonly name = "new_route_interactive_strategy";

  constructor(private config: Config) {
    super();
  }

  public async apply(cliPluginPackageName: string) {
    const { config } = this;
    const texts = Texts.load();

    const { content: json, failure } = await new NewRouteStoryboard(
      texts,
      config
    ).run();

    if (failure) {
      console.log(failure.error);
      process.exit(1);
    }

    const schema = new ApiJsonParser(config, texts).build(json);
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
  }
}
