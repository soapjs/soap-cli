import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CreateParamInteraction } from "./create-param.interaction";
import {
  Config,
  EntityJson,
  ModelJson,
  ParamJson,
  Texts,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";

type InteractionResult = {
  params: ParamJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreateParamsInteraction extends Interaction<InteractionResult> {
  constructor(
    protected texts: Texts,
    protected config: Config,
    protected dependencies_write_method: WriteMethod
  ) {
    super();
  }
  public async run(
    context: {
      endpoint: string;
      areAdditional?: boolean;
      target?: string;
    },
    options?: { skipQuestion?: boolean }
  ): Promise<InteractionResult> {
    const { texts, config, dependencies_write_method } = this;
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

        if (dependencies_write_method !== WriteMethod.Skip) {
          if (
            type.isModel &&
            (await InteractionPrompts.confirm(
              texts.get("non_standard_type_detected__create_one")
            ))
          ) {
            result.models.push({
              name: type.ref,
              types: ["json"],
              endpoint: context.endpoint,
            });
          } else if (
            type.isEntity &&
            (await InteractionPrompts.confirm(
              texts.get("non_standard_type_detected__create_one")
            ))
          ) {
            result.entities.push({
              name: type.ref,
              endpoint: context.endpoint,
            });
          }
        }
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
