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
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";

export class CreateToolsetFrame extends Frame<ApiJson> {
  public static NAME = "create_toolset_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected writeMethods: WriteMethodsAssignment,
    protected texts: Texts
  ) {
    super(CreateToolsetFrame.NAME);
  }

  public async run(context?: {
    name?: string;
    endpoint?: string;
    layer?: string;
  }) {
    const { texts, config, command, writeMethods } = this;
    const result: ApiJson = { toolsets: [], entities: [], models: [] };
    const layer = context.layer || "domain";
    const methods = new Set<MethodJson>();
    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_toolset_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.presets.model.isEndpointRequired(),
    });
    const componentName = config.presets.toolset.generateName(name, {
      layer,
    });
    const componentPath = config.presets.toolset.generatePath({
      name,
      endpoint,
      layer,
    }).path;

    let write_method = command.write_method;

    if (command.force === false) {
      if (existsSync(componentPath) && write_method !== WriteMethod.Patch) {
        write_method = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    if (write_method !== WriteMethod.Skip) {
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

          if (componentTypes.length > 0) {
            for (const componentType of componentTypes) {
              let res: ApiJson;
              if (componentType.isModel) {
                res = await new CreateModelsFrame(
                  config,
                  command,
                  writeMethods,
                  texts
                ).run({
                  endpoint,
                  name: componentType.ref,
                  types: [componentType.type],
                  dependencyOf: 'toolset',
                });
                result.models.push(...res.models);
              } else if (componentType.isEntity) {
                res = await new CreateEntityFrame(
                  config,
                  command,
                  writeMethods,
                  texts
                ).run({
                  endpoint,
                  name: componentType.ref,
                  dependencyOf: 'toolset',
                });
                result.entities.push(...res.entities);
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
        rank: 0,
      });
    }

    return result;
  }
}
