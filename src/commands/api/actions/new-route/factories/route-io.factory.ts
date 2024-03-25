import { nanoid } from "nanoid";
import {
  AnyType,
  ArrayType,
  ClassData,
  ClassSchema,
  Component,
  Config,
  DataProvider,
  Entity,
  Model,
  MultiType,
  ParamSchema,
  RouteElement,
  RouteIOType,
  RouteModel,
  RouteRequestType,
  RouteResponseType,
  TypeInfo,
} from "@soapjs/soap-cli-common";
import { RouteFactoryInput } from "../types";
import exp from "constants";
import {
  InputToDataParser,
  DefaultGroups,
} from "../../../common/input-to-data.parser";

export class RouteIOFactory {
  public static create(
    data: RouteFactoryInput,
    input: { type: TypeInfo; components: Component[] }[],
    output: { type: TypeInfo; components: Component[] },
    pathParams: RouteModel,
    queryParams: RouteModel,
    requestBody: RouteModel,
    responseBody: RouteModel,
    config: Config
  ): Component<RouteElement> {
    const dependencies = [];

    [pathParams, queryParams, requestBody, responseBody].forEach((dep) => {
      if (dep) {
        dependencies.push(dep);
      }
    });

    input.forEach((i) => {
      dependencies.push(...i.components);
    });

    if (output) {
      dependencies.push(...output.components);
    }

    const {
      id,
      name,
      request: { method },
      endpoint,
      write_method,
    } = data;
    const { defaults } = config.presets.route_io;

    let input_type: TypeInfo;
    const output_type = output?.type;

    if (input.length === 1) {
      input_type = input[0].type;
    } else if (input.length > 1) {
      input_type = ArrayType.create(AnyType.create());
    }

    const addons = {
      input,
      output,
      input_type,
      output_type,
      response_type: RouteResponseType.create(responseBody?.type.name),
      request_type: RouteRequestType.create(
        requestBody?.element?.name,
        pathParams?.element?.name,
        queryParams?.element?.name
      ),
    };

    const parser = new InputToDataParser(config);
    const parsed = parser.parse<ClassData>(
      "route_io",
      data,
      new DefaultGroups(["common", method]),
      { addons }
    );

    const element = ClassSchema.create<RouteElement>(
      new DataProvider(parsed.element),
      write_method,
      config,
      {
        addons,
        dependencies,
      }
    );

    const component = Component.create<RouteElement>(config, {
      id: id || nanoid(),
      type: RouteIOType.create(parsed.element.name, name, method),
      endpoint,
      path: parsed.path,
      writeMethod: write_method,
      addons,
      element,
      dependencies,
    });

    return component;
  }
}
// export class RouteIOFactory {
//   public static create(
//     data: RouteFactoryInput,
//     input: Model | Entity,
//     output: Model | Entity,
//     pathParams: RouteModel,
//     queryParams: RouteModel,
//     requestBody: RouteModel,
//     responseBody: RouteModel,
//     config: Config
//   ): Component<RouteElement> {
//     const dependencies = [];

//     [input, output, pathParams, queryParams, requestBody, responseBody].forEach(
//       (dep) => {
//         if (dep) {
//           dependencies.push(dep);
//         }
//       }
//     );

//     const {
//       id,
//       name,
//       request: { method },
//       endpoint,
//       write_method,
//     } = data;
//     const { defaults } = config.presets.route_io;

//     const addons = {
//       input,
//       output,
//       response: RouteResponseType.create(responseBody.type.name),
//       request: RouteRequestType.create(
//         requestBody?.element?.name,
//         pathParams?.element?.name,
//         queryParams?.element?.name
//       ),
//     };
//     const interfaces = [];
//     const methods = [];
//     const props = [];
//     const generics = [];
//     const imports = [];
//     let inheritance = [];
//     let ctor;
//     let exp;
//     const componentName = config.presets.route_io.generateName(name, {
//       type: method,
//       method,
//     });
//     const componentPath = config.presets.route_io.generatePath({
//       name,
//       type: method,
//       method,
//       endpoint,
//     }).path;

//     if (defaults?.common?.exp) {
//       exp = defaults.common.exp;
//     }

//     if (defaults?.common?.ctor) {
//       ctor = defaults.common.ctor;
//     }

//     if (Array.isArray(defaults?.common?.inheritance)) {
//       inheritance.push(...defaults.common.inheritance);
//     }

//     if (Array.isArray(defaults?.common?.imports)) {
//       defaults.common.imports.forEach((i) => {
//         i.ref_path = componentPath;
//         imports.push(i);
//       });
//     }

//     if (Array.isArray(defaults?.common?.interfaces)) {
//       interfaces.push(...defaults.common.interfaces);
//     }

//     if (Array.isArray(defaults?.common?.methods)) {
//       for (const method of defaults.common.methods) {
//         if (
//           (method.meta?.includes("mapFromRequest") &&
//             !requestBody &&
//             !queryParams &&
//             !pathParams) ||
//           (method.meta?.includes("mapToResponse") && !responseBody)
//         ) {
//           continue;
//         } else {
//           methods.push(method);
//         }
//       }
//     }

//     if (Array.isArray(defaults?.common?.props)) {
//       props.push(...defaults.common.props);
//     }

//     if (Array.isArray(defaults?.common?.generics)) {
//       generics.push(...defaults.common.generics);
//     }

//     if (Array.isArray(defaults?.[method]?.inheritance)) {
//       inheritance.push(...defaults[method].inheritance);
//     }

//     if (Array.isArray(defaults?.[method]?.imports)) {
//       defaults[method].imports.forEach((i) => {
//         i.ref_path = componentPath;
//         imports.push(i);
//       });
//     }

//     if (Array.isArray(defaults?.[method]?.interfaces)) {
//       interfaces.push(...defaults[method].interfaces);
//     }

//     if (Array.isArray(defaults?.[method]?.methods)) {
//       methods.push(...defaults[method].methods);
//     }

//     if (Array.isArray(defaults?.[method]?.props)) {
//       props.push(...defaults[method].props);
//     }

//     if (Array.isArray(data.props)) {
//       props.push(...data.props);
//     }

//     if (Array.isArray(data.methods)) {
//       methods.push(...data.methods);
//     }

//     if (Array.isArray(defaults?.[method]?.generics)) {
//       generics.push(...defaults[method].generics);
//     }

//     const element = ClassSchema.create<RouteElement>(
//       {
//         id,
//         name: componentName,
//         props,
//         methods,
//         interfaces,
//         generics,
//         inheritance,
//         ctor,
//         imports,
//         exp,
//       },
//       write_method,
//       config,
//       {
//         addons,
//         dependencies,
//       }
//     );

//     const component = Component.create<RouteElement>(config, {
//       id: id || nanoid(),
//       type: RouteIOType.create(componentName, name, method),
//       endpoint,
//       path: componentPath,
//       writeMethod: write_method,
//       addons,
//       element,
//       dependencies,
//     });

//     return component;
//   }
// }
