
import { useEffect, useState } from 'react';
import {
  Activity, Box, Cloud, Home, Image, Layers3,
  Settings, Wifi, WifiOff, RefreshCw, Server
} from 'lucide-react';

const SAVED_URL = localStorage.getItem('comfyui_url') || '';

function cleanUrl(value) {
  return value.trim().replace(/\/+$/, '');
}

export default function App() {
  const [tab, setTab] = useState('Home');
  const [url, setUrl] = useState(SAVED_URL);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverInfo, setServerInfo] = useState(null);

  async function connect(target = url) {
    const address = cleanUrl(target);

    if (!address) {
      setError('กรุณาใส่ ComfyUI URL');
      return;
    }

    try {
      new URL(address);
    } catch {
      setError('URL ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    setLoading(true);
    setError('');
    setConnected(false);
    setServerInfo(null);

    try {
      const response = await fetch(`${address}/system_stats`);

      if (!response.ok) {
        throw new Error(`ComfyUI ตอบกลับ HTTP ${response.status}`);
      }

      const data = await response.json();

      localStorage.setItem('comfyui_url', address);
      setUrl(address);
      setServerInfo(data);
      setConnected(true);
    } catch (e) {
      setError(
        e.message.includes('Failed to fetch')
          ? 'เชื่อมต่อไม่ได้ ตรวจสอบ URL, Pod และการตั้งค่า CORS ของ ComfyUI'
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    setConnected(false);
    setServerInfo(null);
  }

  useEffect(() => {
    if (SAVED_URL) connect(SAVED_URL);
  }, []);

  const nav = [
    ['Home', Home],
    ['Generate', Image],
    ['Models', Layers3],
    ['Queue', Activity],
    ['Settings', Settings]
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><Box /></div>
          <div>
            <b>ComfyUI Mobile</b>
            <small>RunPod GPU Workspace</small>
          </div>
        </div>

        <span className="connected">
          <i />
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </header>

      <main>
        {tab === 'Home' && (
          <section>
            <div className="hero">
              <div>
                <span className="eyebrow">YOUR AI WORKSPACE</span>
                <h1>สร้างภาพได้<br />จากทุกที่</h1>
                <p>เชื่อมต่อ ComfyUI บน RunPod ผ่านมือถือ</p>
              </div>
              <div className="hero-icon"><Cloud size={42} /></div>
            </div>

            {error && <div className="error">{error}</div>}

            <div className="section-heading">
              <h2>Connection Status</h2>
              <button className="small-btn" onClick={() => connect()}>
                <RefreshCw size={14} />
                {loading ? 'กำลังตรวจสอบ…' : 'ตรวจสอบ'}
              </button>
            </div>

            <div className="stats">
              <div className="stat">
                {connected ? <Wifi /> : <WifiOff />}
                <b>{connected ? 'Online' : 'Offline'}</b>
                <small>ComfyUI</small>
              </div>
              <div className="stat">
                <Server />
                <b>{serverInfo ? 'Ready' : 'Waiting'}</b>
                <small>GPU Server</small>
              </div>
              <div className="stat">
                <Activity />
                <b>{connected ? 'API OK' : 'No API'}</b>
                <small>Connection</small>
              </div>
            </div>

            <div className="panel">
              <b>ComfyUI Server</b>
              <p className="hint">
                {url || 'ยังไม่ได้กำหนด URL'}
              </p>

              {connected ? (
                <button className="danger full" onClick={disconnect}>
                  Disconnect
                </button>
              ) : (
                <button
                  className="primary full"
                  onClick={() => setTab('Settings')}
                >
                  ตั้งค่าการเชื่อมต่อ
                </button>
              )}
            </div>

            {connected && (
              <div className="panel">
                <b>Server Information</b>
                <p className="hint">
                  ComfyUI API พร้อมใช้งาน
                </p>
                {serverInfo?.system?.devices?.map((device, index) => (
                  <p className="hint" key={index}>
                    GPU: {device.name || 'Unknown'}
                  </p>
                ))}
              </div>
            )}

            <div className="section-heading">
              <h2>ทางลัด</h2>
            </div>

            <div className="quick-grid">
              <button onClick={() => setTab('Generate')}>
                <Image /> สร้างภาพ
              </button>
              <button onClick={() => setTab('Models')}>
                <Layers3 /> โมเดล
              </button>
            </div>
          </section>
        )}

        {tab === 'Generate' && (
          <Placeholder
            icon={Image}
            title="Generate"
            detail="เตรียมเชื่อมต่อ ComfyUI Workflow สำหรับ Text-to-Image และ Image-to-Image"
          />
        )}

        {tab === 'Models' && (
          <Placeholder
            icon={Layers3}
            title="Model Manager"
            detail="จัดการ Checkpoint, LoRA, VAE และ ControlNet"
          />
        )}

        {tab === 'Queue' && (
          <Placeholder
            icon={Activity}
            title="Queue"
            detail="ติดตามสถานะและความคืบหน้าของงานสร้างภาพ"
          />
        )}

        {tab === 'Settings' && (
          <section>
            <h1>Settings</h1>

            <div className="panel">
              <label>ComfyUI URL</label>

              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://YOUR-POD-ID-8188.proxy.runpod.net"
              />

              <button
                className="primary full"
                onClick={() => connect()}
                disabled={loading}
              >
                {loading ? 'กำลังเชื่อมต่อ…' : 'Connect ComfyUI'}
              </button>

              <p className="hint">
                ใส่ URL ของ ComfyUI จาก RunPod โดยใช้พอร์ต 8188
                ไม่ต้องใส่ RunPod API Key
              </p>

              {error && <div className="error">{error}</div>}
              {connected && (
                <p className="hint">เชื่อมต่อ ComfyUI สำเร็จ</p>
              )}
            </div>

            <div className="panel">
              <b>Storage Policy</b>
              <p className="hint">
                ใช้ Container Disk ชั่วคราวบน RunPod
                ไม่มี Network Volume
                ควรดาวน์โหลดภาพก่อน Terminate Pod
              </p>
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav">
        {nav.map(([name, Icon]) => (
          <button
            className={tab === name ? 'active' : ''}
            key={name}
            onClick={() => setTab(name)}
          >
            <Icon size={19} />
            <small>{name}</small>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Placeholder({ icon: Icon, title, detail }) {
  return (
    <div className="placeholder">
      <div className="placeholder-icon">
        <Icon size={32} />
      </div>
      <h1>{title}</h1>
      <p>{detail}</p>
      <span className="pill">กำลังพัฒนา</span>
    </div>
  );
}
