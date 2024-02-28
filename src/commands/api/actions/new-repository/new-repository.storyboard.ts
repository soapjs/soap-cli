import {
  StoryResolver,
  TimelineFrame,
  Storyboard,
  StoryboardSession,
} from "@soapjs/soap-cli-interactive";
import { Config } from "../../../../core";
import { ApiJson } from "../../common/api.types";
import { localSessionPath } from "../../common/consts";
import { CreateEntityAsDependencyFrame } from "../new-entity";
import { CreateModelsAsDependenciesFrame } from "../new-model";
import {
  CreateRepositoryFrame,
  DefineRepositoryNameAndEndpointFrame,
  DescribeRepositoryFrame,
} from "./frames";
import { Texts } from "@soapjs/soap-cli-common";

export class NewRepositoryStoryResolver extends StoryResolver<ApiJson> {
  resolve(timeline: TimelineFrame[]): ApiJson {
    for (const frame of timeline) {
      if (frame.name === CreateRepositoryFrame.NAME) {
        return frame.output;
      }
    }

    return {
      models: [],
      entities: [],
      repositories: [],
    };
  }
}

export class NewRepositoryStoryboard extends Storyboard<ApiJson> {
  constructor(texts: Texts, config: Config, session?: StoryboardSession) {
    super(
      "new_repository_storyboard",
      session ||
        new StoryboardSession("new_repository_storyboard", localSessionPath),
      new NewRepositoryStoryResolver()
    );

    this.addFrame(new DefineRepositoryNameAndEndpointFrame(config, texts))
      .addFrame(new DescribeRepositoryFrame(config, texts), (t) => {
        const { name } = t.getFrame(0).output;
        return { name };
      })
      .addFrame(new CreateEntityAsDependencyFrame(config, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        return { name, endpoint, dependencyOf: "repository" };
      })
      .addFrame(
        new CreateModelsAsDependenciesFrame(config, texts),
        (t) => {
          const { name, endpoint } = t.getFrame(0).output;
          const { contexts } = t.getFrame(1).output;
          const { entities } = t.getFrame(2).output;
          const props = entities.at(-1)?.props || [];

          return {
            name,
            endpoint,
            dependencyOf: "repository",
            types: contexts.map((c) => c.type),
            props,
          };
        },
        (t) => {
          const { databases } = t.getFrame(1).output;
          return databases.length > 0;
        }
      )
      .addFrame(new CreateRepositoryFrame(config, texts), (t) => {
        const { name, endpoint } = t.getFrame(0).output;
        const { entities } = t.getFrame(2).output;
        const { models } = t.getFrame(3).output;
        const { createImplementation, willHaveAdditionalContent, contexts } =
          t.getFrame(1).output;

        const entity = entities.at(-1);

        return {
          name,
          endpoint,
          entity,
          models,
          createImplementation,
          willHaveAdditionalContent,
          contexts,
        };
      });
  }
}
