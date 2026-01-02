module.exports = {
    JwksClient: jest.fn().mockImplementation(() => ({
        getSigningKey: jest.fn(),
    })),
};
