export type CliConfig = {
  headless_mode: boolean;
  override: boolean;
  skip_tests: boolean;
  with_dependencies: boolean;
  batch_size: number;
  thread_count: number;
  transport: string;
};
