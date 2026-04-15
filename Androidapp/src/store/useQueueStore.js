import { create } from 'zustand';

export const useQueueStore = create((set) => ({
  activeToken: null,
  queue: [],
  myPosition: 0,
  estimatedWait: 0,
  isMyTurn: false,
  jitsiRoomId: null,
  channelStatus: 'CLOSED',

  setActiveToken: (token) => set({ activeToken: token }),
  clearToken: () => set({ activeToken: null, queue: [], myPosition: 0, estimatedWait: 0, isMyTurn: false, jitsiRoomId: null }),
  updateQueue: (queue) => set({ queue }),
  setMyPosition: (pos) => set({ myPosition: pos }),
  setEstimatedWait: (wait) => set({ estimatedWait: wait }),
  setIsMyTurn: (val) => set({ isMyTurn: val }),
  setJitsiRoomId: (id) => set({ jitsiRoomId: id }),
  setChannelStatus: (status) => set({ channelStatus: status }),
}));
