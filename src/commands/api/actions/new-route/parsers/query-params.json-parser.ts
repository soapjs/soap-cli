import {
  Config,
  RouteJson,
  RouteModelLabel,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { RouteModelFactory } from "../factories/route-model.factory";

export class QueryParamsTools {
  static extractFromString(value: string) {
    const result = [];
    const [_, queryParams] = value.split(/\s*\?\s*/);
    const queryMatches = queryParams?.match(/\w+/g);

    if (queryMatches) {
      queryMatches.forEach((match) => result.push(match));
    }

    return result;
  }
}

export class QueryParamsJsonParser {
  constructor(private config: Config) {}

  parse(data: RouteJson) {
    const { config } = this;
    const { name, endpoint, request } = data;
    const params = QueryParamsTools.extractFromString(request.path);

    if (params.length > 0) {
      return RouteModelFactory.create(
        {
          name,
          route: name,
          endpoint,
          method: request.method,
          type: RouteModelLabel.QueryParams,
          props: params.map((p) => ({ name: p, type: "string" })),
          write_method: data.write_method,
          rank: data.rank,
        },
        config
      );
    }
  }
}
