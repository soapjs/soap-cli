import { existsSync } from "fs";
import {
  CreatePropsInteraction,
  InputNameAndEndpointInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import {
  ApiJson,
  Config,
  ModelType,
  PropJson,
  Texts,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";

export class CreateModelsFrame extends Frame<ApiJson> {
  public static NAME = "create_models_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super(CreateModelsFrame.NAME);
  }

  private adjustPropsToModelType(props, type) {
    return props.map((prop) => {
      const propType = TypeInfo.create(prop.type, this.config);
      if (propType.isModel) {
        return {
          ...prop,
          type: ModelType.create(propType.name, propType.ref, type).tag,
        };
      }

      return prop;
    });
  }

  public async run(context?: {
    types: string[];
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config, command } = this;
    const result: ApiJson = { models: [], entities: [] };
    const types = context.types ? [...context.types] : [];
    const passedProps = context?.props || [];
    let name: string;
    let endpoint: string;

    const res = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_model_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.presets.model.isEndpointRequired(),
    });

    name = res.name;
    endpoint = res.endpoint;

    let writeMethod = WriteMethod.Write;
    const newPropsResult = await new CreatePropsInteraction(
      texts,
      config,
      command.dependencies_write_method
    ).run({
      endpoint,
      target: "model",
      areAdditional: passedProps.length > 0,
      modelTypes: types,
    });

    result.entities.push(...newPropsResult.entities);
    result.models.push(...newPropsResult.models);

    for (const type of types) {
      const componentName = config.presets.model.generateName(name);
      const componentPath = config.presets.model.generatePath({
        name,
        type,
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
        const props = this.adjustPropsToModelType(newPropsResult.props, type);

        result.models.push({
          name,
          types: [type],
          props: [...passedProps, ...props],
          endpoint,
        });
      }
    }

    return result;
  }
}
