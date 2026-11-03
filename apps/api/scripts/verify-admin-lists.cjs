// Read-only integration probe. Prints counts/errors, never customer rows or secrets.
require('dotenv').config({quiet:true});
require('ts-node/register');
const {createClient} = require('@supabase/supabase-js');
const {AdminService} = require('../src/admin/admin.service');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(12000)})}});
const admin=new AdminService({getClient:()=>client});
(async()=>{
 const cases=[...['orders','products','categories','users','posts','contacts','vouchers'].map(r=>[r,{}]),
 ['orders',{search:'no-matching-customer'}],['orders',{search:'ab123'}],
 ['products',{search:'trầm'}],['categories',{search:'trầm'}],
 ...['active','scheduled','expired','exhausted','disabled'].map(status=>['vouchers',{status}]),
 ['orders',{from:'2026-01-01',to:'2026-12-31',status:'PAID'}]];
 let failed=0;
 for(const [resource,filters] of cases){
  try{const result=await admin.list(resource,{page:'1',limit:'1',locale:'vi',...filters});console.log(JSON.stringify({resource,filters,total:result.meta.total,valid:Array.isArray(result.data)&&result.data.length<=1}));}
  catch(error){failed++;console.log(JSON.stringify({resource,filters,error:error.message}));}
 }
 try{const counts=await admin.operations();console.log(JSON.stringify({operations:counts}));}catch(error){failed++;console.log(JSON.stringify({operationsError:error.message}));}
 process.exitCode=failed?1:0;
})();
