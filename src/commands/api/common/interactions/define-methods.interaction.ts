import { MethodJson, Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { Config, TypeInfo } from "../../../../core";
import { ParamSchema } from "../../../../core/components";
import { EntityJson, ModelJson } from "../../actions";
import { DefineMethodInteraction } from "./define-method.interaction";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";

type InteractionResult = {
  methods: MethodJson[];
  models: ModelJson[];
  entities: EntityJson[];
};

export class DefineMethodsInteraction extends Interaction<InteractionResult> {
  constructor(
    protected texts: Texts,
    protected config: Config,
    protected dependencies_write_method: WriteMethod,
    protected references?: { models?: ModelJson[]; entities?: EntityJson[] }
  ) {
    super();
  }

  private isUnique(references, type) {
    if (Array.isArray(references?.models) && type.isModel) {
      return (
        references.models.findIndex(
          (r) => r.name.toLowerCase() === type.ref.toLowerCase()
        ) === -1
      );
    }
    if (Array.isArray(references?.entities) && type.isEntity) {
      return (
        references.entities.findIndex(
          (r) => r.name.toLowerCase() === type.ref.toLowerCase()
        ) === -1
      );
    }

    return true;
  }

  public async run(context?: {
    endpoint: string;
    areAdditional?: boolean;
    component?: string;
  }): Promise<InteractionResult> {
    const { texts, config, dependencies_write_method, references } = this;
    const result = { methods: [], models: [], entities: [] };

    if (
      await InteractionPrompts.confirm(
        (context?.areAdditional
          ? texts.get("do_you_want_to_add_more_methods_to_###")
          : texts.get("do_you_want_to_add_methods_to_###")
        ).replace("###", context?.component || "")
      )
    ) {
      let method: MethodJson;
      do {
        method = await new DefineMethodInteraction(texts).run();
        result.methods.push(method);

        if (dependencies_write_method !== WriteMethod.Skip) {
          const types = [];
          if (method.return_type) {
            const rt = TypeInfo.create(method.return_type, config);
            if (rt.isComponentType && this.isUnique(references, rt)) {
              types.push(rt);
            }
          }

          if (Array.isArray(method.params)) {
            method.params.forEach((str) => {
              const param = ParamSchema.create(str, config);
              if (
                param.type.isComponentType &&
                this.isUnique(references, param.type)
              ) {
                types.push(param.type);
              }
            });
          }

          for (const type of types) {
            if (
              type.isModel &&
              (await InteractionPrompts.confirm(
                texts.get("non_standard_type_detected__create_one")
              ))
            ) {
              const c = result.models.find(
                (m) => m.name === type.ref && m.types.includes(type.type)
              );
              if (!c) {
                result.models.push({
                  name: type.ref,
                  types: [type.type],
                  endpoint: context.endpoint,
                });
              }
            } else if (
              type.isEntity &&
              (await InteractionPrompts.confirm(
                texts.get("non_standard_type_detected__create_one")
              ))
            ) {
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
            .get("method_###_has_been_added__add_more")
            .replace("###", method?.name)
        )
      );
    }

    return result;
  }
}
