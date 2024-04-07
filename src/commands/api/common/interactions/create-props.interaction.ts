import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CreatePropInteraction } from "./create-prop.interaction";
import {
  Config,
  EntityJson,
  ModelJson,
  PropJson,
  Texts,
  TypeInfo,
} from "@soapjs/soap-cli-common";
import { WriteMethodsAssignment } from "../../../../core";

type InteractionResult = {
  props: PropJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreatePropsInteraction extends Interaction<InteractionResult> {
  constructor(
    protected texts: Texts,
    protected config: Config,
    protected writeMethods: WriteMethodsAssignment,
    protected rank: number
  ) {
    super();
  }
  public async run(context: {
    endpoint: string;
    areAdditional?: boolean;
    modelTypes?: string[];
    target?: string;
  }): Promise<InteractionResult> {
    const { texts, config, writeMethods, rank } = this;
    const result: InteractionResult = { props: [], models: [], entities: [] };

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

        if (type.isModel) {
          result.models.push({
            name: type.ref,
            types: context.modelTypes || ["json"],
            endpoint: context.endpoint,
            write_method: writeMethods.relatedComponentsMethods.model,
            rank,
          });
        } else if (type.isEntity) {
          result.entities.push({
            name: type.ref,
            endpoint: context.endpoint,
            write_method: writeMethods.relatedComponentsMethods.entity,
            rank,
          });
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
