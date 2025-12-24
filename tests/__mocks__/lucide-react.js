
const React = require('react');

module.exports = new Proxy({}, {
  get: (target, prop) => {
    const Icon = (props) => React.createElement('svg', { ...props, 'data-testid': `icon-${String(prop)}` });
    Icon.displayName = String(prop);
    return Icon;
  }
});
