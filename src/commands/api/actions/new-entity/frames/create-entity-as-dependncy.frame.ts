import { InputNameAndEndpointInteraction } from "../../../common";
import chalk from "chalk";
import { CreateEntityFrame } from "./create-entity.frame";
import { ApiJson, Config, PropJson, Texts } from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";

export class CreateEntityAsDependencyFrame extends Frame<ApiJson> {
  public static NAME = "create_entity_as_dependency_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
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
    const { texts, config, command } = this;
    const { dependencyOf, ...rest } = context;

    console.log(
      chalk.gray(
        texts
          .get("setup_entity_as_dependency_of_###")
          .replace("###", dependencyOf)
      )
    );

    if (command.with_dependencies) {
      return new CreateEntityFrame(config, command, texts).run(rest);
    }

    const { name, endpoint } = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_entity_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.presets.entity.isEndpointRequired(),
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
