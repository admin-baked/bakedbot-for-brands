
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

const url = 'https://bakedbot.ai/highroad-thailand';
const outputDir = path.join(process.cwd(), 'public', 'assets', 'qr');
const outputPath = path.join(outputDir, 'highroad-thailand.png');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Generating QR code for: ${url}`);

QRCode.toFile(outputPath, url, {
  color: {
    dark: '#0F172A',  // Slate 900 (Brand dark)
    light: '#FFFFFF' // White background
  },
  width: 1024,
  margin: 2
}, function (err) {
  if (err) {
      console.error('Error generating QR code:', err);
      process.exit(1);
  }
  console.log(`QR code generated successfully at ${outputPath}`);
});
