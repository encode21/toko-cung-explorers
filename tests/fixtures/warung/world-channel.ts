/** No realtime client or subscription is started by the isolated preview. */
export const remoteStates = new Map();
export const playerId = "preview-owner";
export const getActiveChannel = () => null;
export function reconnectWorldChannel() {}
export function useWorldChannel() {}
