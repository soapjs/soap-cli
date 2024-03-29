import { Texts, Config, ApiJson } from "@soapjs/soap-cli-common";
import { Frame } from "@soapjs/soap-cli-interactive";

export class CreateControllerAsDependencyFrame extends Frame<ApiJson> {
  public static NAME = "create_controller_as_dependency_frame";

  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(CreateControllerAsDependencyFrame.NAME);
  }

  public async run(context: any) {
    return null;
  }
}
