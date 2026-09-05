import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
const root=path.join(process.cwd(),'data');
class Statement {
  constructor(private database:DatabaseSync,private sql:string,private args:any[]=[]){}
  bind(...args:any[]){return new Statement(this.database,this.sql,args);}
  first():any{return this.database.prepare(this.sql).get(...this.args)||null;}
  all(){return {results:this.database.prepare(this.sql).all(...this.args)};}
  run(){const r=this.database.prepare(this.sql).run(...this.args);return {meta:{changes:Number(r.changes)}};}
}
function createRuntime(){
 mkdirSync(root,{recursive:true});mkdirSync(path.join(root,'uploads'),{recursive:true});
 const database=new DatabaseSync(path.join(root,'medlens.sqlite'));
 database.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
 database.exec(`
 CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY,owner TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS patients_owner ON patients(owner);
 CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY,owner TEXT NOT NULL,patient_id TEXT NOT NULL,data TEXT NOT NULL,file_key TEXT,created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS reports_owner_patient ON reports(owner,patient_id);
 CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY,owner TEXT NOT NULL,patient_id TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL,created TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS audit_owner_patient ON audit(owner,patient_id);
 `);
 const DB={prepare:(sql:string)=>new Statement(database,sql),batch:(statements:Statement[])=>{
  database.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.run());database.exec('COMMIT');return results;}catch(e){database.exec('ROLLBACK');throw e;}
 }};
 const filePath=(key:string)=>{
  if(!/^local-user\/[a-f0-9-]+$/.test(key))throw new Error('Invalid file key');
  return path.join(root,'uploads',key.replace('/','_'));
 };
 const BUCKET={
  put:(key:string,bytes:ArrayBuffer,options:any)=>{const p=filePath(key);writeFileSync(p,Buffer.from(bytes));writeFileSync(p+'.json',JSON.stringify(options?.httpMetadata||{}));},
  get:(key:string)=>{const p=filePath(key);if(!existsSync(p))return null;return {body:new Uint8Array(readFileSync(p)),httpMetadata:JSON.parse(readFileSync(p+'.json','utf8'))};},
  delete:(key:string)=>{const p=filePath(key);for(const f of [p,p+'.json'])if(existsSync(f))unlinkSync(f);}
 };
 return {DB,BUCKET};
}
const state=globalThis as typeof globalThis & {medlensStorage?:ReturnType<typeof createRuntime>};
export function localRuntime(){return state.medlensStorage??=(createRuntime());}
