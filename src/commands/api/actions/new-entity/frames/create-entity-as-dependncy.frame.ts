import { Config } from "../../../../../core";
import { ApiJson, InputNameAndEndpointInteraction } from "../../../common";
import chalk from "chalk";
import { CreateEntityFrame } from "./create-entity.frame";
import { PropJson, Texts } from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";

export class CreateEntityAsDependencyFrame extends Frame<ApiJson> {
  public static NAME = "create_entity_as_dependency_frame";

  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(CreateEntityAsDependencyFrame.NAME);
  }

  public async run(context: {
    dependencyOf: string;
    name?: string;
    endpoint?: string;
    props?: PropJson[];
  }) {
    const { texts, config } = this;
    const { dependencyOf, ...rest } = context;

    console.log(
      chalk.gray(
        texts
          .get("setup_entity_as_dependency_of_###")
          .replace("###", dependencyOf)
      )
    );

    if (config.command.with_dependencies) {
      return new CreateEntityFrame(config, texts).run(rest);
    }

    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_entity_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.components.entity.isEndpointRequired(),
    });

    return {
      entities: [
        {
          name,
          endpoint,
        },
      ],
      models: [],
    };
  }
}
