export type TransportStatus =
  | "skipped"
  | "created"
  | "error"
  | "modified"
  | "blank";

export declare abstract class Transport {
  abstract writeOutput(
    data: string,
    options?: TransportOptions
  ): Promise<TransportStatus> | TransportStatus | void;
}

export type TransportOptions = {
  caller?: string;
  [key: string]: unknown;
};
