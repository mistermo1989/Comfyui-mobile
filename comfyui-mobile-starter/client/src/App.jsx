import { useEffect, useState, useCallback } from 'react';
import {
  Activity, Box, Cloud, Home, Image, Layers3,
  Settings, Wifi, WifiOff, RefreshCw, Server,
  Play, Download, Clock, CheckCircle, AlertCircle
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

  const [checkpoints, setCheckpoints] = useState([]);
  const [loras, setLoras] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const [checkpoint, setCheckpoint] = useState('');
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState(
    'low quality, blurry, distorted, deformed'
  );
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(7);
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [seed, setSeed] = useState(-1);
  const [selectedLora, setSelectedLora] = useState('');
  const [loraStrength, setLoraStrength] = useState(0.8);

  const [generating, setGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState('');
  const [queue, setQueue] = useState({ running: [], pending: [] });
  const [gallery, setGallery] = useState([]);

  const api = useCallback(async (path, options = {}) => {
    if (!url) throw new Error('กรุณาตั้งค่า ComfyUI URL');

    const response = await fetch(`${cleanUrl(url)}${path}`, options);

    if (!response.ok) {
      throw new Error(`ComfyUI HTTP ${response.status}`);
    }

    return response;
  }, [url]);

  async function connect(target = url) {
    const address = cleanUrl(target);

    if (!address) {
      setError('กรุณาใส่ ComfyUI URL');
      return;
    }

    try {
      new URL(address);
    } catch {
      setError('URL ไม่ถูกต้อง');
      return;
    }

    setLoading(true);
    setError('');
    setConnected(false);

    try {
      const response = await fetch(`${address}/system_stats`);
      if (!response.ok) {
        throw new Error(`ComfyUI HTTP ${response.status}`);
      }

      const data = await response.json();

      localStorage.setItem('comfyui_url', address);
      setUrl(address);
      setServerInfo(data);
      setConnected(true);
    } catch (e) {
      setError(
        e.message.includes('Failed to fetch')
          ? 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบ URL, Pod และ CORS'
          : e.message
      );
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    setConnected(false);
    setServerInfo(null);
    setCheckpoints([]);
    setLoras([]);
    setQueue({ running: [], pending: [] });
  }

  const loadModels = useCallback(async () => {
    if (!connected) return;

    setModelsLoading(true);
    setError('');

    try {
      const [checkpointResponse, loraResponse] = await Promise.all([
        api('/models/checkpoints'),
        api('/models/loras')
      ]);

      const checkpointData = await checkpointResponse.json();
      const loraData = await loraResponse.json();

      setCheckpoints(Array.isArray(checkpointData) ? checkpointData : []);
      setLoras(Array.isArray(loraData) ? loraData : []);

      if (checkpointData?.length && !checkpoint) {
        setCheckpoint(checkpointData[0]);
      }
    } catch (e) {
      setError(`ดึงรายการโมเดลไม่สำเร็จ: ${e.message}`);
    } finally {
      setModelsLoading(false);
    }
  }, [connected, api, checkpoint]);

  const loadQueue = useCallback(async () => {
    if (!connected) return;

    try {
      const response = await api('/queue');
      const data = await response.json();

      setQueue({
        running: data.queue_running || [],
        pending: data.queue_pending || []
      });
    } catch (e) {
      console.log('Queue:', e.message);
    }
  }, [connected, api]);

  useEffect(() => {
    if (SAVED_URL) connect(SAVED_URL);
  }, []);

  useEffect(() => {
    if (connected) loadModels();
  }, [connected]);

  useEffect(() => {
    if (!connected || tab !== 'Queue') return;

    loadQueue();
    const timer = setInterval(loadQueue, 3000);
    return () => clearInterval(timer);
  }, [connected, tab, loadQueue]);

  function makeWorkflow() {
    const workflow = {
      '1': {
        class_type: 'CheckpointLoaderSimple',
        inputs: { ckpt_name: checkpoint }
      },
      '2': {
        class_type: 'CLIPTextEncode',
        inputs: { text: prompt, clip: ['1', 1] }
      },
      '3': {
        class_type: 'CLIPTextEncode',
        inputs: { text: negativePrompt, clip: ['1', 1] }
      },
      '4': {
        class_type: 'EmptyLatentImage',
        inputs: {
          width: Number(width),
          height: Number(height),
          batch_size: 1
        }
      },
      '5': {
        class_type: 'KSampler',
        inputs: {
          seed: Number(seed) < 0 ? Math.floor(Math.random() * 999999999999999) : Number(seed),
          steps: Number(steps),
          cfg: Number(cfg),
          sampler_name: 'euler',
          scheduler: 'normal',
          denoise: 1,
          model: selectedLora ? ['6', 0] : ['1', 0],
          positive: ['2', 0],
          negative: ['3', 0],
          latent_image: ['4', 0]
        }
      },
      '7': {
        class_type: 'VAEDecode',
        inputs: {
          samples: ['5', 0],
          vae: ['1', 2]
        }
      },
      '8': {
        class_type: 'SaveImage',
        inputs: {
          filename_prefix: 'ComfyUI-Mobile',
          images: ['7', 0]
        }
      }
    };

    if (selectedLora) {
      workflow['6'] = {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: selectedLora,
          strength_model: Number(loraStrength),
          strength_clip: Number(loraStrength),
          model: ['1', 0],
          clip: ['1', 1]
        }
      };
      workflow['2'].inputs.clip = ['6', 1];
      workflow['3'].inputs.clip = ['6', 1];
    }

    return workflow;
  }

  async function generateImage() {
    if (!connected) {
      setError('กรุณา Connect ComfyUI ก่อน');
      setTab('Settings');
      return;
    }

    if (!checkpoint) {
      setError('ไม่พบ Checkpoint กรุณาตรวจสอบโมเดลใน Pod');
      setTab('Models');
      return;
    }

    if (!prompt.trim()) {
      setError('กรุณาใส่ Prompt ก่อนสร้างภาพ');
      return;
    }

    setGenerating(true);
    setError('');
    setGenerationMessage('กำลังส่ง Workflow ไปยัง ComfyUI...');

    try {
      const response = await api('/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: makeWorkflow(),
          client_id: 'comfyui-mobile'
        })
      });

      const result = await response.json();

      if (!result.prompt_id) {
        throw new Error(
          result.error?.message || 'ComfyUI ไม่ได้ส่ง Prompt ID กลับมา'
        );
      }

      setGenerationMessage('ส่งงานแล้ว กำลังรอภาพ...');
      await waitForImage(result.prompt_id);
    } catch (e) {
      setError(`สร้างภาพไม่สำเร็จ: ${e.message}`);
      setGenerationMessage('');
    } finally {
      setGenerating(false);
      loadQueue();
    }
  }

  async function waitForImage(promptId) {
    const base = cleanUrl(url);

    for (let attempt = 0; attempt < 240; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const response = await fetch(`${base}/history/${promptId}`);
      if (!response.ok) continue;

      const history = await response.json();
      const job = history[promptId];

      if (job?.outputs) {
        const images = [];

        Object.values(job.outputs).forEach(output => {
          (output.images || []).forEach(image => {
            images.push({
              ...image,
              promptId,
              url: `${base}/view?filename=${encodeURIComponent(image.filename)}&subfolder=${encodeURIComponent(image.subfolder || '')}&type=${encodeURIComponent(image.type || 'output')}`
            });
          });
        });

        if (images.length) {
          setGallery(old => [...images, ...old]);
          setGenerationMessage('สร้างภาพสำเร็จแล้ว!');
          setTab('Generate');
          return;
        }
      }

      setGenerationMessage(`กำลังสร้างภาพ... (${Math.round((attempt + 1) * 1.5)} วินาที)`);
    }

    throw new Error('หมดเวลารอภาพ กรุณาตรวจสอบ Queue ใน ComfyUI');
  }

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
        {error && (
          <div className="error">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError('')}>ปิด</button>
          </div>
        )}

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

            <div className="section-heading">
              <h2>Connection Status</h2>
              <button className="small-btn" onClick={() => connect()} disabled={loading}>
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
              <p className="hint">{url || 'ยังไม่ได้กำหนด URL'}</p>
              {connected ? (
                <button className="danger full" onClick={disconnect}>Disconnect</button>
              ) : (
                <button className="primary full" onClick={() => setTab('Settings')}>
                  ตั้งค่าการเชื่อมต่อ
                </button>
              )}
            </div>

            {connected && (
              <div className="panel">
                <b>Server Information</b>
                <p className="hint">ComfyUI API พร้อมใช้งาน</p>
                {serverInfo?.system?.devices?.map((device, index) => (
                  <p className="hint" key={index}>
                    GPU: {device.name || 'Unknown'}
                  </p>
                ))}
              </div>
            )}

            <div className="section-heading"><h2>ทางลัด</h2></div>
            <div className="quick-grid">
              <button onClick={() => setTab('Generate')}><Image /> สร้างภาพ</button>
              <button onClick={() => setTab('Models')}><Layers3 /> โมเดล</button>
            </div>
          </section>
        )}

        {tab === 'Models' && (
          <section>
            <div className="section-heading">
              <h1>Models</h1>
              <button className="small-btn" onClick={loadModels} disabled={!connected || modelsLoading}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {!connected && <div className="panel">กรุณา Connect ComfyUI ก่อน</div>}

            <div className="panel">
              <b>Checkpoint Models</b>
              <p className="hint">โมเดลหลักที่ติดตั้งอยู่ใน Pod</p>
              {modelsLoading ? <p>กำลังโหลดโมเดล...</p> :
                checkpoints.length ? checkpoints.map(name => (
                  <div className="model-row" key={name}>
                    <span>{name}</span>
                    <button
                      className={checkpoint === name ? 'primary' : 'small-btn'}
                      onClick={() => setCheckpoint(name)}
                    >
                      {checkpoint === name ? 'Selected' : 'เลือก'}
                    </button>
                  </div>
                )) : <p className="hint">ไม่พบ Checkpoint ใน Pod</p>
              }
            </div>

            <div className="panel">
              <b>LoRA Models</b>
              <p className="hint">เลือก LoRA เพื่อใช้ร่วมกับ Checkpoint</p>
              <select value={selectedLora} onChange={e => setSelectedLora(e.target.value)}>
                <option value="">ไม่ใช้ LoRA</option>
                {loras.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              {selectedLora && (
                <label className="field">
                  LoRA Strength: {loraStrength}
                  <input
                    type="range" min="0" max="2" step="0.05"
                    value={loraStrength}
                    onChange={e => setLoraStrength(e.target.value)}
                  />
                </label>
              )}
              {!loras.length && !modelsLoading && (
                <p className="hint">ไม่พบ LoRA หรือยังไม่ได้ติดตั้ง</p>
              )}
            </div>
          </section>
        )}

        {tab === 'Generate' && (
          <section>
            <h1>Generate Image</h1>

            <div className="panel">
              <label>Checkpoint</label>
              <select value={checkpoint} onChange={e => setCheckpoint(e.target.value)}>
                <option value="">เลือก Checkpoint</option>
                {checkpoints.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              {!checkpoints.length && (
                <p className="hint">ยังไม่มีรายการโมเดล กรุณาเข้า Models แล้วกด Refresh</p>
              )}

              <label>Prompt</label>
              <textarea
                rows="4"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create..."
              />

              <label>Negative Prompt</label>
              <textarea
                rows="3"
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
              />

              <div className="form-grid">
                <div>
                  <label>Steps</label>
                  <input type="number" min="1" max="100" value={steps}
                    onChange={e => setSteps(e.target.value)} />
                </div>
                <div>
                  <label>CFG</label>
                  <input type="number" min="1" max="30" step="0.5" value={cfg}
                    onChange={e => setCfg(e.target.value)} />
                </div>
                <div>
                  <label>Width</label>
                  <select value={width} onChange={e => setWidth(e.target.value)}>
                    {[512, 640, 768, 896, 1024].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label>Height</label>
                  <select value={height} onChange={e => setHeight(e.target.value)}>
                    {[512, 640, 768, 896, 1024].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <label>Seed (-1 = Random)</label>
              <input type="number" value={seed} onChange={e => setSeed(e.target.value)} />

              <button
                className="primary full generate-btn"
                onClick={generateImage}
                disabled={!connected || generating}
              >
                <Play size={18} />
                {generating ? 'กำลังสร้างภาพ...' : 'Generate Image'}
              </button>

              {generationMessage && (
                <p className="hint"><Clock size={14} /> {generationMessage}</p>
              )}
            </div>

            <div className="section-heading">
              <h2>Gallery</h2>
              <span className="hint">{gallery.length} images</span>
            </div>

            <div className="gallery-grid">
              {gallery.map((item, index) => (
                <div className="gallery-item" key={`${item.promptId}-${index}`}>
                  <img src={item.url} alt="Generated image" />
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <Download size={16} /> เปิด / บันทึกภาพ
                  </a>
                </div>
              ))}
            </div>
            {!gallery.length && <p className="hint">ภาพที่สร้างเสร็จจะแสดงที่นี่</p>}
          </section>
        )}

        {tab === 'Queue' && (
          <section>
            <div className="section-heading">
              <h1>Queue</h1>
              <button className="small-btn" onClick={loadQueue}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {!connected && <div className="panel">กรุณา Connect ComfyUI ก่อน</div>}

            <div className="panel">
              <b><Activity size={16} /> Running ({queue.running.length})</b>
              {queue.running.length ? queue.running.map((job, i) => (
                <p className="hint" key={i}>Prompt ID: {job[1] || 'กำลังทำงาน'}</p>
              )) : <p className="hint">ไม่มีงานที่กำลังทำ</p>}
            </div>

            <div className="panel">
              <b><Clock size={16} /> Pending ({queue.pending.length})</b>
              {queue.pending.length ? queue.pending.map((job, i) => (
                <p className="hint" key={i}>Prompt ID: {job[1] || 'รอทำงาน'}</p>
              )) : <p className="hint">ไม่มีงานรอคิว</p>}
            </div>
          </section>
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
              <button className="primary full" onClick={() => connect()} disabled={loading}>
                {loading ? 'กำลังเชื่อมต่อ…' : 'Connect ComfyUI'}
              </button>
              <p className="hint">
                ใช้ URL ของ RunPod พอร์ต 8188 ไม่ต้องใส่ RunPod API Key
              </p>
              {connected && <p className="hint"><CheckCircle size={14} /> เชื่อมต่อสำเร็จ</p>}
            </div>

            <div className="panel">
              <b>Storage Policy</b>
              <p className="hint">
                ใช้ Container Disk ชั่วคราวบน RunPod
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
       
