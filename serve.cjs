const {createServer}=require('node:http');
const {readFile}=require('node:fs/promises');
const {join}=require('node:path');
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/brand.css':'brand.css','/app.js':'app.js','/melodies.js':'melodies.js','/assets/logo-128.webp':'assets/logo-128.webp'};
const types={html:'text/html',css:'text/css',js:'text/javascript',webp:'image/webp'};
createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname.replace(/^\/one-button-band(?=\/)/,'');const file=files[pathname];if(!file){res.writeHead(404);return res.end('Not found');}try{res.writeHead(200,{'Content-Type':types[file.split('.').pop()]});res.end(await readFile(join(__dirname,file)));}catch{res.writeHead(500);res.end('Unable to load file');}}).listen(4174,'127.0.0.1',()=>console.log('One-Button Band: http://127.0.0.1:4174/'));
