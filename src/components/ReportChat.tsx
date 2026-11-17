import { BookOpen, Send, Sparkles } from 'lucide-react'
import { evidence } from '../data/evidence'

type Props = { caseId:string; time:string; hours:number; questions:string[]; messages:{q:string;a:string;ref:number}[]; input:string; notice:string; setInput:(v:string)=>void; send:(q:string)=>void; openExpert:(i:number)=>void }
export default function ReportChat({caseId,time,hours,questions,messages,input,notice,setInput,send,openExpert}:Props) {
  return <aside id="report-chat" className="report-chat" aria-label="报告问答">
    <div className="report-chat-header"><span className="chat-avatar"><Sparkles size={19}/></span><div><strong>报告助手</strong><small>{caseId} · {time} · 未来 {hours} 小时</small></div><span className="chat-demo">预设问答</span></div>
    <div className="report-chat-scroll"><div className="assistant-message"><b>你好，我可以帮你阅读这份报告。</b><p>选择一个问题，了解患者数据与相关证据。</p></div><div className="report-suggestions">{questions.map(q=><button key={q} onClick={()=>send(q)}>{q}</button>)}</div>{messages.map((m,i)=><div key={`${m.q}-${i}`} className="exchange"><div className="user-message">{m.q}</div><div className="assistant-message"><p>{m.a}</p><button className="citation-button" onClick={()=>openExpert(m.ref)}><BookOpen size={13}/> 查看{evidence[m.ref].name}依据</button></div></div>)}</div>
    <div className="report-chat-compose"><div className="chat-input"><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send(input)}} placeholder="输入或选择预设问题" aria-label="输入报告问题"/><button onClick={()=>send(input)} aria-label="发送问题"><Send size={16}/></button></div>{notice&&<p className="chat-notice" role="status">{notice}</p>}<small>演示模式 · 回答由预设内容生成</small></div>
  </aside>
}
