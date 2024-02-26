import { RouteModelLabel, WriteMethod } from "@soapjs/soap-cli-common";
import { Config } from "../../../../../core";
import { Model } from "../../new-model";
import { RouteModelFactory } from "../route-model.factory";
import { RouteJson } from "../types";

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
  constructor(
    private config: Config,
    private writeMethod: { component: WriteMethod; dependency: WriteMethod },
    private models: Model[]
  ) {}

  parse(data: RouteJson) {
    const { config, writeMethod, models } = this;
    const { name, endpoint, request } = data;
    const params = QueryParamsTools.extractFromString(request.path);

    if (params.length > 0) {
      const model = RouteModelFactory.create(
        {
          name,
          endpoint,
          method: request.method,
          type: RouteModelLabel.QueryParams,
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
