import { existsSync } from "fs";
import {
  InputNameAndEndpointInteraction,
  ResolveDependneciesInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import {
  ApiJson,
  Config,
  PropJson,
  PropTools,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";
import { paramCase } from "change-case";

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
    const resolveDependencies = new ResolveDependneciesInteraction(texts);
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

    let storedPropsStr = "";
    let storedProps = [];

    for (const storage of storages) {
      const db = config.databases.find((db) => db.alias === storage);
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
      const model: { [key: string]: string } = await InteractionPrompts.form(
        texts.get("models_form_title_###").replace("###", db?.name || ''),
        [
          {
            name: "name",
            message: texts.get("name"),
            initial: name,
          },
          {
            name: "endpoint",
            message: texts.get("endpoint"),
            initial: endpoint,
          },
          {
            name: "table",
            message: texts.get("table"),
            initial: paramCase(`${name}.collection`),
          },
          {
            name: "storage",
            message: texts.get("type"),
            initial: storage,
          },
          {
            name: "props",
            message: texts.get("props"),
            initial: storedPropsStr,
            hint: "e.g. prop1:string,prop2:Model<User>",
          },
        ]
      );

      if (model.props != storedPropsStr) {
        storedPropsStr = model.props;
        storedProps = PropTools.arrayToData(model.props.split(","), config);
      }

      result.models.push({
        name: model.name,
        types: [storage],
        endpoint: model.endpoint,
        props: storedProps,
      });

      if (command.dependencies_write_method !== WriteMethod.Skip) {
        storedProps.forEach(async (prop) => {
          const dependencies = await resolveDependencies.run(
            prop.type,
            endpoint
          );
          result.entities.push(...dependencies.entities);
          result.models.push(...dependencies.models);
        });
      }
      if (writeMethod !== WriteMethod.Skip) {
        result.collections.push({
          name,
          table: model.table,
          model: model.name,
          storages: [storage],
          endpoint,
        });
      }
    }

    return result;
  }
}
