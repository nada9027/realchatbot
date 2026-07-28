import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT || 3000);
try {
  const envText = await fs.readFile(path.join(root, '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch {}
const defaultConfig = { subject:'과학', grade:'초등학교 6학년', topic:'전기의 작용', goals:'전기 회로의 구성과 직렬·병렬 연결의 차이를 설명할 수 있다.', misconceptions:'전구는 전지의 한쪽에만 연결해도 켜진다; 병렬연결에서는 전류가 한 길로만 흐른다.', stage:'개념 설명과 오개념 교정' };

const systemPrompt = c => `당신은 교실에서 학생이 가르치는 '서툰 학습자' AI 제자다.
수업 설정: 과목=${c.subject}, 학년=${c.grade}, 단원=${c.topic}, 학습목표=${c.goals}. 이번 활동 단계=${c.stage}. 교사가 검토한 대표 오개념=${c.misconceptions}.
규칙: 학생이 먼저 자기 말로 설명하게 기다린다. 정답을 먼저 길게 말하지 않는다. 한 번에 질문 하나만 하고 초등학생 수준의 짧은 한국어를 쓴다. 설명이 부족하면 왜 그런지, 예를 들어 설명할 수 있는지 묻는다. 대표 오개념은 활동 중 최대 1개만 자연스럽게 제시한다. 학생이 근거를 들어 교정하면 틀렸음을 인정하고 배운 내용을 자기 말로 요약한다. 답을 요구해도 먼저 학생의 생각과 근거를 묻고, 막히면 힌트를 한 단계씩 준다. 개인정보, 위험한 행동, 학습목표와 무관한 질문에는 응하지 않고 교사에게 확인하게 한다. 학생을 평가하거나 점수화하지 않는다. 매 응답은 질문하기, 오개념 제시, 이해한 내용 요약, 성찰 유도 중 하나만 수행하고 2~4문장 이내로 답한다.`;

function send(res, status, data, type='application/json') { res.writeHead(status, {'Content-Type':`${type}; charset=utf-8`}); res.end(type==='application/json'?JSON.stringify(data):data); }
async function readBody(req) { let body=''; for await (const chunk of req) body += chunk; return body?JSON.parse(body):{}; }
function demoReply(message, c) { if (!message) return `나는 ${c.topic}을 잘 모르는 학습자야. 먼저 네가 알고 있는 내용을 한 가지씩 설명해 줄래?`; if (message.includes('전지')||message.includes('전구')) return '전구는 전지의 한쪽에만 연결해도 전기가 들어올 것 같아. 내 생각이 맞는지, 전기가 흐르는 길을 그려서 설명해 줄래?'; if (message.includes('직렬')||message.includes('병렬')) return '직렬연결과 병렬연결은 둘 다 전구를 밝히는 방법이니까 완전히 같은 것 같아. 두 연결에서 전기가 흐르는 길은 어떻게 다른지 말해 줄래?'; return `아, 네 설명을 들으니 조금 알 것 같아. 그런데 '${c.goals}'와 관련해서 왜 그런지 예를 하나 들어 줄래?`; }
async function chat(p) { const c={...defaultConfig,...(p.config||{})}; const history=Array.isArray(p.messages)?p.messages.slice(-12):[]; if(!process.env.OPENAI_API_KEY) return {reply:demoReply(history.at(-1)?.content||'',c),demo:true}; const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',input:[{role:'system',content:[{type:'input_text',text:systemPrompt(c)}]},...history.map(m=>({role:m.role==='assistant'?'assistant':'user',content:[{type:'input_text',text:m.content}]}))],max_output_tokens:220})}); const d=await r.json(); if(!r.ok) throw new Error(d.error?.message||'AI 응답을 가져오지 못했습니다.'); return {reply:d.output_text||'음… 다시 한 번 설명해 줄래?',demo:false}; }
async function serve(req,res) { try { if(req.method==='POST'&&req.url==='/api/chat') return send(res,200,await chat(await readBody(req))); const requested=req.url==='/'?'/index.html':req.url; const file=path.normalize(path.join(publicDir,requested)); if(!file.startsWith(publicDir)) return send(res,403,{error:'Forbidden'}); const data=await fs.readFile(file); const ext=path.extname(file); const types={'.html':'text/html','.js':'text/javascript','.css':'text/css'}; send(res,200,data,types[ext]||'application/octet-stream'); } catch(e) { send(res,e.code==='ENOENT'?404:500,{error:e.message}); } }
http.createServer(serve).listen(port,()=>console.log(`AI 제자 교실: http://localhost:${port}`));
