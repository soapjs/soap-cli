import { existsSync } from "fs";
import { CreateModelsFrame } from "../../new-model";
import { CreateEntityFrame } from "../../new-entity";
import {
  ApiJson,
  ComponentTools,
  Config,
  MethodJson,
  ParamSchema,
  Texts,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import {
  InputNameAndEndpointInteraction,
  SelectComponentWriteMethodInteraction,
  DefineMethodInteraction,
} from "../../../common";
import { CommandConfig } from "../../../../../core";

export class CreateToolsetFrame extends Frame<ApiJson> {
  public static NAME = "create_toolset_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(CreateToolsetFrame.NAME);
  }

  public async run(context?: {
    name?: string;
    endpoint?: string;
    layer?: string;
  }) {
    const { texts, config, command } = this;
    const result: ApiJson = { toolsets: [], entities: [], models: [] };
    const layer = context.layer || "domain";
    const methods = new Set<MethodJson>();
    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_toolset_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.components.model.isEndpointRequired(),
    });
    const componentName = config.components.toolset.generateName(name, {
      layer,
    });
    const componentPath = config.components.toolset.generatePath({
      name,
      endpoint,
      layer,
    }).path;

    let writeMethod = WriteMethod.Write;

    if (command.force === false) {
      if (existsSync(componentPath)) {
        writeMethod = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    if (writeMethod !== WriteMethod.Skip) {
      if (
        await InteractionPrompts.confirm(
          texts
            .get("do_you_want_to_define_methods_of_toolset_###")
            .replace("###", name)
        )
      ) {
        let method: MethodJson;
        do {
          method = await new DefineMethodInteraction(texts).run();
          methods.add(method);
          if (command.dependencies_write_method !== WriteMethod.Skip) {
            const componentTypes: TypeInfo[] = [];
            if (Array.isArray(method.params)) {
              method.params.forEach((param) => {
                const p = ParamSchema.create(param, config);
                p.listTypes().forEach((type) => {
                  ComponentTools.filterComponentTypes(type).forEach(
                    (componentType) => {
                      if (
                        componentTypes.findIndex((d) =>
                          TypeInfo.areIdentical(d, componentType)
                        ) === -1
                      ) {
                        componentTypes.push(componentType);
                      }
                    }
                  );
                });
              });
            }

            if (
              componentTypes.length > 0 &&
              (await InteractionPrompts.confirm(
                texts.get(
                  "component_types_detected__do_you_want_to_define_them"
                )
              ))
            ) {
              for (const componentType of componentTypes) {
                let res: ApiJson;
                if (componentType.isModel) {
                  res = await new CreateModelsFrame(config, command, texts).run(
                    {
                      endpoint,
                      name: componentType.ref,
                      types: [componentType.type],
                    }
                  );
                } else if (componentType.isEntity) {
                  res = await new CreateEntityFrame(config, command, texts).run(
                    {
                      endpoint,
                      name: componentType.ref,
                    }
                  );
                }

                if (Array.isArray(res.models)) {
                  result.models.push(...res.models);
                }

                if (Array.isArray(res.entities)) {
                  result.entities.push(...res.entities);
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

      result.toolsets.push({
        layer,
        name,
        endpoint,
        methods: [...methods],
      });
    }

    return result;
  }
}
