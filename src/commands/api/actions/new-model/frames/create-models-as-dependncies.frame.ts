import chalk from "chalk";
import { Config } from "../../../../../core";
import { ApiJson, InputNameAndEndpointInteraction } from "../../../common";
import { CreateModelsFrame } from "./create-models.frame";
import { PropJson, Texts } from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";

export class CreateModelsAsDependenciesFrame extends Frame<ApiJson> {
  public static NAME = "create_models_as_dependencies_frame";

  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(CreateModelsAsDependenciesFrame.NAME);
  }

  public async run(context: {
    dependencyOf: string;
    types: string[];
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config } = this;
    const { dependencyOf, ...rest } = context;

    console.log(
      chalk.gray(
        texts
          .get("setup_model_as_dependency_of_###")
          .replace("###", dependencyOf)
      )
    );

    if (config.command.with_dependencies) {
      return new CreateModelsFrame(config, texts).run(rest);
    }

    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_model_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.components.entity.isEndpointRequired(),
    });
    const models = [];

    rest.types.forEach((t) => {
      models.push({
        name,
        endpoint,
        types: [t],
      });
    });

    return {
      entities: [],
      models,
    };
  }
}
