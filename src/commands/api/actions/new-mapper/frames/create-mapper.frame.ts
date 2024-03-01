import { existsSync } from "fs";
import {
  InputNameAndEndpointInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import { CreateEntityFrame } from "../../new-entity";
import {
  ApiJson,
  Config,
  EntityJson,
  ModelJson,
  PropJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";
import chalk from "chalk";

export class CreateMappersFrame extends Frame<ApiJson> {
  public static NAME = "create_mappers_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(CreateMappersFrame.NAME);
  }

  private async defineModels(
    dbs: string[],
    name: string,
    entity: EntityJson,
    passProps: boolean
  ): Promise<ModelJson[]> {
    const { texts, config } = this;

    const inputs = dbs.map((db) => {
      const dbDesc = config.databases.find((adb) => adb.alias === db);
      return {
        name: db,
        message: dbDesc?.name || texts.get(db),
        initial: name,
      };
    });

    const names: { [key: string]: string } = await InteractionPrompts.form(
      texts.get("mapper_models_form_title"),
      inputs
    );

    const models: ModelJson[] = Object.keys(names).map((db) => {
      return {
        name: names[db],
        types: [db],
        props: passProps ? entity.props : [],
        endpoint: entity.endpoint,
      };
    });

    return models;
  }

  public async run(context?: {
    storages: string[];
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config, command } = this;
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
    let passProps = false;

    console.log(
      chalk.gray(
        texts.get("setup_entity_as_dependency_of_###").replace("###", "mapper")
      )
    );

    const createEntityResult = await new CreateEntityFrame(
      config,
      command,
      texts
    ).run({
      name,
      endpoint,
    });
    entity = createEntityResult.entities.at(-1);

    if (entity.props.length > 0) {
      passProps = await InteractionPrompts.confirm(
        texts.get("do_you_want_to_use_pass_entity_props_to_models")
      );
    }

    const models = await this.defineModels(storages, name, entity, passProps);

    if (command.dependencies_write_method !== WriteMethod.Skip) {
      result.entities.push(...createEntityResult.entities);
      result.models.push(...createEntityResult.models);
      result.models.push(...models);
    }

    for (const storage of storages) {
      const componentName = config.components.mapper.generateName(name);
      const componentPath = config.components.mapper.generatePath({
        name,
        type: storage,
        endpoint,
      }).path;

      if (command.force === false) {
        if (existsSync(componentPath)) {
          writeMethod = await new SelectComponentWriteMethodInteraction(
            texts
          ).run(componentName);
        }
      }

      if (writeMethod !== WriteMethod.Skip) {
        const model = models.find((m) => m.types.includes(storage));
        result.mappers.push({
          name,
          entity: entity.name,
          model: model.name,
          storages: [storage],
          endpoint,
        });
      }
    }
    return result;
  }
}
