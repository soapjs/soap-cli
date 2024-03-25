import { existsSync } from "fs";
import { RouteNameAndEndpoint } from "./define-route-name-and-endpoint.frame";
import { RequestBodyType } from "./select-request-body-type.frame";
import { ResponseBodyType } from "./select-response-body-type.frame";
import { RouteDescription } from "./interactions/describe-route.interaction";
import { ApiJson, Config, Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { SelectComponentWriteMethodInteraction } from "../../../common";
import { CommandConfig } from "../../../../../core";

export class CreateRouteFrame extends Frame<ApiJson> {
  public static NAME = "create_route_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(CreateRouteFrame.NAME);
  }

  public async run(
    context: RouteDescription &
      RouteNameAndEndpoint &
      RequestBodyType &
      ResponseBodyType
  ) {
    const { texts, config, command } = this;
    const {
      name,
      endpoint,
      path,
      controller,
      handler,
      http_method,
      auth,
      validate,
      request_body,
      response_body,
      cors,
      limiter,
    } = context;
    const result: ApiJson = {
      routes: [],
    };
    const componentName = config.presets.route.generateName(name);
    const componentPath = config.presets.route.generatePath({
      name,
      endpoint,
    }).path;
    let writeMethod = WriteMethod.Write;

    if (command.force === false) {
      if (existsSync(componentPath)) {
        writeMethod = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    if (writeMethod !== WriteMethod.Skip) {
      const request = {
        path,
        method: http_method,
        validate,
        auth,
      };

      if (cors) {
        request["cors"] = {
          origin: null,
          methods: null,
          headers: null,
          credentials: null,
          max_age: null,
        };
      }

      if (limiter) {
        request["rate_limiter"] = {
          max_requests: null,
          window_ms: null,
          mandatory: null,
        };
      }

      if (request_body) {
        request["body"] = request_body;
      }

      let response;
      const responseStatuses = response_body ? Object.keys(response_body) : [];

      if (responseStatuses.length > 0) {
        response = {};
        responseStatuses.forEach((sts) => {
          response[sts] = response_body[sts];
        });
      }

      result.routes.push({
        name,
        endpoint,
        controller,
        handler,
        request,
        response,
      });
    }

    return result;
  }
}
