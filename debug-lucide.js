
const LucideIcons = require('lucide-react');

const keys = Object.keys(LucideIcons);
console.log('Total keys:', keys.length);
console.log('Sample keys:', keys.slice(0, 10));
console.log('Has "message-circle"?', keys.includes('message-circle'));
console.log('Has "MessageCircle"?', keys.includes('MessageCircle'));
console.log('Has "layout-dashboard"?', keys.includes('layout-dashboard'));
console.log('Has "LayoutDashboard"?', keys.includes('LayoutDashboard'));
