import { useState, useEffect } from 'react';
import axios from 'axios';
import './Admin.css';

const API_URL = '/api/admin/data';

export default function Admin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch admin data. Make sure the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="admin-loading">Loading Database...</div>;
  if (error) return <div className="admin-error">{error}</div>;

  return (
    <div className="admin-page container">
      <div className="admin-header">
        <h1 className="text-gradient">SkillXchange Database Explorer</h1>
        <button onClick={fetchData} className="btn-primary">Refresh Data</button>
      </div>

      <section className="admin-section">
        <h2>Users ({data.users.length})</h2>
        <div className="admin-table-wrapper glass-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id}>
                  <td className="text-muted">{u.id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Skills ({data.skills.length})</h2>
        <div className="admin-table-wrapper glass-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Skill Name</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {data.skills.map(s => (
                <tr key={s.id}>
                  <td className="text-muted">{s.id}</td>
                  <td className="text-muted">{s.user_id}</td>
                  <td>{s.name}</td>
                  <td>{s.level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <h2>Messages ({data.messages.length})</h2>
        <div className="admin-table-wrapper glass-panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sender ID</th>
                <th>Receiver ID</th>
                <th>Message</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {data.messages.map(m => (
                <tr key={m.id}>
                  <td className="text-muted">{m.sender_id}</td>
                  <td className="text-muted">{m.receiver_id}</td>
                  <td>{m.text}</td>
                  <td className="text-muted">{new Date(m.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
