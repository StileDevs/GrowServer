import knex from "knex";
import { User } from "../types/database";
import { WorldData, WorldDB } from "../types/world";
import { encrypt } from "../utils/Utils";

export class Database {
  public knex;

  constructor() {
    this.knex = knex({
      client: "mysql2",
      connection: {
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT!),
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DATABASE
      }
    });
  }

  public async getUser(username: string) {
    let res = await this.knex.select("*").from<User>("user").where({ name: username });

    if (res.length) return res[0];
    else return undefined;
  }

  public async saveUserInventory(buf: Buffer, id_user: string) {
    let res = await this.knex("user").where({ id_user }).update({ inventory: buf }, []);

    if (res.length) return true;
    else return undefined;
  }

  public async createUser(username: string, password: string) {
    const encPass = encrypt(password);

    let res = await this.knex("user").insert({ name: username, password: encPass, role: "1" });

    if (res.length) return res[0];
    else return undefined;
  }

  public async getWorld(name: string) {
    let res = await this.knex.select("*").from<WorldData>("worlds").where({ name });

    if (res.length) return res[0];
    else return undefined;
  }

  public async saveWorld({ name, ownedBy = null, blockCount, blocks, width, height }: WorldDB) {
    let res = await this.knex("worlds").insert({
      name: name,
      ownedBy: ownedBy ? ownedBy : null,
      blockCount,
      width,
      height,
      blocks
    });

    if (res.length) return true;
    else return undefined;
  }

  public async updateWorld({ name, ownedBy = null, blockCount, blocks, width, height }: WorldDB) {
    let res = await this.knex("worlds")
      .where({ name })
      .update(
        {
          ownedBy: ownedBy ? ownedBy : null,
          blockCount,
          width,
          height,
          blocks
        },
        []
      );

    if (res.length) return res[0];
    else return undefined;
  }
}
