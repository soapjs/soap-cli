import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CreateParamInteraction } from "./create-param.interaction";
import {
  ComponentJsonFactory,
  ComponentTools,
  Config,
  EntityJson,
  ModelJson,
  ParamJson,
  Texts,
  TypeInfo,
} from "@soapjs/soap-cli-common";

export type CreateParamsInteractionResult = {
  params: ParamJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreateParamsInteraction extends Interaction<CreateParamsInteractionResult> {
  constructor(protected texts: Texts, protected config: Config) {
    super();
  }
  public async run(
    context: {
      endpoint: string;
      areAdditional?: boolean;
      target?: string;
    },
    options?: { skipQuestion?: boolean }
  ): Promise<CreateParamsInteractionResult> {
    const { texts, config } = this;
    const result = { params: [], models: [], entities: [] };
    const skipQuestion = options?.skipQuestion || false;

    if (
      skipQuestion ||
      (await InteractionPrompts.confirm(
        (context?.areAdditional
          ? texts.get("do_you_want_to_add_more_parameters_to_###")
          : texts.get("do_you_want_to_add_parameters_to_###")
        ).replace("###", context?.target || "")
      ))
    ) {
      let param;
      do {
        param = await new CreateParamInteraction(texts).run();
        result.params.push(param);

        const type = TypeInfo.create(param.type, config);
        const types = ComponentTools.filterComponentTypes(type);

        // if (dependencies_write_method !== WriteMethod.Skip) {

        types.forEach((componentType) => {
          const json = ComponentJsonFactory.create(componentType, {
            name: componentType.ref,
            types: ["json"],
            endpoint: context.endpoint,
          });

          if (type.isModel) {
            result.models.push(json);
          } else if (type.isEntity) {
            result.entities.push(json);
          }
        });
        // }
      } while (
        await InteractionPrompts.confirm(
          texts
            .get("param_###_has_been_added__add_more")
            .replace("###", param?.name)
        )
      );
    }

    return result;
  }
}
