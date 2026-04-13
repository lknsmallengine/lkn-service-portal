import { RequestMedia } from '@/lib/types';

export function MediaGallery({ items }: { items: RequestMedia[] }) {
  if (!items.length) {
    return <div className="small subtle">No photos or videos uploaded for this request yet.</div>;
  }

  return (
    <div className="media-grid">
      {items.map((item) => {
        const isVideo = String(item.mime_type || '').startsWith('video/');
        return (
          <div key={item.id} className="card" style={{ padding: 12 }}>
            {item.public_url ? (
              isVideo ? (
                <video controls style={{ width: '100%', borderRadius: 12 }}>
                  <source src={item.public_url} type={item.mime_type || 'video/mp4'} />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.public_url} alt={item.file_path} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 12 }} />
              )
            ) : (
              <div className="alert info">Media uploaded but no public URL is available yet.</div>
            )}
            <div className="small subtle" style={{ marginTop: 8 }}>{item.file_path}</div>
          </div>
        );
      })}
    </div>
  );
}
