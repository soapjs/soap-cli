import { existsSync } from "fs";
import { Config } from "../../../../../core";
import {
  ApiJson,
  InputNameAndEndpointInteraction,
  InputTextInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import { CreateModelsAsDependenciesFrame } from "../../new-model";
import { CreateEntityAsDependencyFrame, EntityJson } from "../../new-entity";
import { PropJson, Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class CreateMappersFrame extends Frame<ApiJson> {
  public static NAME = "create_mappers_frame";

  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(CreateMappersFrame.NAME);
  }

  public async run(context?: {
    storages: string[];
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config } = this;
    const createModelDependenciesFrame = new CreateModelsAsDependenciesFrame(
      config,
      texts
    );
    const result: ApiJson = { models: [], entities: [], mappers: [] };
    const storages = context.storages ? [...context.storages] : [];
    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_mapper_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.components.mapper.isEndpointRequired(),
    });
    let writeMethod = WriteMethod.Write;
    let entity: EntityJson;
    let entityName: string;
    let modelName: string;
    let entityProps = [];

    for (const storage of storages) {
      const componentName = config.components.mapper.generateName(name);
      const componentPath = config.components.mapper.generatePath({
        name,
        type: storage,
        endpoint,
      }).path;

      if (config.command.force === false) {
        if (existsSync(componentPath)) {
          writeMethod = await new SelectComponentWriteMethodInteraction(
            texts
          ).run(componentName);
        }
      }

      if (writeMethod !== WriteMethod.Skip) {
        if (config.command.dependencies_write_method !== WriteMethod.Skip) {
          if (!entityName) {
            const createEntityResult = await new CreateEntityAsDependencyFrame(
              config,
              texts
            ).run({
              dependencyOf: "mapper",
              name,
              endpoint,
            });
            entity = createEntityResult.entities.at(-1);
            entityName = entity.name;
            result.entities.push(...createEntityResult.entities);
            result.models.push(...createEntityResult.models);

            if (entity.props.length > 0) {
              if (
                await InteractionPrompts.confirm(
                  texts.get("do_you_want_to_use_pass_entity_props_to_models")
                )
              ) {
                entityProps.push(...entity.props);
              }
            }
          }

          const createModelsResult = await createModelDependenciesFrame.run({
            dependencyOf: "mapper",
            types: [storage],
            name: modelName || name,
            endpoint,
            props: entityProps,
          });
          modelName = createModelsResult.models.at(-1).name;
          result.entities.push(...createModelsResult.entities);
          result.models.push(...createModelsResult.models);
        } else {
          if (!entityName) {
            entityName = await new InputTextInteraction(
              texts
                .get("please_enter_mapper_###_entity_name")
                .replace("###", storage)
            ).run({
              value: name,
              hint: texts.get("hint___please_enter_mapper_entity_name"),
            });
          }

          modelName = await new InputTextInteraction(
            texts
              .get("please_enter_mapper_###_model_name")
              .replace("###", storage)
          ).run({
            value: modelName || name,
            hint: texts.get("hint___please_enter_mapper_model_name"),
          });
        }

        result.mappers.push({
          name,
          entity: entityName,
          model: modelName,
          storages: [storage],
          endpoint,
        });
      }
    }
    return result;
  }
}
