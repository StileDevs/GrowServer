import { Y_END_DIRT, Y_LAVA_START, Y_START_DIRT } from "../../Constants";
import { Block, WorldData } from "../../types";
import { WorldGen } from "../WorldGen";

export class Default extends WorldGen {
  public data: WorldData;
  public width: number;
  public height: number;
  public blockCount: number;

  constructor(public name: string) {
    super(name);
    this.width = 100;
    this.height = 60;
    this.blockCount = this.height * this.width;

    this.data = {
      name,
      width:       this.width,
      height:      this.height,
      blocks:      [],
      admins:      [], // separate to different table
      playerCount: 0,
      jammers:     [], // separate to different table
      dropped:     {
        // separate (maybe?) to different table
        uid:   0,
        items: []
      },
      weatherId: 41
    };
  }

  public generate(): Promise<void> {
    return new Promise((res, _rej) => {
      // starting points
      let x = 0;
      let y = 0;
      // main door location
      const mainDoorPosition = Math.floor(Math.random() * this.width);

      for (let i = 0; i < this.blockCount; i++) {
        // increase y axis, reset back to 0
        if (x >= this.width) {
          y++;
          x = 0;
        }

        const block: Block = {
          x,
          y,
          fg: 0,
          bg: 0
        };

        if (block.y === Y_START_DIRT - 1 && block.x === mainDoorPosition) {
          block.fg = 6;
          block.door = {
            label:       "EXIT",
            destination: "EXIT"
          };
        } else if (block.y >= Y_START_DIRT) {
          block.fg =
            block.x === mainDoorPosition && block.y === Y_START_DIRT
              ? 8
              : block.y < Y_END_DIRT
                ? block.y >= Y_LAVA_START
                  ? Math.random() > 0.2
                    ? Math.random() > 0.1
                      ? 2
                      : 10
                    : 4
                  : Math.random() > 0.01
                    ? 2
                    : 10
                : 8;
          block.bg = 14;
        }

        this.data.blocks.push(block);

        x++;
      }
      res();
    });
  }
}
