export interface ListenerEventTypes {
  connect: [netID: number];
  raw: [netID: number, data: Buffer];
  disconnect: [netID: number];
}
