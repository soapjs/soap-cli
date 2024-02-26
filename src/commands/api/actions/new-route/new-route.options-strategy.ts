import chalk from "chalk";
import { NewRouteOptions, RouteJson } from "./types";
import { Config } from "../../../../core";
import { ApiJsonParser } from "../../common/api-json.parser";
import { ApiGenerator } from "../../common";
import { RouteMethodType, Strategy, Texts } from "@soapjs/soap-cli-common";

export class NewRouteOptionsStrategy extends Strategy {
  constructor(private config: Config) {
    super();
  }
  public async apply(options: NewRouteOptions, cliPluginPackageName: string) {
    const { config } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.components.route.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const {
      endpoint,
      name,
      path,
      auth,
      validate,
      method,
      controller,
      handler,
    } = options;
    let body;
    let response;

    try {
      body = JSON.parse(options.body.replace(/'/g, '"'));
    } catch (error) {
      body = options.body;
    }

    try {
      response = JSON.parse(options.response.replace(/'/g, '"'));
    } catch (error) {
      response = options.response;
    }

    const route: RouteJson = {
      name,
      endpoint,
      request: {
        path,
        auth,
        validate,
        method: method || RouteMethodType.Get,
        body,
      },
      response,
      handler,
      controller,
    };

    const schema = new ApiJsonParser(config, texts).build({
      routes: [route],
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
  }
}
