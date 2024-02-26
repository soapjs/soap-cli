import { ImportData, ImportSchema } from "./import.schema";
import { TypeInfo } from "../../type.info";
import { MethodSchema } from "./method.schema";
import { PropSchema } from "./prop.schema";
import {
  TestCaseSchemaObject,
  TestSuiteSchemaObject,
} from "@soapjs/soap-cli-common";

export type TestGroupData = {
  name: string;
  is_async?: boolean;
};

export type TestCaseData = {
  group: TestGroupData;
  name: string;
  is_async: boolean;
  prompt?: string;
  methods?: MethodSchema[];
  props?: PropSchema[];
  template?: string;
};

export type TestSuiteData = {
  name: string;
  is_async?: boolean;
  type: "unit_tests" | string; //temp soultion
  endpoint?: string;
  template?: string;
  id?: string;
};

export class TestSuiteSchema {
  public static create<T>(data: TestSuiteData): T {
    if (!data) {
      return null;
    }

    const suite = new TestSuiteSchema(
      data.name,
      (<TestSuiteData>data).template
    );

    return suite as T;
  }

  private __imports: ImportSchema[] = [];
  private __tests: TestCaseSchema[] = [];

  private constructor(
    public readonly name: string,
    private template: string
  ) {}

  addImport(impt: ImportSchema) {
    if (this.hasImport(impt) === false) {
      this.__imports.push(impt);
    }
  }

  findImport(data: ImportData) {
    const { list, ...rest } = data;
    const restKeys = Object.keys(rest);

    return this.__imports.find((impt) => {
      const found =
        Array.isArray(list) && list.length > 0
          ? impt.list.some((i) => list.includes(i))
          : true;

      for (const key of restKeys) {
        const k = impt[key];
        if (k && k !== rest[key]) {
          return false;
        }
      }
      return found;
    });
  }

  hasImport(impt: ImportData) {
    const { dflt, path, alias, list } = impt;

    return (
      this.__imports.findIndex(
        (p) =>
          p.path === path &&
          p.alias === alias &&
          p.dflt === dflt &&
          list.every((i) => p.list.includes(i))
      ) > -1
    );
  }

  get imports() {
    return [...this.__imports];
  }

  addTest(test: TestCaseSchema) {
    if (this.hasTest(test.name) === false) {
      this.__tests.push(test);
    }
  }

  findTest(name: string) {
    return this.__tests.find((p) => p.name === name);
  }

  hasTest(name: string) {
    return this.__tests.findIndex((p) => p.name === name) !== -1;
  }

  get tests() {
    return [...this.__tests];
  }

  toObject(): TestSuiteSchemaObject {
    const { name, __tests, __imports, template } = this;

    const cls: TestSuiteSchemaObject = {
      name,
      tests: __tests.map((i) => i.toObject()),
      imports: __imports.map((i) => i.toObject()),
      template,
    };

    return cls;
  }

  listTypes() {
    const types: TypeInfo[] = [];

    return types.reduce((list: TypeInfo[], current: TypeInfo) => {
      const keys = Object.keys(current);
      if (
        list.findIndex((i) => {
          for (const key of keys) {
            if (i[key] !== current[key]) {
              return false;
            }
          }
          return true;
        }) === -1
      ) {
        list.push(current);
      }
      return list;
    }, []);
  }
}

export class TestCaseSchema {
  public static create<T>(data: TestCaseData): T {
    if (!data) {
      return null;
    }

    const test = new TestCaseSchema(
      data.group.name,
      data.name,
      data.is_async,
      data.methods || [],
      data.props || [],
      data.template
    );

    return test as T;
  }

  private constructor(
    public readonly group: string,
    public readonly name: string,
    public readonly is_async: boolean,
    private methods: MethodSchema[],
    private props: PropSchema[],
    private template: string
  ) {}

  toObject(): TestCaseSchemaObject {
    const { name, methods, group, is_async, props, template } = this;

    const cls: TestCaseSchemaObject = {
      group,
      name,
      is_async,
      methods: methods.map((i) => i.toObject()),
      props: props.map((i) => i.toObject()),
      template,
    };

    return cls;
  }

  listTypes() {
    const { props, methods } = this;
    const types: TypeInfo[] = [];

    props.forEach((p) => {
      types.push(...p.listTypes());
    });

    methods.forEach((m) => {
      types.push(...m.listTypes());
    });

    return types.reduce((list: TypeInfo[], current: TypeInfo) => {
      const keys = Object.keys(current);
      if (
        list.findIndex((i) => {
          for (const key of keys) {
            if (i[key] !== current[key]) {
              return false;
            }
          }
          return true;
        }) === -1
      ) {
        list.push(current);
      }
      return list;
    }, []);
  }
}
