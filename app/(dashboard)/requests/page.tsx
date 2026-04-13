import { createServiceRequest } from '@/lib/actions';
import { getEquipment, getRequests } from '@/lib/data';
import Link from 'next/link';
import { StatusPill } from '@/components/StatusPill';
import { AttachmentUploadFields } from '@/components/AttachmentUploadFields';

export default async function RequestsPage() {
  const [equipment, requests] = await Promise.all([getEquipment(), getRequests()]);

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Request service</h2>
        <form action={createServiceRequest} className="grid">
          <div>
            <label>Select equipment</label>
            <select name="equipment_id" required>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>{item.nickname} • {item.brand} {item.model}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Equipment display name</label>
            <input name="equipment_name" placeholder="Hustler Raptor" required />
          </div>
          <div className="form-row">
            <div>
              <label>Service type</label>
              <select name="request_type">
                <option>Repair</option>
                <option>Diagnostic</option>
                <option>Tune-Up</option>
                <option>Pickup/Delivery</option>
              </select>
            </div>
            <div>
              <label>Requested date</label>
              <input type="date" name="requested_date" />
            </div>
          </div>
          <div>
            <label>Describe the issue</label>
            <textarea name="issue_description" rows={5} placeholder="Tell us what it’s doing or not doing." required />
          </div>
          <div className="form-row">
            <div>
              <label>Pickup required</label>
              <select name="pickup_required">
                <option value="false">No, I will drop it off</option>
                <option value="true">Yes, request pickup</option>
              </select>
            </div>
            <div>
              <label>Preferred contact method</label>
              <select name="contact_method">
                <option>Text</option>
                <option>Phone</option>
                <option>Email</option>
              </select>
            </div>
          </div>
          <div>
            <label>Photo or video uploads</label>
            <AttachmentUploadFields />
          </div>
          <button className="btn" type="submit">Submit service request</button>
        </form>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Open requests</h2>
        <div className="grid">
          {requests.map((request) => (
            <div key={request.id} className="card" style={{ padding: 14 }}>
              <div className="header" style={{ marginBottom: 8 }}>
                <div>
                  <strong>{request.equipment_name}</strong>
                  <div className="small subtle">{request.request_number}</div>
                </div>
                <StatusPill status={request.status} />
              </div>
              <p className="small subtle">{request.issue_description}</p>
              <Link className="btn secondary" href={`/dashboard/requests/${request.id}`}>Open request</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
