import {
  Config,
  Model,
  RouteJson,
  RouteModelLabel,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { RouteModelFactory } from "../route-model.factory";

export class PathParamsTools {
  static extractFromString(value: string) {
    const result = [];
    const [pathParams, _] = value.split(/\s*\?\s*/);
    const pathMatches = pathParams?.match(/\:\w+/g);

    if (pathMatches) {
      pathMatches.forEach((match) =>
        result.push(match.replace(/\s*\:\s*/, ""))
      );
    }

    return result;
  }
}

export class PathParamsJsonParser {
  constructor(
    private config: Config,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private models: Model[]
  ) {}

  parse(data: RouteJson) {
    const { config, writeMethod, models } = this;
    const { name, endpoint, request } = data;
    const params = PathParamsTools.extractFromString(request.path);

    if (params.length > 0) {
      const model = RouteModelFactory.create(
        {
          name,
          endpoint,
          method: request.method,
          type: RouteModelLabel.PathParams,
          props: params.map((p) => `${p}: string`),
        },
        writeMethod.dependency,
        config,
        []
      );

      models.push(model);
      return model;
    }
  }
}
