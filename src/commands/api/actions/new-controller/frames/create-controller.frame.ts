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
  ApiJson,
  ModelJson,
  HandlerJson,
  EntityJson,
} from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { CommandConfig } from "../../../../../core";

export class CreateControllerFrame extends Frame<ApiJson> {
  public static NAME = "create_controller_frame";

  constructor(
    protected config: Config,
    protected command: CommandConfig,
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
      handlers: HandlerJson[];
    }
  ) {
    const { texts, config, command } = this;
    const { name, endpoint, handlers } = context;
    const result: ApiJson = {
      models: [],
      entities: [],
      controllers: [],
    };
    const componentName = config.components.controller.generateName(name);
    const componentPath = config.components.controller.generatePath({
      name,
      endpoint,
    }).path;
    let writeMethod = WriteMethod.Write;

    if (command.force === false) {
      if (existsSync(componentPath)) {
        writeMethod = await new SelectComponentWriteMethodInteraction(
          texts
        ).run(componentName);
      }
    }

    if (writeMethod !== WriteMethod.Skip) {
      const { methods, ...rest } = await new DefineMethodsInteraction(
        texts,
        config,
        command.dependencies_write_method,
        result
      ).run({
        endpoint: endpoint,
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
      });
    }

    return result;
  }
}
