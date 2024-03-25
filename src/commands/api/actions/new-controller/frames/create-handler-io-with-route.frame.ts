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
import { ConvertRouteDataToHandlerIoDataInteraction } from "./interactions/convert-request-to-handler-input-props.interaction";
import { pascalCase } from "change-case";

export type HandlerRoutes = {
  handlers: MethodJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreateHandlerIoWithRouteFrame extends Frame<HandlerRoutes> {
  public static NAME = "create_handler_io_with_route_data_frame";

  constructor(protected config: Config, protected texts: Texts) {
    super(CreateHandlerIoWithRouteFrame.NAME);
  }

  public async run(context: {
    endpoint: string;
    handlers: HandlerDefinition[];
    entities: EntityJson[];
    models: ModelJson[];
    routes: RouteJson[];
  }) {
    const { config } = this;
    const { handlers, endpoint, routes } = context;
    const interaction = new ConvertRouteDataToHandlerIoDataInteraction(config);
    const result = { handlers: [], models: [], entities: [] };

    for (const handler of handlers) {
      const route = routes.find((r) => r.handler === handler.name);
      const { input, output } = await interaction.run({ endpoint, route });

      if (handler.input_strategy === "request" && input.props.length > 0) {
        const entity: EntityJson = {
          name: pascalCase(`${handler.name}Input`),
          props: input.props,
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
        };

        handler.return_type = `Entity<${entity.name}>`;
        result.entities.push(entity);
      }

      result.handlers.push(handler);
    }

    return result;
  }
}
