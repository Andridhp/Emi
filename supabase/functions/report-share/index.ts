import { createClient } from '@supabase/supabase-js';

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
};

const safeFileName = (value: unknown) => {
  const clean = String(value || 'resumen-consulta.pdf').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`;
};

const noStore = { 'cache-control': 'private, no-store, max-age=0', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' };

const tokenPage = () => {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(18)), (value) => value.toString(16).padStart(2, '0')).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resumen protegido · Emi</title><style nonce="${nonce}">*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f5f0;color:#203936;font-family:system-ui,-apple-system,sans-serif;padding:24px}.card{width:min(430px,100%);background:#fff;border:1px solid #e7e2d9;border-radius:28px;padding:30px;text-align:center;box-shadow:0 24px 70px rgba(39,67,61,.12)}.mark{width:58px;height:58px;margin:auto;border-radius:21px;display:grid;place-items:center;background:#e5f0eb;color:#3d675e;font-weight:800;font-size:18px}h1{font-size:24px;margin:20px 0 8px}p{font-size:14px;line-height:1.55;color:#687b77;margin:0}.status{margin-top:18px;padding:12px;border-radius:14px;background:#f5f4ef;font-size:13px;color:#3d675e}.error{background:#fff0eb;color:#8a4f41}</style></head><body><main class="card"><div class="mark">Emi</div><h1>Abriendo resumen protegido</h1><p>El acceso es temporal y puede ser revocado por la familia.</p><div id="status" class="status" role="status">Verificando el enlace…</div></main><script nonce="${nonce}">(()=>{const status=document.getElementById('status');let token='';try{token=decodeURIComponent(location.hash.slice(1)).toLowerCase()}catch{}history.replaceState(null,'',location.pathname+location.search);if(!/^[a-f0-9]{64}$/.test(token)){status.textContent='Este enlace no es válido.';status.classList.add('error');return}fetch(location.href,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token}),cache:'no-store',credentials:'omit'}).then(async response=>{if(!response.ok)throw new Error(await response.text());return response.blob()}).then(pdf=>{status.textContent='Reporte listo.';const url=URL.createObjectURL(pdf);location.replace(url)}).catch(error=>{status.textContent=error.message||'El reporte no está disponible.';status.classList.add('error')})})();</script></body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      ...noStore,
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      'x-frame-options': 'DENY'
    }
  });
};

Deno.serve(async (request) => {
  if (request.method === 'GET') return tokenPage();
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { ...noStore, allow: 'GET, POST' } });

  let token = '';
  try {
    const rawBody = await request.text();
    if (rawBody.length > 1024) return new Response('Solicitud no válida.', { status: 413, headers: noStore });
    const body = JSON.parse(rawBody);
    token = String(body?.token || '').toLowerCase();
  } catch {
    return new Response('Solicitud no válida.', { status: 400, headers: noStore });
  }
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response('Este enlace no es válido.', { status: 404, headers: noStore });

  try {
    const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await supabase.rpc('consume_report_share_token', { raw_token: token });
    const report = data?.[0];
    if (error || !report?.storage_path) return new Response('El enlace expiró o fue revocado.', { status: 410, headers: noStore });
    const { data: pdf, error: downloadError } = await supabase.storage.from('consultation-reports').download(report.storage_path);
    if (downloadError || !pdf) return new Response('El reporte no está disponible.', { status: 404, headers: noStore });
    return new Response(pdf, {
      status: 200,
      headers: {
        ...noStore,
        'content-type': 'application/pdf',
        'content-disposition': `inline; filename="${safeFileName(report.file_name)}"`,
        'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
        'x-frame-options': 'DENY'
      }
    });
  } catch {
    return new Response('El reporte no está disponible.', { status: 503, headers: noStore });
  }
});
