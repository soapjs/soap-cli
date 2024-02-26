import { ProjectDescription } from "@soapjs/soap-cli-common";

export class ProjectConfig {
  static create(project: ProjectDescription) {
    const {
      language,
      database,
      web_framework,
      service,
      source,
      ioc,
      name,
      author,
      description,
      license,
    } = project;
    return new ProjectConfig(
      language,
      database,
      web_framework,
      service,
      source,
      ioc,
      name,
      author,
      description,
      license
    );
  }

  constructor(
    public readonly language: string,
    public readonly database: string[],
    public readonly web_framework: string,
    public readonly service: string,
    public readonly source: string,
    public readonly ioc: string,
    public readonly name: string,
    public readonly author: string,
    public readonly description: string,
    public readonly license: string
  ) {}
}
