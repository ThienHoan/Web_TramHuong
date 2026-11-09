// Isolated browser with fake auth + intercepted APIs. Never sends requests to
// Supabase/GHN or the real API. No production account/data is used.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function browserRuntime(){
 if(process.env.PLAYWRIGHT_CORE_PATH)return require(process.env.PLAYWRIGHT_CORE_PATH);
 try{return require('playwright-core');}catch{}
 // Reuse an already installed local runtime; never download one for this test.
 const cache=path.join(process.env.LOCALAPPDATA||path.join(require('node:os').homedir(),'AppData','Local'),'npm-cache','_npx');
 if(fs.existsSync(cache))for(const entry of fs.readdirSync(cache)){
  const candidate=path.join(cache,entry,'node_modules','playwright-core');
  if(fs.existsSync(path.join(candidate,'package.json')))return require(candidate);
 }
 throw new Error('Set PLAYWRIGHT_CORE_PATH to an installed playwright-core runtime.');
}
const {chromium}=browserRuntime();
const output=path.join(__dirname,'../.next/shipping-qa');fs.mkdirSync(output,{recursive:true});
const owner='00000000-0000-4000-8000-000000000001',order='00000000-0000-4000-8000-000000000002',warehouse='00000000-0000-4000-8000-000000000003',product='00000000-0000-4000-8000-000000000004';
const user={id:owner,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',app_metadata:{provider:'email'},user_metadata:{full_name:'Fixture Admin'},created_at:new Date().toISOString()};
const profile={id:owner,role:'ADMIN',full_name:'Fixture Admin',email:user.email};
const routePath=path.join(__dirname,'../src/app/[locale]/qa-logistics/[orderId]/page.tsx');
const authPath=path.join(__dirname,'../src/components/providers/AuthProvider.tsx');
const fixture=fs.readFileSync(path.join(__dirname,'fixtures/shipping-ui.fixture'),'utf8');
let authBackup,authModified=false,fixtureCreated=false;
function cleanup(){
 if(fixtureCreated&&fs.existsSync(routePath)&&fs.readFileSync(routePath,'utf8')===fixture){fs.unlinkSync(routePath);for(const dir of [path.dirname(routePath),path.dirname(path.dirname(routePath))])if(fs.existsSync(dir)&&fs.readdirSync(dir).length===0)fs.rmdirSync(dir);}
 if(authModified){const current=fs.readFileSync(authPath,'utf8');const expected=authBackup.toString('utf8').replace('const AuthContext =','export const AuthContext =');if(current===expected)fs.writeFileSync(authPath,authBackup);else fs.writeFileSync(authPath,current.replace('export const AuthContext =','const AuthContext ='));}
}
process.once('SIGINT',()=>{cleanup();process.exit(130);});
(async()=>{let browser;const errors=[],writes=[],chartWarnings=[];let configAttempts=0,shippingEnabled=true,warehouseAvailable=true,quoteFails=false,cartQuantity=1;try{
 if(fs.existsSync(routePath))throw new Error('Fixture route already exists; refusing to overwrite it');
 authBackup=fs.readFileSync(authPath);const authSource=authBackup.toString('utf8');if(!authSource.includes('const AuthContext ='))throw new Error('Unexpected auth context declaration');
 if(!authSource.includes('export const AuthContext =')){fs.writeFileSync(authPath,authSource.replace('const AuthContext =','export const AuthContext ='));authModified=true;}
 fs.mkdirSync(path.dirname(routePath),{recursive:true});fs.writeFileSync(routePath,fixture);fixtureCreated=true;
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'vi-VN',reducedMotion:'reduce',serviceWorkers:'block'});
 if(typeof context.routeWebSocket!=='function')throw new Error('Browser runtime must support blocking remote realtime sockets');
 await context.routeWebSocket('**/*',socket=>socket.close());
 await context.addInitScript(()=>{const stepOne=location.search.includes('view=recipient-guest');localStorage.setItem('checkout_shipping_info',JSON.stringify(stepOne?{name:'Fixture',phone:'0900000000',address:'Fixture street'}:{name:'Fixture',phone:'0900000000',address:'Fixture street',full_address:'Fixture street, Phường Vũng Tàu, Hồ Chí Minh',city:'Hồ Chí Minh',province:'Hồ Chí Minh',ward:'Phường Vũng Tàu',shippingProvinceId:'1000001',shippingWardCode:'1003646'}));if(stepOne){localStorage.setItem('cart',JSON.stringify(location.search.includes('empty=1')?[]:[{key:'fixture-local',id:'00000000-0000-4000-8000-000000000004',productId:'00000000-0000-4000-8000-000000000004',title:'Vòng kiểm thử',price:200000,quantity:1,image:null}]));}});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.hostname==='provinces.open-api.vn'){const p=url.pathname;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(p.includes('/p/')?{districts:[{code:2,name:'Quận kiểm thử'}]}:p.includes('/d/')?{wards:[{code:3,name:'Phường kiểm thử'}]}:[{code:1,name:'Hồ Chí Minh'}])});}
  if(url.hostname.endsWith('.supabase.co')){return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.includes('/auth/')?user:profile)});}
  if(!['localhost','127.0.0.1'].includes(url.hostname))return route.abort();
  if(!url.pathname.startsWith('/api/')){const headers={...request.headers()};delete headers.cookie;return route.continue({headers});}
  let body={};const p=url.pathname;
  if(request.method()!=='GET')writes.push({path:p,body:request.postData()});
  if(p==='/api/admin/shipping'){
   const kind=url.searchParams.get('kind')||'shipment',page=Number(url.searchParams.get('page')||1);
   body={data:kind==='warehouse'?[{id:warehouse,key:`warehouse:${warehouse}`,kind,state:'ACTIVE',version:1,created_at:new Date().toISOString(),data:{name:'Kho kiểm thử',active:true,shopId:123}}]:Array.from({length:page===1?20:1},(_,i)=>({id:`fixture-${page}-${i}`,key:`shipment:staging:${order}`,kind,state:'IN_TRANSIT',order_id:order,version:1,created_at:new Date().toISOString(),data:{trackingCode:`FIXTURE-${page}-${i}`,type:'DELAY',description:'Fixture support'}})),total:kind==='warehouse'?1:21,page,limit:20};
  }else if(p==='/api/admin/shipping/configure'){
   configAttempts++;
   if(configAttempts===1)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Validation failed',errors:['Cấu hình thử bị máy chủ từ chối.']})});
   body={id:warehouse,state:'ACTIVE'};
  }else if(p==='/api/shipping/status')body={enabled:true,checkoutEnabled:shippingEnabled};
  else if(p==='/api/shipping/addresses/provinces')body=[{id:'1000001',name:'Hồ Chí Minh'}];
  else if(p==='/api/shipping/addresses/wards')body=[{id:'1003646',name:'Phường Vũng Tàu'}];
  else if(p==='/api/shipping/warehouses')body=warehouseAvailable?[{id:warehouse,name:'Kho kiểm thử'}]:[];
  else if(p.endsWith('/shifts'))body=[{id:4,title:'Ca lấy kiểm thử hôm nay'}];
  else if(p==='/api/shipping/quote'){
   if(quoteFails)return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'SHIPPING_UNAVAILABLE'})});
   const input=JSON.parse(request.postData()),subtotal=input.items.reduce((s,i)=>s+i.quantity*200000,0),discount=input.voucherCode?10000:0,fee=subtotal>=300000?0:25000;
   body={reference:warehouse,subtotal,voucherDiscount:discount,customerFee:fee,actualFee:25000,total:subtotal-discount+fee,eta:new Date(Date.now()+86400000).toISOString(),expiresAt:new Date(Date.now()+300000).toISOString()};
  }
  else if(p==='/api/vouchers/validate')body={isValid:true,discountAmount:10000,voucher:{code:'TEST10'}};
  else if(p==='/api/orders'&&request.method()==='POST')return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:'Không tạo đơn thật trong kiểm thử.'})});
  else if(p.startsWith('/api/shipping/track/'))body={state:'IN_TRANSIT',trackingCode:'GHN-FIXTURE',eta:new Date(Date.now()+86400000).toISOString(),updatedAt:new Date().toISOString(),milestones:[{state:'PICKUP_PENDING',at:new Date(Date.now()-3600000).toISOString()},{state:'IN_TRANSIT',at:new Date().toISOString()}]};
  else if(p==='/api/shipping/support')body={id:warehouse,state:'OPEN'};
  else if(p.includes('/cart')){if(request.method()==='PATCH')cartQuantity=JSON.parse(request.postData()).quantity;body=[{id:product,cartItemId:product,title:'Vòng kiểm thử',price:200000,original_price:200000,quantity:cartQuantity,image:null,variantId:null}];}
  else if(p.includes('/wishlist'))body=[];
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
 });
 const page=await context.newPage();const settleTop=async()=>{await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>scrollY<2);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&/The width\(|The height\(/.test(m.text()))chartWarnings.push(m.text());});
 await page.goto(`http://localhost:3000/vi/qa-logistics/${order}?view=admin`,{waitUntil:'networkidle',timeout:60000});
 await page.getByRole('heading',{name:'Quản lý giao hàng'}).waitFor({timeout:30000});await page.getByText('FIXTURE-1-0',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Tiếp',exact:true}).click();await page.getByText('FIXTURE-2-0',{exact:true}).waitFor();
 await page.screenshot({path:path.join(output,'admin-desktop.png'),fullPage:true});
 await page.getByLabel('Đơn cần giao',{exact:true}).fill(order);await page.getByRole('button',{name:'Chuẩn bị đơn đã có'}).click();
 await page.getByRole('dialog').waitFor();await page.getByLabel('Tỉnh / thành',{exact:true}).selectOption('1000001');await page.getByLabel('Phường / xã',{exact:true}).selectOption('1003646');await page.getByRole('button',{name:'Kiểm tra và chuẩn bị'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'admin overflow');await page.screenshot({path:path.join(output,'admin-mobile.png'),fullPage:true});
 await page.getByRole('button',{name:'Kho',exact:true}).click();await page.getByRole('button',{name:'Thêm cấu hình',exact:true}).click();
 const configDialog=page.getByRole('dialog');await configDialog.getByLabel('Tên kho',{exact:true}).fill('Kho kiểm thử');await configDialog.getByLabel('GHN ShopId',{exact:true}).fill('123');await configDialog.getByLabel('Mã huyện GHN của kho',{exact:true}).fill('123');await configDialog.getByLabel('Khối lượng vỏ hộp (g)',{exact:true}).fill('12');
 const padding=configDialog.getByLabel('Đệm mỗi bên (cm)',{exact:true});assert.equal(await padding.getAttribute('max'),'20');
 for(const value of ['21','0','1.5']){await padding.fill(value);await configDialog.getByRole('button',{name:'Lưu cấu hình',exact:true}).click();await configDialog.getByText('Nhập số nguyên từ 1 đến 20.',{exact:true}).waitFor();assert.equal(configAttempts,0,'invalid measurement must never reach API');}
 await page.screenshot({path:path.join(output,'configuration-validation-mobile.png'),fullPage:true});
 await padding.fill('20');await configDialog.getByRole('button',{name:'Lưu cấu hình',exact:true}).click();await configDialog.getByText('Cấu hình thử bị máy chủ từ chối.',{exact:true}).waitFor();assert.equal(await configDialog.getByLabel('Tên kho',{exact:true}).inputValue(),'Kho kiểm thử');
 await padding.fill('1');await configDialog.getByRole('button',{name:'Lưu cấu hình',exact:true}).click();await configDialog.waitFor({state:'hidden'});assert.equal(configAttempts,2);assert.equal(JSON.parse(writes.filter(w=>w.path==='/api/admin/shipping/configure')[0].body).paddingCm,20);assert.equal(JSON.parse(writes.filter(w=>w.path==='/api/admin/shipping/configure')[1].body).paddingCm,1);
 await page.setViewportSize({width:1440,height:1000});await page.goto(`http://localhost:3000/vi/qa-logistics/${order}?view=charts`,{waitUntil:'networkidle',timeout:60000});await page.locator('.recharts-surface').nth(1).waitFor();
 for(const size of [{width:1440,height:1000},{width:390,height:844}]){await page.setViewportSize(size);await page.waitForFunction(()=>document.querySelectorAll('.recharts-surface').length===2&&[...document.querySelectorAll('.recharts-surface')].every(e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'chart overflow');await page.screenshot({path:path.join(output,`charts-${size.width}.png`),fullPage:true});}
 assert.equal(chartWarnings.length,0,JSON.stringify(chartWarnings));
 await page.goto(`http://localhost:3000/vi/qa-logistics/${order}?view=tracking`,{waitUntil:'networkidle',timeout:60000});await page.getByRole('heading',{name:'Hành trình đơn hàng'}).waitFor();await page.getByText('GHN-FIXTURE',{exact:true}).waitFor();
 await page.getByLabel('Mô tả vấn đề',{exact:true}).fill('Đơn kiểm thử, không gửi đến hệ thống thật.');await page.getByRole('button',{name:'Gửi yêu cầu hỗ trợ'}).click();await page.getByText('Đã ghi nhận yêu cầu.',{exact:false}).waitFor();
 await page.screenshot({path:path.join(output,'tracking-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.goto(`http://localhost:3000/en/qa-logistics/${order}?view=tracking`,{waitUntil:'networkidle',timeout:60000});await page.getByRole('heading',{name:'Your order’s journey'}).waitFor();await page.getByText('GHN-FIXTURE',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'tracking-zen.png'),fullPage:true});

 await page.goto('http://localhost:3000/vi/qa-logistics/'+order+'?view=recipient-guest',{waitUntil:'networkidle',timeout:60000});
 await page.getByRole('heading',{name:'Thông tin người nhận',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Thanh toán nhanh',exact:true}).count(),0);
 await page.getByLabel('Họ và tên người nhận',{exact:true}).fill('');await page.getByRole('button',{name:'Tiếp tục: giao hàng & thanh toán',exact:true}).click();await page.getByText('Bạn chưa nhập họ tên người nhận.',{exact:true}).waitFor();
 await page.getByLabel('Họ và tên người nhận',{exact:true}).fill('Fixture');await page.getByLabel('Số điện thoại',{exact:true}).fill('0900000000');await page.getByLabel('Số nhà, tên đường',{exact:true}).fill('Fixture street');
 await page.locator('#checkout-voucher').fill('TEST10');await page.getByRole('button',{name:'Áp dụng',exact:true}).click();await page.getByText('TEST10',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Tiếp tục: giao hàng & thanh toán',exact:true}).click();await page.getByText('Chọn tỉnh/thành để tính phí giao hàng.',{exact:true}).waitFor();await page.getByLabel('Tỉnh / thành',{exact:true}).selectOption('1000001');await page.getByLabel('Phường / xã',{exact:true}).selectOption('1003646');
 await page.screenshot({path:path.join(output,'checkout-traditional-details-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Tiếp tục: giao hàng & thanh toán',exact:true}).click();await page.waitForURL('**/vi/checkout/payment_select');const savedRecipient=await page.evaluate(()=>JSON.parse(localStorage.getItem('checkout_shipping_info')));assert.equal(savedRecipient.phone,'+84900000000');assert.equal(savedRecipient.shippingWardCode,'1003646');assert.equal(savedRecipient.full_address,'Fixture street, Phường Vũng Tàu, Hồ Chí Minh');const stepTwo=page.getByRole('region',{name:'Báo giá vận chuyển'});await stepTwo.getByRole('status').waitFor();assert.equal(await stepTwo.getByRole('combobox').count(),0);
 await page.setViewportSize({width:1440,height:1000});await page.goto('http://localhost:3000/en/qa-logistics/'+order+'?view=checkout',{waitUntil:'networkidle',timeout:60000});
 await page.getByRole('button',{name:'Increase Vòng kiểm thử',exact:true}).click();await page.waitForFunction(()=>true);await page.getByRole('button',{name:'Decrease Vòng kiểm thử',exact:true}).click();
 const quantityWrites=writes.filter(w=>w.path.includes('/cart/items/')&&w.body).map(w=>JSON.parse(w.body).quantity);assert.deepEqual(quantityWrites.slice(-2),[2,1]);
 await page.locator('#fullName').fill('Fixture');await page.locator('#phone').fill('0900000000');await page.locator('#address').fill('Fixture street');await page.getByLabel('Province / city',{exact:true}).selectOption('1000001');await page.getByLabel('Ward / commune',{exact:true}).selectOption('1003646');
 await page.screenshot({path:path.join(output,'checkout-zen-details-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Continue to delivery & payment',exact:true}).click();
 const panel=page.getByRole('region',{name:'Shipping quote'});const zenOrder=page.getByRole('button',{name:'Place order · pay on delivery',exact:true});assert(await zenOrder.isDisabled());
 assert.equal(await panel.getByLabel('Origin warehouse',{exact:true}).count(),0);assert.equal(await panel.getByRole('combobox').count(),0);await panel.getByRole('status').waitFor();assert(!(await zenOrder.isDisabled()));await settleTop();await page.screenshot({path:path.join(output,'quote-zen.png'),fullPage:true});await page.setViewportSize({width:375,height:812});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);await settleTop();await page.screenshot({path:path.join(output,'checkout-zen-payment-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
 const zenRequote=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/shipping/quote'&&JSON.parse(r.postData()).paymentMethod==='sepay');await page.getByRole('radio',{name:/Bank transfer/}).check();await zenRequote;const zenSepay=page.getByRole('button',{name:'Place order & view payment QR',exact:true});await panel.getByRole('status').waitFor();
 const zenRequest=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/orders'&&r.method()==='POST');await zenSepay.click();const zenPayload=JSON.parse((await zenRequest).postData());assert.equal(zenPayload.paymentMethod,'sepay');assert.equal(zenPayload.shippingQuoteReference,warehouse);await page.getByText('Không tạo đơn thật trong kiểm thử.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Edit details',exact:true}).click();await page.locator('#phone').fill('0911111111');await page.getByRole('button',{name:'Continue to delivery & payment',exact:true}).click();assert(await zenSepay.isDisabled());
 quoteFails=true;await page.goto('http://localhost:3000/vi/qa-logistics/'+order+'?view=payment',{waitUntil:'networkidle',timeout:60000});const traditional=page.getByRole('region',{name:'Báo giá vận chuyển'});
 assert.equal(await traditional.getByLabel('Kho lấy hàng',{exact:true}).count(),0);assert.equal(await traditional.getByRole('combobox').count(),0);
 await traditional.getByRole('alert').waitFor();assert(await page.getByRole('button',{name:'Đặt hàng · thanh toán khi nhận',exact:true}).isDisabled());
 quoteFails=false;await traditional.getByRole('button',{name:'Tính lại phí giao hàng',exact:true}).click();await traditional.getByRole('status').waitFor();assert(!(await page.getByRole('button',{name:'Đặt hàng · thanh toán khi nhận',exact:true}).isDisabled()));
 await settleTop();await page.screenshot({path:path.join(output,'quote-traditional.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'checkout mobile overflow');await settleTop();await page.screenshot({path:path.join(output,'checkout-traditional-payment-mobile.png'),fullPage:true});
 const sepayRequote=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/shipping/quote'&&JSON.parse(r.postData()).paymentMethod==='sepay');await page.getByRole('radio',{name:/Chuyển khoản ngân hàng/}).check();await sepayRequote;await traditional.getByRole('status').waitFor();
 const sepayRequest=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/orders'&&r.method()==='POST');await page.getByRole('button',{name:'Đặt hàng & xem mã QR',exact:true}).click();const sepayPayload=JSON.parse((await sepayRequest).postData());assert.equal(sepayPayload.paymentMethod,'sepay');assert.equal(sepayPayload.shippingQuoteReference,warehouse);assert.equal(sepayPayload.voucherCode,'TEST10');assert.equal(sepayPayload.shipping_info.city,'Hồ Chí Minh');assert.equal(sepayPayload.shipping_info.address,'Fixture street, Phường Vũng Tàu, Hồ Chí Minh');assert(!Object.hasOwn(sepayPayload.shipping_info,'shipping_fee'));await page.getByText('Không tạo đơn thật trong kiểm thử.',{exact:true}).waitFor();
 await page.getByRole('radio',{name:/Nhận tại cửa hàng/}).check();await traditional.waitFor({state:'hidden'});const pickup=page.getByRole('button',{name:'Đặt hàng nhận tại cửa hàng',exact:true});assert(!(await pickup.isDisabled()));const pickupRequest=page.waitForRequest(r=>new URL(r.url()).pathname==='/api/orders'&&r.method()==='POST');await pickup.click();const pickupPayload=JSON.parse((await pickupRequest).postData());assert.equal(pickupPayload.paymentMethod,'showroom');assert(!pickupPayload.shippingQuoteReference);
 warehouseAvailable=false;await page.goto('http://localhost:3000/vi/qa-logistics/'+order+'?view=payment',{waitUntil:'networkidle',timeout:60000});await page.getByText('Cửa hàng chưa thể báo phí giao hàng.',{exact:false}).waitFor();assert(await page.getByRole('button',{name:'Đặt hàng · thanh toán khi nhận',exact:true}).isDisabled());warehouseAvailable=true;
 shippingEnabled=false;await page.goto('http://localhost:3000/vi/qa-logistics/'+order+'?view=payment',{waitUntil:'networkidle',timeout:60000});assert.equal(await page.getByRole('region',{name:'Báo giá vận chuyển'}).getByRole('combobox').count(),0);assert(!(await page.getByRole('button',{name:'Đặt hàng · thanh toán khi nhận',exact:true}).isDisabled()));
 await page.goto('http://localhost:3000/vi/qa-logistics/'+order+'?view=recipient-guest&empty=1',{waitUntil:'networkidle',timeout:60000});await page.getByRole('heading',{name:'Giỏ hàng đang trống',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Tiếp tục: giao hàng & thanh toán',exact:true}).count(),0);shippingEnabled=true;

 assert(!errors.length,JSON.stringify(errors));assert(writes.some(w=>w.path.includes('/prepare')));assert(writes.some(w=>w.path==='/api/shipping/support'));assert(writes.some(w=>w.path==='/api/shipping/quote'));
 const result={checks:['admin server pagination','existing order preparation','mobile admin layout','client measurement bounds before API','server validation details inside dialog','valid measurement boundaries and retry','charts desktop/mobile without dimension warnings','traditional tracking','support request','Zen tracking','Zen two-level checkout quote','stale quote invalidation','Traditional two-level checkout quote','mobile overflow guard','direct guest recipient form and validation','province and ward required in step one','automatic delivery quote','voucher carried into checkout','absolute Zen quantity controls','payment change invalidates quote','SePay payload and failed-order recovery','showroom quote exemption','unavailable origin blocks order','legacy shipping fallback','empty-cart checkout','Zen checkout at375px'],javascriptErrors:errors,chartWarnings,allApiCallsMocked:true,productionWrites:0};fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(error){const p=browser?.contexts()[0]?.pages()[0];if(p){fs.writeFileSync(path.join(output,'failure.txt'),(await p.locator('body').innerText()).slice(0,6000));fs.writeFileSync(path.join(output,'overflow.json'),JSON.stringify(await p.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,left:e.getBoundingClientRect().left,w:e.getBoundingClientRect().width,position:getComputedStyle(e).position,overflow:getComputedStyle(e).overflowX})).filter(e=>e.right>innerWidth+1||e.w>innerWidth+1)})),null,2));await p.screenshot({path:path.join(output,'failure.png'),fullPage:true});}throw error;}finally{if(browser)await browser.close();cleanup();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
