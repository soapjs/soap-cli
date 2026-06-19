import { NameVariants } from "./naming";
import { ProjectPlan } from "../commands/create/project-plan";

export interface TemplateContext {
  project: ProjectPlan;
  names: NameVariants;
}
