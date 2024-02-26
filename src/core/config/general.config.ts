import { CliConfig } from "./cli.config";

export class GeneralConfig {
  public static create(data: CliConfig): GeneralConfig {
    return new GeneralConfig(
      data.headless_mode,
      data.override || false,
      data.skip_tests || false,
      data.with_dependencies || false
    );
  }

  constructor(
    public readonly headlessMode: boolean,
    public readonly override: boolean,
    public readonly skipTests: boolean,
    public readonly withDependencies: boolean
  ) {}
}
