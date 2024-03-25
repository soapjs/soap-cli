import {
  Config,
  EntityJson,
  ModelJson,
  PropJson,
  RouteJson,
  Texts,
} from "@soapjs/soap-cli-common";
import { Interaction } from "@soapjs/soap-cli-interactive";
import { PathParamsTools, QueryParamsTools } from "../../../new-route";

export type CreateReturnTypeInteractionResult = {
  input: { props: PropJson[] };
  output: { props: PropJson[] };
  models: ModelJson[];
  entities: EntityJson[];
};

export class ConvertRouteDataToHandlerIoDataInteraction extends Interaction<CreateReturnTypeInteractionResult> {
  constructor(protected config: Config) {
    super();
  }
  public async run(context: { endpoint?: string; route: RouteJson }) {
    const { endpoint, route } = context;
    const input = { props: [] };
    const output = { props: [] };

    if (route?.request) {
      const params = [
        ...PathParamsTools.extractFromString(route.request.path),
        ...QueryParamsTools.extractFromString(route.request.path),
      ];
      params.forEach((k) => {
        input.props.push({ name: k, type: "string" });
      });
      if (route.request.body) {
        if (typeof route.request.body === "object") {
          Object.keys(route.request.body).forEach((k) => {
            input.props.push({ name: k, type: route.request.body[k] });
          });
        } else {
          input.props.push({
            name: "data",
            type: route.request.body,
          });
        }
      }
    }

    if (route?.response) {
      if (typeof route.response === "object") {
        Object.keys(route.response).forEach((k) => {
          output.props.push({ name: k, type: route.response[k] });
        });
      } else {
        output.props.push({
          name: "data",
          type: route.response,
        });
      }
    }

    // TODO: handle additional RouteModels or other types

    return { input, output, entities: [], models: [] };
  }
}
