import { existsSync } from "fs";
import {
  ResolveDependneciesInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import {
  ApiJson,
  Config,
  PropDataParser,
  PropJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig, WriteMethodResolver } from "../../../../../core";
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

  public async run(context: {
    types: string[];
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config, command } = this;
    const writeMethods = WriteMethodResolver.resolveWriteMethods(command);
    const resolveDependencies = new ResolveDependneciesInteraction(
      writeMethods
    );
    const result: ApiJson = {
      models: [],
      entities: [],
      collections: [],
    };
    const { name, endpoint } = context;
    const types = context.types ? [...context.types] : [];
    let write_method = command.write_method;
    let storedPropsStr = "";
    let storedProps = [];

    for (const type of types) {
      const db = config.databases.find((db) => db.alias === type);
      const componentName = config.presets.collection.generateName(name);
      const componentPath = config.presets.collection.generatePath({
        name,
        type,
        endpoint,
      }).path;

      if (command.force === false) {
        if (existsSync(componentPath) && write_method !== WriteMethod.Patch) {
          write_method = await new SelectComponentWriteMethodInteraction(
            texts
          ).run(componentName);
        }
      }
      if (write_method === WriteMethod.Skip) {
        continue;
      }
      const model: { [key: string]: string } = await InteractionPrompts.form(
        texts.get("models_form_title_###").replace("###", db?.name || ""),
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
            name: "type",
            message: texts.get("type"),
            initial: type,
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
        storedProps = model.props
          .split(/,\s*/)
          .map((p) => PropDataParser.parse(p, config));
      }

      result.models.push({
        name: model.name,
        types: [type],
        endpoint: model.endpoint,
        props: storedProps,
        write_method: writeMethods.relatedComponentsMethods.model,
        rank: 2,
      });

      storedProps.forEach(async (prop) => {
        const dependencies = await resolveDependencies.run(
          prop.type,
          endpoint,
          2
        );
        result.entities.push(...dependencies.entities);
        result.models.push(...dependencies.models);
      });

      result.collections.push({
        name,
        table: model.table,
        model: model.name,
        types: [type],
        endpoint,
        write_method,
        rank: 0,
      });
    }

    return result;
  }
}
