"use client";

import { useMemo, useRef, useState } from 'react';

type FileMeta = {
  key: string;
  name: string;
  label: string;
  note: string;
  previewUrl?: string;
  kind: 'image' | 'video' | 'file';
};

function defaultLabelForName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('serial')) return 'serial';
  if (lower.includes('before')) return 'before';
  if (lower.includes('after')) return 'after';
  if (lower.includes('damage') || lower.includes('broken')) return 'damage';
  return 'overall';
}

function toMeta(file: File, index: number): FileMeta {
  const previewUrl = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined;
  return {
    key: `${file.name}-${file.lastModified}-${index}`,
    name: file.name,
    label: defaultLabelForName(file.name),
    note: '',
    previewUrl,
    kind: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
  };
}

export function AttachmentUploadFields() {
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const helpText = useMemo(() => {
    if (!files.length) return 'Drag photos or videos here, or click to browse. Label each file so customers and staff can understand what they are seeing.';
    return `${files.length} attachment${files.length === 1 ? '' : 's'} ready. Labels and notes will follow each file into the request.`;
  }, [files]);

  const applyFiles = (incoming: FileList | null) => {
    const next = Array.from(incoming || []).map((file, index) => toMeta(file, index));
    setFiles((current) => {
      current.forEach((item) => item.previewUrl && URL.revokeObjectURL(item.previewUrl));
      return next;
    });
  };

  return (
    <div className="stack-sm">
      <div
        className="card"
        style={{
          padding: 16,
          borderStyle: 'dashed',
          borderColor: isDragging ? 'var(--accent)' : 'var(--line)',
          background: isDragging ? 'rgba(249,115,22,.08)' : undefined,
          cursor: 'pointer'
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          applyFiles(event.dataTransfer.files);
          if (inputRef.current) inputRef.current.files = event.dataTransfer.files;
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          name="media"
          multiple
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={(event) => applyFiles(event.target.files)}
        />
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Drop files here or click to upload</div>
        <div className="small subtle">{helpText}</div>
      </div>

      {files.length ? (
        <div className="stack-sm" style={{ marginTop: 4 }}>
          {files.map((file, index) => (
            <div key={file.key} className="card" style={{ padding: 12 }}>
              <div className="form-row" style={{ alignItems: 'start' }}>
                <div>
                  <div className="small subtle" style={{ marginBottom: 8 }}>{file.name}</div>
                  {file.kind === 'image' && file.previewUrl ? (
                    <img src={file.previewUrl} alt={file.name} style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--line)' }} />
                  ) : null}
                  {file.kind === 'video' && file.previewUrl ? (
                    <video src={file.previewUrl} controls style={{ width: '100%', maxHeight: 180, borderRadius: 12, border: '1px solid var(--line)' }} />
                  ) : null}
                  {file.kind === 'file' ? <div className="badge">File preview unavailable</div> : null}
                </div>
                <div className="stack-sm">
                  <label>
                    Label
                    <select name={`media_label_${index}`} defaultValue={file.label}>
                      <option value="overall">overall</option>
                      <option value="damage">damage</option>
                      <option value="serial">serial</option>
                      <option value="before">before</option>
                      <option value="after">after</option>
                      <option value="other">other</option>
                    </select>
                  </label>
                  <label>
                    Note
                    <input name={`media_note_${index}`} placeholder="Optional note for this file" defaultValue={file.note} />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
