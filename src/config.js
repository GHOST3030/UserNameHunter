//const a0_0xbdec50=a0_0x2892;(function(_0x12a4e6,_0x574af0){const _0x350377=a0_0x2892,_0x308219=_0x12a4e6();while(!![]){try{const _0x178e7c=parseInt(_0x350377(0x7b))/0x1*(parseInt(_0x350377(0x77))/0x2)+-parseInt(_0x350377(0x80))/0x3*(parseInt(_0x350377(0x79))/0x4)+parseInt(_0x350377(0x7f))/0x5*(parseInt(_0x350377(0x7e))/0x6)+-parseInt(_0x350377(0x78))/0x7*(-parseInt(_0x350377(0x7a))/0x8)+-parseInt(_0x350377(0x7c))/0x9+-parseInt(_0x350377(0x76))/0xa+-parseInt(_0x350377(0x7d))/0xb;if(_0x178e7c===_0x574af0)break;else _0x308219['push'](_0x308219['shift']());}catch(_0x4f1573){_0x308219['push'](_0x308219['shift']());}}}(a0_0x20db,0xdbfb7));import a0_0x5a7c7f from'fs';function a0_0x2892(_0x37dbc8,_0x50407b){const _0x20dbaf=a0_0x20db();return a0_0x2892=function(_0x28921c,_0x17ad23){_0x28921c=_0x28921c-0x74;let _0x54a927=_0x20dbaf[_0x28921c];return _0x54a927;},a0_0x2892(_0x37dbc8,_0x50407b);}export const CONFIG_FILE=a0_0xbdec50(0x75);export function loadConfig(){const _0x229cfc=a0_0xbdec50;return JSON[_0x229cfc(0x81)](a0_0x5a7c7f[_0x229cfc(0x74)](CONFIG_FILE,'utf8'));}function a0_0x20db(){const _0x3bc508=['214xzyuDx','11230555wqzOPs','168pPNwaM','8lzPawY','6703zSRcgi','10539846tvnFlX','4069835sMXosq','9572538eQPjgd','5jCgVkJ','32193FKGLXf','parse','readFileSync','./src/config.json','10241810IlgWAd'];a0_0x20db=function(){return _0x3bc508;};return a0_0x20db();}export function LastModified(){return a0_0x5a7c7f['statSync'](CONFIG_FILE)['mtimeMs'];}
import fs from 'fs';
export const CONFIG_FILE = './src/config.json';
export function loadConfig(){

     return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}
export function LastModified(){

  return  fs.statSync(CONFIG_FILE).mtimeMs;
}
