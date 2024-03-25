import {
  ApiJson,
  ComponentJsonFactory,
  ComponentTools,
  Config,
  ControllerJson,
  EntityJson,
  MethodJson,
  ModelJson,
  RouteJson,
  Texts,
  TypeInfo,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";
import { pascalCase } from "change-case";
import { PathParamsTools, QueryParamsTools } from "../parsers";
import { ConvertRouteDataToHandlerIoDataInteraction } from "../../new-controller/frames/interactions/convert-request-to-handler-input-props.interaction";
import { CreateParamsInteraction } from "../../../common/interactions/create-params.interaction";

export class DescribeControllerFrame extends Frame<ApiJson> {
  public static NAME = "describe_controller_frame";
  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(DescribeControllerFrame.NAME);
  }

  public async run(context: {
    endpoint: string;
    controller: string;
    handler: string;
    request_body: any;
    response_body: any;
    path: string;
  }) {
    const { texts, config, command } = this;
    const { endpoint, handler, request_body, response_body, path } = context;
    const input: EntityJson = {
      name: pascalCase(`${handler}Input`),
      endpoint,
      props: [],
    };
    const output: EntityJson = {
      name: pascalCase(`${handler}Output`),
      endpoint,
      props: [],
    };
    const h: MethodJson = {
      name: handler,
      is_async: true,
      params: [],
      return_type: `Result<void>`,
    };
    const controller: ControllerJson = {
      name: context.controller,
      endpoint: endpoint,
      handlers: [h],
    };
    const controllers: ControllerJson[] = [controller];
    const entities: EntityJson[] = [];
    const models: ModelJson[] = [];
    const params = [
      ...PathParamsTools.extractFromString(path),
      ...QueryParamsTools.extractFromString(path),
    ];

    if (params.length > 0 || request_body || response_body) {
      const input_strategy_options = [
        {
          message: texts.get("handler_no_input"),
          name: "none",
        },
        {
          message: texts.get("handler_define_input"),
          name: "own",
        },
      ];

      if (params.length > 0 || request_body) {
        input_strategy_options.splice(1, 0, {
          message: texts.get("handler_use_request_for_input"),
          name: "request",
        });
      }

      const input_strategy = await InteractionPrompts.select(
        texts.get("pick_handler_input_strategy"),
        input_strategy_options,
        ["none"],
        texts.get("hint___pick_handler_input_strategy")
      );

      const output_strategy_options = [
        {
          message: texts.get("handler_no_output"),
          name: "none",
        },
        {
          message: texts.get("handler_define_output"),
          name: "own",
        },
      ];

      if (response_body) {
        output_strategy_options.splice(1, 0, {
          message: texts.get("handler_use_response_for_output"),
          name: "response",
        });
      }

      const output_strategy = await InteractionPrompts.select(
        texts.get("pick_handler_output_strategy"),
        output_strategy_options,
        ["none"],
        texts.get("hint___pick_handler_output_strategy")
      );

      let route: any = { request: null, response: null };

      if (input_strategy === "request") {
        route.request = {
          path: context.path,
          body: request_body,
          method: "",
        };
      }

      if (output_strategy === "response") {
        route.response = response_body;
      }

      if (route.request || route.response) {
        const routeToIO = new ConvertRouteDataToHandlerIoDataInteraction(
          config
        );

        const result = await routeToIO.run({ endpoint, route });
        if (result.input) {
          input.props.push(...result.input.props);
          h.params.push({ name: "input", type: `Entity<${input.name}>` });
        }

        if (result.output) {
          output.props.push(...result.output.props);
          h.return_type = `Entity<${output.name}>`;
        }
      }

      if (input_strategy === "own") {
        const result = await new CreateParamsInteraction(texts, config).run({
          endpoint: context?.endpoint,
          target: handler,
        });
        h.params.push(...result.params);
        models.push(...result.models);
        entities.push(...result.entities);
      }

      if (output_strategy === "own") {
        do {
          h.return_type = await InteractionPrompts.input(
            texts.get("handler_return_type")
          );
        } while (!h.return_type);

        const rType = TypeInfo.create(h.return_type, config);
        const types = ComponentTools.filterComponentTypes(rType);
        types.forEach((componentType) => {
          const json = ComponentJsonFactory.create(componentType, {
            name: componentType.ref,
            types: ["json"],
            endpoint: context?.endpoint,
          });

          if (rType.isModel) {
            models.push(json);
          } else if (rType.isEntity) {
            entities.push(json);
          }
        });
      }
    }

    return { controllers, entities, models };
  }
}
