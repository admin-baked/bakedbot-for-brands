// Mock for react-syntax-highlighter (ESM deps via refractor)
const React = require('react');

function SyntaxHighlighter({ children, ...props }) {
  return React.createElement('pre', { 'data-testid': 'syntax-highlighter', ...props }, children);
}
SyntaxHighlighter.displayName = 'SyntaxHighlighter';

module.exports = {
  Prism: SyntaxHighlighter,
  Light: SyntaxHighlighter,
  default: SyntaxHighlighter,
};
