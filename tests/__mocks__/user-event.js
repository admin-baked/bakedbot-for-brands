// Stub mock for @testing-library/user-event (not installed)
const userEvent = {
  setup: jest.fn(() => ({
    click: jest.fn(),
    type: jest.fn(),
    clear: jest.fn(),
    tab: jest.fn(),
    keyboard: jest.fn(),
    selectOptions: jest.fn(),
    hover: jest.fn(),
    unhover: jest.fn(),
    pointer: jest.fn(),
    upload: jest.fn(),
    dblClick: jest.fn(),
    tripleClick: jest.fn(),
    paste: jest.fn(),
  })),
  click: jest.fn(),
  type: jest.fn(),
  clear: jest.fn(),
  tab: jest.fn(),
  keyboard: jest.fn(),
  selectOptions: jest.fn(),
  hover: jest.fn(),
  unhover: jest.fn(),
};

module.exports = userEvent;
module.exports.default = userEvent;
