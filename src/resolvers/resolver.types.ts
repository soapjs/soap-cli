export interface CommandInputResolver<TFlags, TPromptAnswers, TConfig, TResult, TPreset = Partial<TResult>> {
  resolve(input: {
    flags: TFlags;
    promptAnswers?: TPromptAnswers;
    projectConfig?: TConfig;
    preset?: TPreset;
  }): TResult;
}
