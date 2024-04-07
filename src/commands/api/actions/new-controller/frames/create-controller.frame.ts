import { existsSync } from "fs";
import {
  DefineMethodsInteraction,
  SelectComponentWriteMethodInteraction,
} from "../../../common";
import { ControllerNameAndEndpoint } from "./define-controller-name-and-endpoint.frame";
import {
  Texts,
  WriteMethod,
  Config,
  MethodJson,
  ApiJson,
  EntityJson,
  ModelJson,
} from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";

export class CreateControllerFrame extends Frame<ApiJson> {
  public static NAME = "create_controller_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected writeMethods: WriteMethodsAssignment,
    protected texts: Texts
  ) {
    super(CreateControllerFrame.NAME);
  }

  public async run(
    context: ControllerNameAndEndpoint & {
      name: string;
      endpoint: string;
      entities: EntityJson[];
      models: ModelJson[];
      handlers: MethodJson[];
    }
  ) {
    const { texts, config, command, writeMethods } = this;
    const { name, endpoint, handlers } = context;
    const result: ApiJson = {
      models: [],
      entities: [],
      controllers: [],
    };

    const componentName = config.presets.controller.generateName(name);
    const componentPath = config.presets.controller.generatePath({
      name,
      endpoint,
    }).path;
    let write_method = command.write_method;

    if (command.force === false) {
      if (existsSync(componentPath) && write_method !== WriteMethod.Patch) {
        write_method = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    if (write_method !== WriteMethod.Skip) {
      const { methods, ...rest } = await new DefineMethodsInteraction(
        texts,
        config,
        writeMethods,
        result
      ).run({
        endpoint,
        component: "controller",
        title: texts.get("do_you_want_to_add_controller_methods"),
      });

      result.entities.push(...rest.entities);
      result.models.push(...rest.models);
      result.controllers.push({
        name,
        endpoint,
        methods,
        handlers,
        write_method,
        rank: 0,
      });
    }

    return result;
  }
}
