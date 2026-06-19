import { CreateConfigResult } from "../resolvers/create-config.resolver";

export interface CreatePreset {
  name: string;
  description: string;
  config: Partial<CreateConfigResult>;
}
