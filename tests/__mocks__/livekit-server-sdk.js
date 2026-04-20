// Mock for livekit-server-sdk — avoids ESM parse errors from jose dependency
module.exports = {
  AccessToken: jest.fn().mockImplementation(() => ({
    addGrant: jest.fn(),
    toJwt: jest.fn().mockResolvedValue('mock-livekit-token'),
  })),
  VideoGrant: jest.fn(),
  RoomServiceClient: jest.fn().mockImplementation(() => ({
    createRoom: jest.fn().mockResolvedValue({}),
    deleteRoom: jest.fn().mockResolvedValue({}),
    listRooms: jest.fn().mockResolvedValue([]),
  })),
};
