import chalk from "chalk";
import { pascalCase } from "change-case";
import { Config, TypeInfo, TestCaseSchema } from "../../../../../core";
import {
  Controller,
  ControllerFactory,
  ControllerInputJsonParser,
  ControllerOutputJsonParser,
} from "../../new-controller";
import { Entity } from "../../new-entity";
import { Model, ModelFactory } from "../../new-model";
import { RouteIOFactory } from "../route-io.factory";
import { RouteFactory } from "../route.factory";
import { RouteJson, Route, RouteIO } from "../types";
import { hasBody, hasParams } from "../utils";
import { PathParamsJsonParser } from "./path-params.json-parser";
import { QueryParamsJsonParser } from "./query-params.json-parser";
import { RequestBodyJsonParser } from "./request-body.json-parser";
import { ResponseBodyJsonParser } from "./response-body.json-parser";
import { TestSuite, TestSuiteFactory } from "../../new-test-suite";
import { Texts, WriteMethod } from "@soapjs/soap-cli-common";

export class RouteJsonParser {
  private inputParser: ControllerInputJsonParser;
  private outputParser: ControllerOutputJsonParser;
  private pathParamsParser: PathParamsJsonParser;
  private queryParamsParser: QueryParamsJsonParser;
  private responseBodyParser: ResponseBodyJsonParser;
  private requestBodyParser: RequestBodyJsonParser;
  private models: Model[] = [];
  private entities: Entity[] = [];
  private routes: Route[] = [];
  private route_ios: RouteIO[] = [];

