import { existsSync } from "fs";
import {
  InputNameAndEndpointInteraction,
  InputTextInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import { CreateModelsFrame } from "../../new-model";
import {
  ApiJson,
  Config,
  PropJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";

export class CreateCollectionFrame extends Frame<ApiJson> {
  public static NAME = "create_collection_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(CreateCollectionFrame.NAME);
  }

  public async run(context?: {
    storages: string[];
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config, command } = this;
    const createModelsFrame = new CreateModelsFrame(config, command, texts);
    const result: ApiJson = { models: [], entities: [], collections: [] };
    const storages = context.storages ? [...context.storages] : [];
    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_collection_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.components.collection.isEndpointRequired(),
    });
    let writeMethod = WriteMethod.Write;

    for (const storage of storages) {
      const componentName = config.components.collection.generateName(name);
      const componentPath = config.components.collection.generatePath({
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

      const table = await new InputTextInteraction(
        texts.get("please_enter_storage_###_table_name").replace("###", storage)
      ).run();

      const model = await new InputTextInteraction(
        texts.get("please_enter_storage_###_model_name").replace("###", storage)
      ).run({
        value: name,
        hint: texts.get("hint___please_enter_storage_model_name"),
      });

      if (command.dependencies_write_method !== WriteMethod.Skip) {
        if (
          await InteractionPrompts.confirm(
            texts
              .get("do_you_want_to_define_the_contents_of_storage_model_###")
              .replace("###", storage)
          )
        ) {
          const createModelsResult = await createModelsFrame.run({
            types: [storage],
            name: model,
            endpoint,
          });

          result.entities.push(...createModelsResult.entities);
          result.models.push(...createModelsResult.models);
        }
      }

      if (writeMethod !== WriteMethod.Skip) {
        result.collections.push({
          name,
          table,
          model,
          storages: [storage],
          endpoint,
        });
      }
    }

    return result;
  }
}
