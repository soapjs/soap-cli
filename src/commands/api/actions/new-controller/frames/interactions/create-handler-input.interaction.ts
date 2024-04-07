import {
  Config,
  EntityJson,
  ModelJson,
  PropJson,
  RouteJson,
  RouteRequestJson,
} from "@soapjs/soap-cli-common";
import { Interaction } from "@soapjs/soap-cli-interactive";
import { PathParamsTools, QueryParamsTools } from "../../../new-route";

export type CreateHandlerInputResult = {
  input: { props: PropJson[] };
  models: ModelJson[];
  entities: EntityJson[];
};

export class CreateHandlerInputInteraction extends Interaction<CreateHandlerInputResult> {
  constructor(protected config: Config) {
    super();
  }
  public async run(context: { endpoint?: string; request: RouteRequestJson }) {
    const { endpoint, request } = context;
    const input = { props: [] };

    if (request) {
      const params = [
        ...PathParamsTools.extractFromString(request.path),
        ...QueryParamsTools.extractFromString(request.path),
      ];
      params.forEach((k) => {
        input.props.push({ name: k, type: "string" });
      });
      if (request.body) {
        if (typeof request.body === "object") {
          Object.keys(request.body).forEach((k) => {
            input.props.push({ name: k, type: request.body[k] });
          });
        } else {
          input.props.push({
            name: "data",
            type: request.body,
          });
        }
      }
    }

    return { input, entities: [], models: [] };
  }
}
