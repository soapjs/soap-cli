import { existsSync } from "fs";
import {
  CreatePropsInteraction,
  InputNameAndEndpointInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import {
  ApiJson,
  Config,
  PropJson,
  Texts,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";
import chalk from "chalk";

export class CreateEntityFrame extends Frame<ApiJson> {
  public static NAME = "create_entity_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected writeMethods: WriteMethodsAssignment,
    protected texts: Texts
  ) {
    super(CreateEntityFrame.NAME);
  }

  public async run(context?: {
    name?: string;
    endpoint?: string;
    props?: PropJson[];
    dependencyOf?: string;
  }) {
    const { texts, config, command, writeMethods } = this;
    const result: ApiJson = { entities: [], models: [] };
    const passedProps = context.props || [];
    let name: string;
    let endpoint: string;

    if (context?.dependencyOf) {
      console.log(
        chalk.gray(
          texts
            .get("setup_entity_as_dependency_of_###")
            .replace("###", context?.dependencyOf)
        )
      );
    }

    const res = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_entity_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.presets.entity.isEndpointRequired(),
    });

    name = res.name;
    endpoint = res.endpoint;

    const componentName = config.presets.entity.generateName(name);
    const componentPath = config.presets.entity.generatePath({
      name,
      endpoint,
    }).path;

    if (context?.dependencyOf) {
      result.entities.push({
        name,
        has_model: false,
        props: passedProps,
        endpoint,
        write_method: writeMethods.relatedComponentsMethods.entity,
        rank: 2,
      });
    } else {
      let write_method = command.write_method;

      if (command.force === false) {
        if (existsSync(componentPath) && write_method !== WriteMethod.Patch) {
          write_method = await new SelectComponentWriteMethodInteraction(
            texts
          ).run(componentName);
        }
      }

      if (write_method !== WriteMethod.Skip) {
        const { props, ...deps } = await new CreatePropsInteraction(
          texts,
          config,
          writeMethods,
          2
        ).run({
          endpoint,
          target: "entity",
          areAdditional: passedProps.length > 0,
        });

        result.entities.push(...deps.entities);
        result.models.push(...deps.models);
        let has_model = false;

        has_model = await InteractionPrompts.confirm(
          texts.get("do_you_want_to_create_entity_json_model")
        );

        result.entities.push({
          name,
          has_model,
          props: [...passedProps, ...props],
          endpoint,
          write_method,
          rank: 0,
        });
      }
    }
    return result;
  }
}
