import {
  TypeInfo,
  Component,
  WriteMethod,
  Config,
} from "@soapjs/soap-cli-common";
import { ModelFactory, EntityFactory, RouteModelFactory } from "../actions";

export class ComponentFactory {
  static create(
    type: TypeInfo,
    config: Config,
    data: {
      endpoint?: string;
      props?: [];
      write_method: WriteMethod;
      method?: string;
      type?: string;
      alias?: string;
    }
  ): Component {
    if (type.isModel) {
      return ModelFactory.create(
        {
          name: type.ref,
          endpoint: data.endpoint,
          type: type.type,
          props: data.props || [],
          write_method: data.write_method,
        },
        config
      );
    } else if (type.isEntity) {
      return EntityFactory.create(
        {
          name: type.ref,
          endpoint: data.endpoint,
          props: data.props || [],
          write_method: data.write_method,
        },
        null,
        config
      );
    } else if (type.isRouteModel) {
      return RouteModelFactory.create(
        {
          name: type.ref,
          endpoint: data.endpoint,
          method: data.method,
          type: data.type,
          alias: type.ref,
          write_method: data.write_method,
        },
        config
      );
    }
  }
}
