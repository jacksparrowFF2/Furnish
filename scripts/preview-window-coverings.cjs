const fs=require('node:fs'),path=require('node:path'),root=path.resolve(process.env.FURNISH_VERIFY_ROOT||path.join(__dirname,'..')),dir=path.join(root,'output/window-coverings');fs.mkdirSync(dir,{recursive:true});
const map=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script type="importmap">[\s\S]*?<\/script>/)[0],template=fs.readFileSync(path.join(root,'templates/previews/window-coverings.html'),'utf8');
fs.writeFileSync(path.join(dir,'preview.html'),template.replace('<!--IMPORTMAP-->',map));console.log(path.join(dir,'preview.html'));
