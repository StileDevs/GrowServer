import knex from "knex";
import nodemailer, { SentMessageInfo } from 'nodemailer';
import { User } from "../types/database";
import { PeerDataType } from "../types/peer";
import { encode, decode } from 'base-64';
import { WorldData, WorldDB } from "../types/world";
import { encrypt } from "../utils/Utils";

const transporter = nodemailer.createTransport({
  host: 'smtp host',
  port: 465,
  secure: true, // Set to true if using SSL/TLS
  auth: {
    user: 'name@domain.com',
    pass: 'Mail SMTP Password ',
  },
})

export class Database {
  public knex;

  constructor() {
    this.knex = knex({
      client: "better-sqlite3",
      connection: {
        filename: "./data/dev.db"
      },
      log: {
        error(m) {
          console.log(m);
        }
      },
      useNullAsDefault: true
    });
  }

  public async getUser(username: string) {
    let res = await this.knex.select("*").from<User>("users").where({ name: username });
    if (res.length) return res[0];
    else return undefined;
  }

  public async getUsers(id: string, password: string) {
    let res = await this.knex.select("*").from<User>("users").where({ id_user: id, password: password});
    if (res.length) return res[0];
    else return undefined;
  }

  public async saveUser(data: PeerDataType) {
    if (!data.id_user) return;

    let res = await this.knex("users")
      .where({ id_user: data.id_user })
      .update(
        {
          inventory: Buffer.from(JSON.stringify(data.inventory)),
          clothing: Buffer.from(JSON.stringify(data.clothing)),
          gems: data.gems
        },
        []
      );

    if (res.length) return true;
    else return undefined;
  }

  public async createUser(username: string, password: string) {
    const encPass = encrypt(password);
    let res = await this.knex("users").insert({ name: username, password: encPass, role: "1" });
    if (res.length) return res[0];
    else return undefined;
  }

  public async createUsers(username: string, password: string,mail: string) {
    const encPass = encrypt(password);
    let res = await this.knex("users").insert({ name: username, password: encPass,email:mail, role: "1" });
    if (res.length) return res[0];
    else return undefined;
  }

  public async sendmailpass(username: string,newpw: string){
    const user = await this.knex("users").where({ name: username }).first();
    if (!user) {
     return("User not found");
    }
    const codex = encode(user.id_user+","+user.password+","+newpw)
    const mailOptions = {
      from: 'admin@pandaever.me',
      to: `${user.email}`,
      subject: 'Test Email',
      text: `Reset Password Url Is: http://${process.env.WEB_ADDRESS}/resetpass?code=${codex}`
    };
    transporter.sendMail(mailOptions, (error: Error | null, info: nodemailer.SentMessageInfo) => {
      if (error) {
        console.error('Error sending email:', error.message);
        return undefined;
      } else {
        console.log('Email sent:', info.response);
      }
    });    
    return "oke"
  }

  public async updatepass(id: string, password: string){
    const encPass = encrypt(password);
    await this.knex("users").where({ id_user: id }).update({ password: encPass });
    return "oke"
  }

  public async getWorld(name: string) {
    let res = await this.knex.select("*").from<WorldData>("worlds").where({ name });

    if (res.length) return res[0];
    else return undefined;
  }

  public async saveWorld({
    name,
    ownedBy = null,
    blockCount,
    blocks,
    width,
    height,
    owner
  }: WorldDB) {
    if (!name && !blockCount && !blocks && !width && !height) return;

    let res = await this.knex("worlds").insert({
      name: name,
      ownedBy: ownedBy ? ownedBy : null,
      blockCount,
      width,
      height,
      blocks,
      owner
    });

    if (res.length) return true;
    else return undefined;
  }

  public async updateWorld({
    name,
    ownedBy = null,
    blockCount,
    blocks,
    width,
    height,
    owner
  }: WorldDB) {
    if (!name && !blockCount && !blocks && !width && !height) return;

    let res = await this.knex("worlds")
      .where({ name })
      .update(
        {
          ownedBy: ownedBy ? ownedBy : null,
          blockCount,
          width,
          height,
          blocks,
          owner
        },
        []
      );

    if (res.length) return res[0];
    else return undefined;
  }
}
