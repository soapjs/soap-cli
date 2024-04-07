import {
  AnyType,
  ApiSchema,
  ArrayType,
  ComponentRegistry,
  Config,
  PropJson,
  PropSchema,
  RouteJson,
  RouteModel,
  RouteModelLabel,
  TypeInfo,
  WriteMethod,
} from "@soapjs/soap-cli-common";
import { RouteModelFactory } from "../factories/route-model.factory";
import { ComponentFactory } from "../../../common";
import {
  DependencyResolver,
  WriteMethodsAssignment,
} from "../../../../../core";

type ParseContext = {
  route: string;
  endpoint: string;
  method: string;
  write_method: WriteMethod;
  rank: number;
  type?: RouteModelLabel;
};

export class RequestBodyJsonParser {
  private registry = new ComponentRegistry();

  constructor(
    private config: Config,
    private writeMethods: WriteMethodsAssignment,
    private apiSchema: ApiSchema
  ) {}

  private parseProperty(
    route: string,
    key: string,
    value: any,
    context: ParseContext
  ): { name: string; type: TypeInfo; dependencies: RouteModel[] } {
    let dependencies = [];
    let type;
    const name = Number.isFinite(+key) ? `${route}${key}` : key;

    if (Array.isArray(value)) {
      type = ArrayType.create(AnyType.create());
    } else if (typeof value === "string") {
      type = TypeInfo.create(value, this.config);
    } else if (value && typeof value === "object") {
      // skip route model label in names
      const model = this.parseObject(value, name, route, {
        ...context,
        type: null,
      });
      dependencies.push(model);
      type = model.type;
      this.registry.add(model);
    } else {
      type = AnyType.create();
    }

    return { name: key, type, dependencies };
  }

  private parseObject(
    data: any,
    name: string,
    route: string,
    context: ParseContext
  ): RouteModel {
    const model = RouteModelFactory.create(
      {
        ...context,
        name,
        route,
        props: [],
      },
      this.config
    );

    Object.entries(data).forEach(([key, value]) => {
      const { name, type, dependencies } = this.parseProperty(
        route,
        key,
        value,
        context
      );
      model.element.addProp(
        PropSchema.create({ name, type: type.tag }, this.config, {
          dependencies,
        })
      );
      dependencies.forEach((d) => {
        model.addDependency(d, this.config);
        this.registry.add(d);
      });
    });

    this.resolveAndRegisterDependencies(model, route, context.method);

    return model;
  }

  private resolveAndRegisterDependencies(
    model: RouteModel,
    route: string,
    method: string
  ) {
    model.unresolvedDependencies.forEach((type) => {
      const dependency = RouteModelFactory.create(
        {
          name: type.ref,
          endpoint: model.endpoint,
          type: type.type,
          write_method: this.writeMethods.relatedComponentsMethods.route_model,
          rank: 2,
          route,
          method,
        },
        this.config
      );
      model.addDependency(dependency, this.config);
      this.registry.add(dependency);
    });
  }

  parse(data: RouteJson) {
    let model;
    if (typeof data.request.body === "string") {
      const type = TypeInfo.create(data.request.body, this.config);
      if (type.isComponentType) {
        model = this.apiSchema.get(type);
        if (!model) {
          model = ComponentFactory.create(type, this.config, {
            endpoint: data.endpoint,
            write_method: data.write_method,
            method: data.request.method,
            type: RouteModelLabel.RequestBody,
            alias: type.ref,
            rank: data.rank,
            route: data.name,
          });
        }
      } else {
        model = RouteModelFactory.create(
          {
            name: type.ref,
            route: data.name,
            endpoint: data.endpoint,
            method: data.request.method,
            type: RouteModelLabel.RequestBody,
            alias: type.ref,
            write_method: data.write_method,
            rank: data.rank,
          },
          this.config
        );
      }
      this.resolveAndRegisterDependencies(
        model,
        data.name,
        data.request.method
      );
    } else if (data.request.body && typeof data.request.body === "object") {
      const context: ParseContext = {
        route: data.name,
        endpoint: data.endpoint,
        method: data.request.method,
        write_method: data.write_method,
        rank: data.rank,
        type: RouteModelLabel.RequestBody,
      };

      model = this.parseObject(
        data.request.body,
        data.name,
        data.name,
        context
      );
    }

    return { model, components: this.registry.toArray() };
  }
}
