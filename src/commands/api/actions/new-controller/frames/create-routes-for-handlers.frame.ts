import chalk from "chalk";
import {
  DescribeRouteInteraction,
  SelectRequestBodyTypeFrame,
  SelectResponseBodyTypeFrame,
} from "../../new-route";
import {
  Texts,
  Config,
  ModelJson,
  RouteJson,
  EntityJson,
  MethodJson,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export type HandlerRoutes = {
  routes: RouteJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreateRoutesForHandlersFrame extends Frame<HandlerRoutes> {
  public static NAME = "create_routes_for_handlers_frame";

  private interaction: DescribeRouteInteraction;
  private selectRequestBodyFrame: SelectRequestBodyTypeFrame;
  private selectResponseBodyFrame: SelectResponseBodyTypeFrame;

  constructor(protected config: Config, protected texts: Texts) {
    super(CreateRoutesForHandlersFrame.NAME);

    this.interaction = new DescribeRouteInteraction(texts);
    this.selectRequestBodyFrame = new SelectRequestBodyTypeFrame(texts);
    this.selectResponseBodyFrame = new SelectResponseBodyTypeFrame(texts);
  }

  public async run(context: {
    name: string;
    endpoint: string;
    handlers: MethodJson[];
    entities: EntityJson[];
    models: ModelJson[];
  }) {
    const { texts } = this;
    const { handlers, name, endpoint } = context;
    const result = { routes: [], models: [], entities: [] };
    let i = 0;
    if (
      await InteractionPrompts.confirm(
        texts.get("do_you_want_to_create_routes_for_handlers")
      )
    ) {
      let route: RouteJson;
      let handler: MethodJson;
      do {
        handler = handlers[i];
        console.log(
          chalk.gray(
            texts
              .get("defining_route_for_the_handler_###")
              .replace("###", handler.name)
          )
        );
        const description = await this.interaction.run(
          {
            name,
            controller: name,
            handler: handler.name,
            endpoint,
          },
          { skip: ["controller", "handler"] }
        );

        const { request_body: body } = await this.selectRequestBodyFrame.run();
        const { response_body: response } =
          await this.selectResponseBodyFrame.run();

        route = {
          name: description.name || name,
          endpoint,
          controller: description.controller,
          handler: handler.name,
          request: {
            path: description.path,
            method: description.http_method,
            auth: description.auth,
            validate: description.validate,
            body,
          },
          response,
        };
        result.routes.push(route);

        i++;
      } while (i < handlers.length);
    }
    return result;
  }
}
