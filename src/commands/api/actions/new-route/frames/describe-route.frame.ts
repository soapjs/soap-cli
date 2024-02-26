import { Texts } from "@soapjs/soap-cli-common";
import { Config } from "../../../../../core";
import {
  DescribeRouteInteraction,
  RouteDescription,
} from "./interactions/describe-route.interaction";
import { Frame } from "@soapjs/soap-cli-interactive";

export class DescribeRouteFrame extends Frame<RouteDescription> {
  public static NAME = "describe_route_frame";
  private interaction: DescribeRouteInteraction;

  constructor(
    protected config: Config,
    protected texts: Texts
  ) {
    super(DescribeRouteFrame.NAME);
    this.interaction = new DescribeRouteInteraction(texts);
  }

  public async run(context: { name: string; endpoint: string }) {
    const { name, endpoint } = context;
    return this.interaction.run({ name, endpoint }, { skip: ["name"] });
  }
}
