const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, '..', 'assets', 'logo.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

function render(size, outName) {
  const opts = {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  };
  const resvg = new Resvg(svg, opts);
  const pngData = resvg.render().asPng();
  const out = path.join(__dirname, '..', 'assets', outName);
  fs.writeFileSync(out, pngData);
  console.log('Created', outName, pngData.length, 'bytes');
}

render(128, 'icon128.png');
render(48, 'icon48.png');
render(16, 'icon16.png');
console.log('done');
