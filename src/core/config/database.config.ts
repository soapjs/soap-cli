import { DatabaseConfigJson } from "@soapjs/soap-cli-common";

export type DatabaseMapping = {
  dbType: string;
  codeType: string;
};

export class DatabaseConfig {
  public static create(data: DatabaseConfigJson): DatabaseConfig {
    const mappings: DatabaseMapping[] = [];

    if (data.mappings) {
      data.mappings.forEach((m) => {
        mappings.push({ dbType: m.db_type, codeType: m.code_type });
      });
    }

    return new DatabaseConfig(data.name, data.alias, data.case_style, mappings);
  }

  constructor(
    public readonly name: string,
    public readonly alias: string,
    public readonly caseStyle: string,
    public readonly mappings: DatabaseMapping[]
  ) {}
}
