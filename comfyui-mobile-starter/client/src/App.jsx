import { useEffect, useState } from 'react';
import { Activity, Box, Cloud, Download, HardDrive, Home, Image, Layers3, Settings, Server, ShieldCheck, Zap } from 'lucide-react';

const API_SECRET = localStorage.getItem('app_secret') || '';
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-app-secret': API_SECRET, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'API request failed');
  return data;
}

export default function App() {
  const [tab, setTab] = useState('Home');
  const [pods, setPods] = useState([]);
  const [error, setError] = useState('');
  const [secret, setSecret] = useState(API_SECRET);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true); setError('');
    try {
      const p = await api('/runpod/pods');
      setPods(Array.isArray(p) ? p : (p.pods || []));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (API_SECRET) refresh(); }, []);

  async function podAction(id, action) {
    try {
      await api(`/runpod/pods/${id}${action === 'terminate' ? '' : `/${action}`}`, { method: action === 'terminate' ? 'DELETE' : 'POST' });
      await refresh();
    } catch (e) { setError(e.message); }
  }

  const nav = [
    ['Home', Home], ['Generate', Image], ['Models', Layers3], ['Queue', Activity], ['Settings', Settings]
  ];
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-icon"><Box /></div><div><b>ComfyUI Mobile</b><small>Powered by RunPod</small></div></div><span className="connected"><i /> RunPod Manager</span></header>
    <main>
      {tab === 'Home' && <section>
        <div className="hero"><div><span className="eyebrow">YOUR AI WORKSPACE</span><h1>สร้างภาพได้<br/>จากทุกที่</h1><p>จัดการ GPU, โมเดล และ ComfyUI ผ่านมือถือ</p></div><div className="hero-icon"><Zap size={42}/></div></div>
        {error && <div className="error">{error}</div>}
        <div className="section-heading"><h2>RunPod Overview</h2><button className="small-btn" onClick={refresh}>{loading ? 'กำลังโหลด…' : 'รีเฟรช'}</button></div>
        <div className="stats"><div className="stat"><Server/><b>{pods.length}</b><small>Pods</small></div><div className="stat"><HardDrive/><b>0</b><small>Network Volumes</small></div><div className="stat"><ShieldCheck/><b>API</b><small>Protected</small></div></div>
        <div className="section-heading"><h2>Pods ของฉัน</h2></div>
        {pods.length === 0 ? <div className="empty"><Cloud size={30}/><b>ยังไม่พบ Pod</b><small>เชื่อมต่อ API Key และตั้งค่า RunPod ก่อน</small></div> : pods.map(p => <article className="pod-card" key={p.id}><div className="row"><div><b>{p.name || p.id}</b><small>{p.id}</small></div><span className="pill">{p.desiredStatus || p.runtime?.uptimeInSeconds ? 'สถานะ Pod' : 'RunPod'}</span></div><div className="row actions"><button onClick={() => podAction(p.id,'start')}>เริ่ม Pod</button><button onClick={() => podAction(p.id,'stop')}>หยุด</button><button className="danger" onClick={() => { if(confirm('ยืนยันลบ Pod? ข้อมูลใน Pod จะถูกลบถาวร')) podAction(p.id,'terminate'); }}>Terminate</button></div></article>)}
        <div className="section-heading"><h2>ทางลัด</h2></div><div className="quick-grid"><button onClick={()=>setTab('Generate')}><Image/>สร้างภาพ</button><button onClick={()=>setTab('Models')}><Download/>จัดการโมเดล</button></div>
      </section>}
      {tab === 'Generate' && <Placeholder icon={Image} title="Generate" detail="Text to Image และ Image to Image จะเชื่อมกับ ComfyUI API ในขั้นถัดไป"/>}
      {tab === 'Models' && <Placeholder icon={Layers3} title="Model Manager" detail="Civitai / Hugging Face / Direct URL และ Download Queue จะเพิ่มในขั้นถัดไป"/>}
      {tab === 'Queue' && <Placeholder icon={Activity} title="Queue" detail="ติดตามงานสร้างภาพและดาวน์โหลดโมเดล"/>}
      {tab === 'Settings' && <section><h1>Settings</h1><div className="panel"><label>App API Secret</label><input type="password" value={secret} onChange={e=>setSecret(e.target.value)} placeholder="ใส่ secret ที่ตั้งไว้ใน server/.env"/><button className="primary full" onClick={()=>{localStorage.setItem('app_secret',secret);location.reload();}}>บันทึกและเชื่อมต่อ</button><p className="hint">Secret นี้ใช้ป้องกัน API ของแอพ ไม่ใช่ RunPod API Key โดยตรง</p></div><div className="panel"><b>Network Volume</b><p className="hint">ใช้ Container Disk แบบชั่วคราวเท่านั้น ไม่สร้าง Network Volume เมื่อ Terminate Pod โมเดลและไฟล์ใน Pod จะถูกลบ ต้องดาวน์โหลดใหม่ในครั้งถัดไป</p></div></section>}
    </main>
    <nav className="bottom-nav">{nav.map(([name, Icon])=><button className={tab===name?'active':''} key={name} onClick={()=>setTab(name)}><Icon size={19}/><small>{name}</small></button>)}</nav>
  </div>;
}
function Placeholder({icon:Icon,title,detail}) { return <div className="placeholder"><div className="placeholder-icon"><Icon size={32}/></div><h1>{title}</h1><p>{detail}</p><span className="pill">กำลังพัฒนา</span></div>; }
