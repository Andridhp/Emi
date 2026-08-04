import { createClient } from '@supabase/supabase-js';
import { DOCUMENT_EXTRACTION_SCHEMA_VERSION, factsForDatabase, validateDocumentExtraction } from '../../../src/lib/documentExtraction.ts';

const WORKER_NAME = 'emi-document-worker-v1';
const MAX_BYTES = 8 * 1024 * 1024;

class WorkerFailure extends Error {
  constructor(readonly code: string) { super(code); }
}

const required = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new WorkerFailure(`missing_${name.toLowerCase()}`);
  return value;
};

const sha256 = async (value: ArrayBuffer | string) => {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const protectedRequest = async (url: string, token: string, body: BodyInit, contentType?: string) => {
  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, ...(contentType ? { 'content-type': contentType } : {}) }, body, signal: AbortSignal.timeout(90_000) });
  if (!response.ok) throw new WorkerFailure(`provider_${response.status}`);
  return response;
};

Deno.serve(async (request) => {
  const triggerSecret = required('WORKER_TRIGGER_SECRET');
  if (request.headers.get('x-worker-secret') !== triggerSecret) return new Response('Unauthorized', { status: 401 });

  const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  let jobId: string | undefined;
  try {
    const { data: claimed, error: claimError } = await supabase.rpc('claim_document_processing_job', { target_worker: WORKER_NAME, lease_seconds: 180 });
    if (claimError) throw new WorkerFailure('claim_failed');
    const job = claimed?.[0];
    if (!job) return Response.json({ status: 'idle' });
    jobId = job.job_id;
    if (!job.storage_path || !job.mime_type || !job.size_bytes || job.size_bytes > MAX_BYTES) throw new WorkerFailure('invalid_document_metadata');

    const { data: stored, error: downloadError } = await supabase.storage.from('medical-documents').download(job.storage_path);
    if (downloadError || !stored) throw new WorkerFailure('download_failed');
    const bytes = await stored.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new WorkerFailure('invalid_download_size');
    const inputHash = await sha256(bytes);

    const scanResponse = await protectedRequest(required('MALWARE_SCAN_URL'), required('MALWARE_SCAN_TOKEN'), bytes, job.mime_type);
    const scan = await scanResponse.json();
    if (scan?.clean !== true) throw new WorkerFailure('malware_detected');
    const { error: scanStageError } = await supabase.rpc('record_document_worker_stage', {
      target_job: jobId, target_worker: WORKER_NAME, target_stage: 'malware_scan', target_processor: String(scan.engine || 'configured-scanner'),
      target_processor_version: String(scan.version || 'unknown'), target_schema_version: '1.0', target_input_sha256: inputHash,
      target_output_sha256: await sha256(JSON.stringify({ clean: true, engine: scan.engine, version: scan.version }))
    });
    if (scanStageError) throw new WorkerFailure('scan_stage_failed');

    const ocrForm = new FormData();
    ocrForm.append('file', new Blob([bytes], { type: job.mime_type }), 'document');
    const ocrResponse = await protectedRequest(required('OCR_SERVICE_URL'), required('OCR_SERVICE_TOKEN'), ocrForm);
    const ocr = await ocrResponse.json();
    const ocrText = typeof ocr?.text === 'string' ? ocr.text.slice(0, 250_000) : '';
    if (!ocrText.trim()) throw new WorkerFailure('ocr_empty');
    const ocrHash = await sha256(ocrText);
    const { error: ocrStageError } = await supabase.rpc('record_document_worker_stage', {
      target_job: jobId, target_worker: WORKER_NAME, target_stage: 'ocr', target_processor: String(ocr.processor || 'configured-ocr'),
      target_processor_version: String(ocr.version || 'unknown'), target_schema_version: '1.0', target_input_sha256: inputHash, target_output_sha256: ocrHash
    });
    if (ocrStageError) throw new WorkerFailure('ocr_stage_failed');

    const extractionResponse = await protectedRequest(required('EXTRACTION_SERVICE_URL'), required('EXTRACTION_SERVICE_TOKEN'), JSON.stringify({
      schemaVersion: DOCUMENT_EXTRACTION_SCHEMA_VERSION,
      locale: 'es-MX',
      text: ocrText,
      pages: Array.isArray(ocr.pages) ? ocr.pages.slice(0, 500) : undefined,
      constraints: { diagnose: false, prescribe: false, inferUrgency: false, retainOriginalWording: true }
    }), 'application/json');
    const extraction = validateDocumentExtraction(await extractionResponse.json());
    if (!extraction.facts.length) throw new WorkerFailure('no_facts');
    const outputHash = await sha256(JSON.stringify(extraction));
    const { error: extractionStageError } = await supabase.rpc('record_document_worker_stage', {
      target_job: jobId, target_worker: WORKER_NAME, target_stage: 'extraction', target_processor: 'configured-extractor',
      target_processor_version: String(extractionResponse.headers.get('x-processor-version') || 'unknown'), target_schema_version: DOCUMENT_EXTRACTION_SCHEMA_VERSION,
      target_input_sha256: ocrHash, target_output_sha256: outputHash
    });
    if (extractionStageError) throw new WorkerFailure('extraction_stage_failed');
    const { data: count, error: completeError } = await supabase.rpc('complete_document_processing_job', { target_job: jobId, target_worker: WORKER_NAME, proposed_facts: factsForDatabase(extraction) });
    if (completeError) throw new WorkerFailure('completion_failed');
    return Response.json({ status: 'review', facts: count });
  } catch (error) {
    const code = error instanceof WorkerFailure ? error.code : 'worker_error';
    if (jobId) await supabase.rpc('fail_document_processing_job', { target_job: jobId, target_worker: WORKER_NAME, target_failure_code: code });
    return Response.json({ status: 'failed', code }, { status: 500 });
  }
});
