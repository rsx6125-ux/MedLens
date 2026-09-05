import { localRuntime } from './local-storage';
export function runtime(){return {...localRuntime(),OPENAI_API_KEY:process.env.OPENAI_API_KEY,OPENAI_MODEL:process.env.OPENAI_MODEL};}
export function db(){const d=runtime().DB;if(!d)throw new Error('Storage is unavailable. Please try again.');return d;}
export function identity(req:Request){
 const host=(req.headers.get('host')||new URL(req.url).host).split(':')[0];
 if(!['localhost','127.0.0.1'].includes(host))throw new Error('Local access only. Open http://localhost:3000.');
 if(req.method!=='GET'){
  const origin=req.headers.get('origin');
  if(origin){const parsed=new URL(origin);if(!['localhost','127.0.0.1'].includes(parsed.hostname)||parsed.port!=='3000')throw new Error('Cross-origin request rejected.');}
  if(req.headers.get('sec-fetch-site')==='cross-site')throw new Error('Cross-origin request rejected.');
 }
 return 'local-user';
}
export function reply(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
export function failure(e:unknown){const msg=e instanceof Error?e.message:'';if(msg.includes('Sign in'))return reply({error:msg},401);if(msg.includes('Cross-origin'))return reply({error:msg},403);return reply({error:'The request could not be completed. Check your input and try again.'},400);}
export function auditStatement(owner:string,patient:string,action:string,detail:unknown){return db().prepare('INSERT INTO audit (id,owner,patient_id,action,detail,created) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),owner,patient,action,JSON.stringify(detail),new Date().toISOString());}
export async function ownedPatient(owner:string,id:string){const p=await db().prepare('SELECT * FROM patients WHERE id=? AND owner=?').bind(id,owner).first();if(!p)throw new Error('Patient not found');return p;}

export async function boundedRequest(req:Request,max:number){
 const reader=req.body?.getReader();if(!reader)return req;const chunks:Uint8Array[]=[];let length=0;
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>max){await reader.cancel();throw new Error('Request too large');}chunks.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
 return new Request(req.url,{method:req.method,headers:req.headers,body:bytes});
}
export function conditionalAudit(owner:string,patient:string,action:string,detail:unknown){return db().prepare('INSERT INTO audit (id,owner,patient_id,action,detail,created) SELECT ?,?,?,?,?,? WHERE changes()=1').bind(crypto.randomUUID(),owner,patient,action,JSON.stringify(detail),new Date().toISOString());}
