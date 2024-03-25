import { Config, Texts } from "@soapjs/soap-cli-common";
import { Interaction } from "@soapjs/soap-cli-interactive";
import {
  CreateParamsInteraction,
  CreateParamsInteractionResult,
} from "../../../../common/interactions/create-params.interaction";
import { CommandConfig } from "../../../../../../core";

export class DefineHandlerParamsInteraction extends Interaction<CreateParamsInteractionResult> {
  constructor(
    protected config: Config,
    protected command: CommandConfig,
    protected texts: Texts
  ) {
    super();
  }
  public async run(options?: {
    endpoint?: string;
  }): Promise<CreateParamsInteractionResult> {
    const { texts, config } = this;
    const { endpoint } = options;

    return new CreateParamsInteraction(texts, config).run(
      {
        endpoint,
        target: "controller",
      },
      { skipQuestion: true }
    );
  }
}
