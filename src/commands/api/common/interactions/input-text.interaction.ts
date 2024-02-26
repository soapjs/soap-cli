import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export class InputTextInteraction extends Interaction<string> {
  constructor(protected inputTextMessage) {
    super();
  }

  public async run(context?: {
    value?: string;
    hint?: string;
  }): Promise<string> {
    let value;

    while (typeof value !== "string" || value.length === 0) {
      value = await InteractionPrompts.input(
        this.inputTextMessage,
        context?.value,
        context?.hint
      );
    }

    return value;
  }
}
