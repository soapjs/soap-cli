import { Texts } from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class PickOutputStrategyInteraction extends Interaction<string> {
  constructor(private texts: Texts) {
    super();
  }
  public async run(response_body: any): Promise<string> {
    const { texts } = this;
    const output_strategy_options = [
      {
        message: texts.get("handler_no_output"),
        name: "none",
      },
      {
        message: texts.get("handler_define_output"),
        name: "own",
      },
    ];

    if (response_body) {
      output_strategy_options.splice(1, 0, {
        message: texts.get("handler_use_response_for_output"),
        name: "response",
      });
    }

    return InteractionPrompts.select(
      texts.get("pick_handler_output_strategy"),
      output_strategy_options,
      ["none"],
      texts.get("hint___pick_handler_output_strategy")
    );
  }
}
