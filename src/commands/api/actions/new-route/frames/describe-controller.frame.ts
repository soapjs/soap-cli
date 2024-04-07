import {
  ApiJson,
  Config,
  ControllerJson,
  EntityJson,
  MethodJson,
  ModelJson,
  Texts,
} from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";
import { CommandConfig, WriteMethodsAssignment } from "../../../../../core";
import { PickInputStrategyInteraction } from "./interactions/pick-input-strategy.interaction";
import { PickOutputStrategyInteraction } from "./interactions/pick-output-strategy.interaction";
import { ResolveInputStrategyInteraction } from "./interactions/resolve-input-strategy.interaction";
import { ResolveOutputStrategyInteraction } from "./interactions/resolve-output-strategy.interaction";

export class DescribeControllerFrame extends Frame<ApiJson> {
  public static NAME = "describe_controller_frame";
  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected writeMethods: WriteMethodsAssignment,
    protected texts: Texts
  ) {
    super(DescribeControllerFrame.NAME);
  }

  public async run(context: {
    endpoint: string;
    controller: string;
    handler: string;
    request_body: any;
    response_body: any;
    path: string;
  }) {
    const { texts, config, writeMethods } = this;
    const {
      endpoint,
      handler: handlerName,
      request_body,
      response_body,
      path,
    } = context;

    const handler: MethodJson = {
      name: handlerName,
      is_async: true,
      params: [],
      return_type: `Result<void>`,
    };

    const controllers: ControllerJson[] = [
      {
        name: context.controller,
        endpoint: endpoint,
        handlers: [handler],
        write_method: writeMethods.relatedComponentsMethods.controller,
        rank: 2,
      },
    ];
    const entities: EntityJson[] = [];
    const models: ModelJson[] = [];
    const input_strategy = await new PickInputStrategyInteraction(texts).run(
      request_body,
      path
    );
    const output_strategy = await new PickOutputStrategyInteraction(texts).run(
      response_body
    );

    await new ResolveInputStrategyInteraction(config, writeMethods, texts).run(
      input_strategy,
      handler,
      endpoint,
      path,
      request_body,
      models,
      entities
    );

    await new ResolveOutputStrategyInteraction(config, writeMethods, texts).run(
      output_strategy,
      handler,
      endpoint,
      response_body,
      models,
      entities
    );

    return { controllers, entities, models };
  }
}
