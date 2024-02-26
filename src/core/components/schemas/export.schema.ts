import { ExportJson } from "@soapjs/soap-cli-common";

export type ExportData = {
  is_default?: boolean;
  use_wildcard?: boolean;
  path?: string;
  list?: string[];
  alias?: string;
};

export class ExportSchema {
  public static create(data: string | boolean | ExportData | ExportJson) {
    if (data === true) {
      return new ExportSchema(false, false, "", [], "");
    }

    if (data === "default") {
      return new ExportSchema(true, false, "", [], "");
    }

    const json = data as Partial<ExportData | ExportJson>;

    return new ExportSchema(
      json.is_default || false,
      json.use_wildcard || false,
      json.path || "",
      json.list || [],
      json.alias || ""
    );
  }

  constructor(
    public readonly isDefault: boolean,
    public readonly useWildcard: boolean,
    public readonly path: string,
    public readonly list: string[],
    public readonly alias: string
  ) {}

  toObject() {
    const {
      isDefault: is_default,
      useWildcard: use_wildcard,
      path,
      list,
      alias,
    } = this;

    return {
      is_default,
      use_wildcard,
      path,
      alias,
      list,
    };
  }
}
