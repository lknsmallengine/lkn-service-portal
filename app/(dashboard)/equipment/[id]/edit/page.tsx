import { notFound } from 'next/navigation';
import { updateEquipment } from '@/lib/actions';
import { getEquipmentById } from '@/lib/data';

export default async function EditEquipmentPage({ params }: { params: { id: string } }) {
  const item = await getEquipmentById(params.id);
  if (!item) return notFound();

  return (
    <section className="card" style={{ maxWidth: 760 }}>
      <h2 style={{ marginTop: 0 }}>Edit equipment</h2>
      <form action={updateEquipment} className="grid">
        <input type="hidden" name="id" value={item.id} />
        <div className="form-row">
          <div><label>Nickname</label><input name="nickname" defaultValue={item.nickname} required /></div>
          <div><label>Type</label><input name="equipment_type" defaultValue={item.equipment_type} required /></div>
        </div>
        <div className="form-row">
          <div><label>Brand</label><input name="brand" defaultValue={item.brand} required /></div>
          <div><label>Model</label><input name="model" defaultValue={item.model} required /></div>
        </div>
        <div><label>Serial number</label><input name="serial_number" defaultValue={item.serial_number} /></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="submit">Save changes</button>
          <a className="btn secondary" href="/dashboard/equipment">Cancel</a>
        </div>
      </form>
    </section>
  );
}
