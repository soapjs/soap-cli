import { PromptAdapter } from "./prompt-adapter";
import { ConfirmQuestion, InputQuestion, MultiSelectQuestion, PromptChoice, SelectQuestion } from "./prompt.types";

type InquirerPrompts = typeof import("@inquirer/prompts");

const importModule = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<InquirerPrompts>;
let prompts: Promise<InquirerPrompts> | undefined;

function loadPrompts(): Promise<InquirerPrompts> {
  prompts ??= importModule("@inquirer/prompts");
  return prompts;
}

export class InquirerPromptAdapter implements PromptAdapter {
  async input(question: InputQuestion): Promise<string> {
    const { input } = await loadPrompts();

    return input({
      message: question.message,
      default: question.defaultValue,
      validate: question.required ? (value: string) => value.trim().length > 0 || "Value is required." : undefined,
    });
  }

  async confirm(question: ConfirmQuestion): Promise<boolean> {
    const { confirm } = await loadPrompts();

    return confirm({
      message: question.message,
      default: question.defaultValue,
    });
  }

  async select<T extends string>(question: SelectQuestion<T>): Promise<T> {
    const { select } = await loadPrompts();

    return select<T>({
      message: question.message,
      choices: question.choices.map(toInquirerChoice),
      default: question.defaultValue,
    });
  }

  async multiSelect<T extends string>(question: MultiSelectQuestion<T>): Promise<T[]> {
    const { checkbox } = await loadPrompts();
    const selected = await checkbox<T>({
      message: question.message,
      choices: question.choices.map((choice) => ({
        ...toInquirerChoice(choice),
        checked: question.defaultValues?.includes(choice.value),
      })),
      required: question.required,
    });

    return normalizeNoneSelection(selected);
  }
}

function normalizeNoneSelection<T extends string>(values: T[]): T[] {
  if (values.length <= 1 || !values.includes("none" as T)) {
    return values;
  }

  return values.filter((value) => value !== "none");
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
