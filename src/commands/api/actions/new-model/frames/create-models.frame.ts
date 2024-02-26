import { existsSync } from "fs";
import { Config } from "../../../../../core";
import {
  ApiJson,
  CreatePropsInteraction,
  InputNameAndEndpointInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import { PropJson, Texts, WriteMethod } from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";

export class CreateModelsFrame extends Frame<ApiJson> {
  public static NAME = "create_models_frame";

  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(CreateModelsFrame.NAME);
  }

  public async run(context?: {
    types: string[];
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config } = this;
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
      isEndpointRequired: config.components.model.isEndpointRequired(),
    });

    name = res.name;
    endpoint = res.endpoint;

    let writeMethod = WriteMethod.Write;

    const newPropsResult = await new CreatePropsInteraction(
      texts,
      config,
      config.command.dependencies_write_method
    ).run({
      endpoint,
      target: "model",
      areAdditional: passedProps.length > 0,
    });

    result.entities.push(...newPropsResult.entities);
    result.models.push(...newPropsResult.models);

    for (const type of types) {
      const componentName = config.components.model.generateName(name);
      const componentPath = config.components.model.generatePath({
        name,
        type,
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
        result.models.push({
          name,
          types: [type],
          props: [...passedProps, ...newPropsResult.props],
          endpoint,
        });
      }
    }

    return result;
  }
}
