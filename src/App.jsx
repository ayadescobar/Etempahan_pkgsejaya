import { useEffect, useState } from 'react';
import './App.css';
import { fetchBookings, saveBookings } from './api/bookings';

const rooms = [
  {
    id: 'seminar',
    icon: '🎤',
    name: 'Bilik Seminar',
    description: 'Ruang seminar dengan kapasiti besar, projektor dan sistem bunyi.',
  },
  {
    id: 'mesyuarat',
    icon: '🧑‍💼',
    name: 'Bilik Mesyuarat',
    description: 'Ruang mesyuarat profesional untuk perbincangan berkumpulan.',
  },
  {
    id: 'studio',
    icon: '🎙️',
    name: 'Studio Rakaman',
    description: 'Studio rakaman audio lengkap dengan peralatan rakaman asas.',
  },
];

const bookingStatuses = [
  { value: 'Dalam Proses', label: 'Dalam Proses' },
  { value: 'Disahkan', label: 'Disahkan' },
  { value: 'Dibatalkan', label: 'Dibatalkan' },
];

const initialForm = {
  roomId: rooms[0].id,
  date: '',
  start: '',
  end: '',
  name: '',
  phone: '',
  purpose: '',
  status: bookingStatuses[0].value,
};

function App() {
  const [form, setForm] = useState(initialForm);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [filterRoom, setFilterRoom] = useState('all');
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchBookings().then((saved) => {
      setBookings(saved);
    });
  }, []);

  useEffect(() => {
    saveBookings(bookings);
  }, [bookings]);

  const isConflict = (roomId, date, start, end, skipId = null) => bookings.some((booking) => {
    if (booking.id === skipId) return false;
    if (booking.roomId !== roomId || booking.date !== date) return false;
    return !(end <= booking.start || start >= booking.end);
  });

  const handleEdit = (booking) => {
    setForm({
      roomId: booking.roomId,
      date: booking.date,
      start: booking.start,
      end: booking.end,
      name: booking.name,
      phone: booking.phone,
      purpose: booking.purpose,
      status: booking.status || bookingStatuses[0].value,
    });
    setEditingId(booking.id);
    setMessage(`Menyunting tempahan bagi ${booking.roomName}.`);
  };

  const handleDelete = (id) => {
    setBookings((prev) => prev.filter((booking) => booking.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }
    setMessage('Tempahan telah dipadam.');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
    setMessage('Menyunting dibatalkan.');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { roomId, date, start, end, name, purpose } = form;

    if (!date || !start || !end || !name || !purpose) {
      setMessage('Sila lengkapkan semua maklumat tempahan.');
      return;
    }

    if (start >= end) {
      setMessage('Masa mula mesti lebih awal daripada masa tamat.');
      return;
    }

    if (isConflict(roomId, date, start, end, editingId)) {
      setMessage('Masa tempahan bertindih dengan tempahan sedia ada untuk bilik ini.');
      return;
    }

    const roomName = rooms.find((room) => room.id === roomId)?.name || 'Bilik';

    if (editingId) {
      setBookings((prev) => prev.map((booking) => (
        booking.id === editingId
          ? {
            ...booking,
            roomId,
            roomName,
            date,
            start,
            end,
            name,
            phone: form.phone,
            purpose,
            status: form.status,
          }
          : booking
      )));
      setMessage(`Tempahan untuk ${roomName} pada ${date} telah dikemaskini.`);
    } else {
      const newBooking = {
        id: `${roomId}-${date}-${start}-${end}-${Date.now()}`,
        roomId,
        roomName,
        date,
        start,
        end,
        name,
        phone: form.phone,
        purpose,
        status: form.status,
        createdAt: new Date().toISOString(),
      };
      setBookings((prev) => [newBooking, ...prev]);
      setMessage(`Tempahan untuk ${roomName} pada ${date} berjaya disimpan.`);
    }

    setEditingId(null);
    setForm(initialForm);
  };

  const makeCsvExport = (data, fileName, successMessage) => {
    if (!data.length) {
      setMessage('Tiada tempahan untuk dieksport.');
      return;
    }

    const headers = ['Bilik', 'Tarikh', 'Masa Mula', 'Masa Tamat', 'Nama', 'Telefon', 'Tujuan', 'Status'];
    const rows = data.map((booking) => [
      booking.roomName,
      booking.date,
      booking.start,
      booking.end,
      booking.name,
      booking.phone,
      booking.purpose,
      booking.status || '',
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    setMessage(successMessage);
  };

  const makePdfExport = (data, title) => {
    if (!data.length) {
      setMessage('Tiada tempahan untuk dieksport.');
      return;
    }

    const rows = data.map((booking) => `
      <tr>
        <td>${booking.roomName}</td>
        <td>${booking.date}</td>
        <td>${booking.start}</td>
        <td>${booking.end}</td>
        <td>${booking.name}</td>
        <td>${booking.phone || '-'}</td>
        <td>${booking.purpose}</td>
        <td>${booking.status || '-'}</td>
      </tr>
    `).join('');

    const exportHtml = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #212121; }
            h1 { font-size: 24px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Jumlah tempahan: ${data.length}</p>
          <table>
            <thead>
              <tr>
                <th>Bilik</th>
                <th>Tarikh</th>
                <th>Masa Mula</th>
                <th>Masa Tamat</th>
                <th>Nama</th>
                <th>Telefon</th>
                <th>Tujuan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(exportHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const exportCurrentToCsv = () => makeCsvExport(
    upcomingBookings,
    'tempahan-pkg-segambut.csv',
    'Eksport Excel berjaya. Fail CSV dimuat turun.',
  );

  const exportCurrentToPdf = () => makePdfExport(
    upcomingBookings,
    'Laporan Tempahan Dipilih - PKG Segambut Jaya',
  );

  const exportAllToCsv = () => makeCsvExport(
    bookings,
    'tempahan-pkg-segambut-all.csv',
    'Eksport semua tempahan berjaya. Fail CSV dimuat turun.',
  );

  const exportAllToPdf = () => makePdfExport(
    bookings,
    'Laporan Semua Tempahan - PKG Segambut Jaya',
  );

  const filteredBookings = filterRoom === 'all'
    ? bookings
    : bookings.filter((booking) => booking.roomId === filterRoom);

  const upcomingBookings = [...filteredBookings].sort((a, b) => {
    const first = `${a.date} ${a.start}`;
    const second = `${b.date} ${b.start}`;
    return first.localeCompare(second);
  });

  return (
    <div className="App">
      <header className="hero">
        <div>
          <h1>Tempahan Bilik PKG Segambut Jaya</h1>
          <p>Rekod dan urus tempahan Bilik Seminar, Bilik Mesyuarat, dan Studio Rakaman dengan cepat.</p>
          <div className="manager-card">
            <img
              src="https://i.postimg.cc/wB5S18p6/Whats-App-Image-2026-05-11-at-3-20-00-PM.jpg"
              alt="Encik Mohd Sari Hidayat"
              loading="lazy"
            />
            <div className="manager-info">
              <p className="manager-label">Pegawai Pengurus</p>
              <h3>PKG Segambut Jaya</h3>
              <p className="manager-name">Encik Mohd Sari Hidayat bin Mohammad Isa</p>
              <p className="manager-contact">
                <span className="whatsapp-icon">📲</span>
                <a href="https://wa.me/60173883674" target="_blank" rel="noreferrer">
                  WhatsApp: 017-3883674
                </a>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="room-list">
          <h2>Senarai Bilik</h2>
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-icon">{room.icon}</div>
                <h3>{room.name}</h3>
                <p>{room.description}</p>
                <p><strong>ID:</strong> {room.id}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="booking-summary">
          <div className="summary-card">
            <h2>Ringkasan Tempahan</h2>
            <p className="summary-total">Jumlah tempahan: {bookings.length}</p>
            <div className="summary-grid">
              {rooms.map((room) => (
                <div key={room.id} className="summary-item">
                  <p>{room.name}</p>
                  <strong>{bookings.filter((booking) => booking.roomId === room.id).length}</strong>
                </div>
              ))}
            </div>
            <div className="status-summary">
              <h3>Status Tempahan</h3>
              <div className="status-grid">
                {bookingStatuses.map((status) => (
                  <div key={status.value} className="status-item">
                    <p>{status.label}</p>
                    <strong>{bookings.filter((booking) => booking.status === status.value).length}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="booking-panel">
          <div className="booking-form-card">
            <h2>Tempah Bilik</h2>
            <form onSubmit={handleSubmit} className="booking-form">
              <label>
                Bilik
                <select name="roomId" value={form.roomId} onChange={handleChange}>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Tarikh
                <input type="date" name="date" value={form.date} onChange={handleChange} />
              </label>

              <label>
                Masa Mula
                <input type="time" name="start" value={form.start} onChange={handleChange} />
              </label>

              <label>
                Masa Tamat
                <input type="time" name="end" value={form.end} onChange={handleChange} />
              </label>

              <label>
                Nama Pemohon
                <input type="text" name="name" value={form.name} onChange={handleChange} placeholder="Contoh: Siti" />
              </label>

              <label>
                Nombor Telefon
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="012-3456789" />
              </label>

              <label>
                Status Tempahan
                <select name="status" value={form.status} onChange={handleChange}>
                  {bookingStatuses.map((status) => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </label>

              <label>
                Tujuan
                <textarea name="purpose" value={form.purpose} onChange={handleChange} rows="3" placeholder="Contoh: Latihan ICT"></textarea>
              </label>

              <div className="form-actions">
                <button type="submit" className="primary-button">
                  {editingId ? 'Simpan Perubahan' : 'Tempah Sekarang'}
                </button>
                {editingId && (
                  <button type="button" className="secondary-button" onClick={handleCancelEdit}>
                    Batal
                  </button>
                )}
              </div>
            </form>
            {message && <p className="message">{message}</p>}
          </div>

          <div className="booking-list-card">
            <div className="booking-list-header">
              <div>
                <h2>Senarai Tempahan ({upcomingBookings.length})</h2>
                <p className="small-note">Eksport semasa akan menggunakan penapis bilik yang dipilih.</p>
              </div>
              <div className="export-actions">
                <button type="button" className="secondary-button" onClick={exportCurrentToCsv}>
                  CSV Semasa
                </button>
                <button type="button" className="secondary-button" onClick={exportAllToCsv}>
                  CSV Semua
                </button>
                <button type="button" className="secondary-button" onClick={exportCurrentToPdf}>
                  PDF Semasa
                </button>
                <button type="button" className="secondary-button" onClick={exportAllToPdf}>
                  PDF Semua
                </button>
                <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
                  <option value="all">Semua Bilik</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {upcomingBookings.length === 0 ? (
              <p className="empty-state">Tiada tempahan lagi. Sila buat tempahan pertama anda.</p>
            ) : (
              <div className="booking-items">
                {upcomingBookings.map((booking) => (
                  <article key={booking.id} className="booking-item">
                    <div className="booking-meta">
                      <strong>{booking.roomName}</strong>
                      <span>{booking.date}</span>
                    </div>
                    <div className="booking-time">
                      {booking.start} - {booking.end}
                    </div>
                    <div className="booking-details">
                      <div className="booking-status-row">
                        <span className={`status-badge status-${booking.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p><strong>Nama:</strong> {booking.name}</p>
                      {booking.phone && <p><strong>Telefon:</strong> {booking.phone}</p>}
                      <p><strong>Tujuan:</strong> {booking.purpose}</p>
                    </div>
                    <div className="booking-actions">
                      <button type="button" className="secondary-button" onClick={() => handleEdit(booking)}>
                        Edit
                      </button>
                      <button type="button" className="danger-button" onClick={() => handleDelete(booking.id)}>
                        Padam
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
