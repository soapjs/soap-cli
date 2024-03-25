import { EntityJson, ModelJson, Texts, Config } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";
import {
  DefineHandlerInteraction,
  HandlerDefinition,
} from "./interactions/define-handler.interaction";

export type ControllerHandlers = {
  handlers: HandlerDefinition[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class DefineControllerHandlersFrame extends Frame<ControllerHandlers> {
  public static NAME = "define_controller_handlers_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(DefineControllerHandlersFrame.NAME);
  }

  public async run(context: { endpoint: string; name: string }) {
    const { texts, config, command } = this;
    const result: ControllerHandlers = {
      handlers: [],
      models: [],
      entities: [],
    };

    if (
      await InteractionPrompts.confirm(
        texts
          .get("do_you_want_to_add_handlers_to_###")
          .replace("###", context.name || "")
      )
    ) {
      let handler;
      do {
        const { models, entities, ...definition } =
          await new DefineHandlerInteraction(texts, config).run({
            endpoint: context?.endpoint,
          });
        handler = definition;
        result.handlers.push(handler);

        models.forEach((model) => {
          if (result.models.findIndex((m) => m.name === model.name) === -1) {
            result.models.push(model);
          }
        });

        entities.forEach((entity) => {
          if (result.entities.findIndex((m) => m.name === entity.name) === -1) {
            result.entities.push(entity);
          }
        });
      } while (
        await InteractionPrompts.confirm(
          texts
            .get("handler_###_has_been_added__add_more")
            .replace("###", handler?.name)
        )
      );
    }

    return result;
  }
}
