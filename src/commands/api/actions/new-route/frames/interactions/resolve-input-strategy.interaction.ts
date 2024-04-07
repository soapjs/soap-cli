import {
  Config,
  EntityJson,
  MethodJson,
  ModelJson,
  ParamJson,
  Texts,
} from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";
import { PathParamsTools, QueryParamsTools } from "../../parsers";
import { config } from "process";
import { WriteMethodsAssignment } from "../../../../../../core";
import { CreateParamsInteraction } from "../../../../common";
import { CreateHandlerInputInteraction } from "../../../new-controller";
import { pascalCase } from "change-case";

export class ResolveInputStrategyInteraction extends Interaction<void> {
  constructor(
    protected config: Config,
    protected writeMethods: WriteMethodsAssignment,
    private texts: Texts
  ) {
    super();
  }
  public async run(
    input_strategy: string,
    handler: MethodJson,
    endpoint: string,
    path: string,
    request_body: any,
    models: ModelJson[],
    entities: EntityJson[]
  ): Promise<void> {
    const { texts, config, writeMethods } = this;
    const input: EntityJson = {
      name: pascalCase(`${handler.name}Input`),
      endpoint,
      props: [],
      write_method: writeMethods.relatedComponentsMethods.entity,
      rank: 2,
    };

    if (input_strategy === "request") {
      const inputInteraction = new CreateHandlerInputInteraction(config);
      const inputResult = await inputInteraction.run({
        endpoint,
        request: {
          path: path,
          body: request_body,
          method: "",
        },
      });
      if (inputResult.input) {
        input.props.push(...inputResult.input.props);
        handler.params.push({ name: "input", type: `Entity<${input.name}>` });
      }
      entities.push(input);
    }

    if (input_strategy === "own") {
      const result = await new CreateParamsInteraction(
        texts,
        config,
        writeMethods
      ).run({
        endpoint: endpoint,
        target: handler.name,
      });
      handler.params.push(...result.params);
      models.push(...result.models);
      entities.push(...result.entities);
    }
  }
}
