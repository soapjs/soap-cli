import { PromptAdapter } from "./prompt-adapter";
import { ConfirmQuestion, InputQuestion, MultiSelectQuestion, SelectQuestion } from "./prompt.types";

type MockAnswer = string | boolean | string[];

export class MockPromptAdapter implements PromptAdapter {
  private readonly answers: MockAnswer[];

  constructor(answers: MockAnswer[] = []) {
    this.answers = [...answers];
  }

  async input(question: InputQuestion): Promise<string> {
    const answer = this.nextAnswer();

    if (answer === undefined) {
      return question.defaultValue ?? "";
    }

    if (typeof answer !== "string") {
      throw new Error(`Mock prompt answer for "${question.message}" must be a string.`);
    }

    return answer;
  }

  async confirm(question: ConfirmQuestion): Promise<boolean> {
    const answer = this.nextAnswer();

    if (answer === undefined) {
      return question.defaultValue ?? false;
    }

    if (typeof answer !== "boolean") {
      throw new Error(`Mock prompt answer for "${question.message}" must be a boolean.`);
    }

    return answer;
  }

  async select<T extends string>(question: SelectQuestion<T>): Promise<T> {
    const answer = this.nextAnswer();

    if (answer === undefined) {
      if (question.defaultValue !== undefined) {
        return question.defaultValue;
      }

      const firstChoice = question.choices.find((choice) => !choice.disabled);
      if (firstChoice) {
        return firstChoice.value;
      }

      throw new Error(`Mock prompt has no selectable answer for "${question.message}".`);
    }

    if (typeof answer !== "string") {
      throw new Error(`Mock prompt answer for "${question.message}" must be a string.`);
    }

    return answer as T;
  }

  async multiSelect<T extends string>(question: MultiSelectQuestion<T>): Promise<T[]> {
    const answer = this.nextAnswer();

    if (answer === undefined) {
      return [...(question.defaultValues ?? [])] as T[];
    }

    if (!Array.isArray(answer)) {
      throw new Error(`Mock prompt answer for "${question.message}" must be a string array.`);
    }

    return answer as T[];
  }

  private nextAnswer(): MockAnswer | undefined {
    return this.answers.shift();
  }
}
