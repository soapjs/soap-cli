import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  ComponentTools,
  Config,
  Controller,
  Entity,
  MethodSchema,
  Model,
  RouteJson,
  Texts,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { TestSuiteFactory } from "../../new-test-suite";
import { RouteIOFactory } from "../factories/route-io.factory";
import { RouteFactory } from "../factories/route.factory";
import { hasParams, hasBody } from "../utils";
import { PathParamsJsonParser } from "./path-params.json-parser";
import { QueryParamsJsonParser } from "./query-params.json-parser";
import { RequestBodyJsonParser } from "./request-body.json-parser";
import { ResponseBodyJsonParser } from "./response-body.json-parser";
import { CommandConfig } from "../../../../../core";
import { RouteSchemaFactory } from "../factories/route-schema.factory";

export class RouteJsonParser {
  private pathParamsParser: PathParamsJsonParser;
  private queryParamsParser: QueryParamsJsonParser;
  private responseBodyParser: ResponseBodyJsonParser;
  private requestBodyParser: RequestBodyJsonParser;

  constructor(
    private config: Config,
    private command: CommandConfig,
    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private apiSchema: ApiSchema
  ) {
    this.pathParamsParser = new PathParamsJsonParser(config, writeMethod);
    this.queryParamsParser = new QueryParamsJsonParser(config, writeMethod);
    this.responseBodyParser = new ResponseBodyJsonParser(
      config,
      writeMethod,
      apiSchema
    );
    this.requestBodyParser = new RequestBodyJsonParser(
      config,
      writeMethod,
      apiSchema
    );
  }

  prepareRoutIoData(handler: MethodSchema): {
    input?: { type: TypeInfo; components: Component[] }[];
    output?: { type: TypeInfo; components: Component[] };
  } {
    const io = { input: [], output: null };

    handler.params.forEach((param) => {
      const components = [];
      const types = ComponentTools.filterComponentTypes(param.type);
      types.forEach((type) => {
        const component = this.apiSchema.get(type);
        if (component) {
          components.push(component);
        }
      });
      io.input.push({ type: param.type, components });
    });

    if (handler.returnType && !handler.returnType.isVoid) {
      const components = [];
      const types = ComponentTools.filterComponentTypes(handler.returnType);
      types.forEach((type) => {
        const component = this.apiSchema.get(type);
        if (component) {
          components.push(component);
        }
      });
      io.output = {
        type: handler.returnType,
        components,
      };
    }

    return io;
  }

  parse(list: RouteJson[]): {
    components: Component[];
  } {
    const { config, texts, writeMethod, command } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      let pathParams: Model;
      let queryParams: Model;
      let requestBody: Model;
      let responseBody: Model;
      let controller: Controller;
      let io;
      const { name, endpoint, request, response } = data;

      if (
        registry.routes.find(
          (route) =>
            route.type.ref === name &&
            route.type.type.toLowerCase() === request.method.toLowerCase()
        )
      ) {
        continue;
      }

      if (
        !endpoint &&
        (config.presets.route.isEndpointRequired() ||
          config.presets.route_model.isEndpointRequired() ||
          config.presets.route_io.isEndpointRequired())
      ) {
        console.log(chalk.red(texts.get("missing_endpoint")));
        console.log(
          chalk.yellow(texts.get("component_###_skipped").replace("###", name))
        );
        continue;
      }

      if (hasParams(request.path)) {
        pathParams = this.pathParamsParser.parse(data);
        queryParams = this.queryParamsParser.parse(data);
      }

      if (hasBody(request.body)) {
        const { model, components } = this.requestBodyParser.parse(data);
        requestBody = model;
        registry.add(...components);
      }

      if (hasBody(response)) {
        const { model, components } = this.responseBodyParser.parse(data);
        responseBody = model;
        registry.add(...components);
      }

      /**
       * Controller / Handler
       */
      controller = this.apiSchema.get({
        component: "controller",
        ref: data.controller,
      });

      const handler = controller.element.findMethod(data.handler);

      if (handler) {
        /**
         * Route IO
         */
        const ioData = this.prepareRoutIoData(handler);
        if (
          (ioData.input.length > 0 &&
            (pathParams || queryParams || requestBody)) ||
          (ioData.output && responseBody)
        ) {
          io = RouteIOFactory.create(
            { ...data, write_method: writeMethod.component },
            ioData.input,
            ioData.output,
            pathParams,
            queryParams,
            requestBody,
            responseBody,
            config
          );
          registry.add(io);

          if (!command.skip_tests && io.element.methods.length > 0) {
            //
            const suite = TestSuiteFactory.create(
              { name, endpoint, type: "unit_tests" },
              io,
              writeMethod.component,
              config
            );
            registry.add(suite);
          }
        }
      }

      /**
       * Schema
       */
      const schema = RouteSchemaFactory.create(
        name,
        endpoint,
        pathParams,
        queryParams,
        requestBody,
        writeMethod.component,
        config
      );
      registry.add(schema);

      /**
       * Route
       */
      const route = RouteFactory.create(
        { ...data, write_method: writeMethod.component },
        controller,
        io,
        schema,
        config
      );
      registry.add(route);
    }

    return {
      components: registry.toArray(),
    };
  }
}
