export default function HistoryPage() {
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Service history</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Equipment</th>
            <th>Summary</th>
            <th>Recommendation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>2026-03-10</td>
            <td>Hustler Raptor XD</td>
            <td>Premium service, blade sharpen, fuel flush</td>
            <td>Hydro service at next interval</td>
          </tr>
          <tr>
            <td>2025-09-15</td>
            <td>Echo PB-9010</td>
            <td>Coil replacement and carburetor diagnostics</td>
            <td>Inspect crank seals if issue returns</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
