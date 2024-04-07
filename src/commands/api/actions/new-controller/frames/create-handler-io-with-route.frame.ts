import {
  Texts,
  Config,
  ModelJson,
  RouteJson,
  EntityJson,
  MethodJson,
} from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { HandlerDefinition } from "./interactions/define-handler.interaction";
import { CreateHandlerInputInteraction } from "./interactions/create-handler-input.interaction";
import { pascalCase } from "change-case";
import { WriteMethodsAssignment } from "../../../../../core";
import { CreateHandlerOutputInteraction } from "./interactions/create-handler-output.interaction";

export type HandlerRoutes = {
  handlers: MethodJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreateHandlerIoWithRouteFrame extends Frame<HandlerRoutes> {
  public static NAME = "create_handler_io_with_route_data_frame";

  constructor(
    protected config: Config,
    protected writeMethods: WriteMethodsAssignment,
    protected texts: Texts
  ) {
    super(CreateHandlerIoWithRouteFrame.NAME);
  }

  public async run(context: {
    endpoint: string;
    handlers: HandlerDefinition[];
    entities: EntityJson[];
    models: ModelJson[];
    routes: RouteJson[];
  }) {
    const { config, writeMethods } = this;
    const { handlers, endpoint, routes } = context;
    const inputInteraction = new CreateHandlerInputInteraction(config);
    const outputInteraction = new CreateHandlerOutputInteraction(config);
    const result = { handlers: [], models: [], entities: [] };

    for (const handler of handlers) {
      const route = routes.find((r) => r.handler === handler.name);
      const { input } = await inputInteraction.run({
        endpoint,
        request: route.request,
      });
      const { output } = await outputInteraction.run({
        endpoint,
        response: route.response,
      });

      if (handler.input_strategy === "request" && input.props.length > 0) {
        const entity: EntityJson = {
          name: pascalCase(`${handler.name}Input`),
          props: input.props,
          write_method: writeMethods.relatedComponentsMethods.entity,
          rank: 1,
        };

        handler.params.push({
          name: "input",
          type: `Entity<${entity.name}>`,
        });

        result.entities.push(entity);
      }

      if (handler.output_strategy === "response") {
        const entity: EntityJson = {
          name: pascalCase(`${handler.name}Output`),
          props: output.props,
          write_method: writeMethods.relatedComponentsMethods.entity,
          rank: 1,
        };

        handler.return_type = `Entity<${entity.name}>`;
        result.entities.push(entity);
      }

      result.handlers.push(handler);
    }

    return result;
  }
}
