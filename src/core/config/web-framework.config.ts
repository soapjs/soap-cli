import { WebFrameworkConfigJaon } from "@soapjs/soap-cli-common";

export class WebFrameworkConfig {
  public static create(data: WebFrameworkConfigJaon): WebFrameworkConfig {
    return new WebFrameworkConfig(data.name, data.alias);
  }

  constructor(
    public readonly name: string,
    public readonly alias: string
  ) {}
}
