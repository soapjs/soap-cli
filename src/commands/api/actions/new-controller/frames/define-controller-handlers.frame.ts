import { Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { Config, TypeInfo } from "../../../../../core";
import { EntityJson } from "../../new-entity";
import { ModelJson } from "../../new-model";
import { HandlerJson } from "../types";
import { DefineHandlerInteraction } from "./interactions/define-handler.interaction";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export type ControllerHandlers = {
  handlers: HandlerJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class DefineControllerHandlersFrame extends Frame<ControllerHandlers> {
  public static NAME = "define_controller_handlers_frame";

  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(DefineControllerHandlersFrame.NAME);
  }

  public async run(context: { endpoint: string; name: string }) {
    const { texts, config } = this;
    const result = { handlers: [], models: [], entities: [] };

    if (
      await InteractionPrompts.confirm(
        texts
          .get("do_you_want_to_add_handlers_to_###")
          .replace("###", context.name || "")
      )
    ) {
      let handler: HandlerJson;
      do {
        handler = await new DefineHandlerInteraction(texts).run();
        result.handlers.push(handler);

        if (config.command.dependencies_write_method !== WriteMethod.Skip) {
          let hasComponentType = false;

          const types = [];
          if (handler.input) {
            let it = TypeInfo.create(handler.input, config);

            if (it.isComponentType) {
              hasComponentType = true;
              if (!it.isEntity) {
                it = TypeInfo.create(`Entity<${it.ref}>`, config);
              }
              types.push(it);
            }
          }

          if (handler.output) {
            let rt = TypeInfo.create(handler.output, config);
            if (rt.isComponentType) {
              hasComponentType = true;
              if (!rt.isEntity) {
                rt = TypeInfo.create(`Entity<${rt.ref}>`, config);
              }
              types.push(rt);
            }
          }

          if (
            hasComponentType &&
            (await InteractionPrompts.confirm(
              texts.get("non_standard_types_detected__create")
            ))
          ) {
            for (const type of types) {
              const c = result.entities.find((m) => m.name === type.ref);
              if (!c) {
                result.entities.push({
                  name: type.ref,
                  endpoint: context.endpoint,
                });
              }
            }
          }
        }
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
