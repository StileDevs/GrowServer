import { WorldData } from "../types";

export abstract class WorldGen {
  public abstract data: WorldData;
  public abstract width: number;
  public abstract height: number;

  constructor(public name: string) {}

  public abstract generate(): Promise<void>;
}
