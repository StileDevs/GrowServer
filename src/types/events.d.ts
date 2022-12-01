export interface ListenerEventTypes {
  connect: [netID: number];
  data: [netID: number, data: Buffer];
  disconnect: [netID: number];
}
