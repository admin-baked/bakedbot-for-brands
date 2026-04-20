// Stub mock for @/server/services/alpine-iq (moved to @/server/integrations/alpine-iq)
module.exports = {
  getLoyaltyProfile: jest.fn(),
  updateLoyaltyPoints: jest.fn(),
  alpineClient: {
    getLoyaltyProfile: jest.fn(),
    updatePoints: jest.fn(),
  },
};
