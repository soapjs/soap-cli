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
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";
import chalk from "chalk";

export class CreateModelsFrame extends Frame<ApiJson> {
  public static NAME = "create_models_frame";
  private newProps;

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected writeMethods: WriteMethodsAssignment,
    protected texts: Texts
  ) {
    super(CreateModelsFrame.NAME);
  }

  private async adjustPropsToModelType(
    endpoint,
    types,
    passedProps,
    result,
    type
  ) {
    const { texts, config, writeMethods } = this;

    if (!this.newProps) {
      const newPropsResult = await new CreatePropsInteraction(
        texts,
        config,
        writeMethods,
        2
      ).run({
        endpoint,
        target: "model",
        areAdditional: passedProps.length > 0,
        modelTypes: types,
      });

      result.entities.push(...newPropsResult.entities);
      result.models.push(...newPropsResult.models);
      this.newProps = newPropsResult.props;
    }

    return this.newProps.map((prop) => {
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
    dependencyOf?: string;
  }) {
    const { texts, config, command } = this;
    const result: ApiJson = { models: [], entities: [] };
    const types = context.types ? [...context.types] : [];
    const passedProps = context?.props || [];
    let name: string;
    let endpoint: string;

    if (context?.dependencyOf) {
      console.log(
        chalk.gray(
          texts
            .get("setup_model_as_dependency_of_###")
            .replace("###", context?.dependencyOf)
        )
      );
    }

    const res = await new InputNameAndEndpointInteraction({
      nameMessage: texts.get("please_provide_model_name"),
      endpointMessage: texts.get("please_provide_endpoint"),
    }).run({
      ...context,
      isEndpointRequired: config.presets.model.isEndpointRequired(),
    });

    name = res.name;
    endpoint = res.endpoint;

    let write_method = command.write_method;

    if (context?.dependencyOf) {
      types.forEach((t) => {
        result.models.push({
          name,
          endpoint,
          types: [t],
          write_method: this.writeMethods.relatedComponentsMethods.model,
          rank: 2,
        });
      });
    } else {
      for (const type of types) {
        const componentName = config.presets.model.generateName(name);
        const componentPath = config.presets.model.generatePath({
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

        if (write_method !== WriteMethod.Skip) {
          const props = await this.adjustPropsToModelType(
            endpoint,
            types,
            passedProps,
            result,
            type
          );

          result.models.push({
            name,
            types: [type],
            props: [...passedProps, ...props],
            endpoint,
            write_method,
            rank: 0,
          });
        }
      }
    }
    return result;
  }
}