  constructor(
    private config: Config,

    private texts: Texts,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod }
  ) {
    this.inputParser = new ControllerInputJsonParser(config, writeMethod);
    this.outputParser = new ControllerOutputJsonParser(config, writeMethod);
    this.pathParamsParser = new PathParamsJsonParser(
      config,
      writeMethod,
      this.models
    );
    this.queryParamsParser = new QueryParamsJsonParser(
      config,
      writeMethod,
      this.models
    );
    this.responseBodyParser = new ResponseBodyJsonParser(
      config,
      writeMethod,
      this.models,
      this.entities
    );
    this.requestBodyParser = new RequestBodyJsonParser(
      config,
      writeMethod,
      this.models,
      this.entities
    );
  }

  buildInput(
    handlerName: string,
    inputType: TypeInfo,
    endpoint: string,
    pathParams: Model,
    queryParams: Model,
    requestBody: Model,
    modelsRef: Model[],
    entitiesRef: Entity[]
  ) {
    const { config, writeMethod, entities, models, inputParser } = this;

    if (inputType) {
      if (inputType.isModel || inputType.isRouteModel) {
        const model = modelsRef.find(
          (m) => m.type.ref === inputType.ref && m.type.type === inputType.type
        );

        return model;
      }

      if (inputType.isEntity) {
        const entity = entitiesRef.find((e) => e.type.ref === inputType.ref);

        return entity;
      }

      if (inputType.isPrimitive) {
        const model = ModelFactory.create(
          {
            alias: inputType.name,
            name: `${handlerName} Output`,
            type: "json",
          },
          writeMethod.dependency,
          config,
          []
        );
        models.push(model);
        return model;
      }

      return null;
    }

    let inputProps = {};

    if (requestBody) {
      requestBody.element.props.forEach((prop) => {
        inputProps[prop.name] = prop.type.name;
      });
    }

    if (pathParams) {
      pathParams.element.props.forEach((prop) => {
        inputProps[prop.name] = prop.type.name;
      });
    }

    if (queryParams) {
      queryParams.element.props.forEach((prop) => {
        inputProps[prop.name] = prop.type.name;
      });
    }

    if (Object.keys(inputProps).length > 0) {
      const { entity } = inputParser.build(
        { name: handlerName, input: inputProps },
        endpoint
      );
      if (entity) {
        entities.push(entity);
      }
      return entity;
    }

    return null;
  }

  buildOutput(
    handlerName: string,
    outputType: TypeInfo,
    endpoint: string,
    responseBody: Model,
    modelsRef: Model[],
    entitiesRef: Entity[]
  ) {
    const { config, writeMethod, entities, models, outputParser } = this;

    if (outputType) {
      if (outputType.isModel || outputType.isRouteModel) {
        const model = modelsRef.find(
          (m) =>
            m.type.ref === outputType.ref && m.type.type === outputType.type
        );

        return model;
      }

      if (outputType.isEntity) {
        const entity = entitiesRef.find((e) => e.type.ref === outputType.ref);

        return entity;
      }

      if (outputType.isPrimitive) {
        const model = ModelFactory.create(
          {
            alias: outputType.name,
            name: pascalCase(`${handlerName} Output`),
            type: "alias",
          },
          writeMethod.dependency,
          config,
          []
        );
        models.push(model);
        return model;
      }

      return null;
    }

    if (responseBody) {
      let output = {};
      responseBody.element.props.forEach((prop) => {
        if (prop.type.isRouteModel) {
          const mdl = modelsRef.find(
            (m) =>
              m.type.ref === prop.type.ref && m.type.type === prop.type.type
          );
          if (mdl) {
            mdl.element.props.forEach((p) => {
              output[p.name] = p.type.ref;
            });
          }
        } else if (prop.type.isPrimitive) {
          output[`status_${prop.name}`] = prop.type.name;
        }
      });

      if (Object.keys(output).length > 0) {
        const { entity } = outputParser.build(
          { name: handlerName, output },
          endpoint
        );
        if (entity) {
          entities.push(entity);
        }
        return entity;
      }
    }
  }

  build(
    list: RouteJson[],
    modelsRef: Model[],
    entitiesRef: Entity[],
    controllersRef: Controller[]
  ): {
    models: Model[];
    entities: Entity[];
    routes: Route[];
    route_ios: RouteIO[];
    test_suites: TestSuite[];
  } {
    const { config, texts, writeMethod, models, entities, routes, route_ios } =
      this;
    const test_suites: TestSuite[] = [];

    models.length = 0;
    entities.length = 0;
    routes.length = 0;
    route_ios.length = 0;

    for (const data of list) {
      let input: Model | Entity;
      let output: Model | Entity;
      let pathParams: Model;
      let queryParams: Model;
      let requestBody: Model;
      let responseBody: Model;
      let controller: Controller;
      let io;
      const { name, endpoint, request, response } = data;

      if (
        routes.find(
          (r) =>
            r.type.ref === name &&
            r.type.type.toLowerCase() === request.method.toLowerCase()
        )
      ) {
        continue;
      }

      if (
        !endpoint &&
        (config.components.route.isEndpointRequired() ||
          config.components.route_model.isEndpointRequired() ||
          config.components.route_io.isEndpointRequired())
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
        requestBody = this.requestBodyParser.parse(
          data,
          [...models, ...modelsRef],
          [...entities, ...entitiesRef]
        );
      }

      if (hasBody(response)) {
        responseBody = this.responseBodyParser.parse(
          data,
          [...models, ...modelsRef],
          [...entities, ...entitiesRef]
        );
      }

      controller = controllersRef.find((c) => c.type.ref === data.controller);

      if (!controller) {
        controller = ControllerFactory.create(
          {
            name: data.controller,
            handlers: [{ name: data.handler }],
            endpoint,
          },
          WriteMethod.Skip,
          config,
          []
        );
      }

      const handler = controller.element.findMethod(data.handler);

      input = this.buildInput(
        handler.name,
        handler.params[0]?.type,
        endpoint,
        pathParams,
        queryParams,
        requestBody,
        [...models, ...modelsRef],
        [...entities, ...entitiesRef]
      );

      output = this.buildOutput(
        handler.name,
        handler.returnType,
        endpoint,
        responseBody,
        [...models, ...modelsRef],
        [...entities, ...entitiesRef]
      );

      if (input || output) {
        io = RouteIOFactory.create(
          data,
          input,
          output,
          pathParams,
          queryParams,
          requestBody,
          responseBody,
          writeMethod.component,
          config
        );
        route_ios.push(io);

        if (!config.command.skip_tests && io.element.methods.length > 0) {
          //
          const suite = TestSuiteFactory.create(
            { name, endpoint, type: "unit_tests" },
            io,
            writeMethod.component,
            config
          );

          io.element.methods.forEach((method) => {
            suite.element.addTest(
              TestCaseSchema.create({
                group: { name: suite.element.name, is_async: false },
                is_async: method.isAsync,
                name: method.name,
                methods: [method],
              })
            );
          });
          test_suites.push(suite);
        }
      }

      const route = RouteFactory.create(
        data,
        controller,
        io,
        writeMethod.component,
        config
      );
      routes.push(route);
    }

    return { routes, route_ios, entities, models, test_suites };
  }
}
