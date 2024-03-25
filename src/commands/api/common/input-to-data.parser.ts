import {
  Config,
  ExportJson,
  InheritanceJson,
  GenericData,
  GenericDataParser,
  InheritanceData,
  MethodData,
  MethodJson,
  InheritanceDataParser,
  MethodDataParser,
  ConstructorDataParser,
  PropDataParser,
  InterfaceDataParser,
  ImportDataParser,
  FunctionDataParser,
  ExportDataParser,
  ConstructorJson,
  GenericJson,
  ImportJson,
  InterfaceJson,
  PropJson,
  ExportData,
  ConstructorData,
  ImportData,
  InterfaceData,
  PropData,
  ComponentLabel,
  WriteMethod,
} from "@soapjs/soap-cli-common";

type JsonInput = {
  is_abstract?: boolean;
  exp?: string | boolean | ExportJson;
  ctor?: string | ConstructorJson;
  interfaces?: (string | InterfaceJson)[];
  inheritance?: (string | InheritanceJson)[];
  props?: (PropJson | string)[];
  methods?: (MethodJson | string)[];
  generics?: (GenericJson | string)[];
  imports?: (ImportJson | string)[];
  name?: string;
  id?: string;
  type?: string;
  alias?: any;
  meta?: string;
  template?: string;
  layer?: string;
  write_method?: WriteMethod;
  [key: string]: any;
};

type ElementData = {
  is_abstract?: boolean;
  exp?: ExportData;
  ctor?: ConstructorData;
  interfaces?: InterfaceData[];
  inheritance?: InheritanceData[];
  props?: PropData[];
  methods?: MethodData[];
  generics?: GenericData[];
  imports?: ImportData[];
  name?: string;
  id?: string;
  type: string;
  alias?: any;
  meta?: string;
  template?: string;
  write_method?: WriteMethod;
  [key: string]: any;
};

type ComponentData<T = ElementData> = {
  element: T;
  path?: string;
};

export class DefaultGroups {
  constructor(public readonly groups: string[]) {}
}

export class InputToDataParser {
  constructor(protected config: Config) {}

  parse<T>(
    component: ComponentLabel,
    json: JsonInput,
    defaults: DefaultGroups,
    references?: any
  ): ComponentData<T> {
    const { config } = this;
    //
    const interfaces = json.interfaces || [];
    const methods = json.methods || [];
    const props = json.props || [];
    const generics = json.generics || [];
    const imports = json.imports || [];
    const inheritance = json.inheritance || [];
    const tests = json.tests || [];
    let ctor: any = json.ctor;
    let exp: any = json.exp || true;
    let componentName = json.name;
    let componentPath;
    let is_abstract = false;

    if (config.presets[component]) {
      const { elementType } = config.presets[component];

      is_abstract = elementType === "abstract_class";

      componentName = config.presets[component].generateName(json.name, {
        type: json.type,
        layer: json.layer,
      });

      componentPath = config.presets[component].generatePath({
        name: json.name,
        type: json.type,
        layer: json.layer,
        endpoint: json.endpoint,
      }).path;

      for (const group of defaults.groups) {
        const dflts = config.presets[component].defaults?.[group];

        if (!dflts) {
          continue;
        }

        if (dflts.exp) {
          exp = dflts.exp;
        }

        if (dflts.ctor) {
          ctor = dflts.ctor;
        }

        if (Array.isArray(dflts.tests)) {
          tests.push(...dflts.tests);
        }

        if (Array.isArray(dflts.inheritance)) {
          inheritance.push(...dflts.inheritance);
        }

        if (Array.isArray(dflts.imports)) {
          dflts.imports.forEach((i) => {
            i.ref_path = componentPath;
            imports.push(i);
          });
        }

        if (Array.isArray(dflts.interfaces)) {
          interfaces.push(...dflts.interfaces);
        }

        if (Array.isArray(dflts.methods)) {
          methods.push(...dflts.methods);
        }

        if (Array.isArray(dflts.props)) {
          props.push(...dflts.props);
        }

        if (Array.isArray(dflts.generics)) {
          generics.push(...dflts.generics);
        }

        if (Array.isArray(dflts.tests)) {
          tests.push(...dflts.tests);
        }
      }
    }

    return {
      path: componentPath,
      element: {
        name: componentName,
        template: json.template,
        alias: json.alias,
        is_abstract,
        exp: exp ? ExportDataParser.parse(exp) : null,
        inheritance: Array.isArray(inheritance)
          ? inheritance.map(
              (i) => InheritanceDataParser.parse(i, config, references).data
            )
          : [],
        ctor: ctor
          ? ConstructorDataParser.parse(ctor, config, references).data
          : null,
        methods: Array.isArray(methods)
          ? methods.map(
              (i) => MethodDataParser.parse(i, config, references).data
            )
          : [],
        props: Array.isArray(props)
          ? props.map((i) => PropDataParser.parse(i, config, references).data)
          : [],
        generics: Array.isArray(generics)
          ? generics.map(
              (i) => GenericDataParser.parse(i, config, references).data
            )
          : [],
        interfaces: Array.isArray(interfaces)
          ? interfaces.map(
              (i) => InterfaceDataParser.parse(i, config, references).data
            )
          : [],
        imports: Array.isArray(imports)
          ? imports.map(
              (i) => ImportDataParser.parse(i, config, references).data
            )
          : [],
        functions: Array.isArray(json.functions)
          ? json.functions.map(
              (i) => FunctionDataParser.parse(i, config, references).data
            )
          : [],
        tests,
        write_method: json.write_method,
      } as T,
    };
  }
}
