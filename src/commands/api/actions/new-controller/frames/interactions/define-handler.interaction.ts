import {
  ComponentJsonFactory,
  ComponentTools,
  Config,
  EntityJson,
  MethodJson,
  ModelJson,
  Texts,
  TypeInfo,
} from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CreateParamsInteraction } from "../../../../common";
import { WriteMethodsAssignment } from "../../../../../../core";

export type HandlerDefinition = MethodJson & {
  input_strategy: "none" | "own" | "request";
  output_strategy: "none" | "own" | "response";
};

export type DefineHandlerInteractionResult = HandlerDefinition & {
  models: ModelJson[];
  entities: EntityJson[];
};

export class DefineHandlerInteraction extends Interaction<DefineHandlerInteractionResult> {
  constructor(
    private texts: Texts,
    protected config: Config,
    protected writeMethods: WriteMethodsAssignment
  ) {
    super();
  }
  public async run(options?: {
    initialName?: string;
    endpoint?: string;
  }): Promise<DefineHandlerInteractionResult> {
    const { texts, config, writeMethods } = this;
    const models = [];
    const entities = [];
    let name;

    do {
      name = await InteractionPrompts.input(
        texts.get("handler_name"),
        options?.initialName
      );
    } while (!name);

    const input_strategy = await InteractionPrompts.select(
      texts.get("pick_handler_input_strategy"),
      [
        {
          message: texts.get("handler_no_input"),
          name: "none",
        },
        {
          message: texts.get("handler_use_request_for_input"),
          name: "request",
        },
        {
          message: texts.get("handler_define_input"),
          name: "own",
        },
      ],
      ["none"],
      texts.get("hint___pick_handler_input_strategy")
    );

    const output_strategy = await InteractionPrompts.select(
      texts.get("pick_handler_output_strategy"),
      [
        {
          message: texts.get("handler_no_output"),
          name: "none",
        },
        {
          message: texts.get("handler_use_response_for_output"),
          name: "response",
        },
        {
          message: texts.get("handler_define_output"),
          name: "own",
        },
      ],
      ["none"],
      texts.get("hint___pick_handler_output_strategy")
    );

    const params = [];

    if (input_strategy === "own") {
      const result = await new CreateParamsInteraction(
        texts,
        config,
        writeMethods
      ).run({
        endpoint: options?.endpoint,
        target: name,
      });
      params.push(...result.params);
      models.push(...result.models);
      entities.push(...result.entities);
    }

    let return_type: string;

    if (output_strategy === "own") {
      do {
        return_type = await InteractionPrompts.input(
          texts.get("handler_return_type")
        );
      } while (!return_type);
      const rType = TypeInfo.create(return_type, config);
      const types = ComponentTools.filterComponentTypes(rType);
      types.forEach((componentType) => {
        const json = ComponentJsonFactory.create(componentType, {
          name: componentType.ref,
          types: ["json"],
          endpoint: options?.endpoint,
          rank: 2,
        });

        if (rType.isModel) {
          json.write_method = writeMethods.relatedComponentsMethods.model;
          models.push(json);
        } else if (rType.isEntity) {
          json.write_method = writeMethods.relatedComponentsMethods.entity;
          entities.push(json);
        }
      });
    }

    return {
      name,
      is_async: true,
      input_strategy,
      output_strategy,
      return_type,
      params,
      models,
      entities,
    };
  }
}
