export interface PromptChoice<T extends string> {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean | string;
}

export interface InputQuestion {
  message: string;
  defaultValue?: string;
  required?: boolean;
}

export interface ConfirmQuestion {
  message: string;
  defaultValue?: boolean;
}

export interface SelectQuestion<T extends string> {
  message: string;
  choices: Array<PromptChoice<T>>;
  defaultValue?: T;
}

export interface MultiSelectQuestion<T extends string> {
  message: string;
  choices: Array<PromptChoice<T>>;
  defaultValues?: T[];
  required?: boolean;
}
