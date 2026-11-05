// Read-only source benchmark. Never loads env, Supabase or Cloudinary.
const sharp=require('sharp'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'../../web/public');
const output=path.resolve(process.argv[2]||'/private/tmp/tramhuong-media-benchmark');fs.mkdirSync(output,{recursive:true});
const sources=['editorial/forest.webp','editorial/ritual.webp','editorial/wood.webp','editorial/preview-ritual.webp','editorial/preview-gallery.webp','editorial/preview-bracelet.webp',
 ...fs.readdirSync(path.join(root,'references/annhien')).filter(n=>/\.(jpg|jpeg)$/i.test(n)).sort().map(n=>'references/annhien/'+n),'placeholder-bracelet.jpg'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=b=>sharp(b).removeAlpha().toColourspace('srgb').raw().toBuffer();
(async()=>{
 const results=[],tiles=[];let index=0;
 for(const source of sources){
  const input=fs.readFileSync(path.join(root,source)),before=hash(input),metadata=await sharp(input).metadata();
  if((metadata.width??0)<400||(metadata.height??0)<400)continue;
  const base=sharp(input,{limitInputPixels:60000000,animated:false}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true});
  const reference=await base.clone().png().toBuffer();
  const start=performance.now(),webp=await base.clone().webp({quality:82,effort:4}).toBuffer(),webpMs=performance.now()-start;
  const avifStart=performance.now(),avif=await base.clone().avif({quality:50,effort:3}).toBuffer(),avifMs=performance.now()-avifStart;
  const thumbnail=await sharp(webp).resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toBuffer();
  const expected=await raw(reference);
  const psnr=async data=>{const actual=await raw(data);assert.equal(actual.length,expected.length);let sum=0;for(let i=0;i<actual.length;i++)sum+=(actual[i]-expected[i])**2;return sum===0?null:Number((10*Math.log10(255**2/(sum/actual.length))).toFixed(2));};
  const target=await sharp(webp).metadata();
  assert.equal(hash(fs.readFileSync(path.join(root,source))),before);
  for(const [column,data] of [reference,webp,avif].entries())tiles.push({input:await sharp(data).resize(240,180,{fit:'contain',background:'#f5f5f5'}).png().toBuffer(),left:column*240,top:index*208+28});
  const label=Buffer.from(`<svg width="720" height="28"><rect width="720" height="28" fill="white"/><text x="8" y="19" font-size="13" font-family="sans-serif">${index+1}. ${source.replace(/[^a-zA-Z0-9/_.-]/g,'')} | Original / WebP82 / AVIF50</text></svg>`);
  tiles.push({input:label,left:0,top:index*208});
  results.push({source,sourceSha256:before,sourceBytes:input.length,sourceFormat:metadata.format,sourceWidth:metadata.width,sourceHeight:metadata.height,targetWidth:target.width,targetHeight:target.height,
   webp82:{bytes:webp.length,encodingMs:Number(webpMs.toFixed(2)),psnr:await psnr(webp)},avif50:{bytes:avif.length,encodingMs:Number(avifMs.toFixed(2)),psnr:await psnr(avif)},thumbnailWebp78Bytes:thumbnail.length,sourceUnchanged:true});
  index++;
 }
 assert.ok(results.length>=10&&results.length<=20);
 await sharp({create:{width:720,height:index*208,channels:3,background:'#ffffff'}}).composite(tiles).png().toFile(path.join(output,'contact-sheet.png'));
 const sum=key=>results.reduce((n,r)=>n+(key==='source'?r.sourceBytes:r[key].bytes),0);
 const report={batch:'P7-01',result:'PASS',samples:results.length,results,totals:{sourceBytes:sum('source'),webp82Bytes:sum('webp82'),avif50Bytes:sum('avif50')},sourceFilesUnchanged:true,remoteRequests:0,uploads:0,cloudinaryTested:false,cwvMeasured:false,decision:'KEEP_EXISTING_STORAGE_CLOUDINARY_DEFERRED_PENDING_AUTHORIZED_CDN_BENCHMARK'};
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,results:undefined}));
})().catch(error=>{console.error(error.message);process.exitCode=1;});
