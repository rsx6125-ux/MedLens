import { z } from 'zod';
export const findingSchema=z.object({name:z.string().min(1).max(160),value:z.string().max(100),unit:z.string().max(60),range:z.string().max(160),date:z.string().max(60),observation:z.string().max(1000),excerpt:z.string().max(2000)});
export type Finding=z.infer<typeof findingSchema>&{id:string;method:string;verified:boolean;original?:z.infer<typeof findingSchema>};
export function rangeStatus(value:string,range:string):'Low'|'Normal'|'High'|'Unknown'{
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))return 'Unknown';
 const v=Number(value),r=range.trim().replace(/[–—]/g,'-');
 const n='([+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))';
 const pair=r.match(new RegExp('^'+n+'\\s*-\\s*'+n+'$'));
 if(pair){const lo=Number(pair[1]),hi=Number(pair[2]);if(lo>hi)return 'Unknown';return v<lo?'Low':v>hi?'High':'Normal';}
 const bound=r.match(new RegExp('^(<=|>=|<|>|≤|≥)\\s*'+n+'$'));
 if(bound){const b=Number(bound[2]);switch(bound[1]){case '<':return v<b?'Normal':'High';case '<=':case '≤':return v<=b?'Normal':'High';case '>':return v>b?'Normal':'Low';default:return v>=b?'Normal':'Low';}}
 return 'Unknown';
}
export function parseReport(text:string):Finding[]{return text.split('\n').flatMap((line)=>{const p=line.split('|').map(x=>x.trim());if(p.length<2||!p[0]||/^(test|test name)$/i.test(p[0]))return [];return [{id:crypto.randomUUID(),name:p[0],value:p[1],unit:p[2]||'',range:p[3]||'',date:p[4]||'',observation:p[5]||'',excerpt:line,method:'Text parser',verified:false}];}).slice(0,200);}
export const patientSchema=z.object({name:z.string().trim().min(1).max(100),age:z.string().refine(s=>s===''||(/^\d+$/.test(s)&&Number(s)<=130),'Age must be between 0 and 130'),sex:z.string().max(40),symptoms:z.string().max(2000),conditions:z.string().max(2000),allergies:z.string().max(2000),medications:z.string().max(2000),notes:z.string().max(3000)});
export type Patient=z.infer<typeof patientSchema>&{id:string;version:number};
export type Report={id:string;patientId:string;name:string;date:string;sourceText:string;hasFile:boolean;method:string;findings:Finding[]};
export function safeSummary(reports:Report[]){const f=reports.flatMap(r=>r.findings.map(x=>({...x,report:r.name})));const out=f.filter(x=>['Low','High'].includes(rangeStatus(x.value,x.range)));return {text:f.length?`${f.length} results are recorded across ${reports.length} report${reports.length===1?'':'s'}. ${out.length} are outside their source report’s reference range. ${f.filter(x=>rangeStatus(x.value,x.range)==='Unknown').length} cannot be classified from the available information. ${f.filter(x=>!x.verified).length} results still need human verification.`:'No test results have been recorded yet.',items:out.map(x=>({id:x.id,text:`${x.name}: ${x.value} ${x.unit} — ${rangeStatus(x.value,x.range).toLowerCase()} against the reported range ${x.range}.`,source:x.report})),method:'Rule-based summary'};}
