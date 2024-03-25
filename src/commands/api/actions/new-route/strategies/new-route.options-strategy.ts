import chalk from "chalk";
import { ApiJsonParser } from "../../../common/api-json.parser";
import { ApiGenerator } from "../../../common";
import {
  Config,
  ControllerJson,
  MethodDataParser,
  MethodJson,
  MethodStringParser,
  RouteJson,
  RouteMethodType,
  Strategy,
  Texts,
} from "@soapjs/soap-cli-common";
import { NewRouteOptions } from "../types";
import { CommandConfig, CompilationConfig } from "../../../../../core";

export class NewRouteOptionsStrategy extends Strategy {
  constructor(
    private config: Config,
    private command: CommandConfig,
    private compilation: CompilationConfig
  ) {
    super();
  }
  public async apply(options: NewRouteOptions, cliPluginPackageName: string) {
    const { config, command, compilation } = this;
    const texts = await Texts.load();

    if (!options.endpoint && config.presets.route.isEndpointRequired()) {
      console.log(chalk.red(texts.get("missing_endpoint")));
      process.exit(1);
    }

    const { endpoint, name, path, auth, validate, method, cors, limiter } =
      options;
    let body;
    let response;
    let handler: MethodJson;

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

    const controller: ControllerJson = {
      name: options.controller,
      endpoint,
      handlers: [],
    };

    if (options.handler) {
      handler = MethodStringParser.parse(options.handler);
      controller.handlers.push(handler);
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
        cors: cors ? { origin: "*" } : null,
        rate_limiter: limiter ? { max_requests: 1000 } : null,
      },
      response,
      handler: handler.name,
      controller: options.controller,
    };

    const schema = new ApiJsonParser(config, command, texts).build({
      controllers: [controller],
      routes: [route],
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
