import { ConfirmQuestion, InputQuestion, MultiSelectQuestion, SelectQuestion } from "./prompt.types";

export interface PromptAdapter {
  input(question: InputQuestion): Promise<string>;
  confirm(question: ConfirmQuestion): Promise<boolean>;
  select<T extends string>(question: SelectQuestion<T>): Promise<T>;
  multiSelect<T extends string>(question: MultiSelectQuestion<T>): Promise<T[]>;
}
