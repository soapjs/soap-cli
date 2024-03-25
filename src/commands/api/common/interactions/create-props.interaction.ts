import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CreatePropInteraction } from "./create-prop.interaction";
import {
  Config,
  EntityJson,
  ModelJson,
  PropJson,
  Texts,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";

type InteractionResult = {
  props: PropJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreatePropsInteraction extends Interaction<InteractionResult> {
  constructor(
    protected texts: Texts,
    protected config: Config,
    protected dependencies_write_method: WriteMethod
  ) {
    super();
  }
  public async run(context: {
    endpoint: string;
    areAdditional?: boolean;
    modelTypes?: string[];
    target?: string;
  }): Promise<InteractionResult> {
    const { texts, config, dependencies_write_method } = this;
    const result = { props: [], models: [], entities: [] };

    if (
      await InteractionPrompts.confirm(
        (context?.areAdditional
          ? texts.get("do_you_want_to_add_more_properties_to_###")
          : texts.get("do_you_want_to_add_properties_to_###")
        ).replace("###", context?.target || "")
      )
    ) {
      let prop;
      do {
        prop = await new CreatePropInteraction(texts).run();
        result.props.push(prop);

        const type = TypeInfo.create(prop.type, config);

        if (dependencies_write_method !== WriteMethod.Skip) {
          if (
            type.isModel &&
            (await InteractionPrompts.confirm(
              texts.get("non_standard_type_detected__create_one")
            ))
          ) {
            result.models.push({
              name: type.ref,
              types: context.modelTypes || ["json"],
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
            .get("prop_###_has_been_added__add_more")
            .replace("###", prop?.name)
        )
      );
    }

    return result;
  }
}
