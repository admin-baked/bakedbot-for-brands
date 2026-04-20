// Mock for @react-pdf/renderer
const React = require('react');

const mockComponent = (name) => function MockPDFComponent(props) {
  return React.createElement('div', { 'data-testid': name, ...props });
};

module.exports = {
  Document: mockComponent('Document'),
  Page: mockComponent('Page'),
  View: mockComponent('View'),
  Text: mockComponent('Text'),
  Image: mockComponent('Image'),
  Link: mockComponent('Link'),
  StyleSheet: {
    create: (styles) => styles,
  },
  Font: {
    register: jest.fn(),
    registerHyphenationCallback: jest.fn(),
  },
  pdf: jest.fn().mockReturnValue({
    toBlob: jest.fn().mockResolvedValue(new Blob()),
    toString: jest.fn().mockResolvedValue(''),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('')),
    toBase64: jest.fn().mockResolvedValue(''),
    updateContainer: jest.fn(),
    isDirty: jest.fn().mockReturnValue(false),
    container: null,
  }),
  renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('')),
  renderToString: jest.fn().mockResolvedValue(''),
  renderToStream: jest.fn().mockReturnValue({ pipe: jest.fn() }),
  usePDF: jest.fn().mockReturnValue([{ loading: false, blob: null, url: null, error: null }, jest.fn()]),
  PDFViewer: mockComponent('PDFViewer'),
  PDFDownloadLink: mockComponent('PDFDownloadLink'),
  BlobProvider: mockComponent('BlobProvider'),
};
