import { LanguageConfigJson } from "@soapjs/soap-cli-common";

export class LanguageConfig {
  public static create(data: LanguageConfigJson): LanguageConfig {
    return new LanguageConfig(data.name, data.alias, data.types);
  }

  constructor(
    public readonly name: string,
    public readonly alias: string,
    public readonly types: string[]
  ) {}
}
