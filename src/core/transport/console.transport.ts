import { Transport } from "./transport";

export class ConsoleTransport implements Transport {
    writeOutput(data: string): void {
        console.log(data);
    }
}
