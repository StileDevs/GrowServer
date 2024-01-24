import { ListenerEventTypes } from "../types/events";
import { BaseServer } from "../structures/BaseServer";

export abstract class Listener<K extends keyof ListenerEventTypes> {
  public name: keyof ListenerEventTypes | undefined;
  public base: BaseServer;

  constructor(base: BaseServer) {
    this.base = base;
    this.name = undefined;
  }

  public run(...args: ListenerEventTypes[K]): void {}
}
