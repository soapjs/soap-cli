import {
  Config,
  EntityJson,
  ModelJson,
  PropJson,
  RouteResponseJson,
} from "@soapjs/soap-cli-common";
import { Interaction } from "@soapjs/soap-cli-interactive";

export type CreateHandlerOutputResult = {
  output: { props: PropJson[] };
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreateHandlerOutputInteraction extends Interaction<CreateHandlerOutputResult> {
  constructor(protected config: Config) {
    super();
  }
  public async run(context: {
    endpoint?: string;
    response: RouteResponseJson;
  }) {
    const { response } = context;
    const output = { props: [] };

    if (response) {
      if (typeof response === "object") {
        Object.keys(response).forEach((k) => {
          output.props.push({ name: k, type: response[k] });
        });
      } else {
        output.props.push({
          name: "data",
          type: response,
        });
      }
    }

    return { output, entities: [], models: [] };
  }
}
