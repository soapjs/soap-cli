import { camelCase, paramCase } from "change-case";
import { Texts } from "@soapjs/soap-cli-common";
import { Interaction, InteractionPrompts } from "@soapjs/soap-cli-interactive";

export type RouteDescription = {
  name?: string;
  path?: string;
  http_method?: string;
  controller?: string;
  handler?: string;
  auth?: { type: string; operation?: string };
  validate?: boolean;
  cors?: boolean;
  limiter?: boolean;
};

type TempRouteDescription = {
  name?: string;
  path?: string;
  http_method?: string;
  controller?: string;
  handler?: string;
  auth?: string;
  auth_operation?: string;
  validate?: string;
  cors?: string;
  limiter?: string;
};

class DescriptionValidation {
  public mustContainName: boolean;
  public mustContainPath: boolean;
  public mustContainController: boolean;
  public mustContainHandler: boolean;
  public mustContainHttpMethod: boolean;

  validate(description: TempRouteDescription) {
    if (this.mustContainName && !description.name) {
      return false;
    }

    if (this.mustContainController && !description.controller) {
      return false;
    }

    if (this.mustContainHandler && !description.handler) {
      return false;
    }

    if (this.mustContainHttpMethod && !description.http_method) {
      return false;
    }

    if (this.mustContainPath && !description.path) {
      return false;
    }

    return true;
  }
}

export class DescribeRouteInteraction extends Interaction<RouteDescription> {
  constructor(private texts: Texts) {
    super();
  }
  public async run(
    context: {
      name?: string;
      controller?: string;
      handler?: string;
      endpoint?: string;
    },
    options?: { skip?: string[] }
  ): Promise<RouteDescription> {
    const { texts } = this;
    const skip = Array.isArray(options?.skip) ? options.skip : [];
    const choices = [];
    const validation = new DescriptionValidation();

    if (skip.includes("name") === false) {
      choices.push({
        name: "name",
        message: texts.get("route_name"),
        hint: texts.get("hint___route_name"),
        initial: context.name || "",
      });
      validation.mustContainName = true;
    }

    if (skip.includes("path") === false) {
      choices.push({
        name: "path",
        message: texts.get("route_path"),
        hint: texts.get("hint___route_path"),
        initial: context.endpoint ? `/${paramCase(context.endpoint)}` : "",
      });
      validation.mustContainPath = true;
    }

    if (skip.includes("http_method") === false) {
      choices.push({
        name: "http_method",
        message: texts.get("route_http_method"),
        initial: "GET",
        hint: texts.get("hint___route_http_method"),
      });
      validation.mustContainHttpMethod = true;
    }

    if (skip.includes("controller") === false) {
      choices.push({
        name: "controller",
        message: texts.get("route_controller"),
        initial: context.controller || context.endpoint,
      });
      validation.mustContainController = true;
    }

    if (skip.includes("handler") === false) {
      choices.push({
        name: "handler",
        message: texts.get("route_handler"),
        hint: texts.get("hint___route_handler"),
        initial:
          context.handler || context.name
            ? camelCase(`get ${context.name}`)
            : "",
      });
      validation.mustContainHandler = true;
    }

    if (skip.includes("auth") === false) {
      choices.push({
        name: "auth",
        message: texts.get("route_auth"),
        initial: "none",
        hint: texts.get("hint___route_auth"),
      });
    }

    if (skip.includes("validate") === false) {
      choices.push({
        name: "validate",
        message: texts.get("route_validate"),
        initial: "false",
        hint: texts.get("hint___route_validate"),
      });
    }

    if (skip.includes("cors") === false) {
      choices.push({
        name: "cors",
        message: texts.get("route_cors"),
        initial: "false",
        hint: texts.get("hint___route_cors"),
      });
    }

    if (skip.includes("limiter") === false) {
      choices.push({
        name: "limiter",
        message: texts.get("route_limiter"),
        initial: "false",
        hint: texts.get("hint___route_limiter"),
      });
    }

    if (skip.includes("auth_operation") === false) {
      choices.push({
        name: "auth_operation",
        message: texts.get("route_auth_operation"),
        initial: "none",
        hint: texts.get("hint___route_auth_operation"),
      });
    }

    let route: TempRouteDescription;

    do {
      route = await InteractionPrompts.form(
        texts.get("route_form_title"),
        choices
      );
    } while (validation.validate(route) === false);

    return {
      name: route.name,
      path: route.path,
      http_method: route.http_method,
      controller: route.controller,
      handler: route.handler,
      validate: route.validate.toLowerCase() === "true",
      cors: route.cors.toLowerCase() === "true",
      limiter: route.limiter.toLowerCase() === "true",
      auth:
        route.auth && route.auth !== "none"
          ? { type: route.auth, operation: route.auth_operation }
          : null,
    };
  }
}
