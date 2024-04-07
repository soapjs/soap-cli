import chalk from "chalk";
import {
  ApiSchema,
  Component,
  ComponentRegistry,
  ComponentTools,
  Config,
  Controller,
  MethodSchema,
  Model,
  RouteJson,
  RouteModel,
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
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";
import { RouteSchemaFactory } from "../factories/route-schema.factory";

export class RouteJsonParser {
  private pathParamsParser: PathParamsJsonParser;
  private queryParamsParser: QueryParamsJsonParser;
  private responseBodyParser: ResponseBodyJsonParser;
  private requestBodyParser: RequestBodyJsonParser;

  constructor(
    private config: Config,
    private command: CommandConfig,
    private writeMethods: WriteMethodsAssignment,
    private texts: Texts,
    private apiSchema: ApiSchema
  ) {
    this.pathParamsParser = new PathParamsJsonParser(config);
    this.queryParamsParser = new QueryParamsJsonParser(config);
    this.responseBodyParser = new ResponseBodyJsonParser(
      config,
      writeMethods,
      apiSchema
    );
    this.requestBodyParser = new RequestBodyJsonParser(
      config,
      writeMethods,
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
    const { config, texts, command, writeMethods } = this;
    const registry = new ComponentRegistry();

    for (const data of list) {
      let pathParams: RouteModel;
      let queryParams: RouteModel;
      let requestBody: RouteModel;
      let responseBody: RouteModel;
      let controller: Controller;
      let io;
      const { name, endpoint, request, response, rank } = data;
      const write_method = data.write_method || command.write_method;

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
        registry.add(pathParams, queryParams);
      }

      if (hasBody(request.body)) {
        const { model, components } = this.requestBodyParser.parse(data);
        requestBody = model;
        registry.add(requestBody, ...components);
      }

      if (hasBody(response)) {
        const { model, components } = this.responseBodyParser.parse(data);
        responseBody = model;
        registry.add(responseBody, ...components);
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
            { ...data, write_method, rank },
            ioData.input,
            ioData.output,
            pathParams,
            queryParams,
            requestBody,
            responseBody,
            config
          );
          registry.add(io);

          if (!command.no_tests && io.element.methods.length > 0) {
            //
            const suite = TestSuiteFactory.create(
              { name, endpoint, type: "unit_tests" },
              io,
              command.write_method,
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
        write_method,
        config
      );
      registry.add(schema);

      /**
       * Route
       */
      const route = RouteFactory.create(
        { ...data, write_method, rank },
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
