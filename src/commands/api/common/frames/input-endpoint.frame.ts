import { Texts } from "@soapjs/soap-cli-common";
import { Frame, InteractionPrompts } from "@soapjs/soap-cli-interactive";

type FrameResult = {
  endpoint: string;
};

export type InputEndpointContext = {
  endpoint: string;
};

export class InputEndpointFrame extends Frame<FrameResult> {
  public static NAME = "input_endpoint";

  constructor(protected texts: Texts) {
    super(InputEndpointFrame.NAME);
  }

  public async run(context: InputEndpointContext) {
    const { texts } = this;

    if (context.endpoint) {
      return { endpoint: context.endpoint };
    }

    const endpoint = await InteractionPrompts.input<string>(
      texts.get("INPUT_ENDPOINT"),
      context.endpoint
    );

    return { endpoint };
  }
}
