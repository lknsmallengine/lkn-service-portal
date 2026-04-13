import Link from 'next/link';
import { createEquipment, deleteEquipment } from '@/lib/actions';
import { getEquipment } from '@/lib/data';

export default async function EquipmentPage() {
  const equipment = await getEquipment();
  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>My equipment</h2>
        <div className="grid">
          {equipment.map((item) => (
            <div key={item.id} className="card" style={{ padding: 14 }}>
              <strong>{item.nickname}</strong>
              <div className="small subtle">{item.brand} {item.model}</div>
              <div className="small subtle">Type: {item.equipment_type}</div>
              <div className="small subtle">SN: {item.serial_number || 'Not saved'}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
                <Link className="btn secondary" href={`/dashboard/equipment/${item.id}/edit`}>Edit</Link>
                <form action={deleteEquipment}>
                  <input type="hidden" name="id" value={item.id} />
                  <button className="btn ghost" type="submit">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add equipment</h2>
        <form action={createEquipment} className="grid">
          <div className="form-row">
            <div><label>Nickname</label><input name="nickname" placeholder="Front Yard Mower" required /></div>
            <div><label>Type</label><input name="equipment_type" placeholder="Zero Turn" required /></div>
          </div>
          <div className="form-row">
            <div><label>Brand</label><input name="brand" placeholder="Hustler" required /></div>
            <div><label>Model</label><input name="model" placeholder="Raptor XD" required /></div>
          </div>
          <div><label>Serial number</label><input name="serial_number" placeholder="HZT-12345" /></div>
          <button className="btn" type="submit">Save equipment</button>
        </form>
      </section>
    </div>
  );
}
