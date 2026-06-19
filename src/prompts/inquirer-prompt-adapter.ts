import { checkbox, confirm, input, select } from "@inquirer/prompts";
import { PromptAdapter } from "./prompt-adapter";
import { ConfirmQuestion, InputQuestion, MultiSelectQuestion, PromptChoice, SelectQuestion } from "./prompt.types";

export class InquirerPromptAdapter implements PromptAdapter {
  async input(question: InputQuestion): Promise<string> {
    return input({
      message: question.message,
      default: question.defaultValue,
      validate: question.required ? (value: string) => value.trim().length > 0 || "Value is required." : undefined,
    });
  }

  async confirm(question: ConfirmQuestion): Promise<boolean> {
    return confirm({
      message: question.message,
      default: question.defaultValue,
    });
  }

  async select<T extends string>(question: SelectQuestion<T>): Promise<T> {
    return select<T>({
      message: question.message,
      choices: question.choices.map(toInquirerChoice),
      default: question.defaultValue,
    });
  }

  async multiSelect<T extends string>(question: MultiSelectQuestion<T>): Promise<T[]> {
    return checkbox<T>({
      message: question.message,
      choices: question.choices.map((choice) => ({
        ...toInquirerChoice(choice),
        checked: question.defaultValues?.includes(choice.value),
      })),
      required: question.required,
    });
  }
}

function toInquirerChoice<T extends string>(choice: PromptChoice<T>): {
  name: string;
  value: T;
  description?: string;
  disabled?: boolean | string;
} {
  return {
    name: choice.label,
    value: choice.value,
    description: choice.description,
    disabled: choice.disabled,
  };
}
