import { TankPacket } from "growtopia.js";
import { type TileData } from "@growserver/types";
import { Base } from "../core/Base";
import {
  BlockFlags2,
  LockPermission,
  LOCKS,
  TankTypes,
  TileIgnore,
} from "@growserver/const";
import { World } from "../core/World";
import { Peer } from "../core/Peer";

const directions = [
  { x: 0, y: -1 }, // N
  { x: -1, y: 0 }, // W
  { x: 0, y: 1 }, // S
  { x: 1, y: 0 }, //E

  { x: -1, y: -1 }, //NW
  { x: -1, y: 1 }, //SW
  { x: 1, y: -1 }, // NE
  { x: 1, y: 1 }, // SE
];

interface Node {
  x: number;
  y: number;
}

interface FloodFillData {
  s_node: Node;
  max: number;
  width: number;
  height: number;
  blocks: TileData[];
  s_block: TileData;
  base: Base;
  noEmptyAir: boolean;
}

export class Floodfill {
  public totalNodes: Node[] = [];
  public count = 0;

  constructor(public data: FloodFillData) {}

  async exec() {
    const toBeExplored: Node[] = [];
    toBeExplored.push(this.data.s_node);

    // push starting node. Will be "shifted" later
    this.totalNodes.push(this.data.s_node);

    // need 1 extra space for starting node
    while (this.totalNodes.length <= this.data.max + 1) {
      const node = toBeExplored.shift();
      if (!node) break;

      let neighbours = undefined;

      // if (node.x == this.data.s_block.x && node.y == this.data.s_block.y)
      //   neighbours = this.neighbours(node, true);
      // else
      neighbours = this.neighbours(node);

      for (const neighbour of neighbours) {
        if (!this.isConnectedToFaces(neighbour)) continue;

        const block =
          this.data.blocks[neighbour.x + neighbour.y * this.data.width];

        const meta = this.data.base.items.metadata.items.get(
          (block.fg || block.bg).toString(),
        )!;
        if (
          this.totalNodes.find(
            (n) => n.x === neighbour.x && n.y === neighbour.y,
          ) ||
          block.lockedBy ||
          TileIgnore.blockIDsToIgnoreByLock.includes(meta.id || 0) ||
          (this.data.noEmptyAir && !meta.id) ||
          TileIgnore.blockActionTypesToIgnore.includes(meta.type || 0)
        )
          continue;

        // if adding one more nodes means going over the max, we break;
        // +1 on the this.data.max because we need 1 extra space to account for the extra node
        //  (will be deleted at the end of the function)
        // (i prefer clarity over performance in this case) - badewen
        if (this.totalNodes.length + 1 > this.data.max + 1) break;

        toBeExplored.push(neighbour);
        this.totalNodes.push(neighbour);
      }
    }

    this.totalNodes.shift();

    // if (this.data.s_block.lock) return;

    // const nodes: Node[] = [];
    // nodes.push(this.data.s_node);

    // while (this.totalNodes.length <= this.data.max) {
    //   const tempNodes: Node[] = [];

    //   for (const node of nodes) {
    //     const neighbours = this.neighbours(node);

    //     for (const neighbour of neighbours) {
    //       const block =
    //         this.data.blocks[neighbour.x + neighbour.y * this.data.width];

    //       const meta =
    //         this.data.base.items.metadata.items.get((block.fg || block.bg).toString())!;
    //       if (
    //         this.totalNodes.find(
    //           (n) => n.x === neighbour.x && n.y === neighbour.y
    //         ) ||
    //         block.lock ||
    //         block.lockedBy ||
    //         block.worldLockData ||
    //         TileIgnore.blockIDsToIgnoreByLock.includes(meta.id || 0) ||
    //         (this.data.noEmptyAir &&
    //           (!meta.id ||
    //             TileIgnore.blockActionTypesToIgnore.includes(meta.type || 0)))
    //       )
    //         continue;

    //       tempNodes.push(neighbour);
    //       this.totalNodes.push(neighbour);

    //       if (this.totalNodes.length >= this.data.max - 1) break;
    //     }
    //   }

    //   if (nodes.length < 1) break;
    //   nodes.shift();

    //   for (const node of tempNodes) nodes.push(node);
    // }
  }

  private neighbours(node: Node, discoverCorner: boolean = false): Node[] {
    const nodes: Node[] = [];

    for (let i = 0; i < directions.length; i++) {
      const x = node.x + directions[i].x;
      const y = node.y + directions[i].y;

      if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height)
        continue;

      const block = this.data.blocks[x + y * this.data.width];

      if (block.lockedBy) continue;

      if (i >= directions.length / 2 && !discoverCorner) {
        break;
      }

      if (block) nodes.push({ x, y });
    }

    return nodes;
  }

  public isConnectedToFaces(node: Node) {
    let res = false;
    for (let i = 0; i < 4; i++) {
      const x = node.x + directions[i].x;
      const y = node.y + directions[i].y;
      const block = this.data.blocks[y * this.data.width + x];

      if (x < 0 || x >= this.data.width || y < 0 || y >= this.data.height)
        continue;

      // check if the neighbouring block has the same parent
      if (
        block.lockedBy &&
        block.lockedBy.parentX == node.x &&
        block.lockedBy.parentY == node.y
      ) {
        return true;
      }

      res = !!this.totalNodes.find(
        (i) => i.x === x && i.y === y,
        // (i.x == this.data.s_block.x && i.y == this.data.s_block.y)
      );
      if (res) break;
    }

    return res;
  }

  public async apply(world: World, owner: Peer) {
    const buffer = Buffer.alloc(this.data.max * 2);
    let pos = 0;
    const lockData = LOCKS.find((v) => v.id == this.data.s_block.fg);

    if (!this.data.s_block.lock) {
      this.data.s_block.lock = {
        // ownerFg: this.data.s_block.fg,
        ownerUserID:    owner.data?.userID,
        // ownerName: owner.name,
        // ownerX: this.data.s_block.x,
        // ownerY: this.data.s_block.y,
        // isOwner: true,
        adminLimited:   false,
        ignoreEmptyAir: this.data.noEmptyAir,
        adminIDs:       [],
        permission:     lockData?.defaultPermission ?? LockPermission.NONE, // the lock itself can only be destroyed by the owner
        ownedTiles:     [],
      };
    }

    let i = 0;

    for (const node of this.totalNodes) {
      if (i >= this.data.max) break;
      if (node.x === this.data.s_block.x && node.y === this.data.s_block.y)
        continue;

      const b_pos = node.x + node.y * this.data.width;
      const block = world.data.blocks[b_pos];

      this.data.s_block.lock.ownedTiles?.push(b_pos);

      block.lockedBy = {
        // ownerFg: this.data.s_block.fg,
        //ownerUserID: owner.data.id,
        parentX: this.data.s_block.x,
        parentY: this.data.s_block.y,
        //adminIDs: [],
      };

      buffer.writeUInt16LE(b_pos, pos);
      pos += 2;

      i++;
    }

    world.saveToCache();

    const tank = TankPacket.from({
      type:        TankTypes.SEND_LOCK,
      netID:       owner.data?.userID as number,
      targetNetID: this.data.max,
      info:        this.data.s_block.fg,
      xPunch:      this.data.s_block.x,
      yPunch:      this.data.s_block.y,
      data:        () => buffer,
    });

    world.every((p) => {
      p.send(tank);
    });
  }
}
