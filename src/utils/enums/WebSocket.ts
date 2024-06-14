export const OpCode = {
  HELLO: 1,
  /** Refer to RequestType */
  REQUEST: 2,
  READY: 3,
  /** Refer to BroadcastChannelsType */
  BROADCAST_CHANNELS: 4
};

export const RequestFlags = {
  SUPER_BROADCAST: 1 << 0
};

export const BroadcastChannelsType = {
  SUPER_BROADCAST: 1
};
