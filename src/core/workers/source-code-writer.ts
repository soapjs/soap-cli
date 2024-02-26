import { FileOutput } from "@soapjs/soap-cli-common";
import { Transport } from "../transport/transport";

export type SourceCodeWriterState = { path: string; status: string }[];

export class SourceCodeWriter {
  protected outputs = new Set<FileOutput>();
  constructor(protected transport: Transport) {}

  public add(value: FileOutput | FileOutput[]) {
    if (Array.isArray(value)) {
      value.forEach((v) => {
        this.outputs.add(v);
      });
    } else {
      this.outputs.add(value);
    }
    return this;
  }

  public write(): { error?: Error; state: SourceCodeWriterState } {
    try {
      const { transport, outputs } = this;
      const state = [];
      outputs.forEach((out) => {
        const status = transport.writeOutput(out.content, {
          outputPath: out.path,
          write_method: out.write_method,
        });
        state.push({ status, path: out.path });
      });
      return { state };
    } catch (error) {
      return { error, state: [] };
    }
  }
}
