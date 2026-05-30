import './Counter.css';
import 'react-calendar/dist/Calendar.css';

import React, {
  useEffect,
  useState,
} from 'react';

import { getAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import Calendar from 'react-calendar';

import { db } from '../firebase';
import TableTemplate from './Table';

const TABLE_HEADERS = ["KD", "B"];

const Counter = () => {
  const [formData, setFormData] = useState({});
  const [entries, setEntries] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDeleteIndex, setEntryToDeleteIndex] = useState(null);
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) { setEntries([]); return; }
    const entriesColRef = collection(db, "users", user.uid, "entries");
    const unsubscribe = onSnapshot(entriesColRef, (querySnapshot) => {
      const fetchedEntries = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      fetchedEntries.sort((a, b) => new Date(b.KD || 0) - new Date(a.KD || 0));
      setEntries(fetchedEntries);
    });
    return () => unsubscribe();
  }, [user]);

  const createDateFromForm = (label) => {
    const date = formData[label]?.date;
    const time = formData[label]?.time;
    return date && time ? new Date(`${date}T${time}`).toISOString() : null;
  };

  const handleInputChange = (label, field, value) => {
    setFormData((prev) => ({ ...prev, [label]: { ...prev[label], [field]: value } }));
  };

  const handleSave = async () => {
    if (!user) return;
    const newEntry = {};
    for (const label of TABLE_HEADERS) { newEntry[label] = createDateFromForm(label); }
    if (Object.values(newEntry).every((v) => v === null)) return;
    try {
      await addDoc(collection(db, "users", user.uid, "entries"), newEntry);
      setFormData({});
    } catch (error) { console.error("Error adding document: ", error); }
  };

  const handleUpdate = async () => {
    if (editingIndex === null || !user) return;
    const entryToUpdate = entries[editingIndex];
    const updatedData = { ...entryToUpdate };
    for (const label of TABLE_HEADERS) { updatedData[label] = createDateFromForm(label); }
    try {
      await updateDoc(doc(db, "users", user.uid, "entries", entryToUpdate.id), updatedData);
      setEditingIndex(null);
      setFormData({});
    } catch (error) { console.error("Error updating document: ", error); }
  };

  const handleCancelEdit = () => { setEditingIndex(null); setFormData({}); };

  const handleDelete = (index) => { setShowDeleteConfirmation(true); setEntryToDeleteIndex(index); };

  const confirmDelete = async () => {
    if (entryToDeleteIndex === null || !user) { setShowDeleteConfirmation(false); setEntryToDeleteIndex(null); return; }
    const entryToDelete = entries[entryToDeleteIndex];
    try { await deleteDoc(doc(db, "users", user.uid, "entries", entryToDelete.id)); }
    catch (error) { console.error("Error deleting document: ", error); }
    finally { setShowDeleteConfirmation(false); setEntryToDeleteIndex(null); }
  };

  const cancelDelete = () => { setShowDeleteConfirmation(false); setEntryToDeleteIndex(null); };

  const handleEdit = (index) => {
    setEditingIndex(index);
    const entry = entries[index];
    if (!entry) return;
    const newForm = {};
    for (const label of TABLE_HEADERS) {
      if (entry[label]) {
        const dateObj = new Date(entry[label]);
        if (!isNaN(dateObj.getTime())) {
          newForm[label] = { date: dateObj.toISOString().split("T")[0], time: dateObj.toTimeString().slice(0, 5) };
        }
      }
    }
    setFormData(newForm);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const kdHighlightDates = React.useMemo(() => {
    const getDatesBetween = (start, end) => {
      const dates = []; const current = new Date(start);
      while (current < end) { dates.push(new Date(current)); current.setDate(current.getDate() + 1); }
      return dates;
    };
    return entries.flatMap((entry) => {
      if (!entry.KD || !entry.B) return [];
      const kd = new Date(entry.KD); const b = new Date(entry.B);
      if (isNaN(kd.getTime()) || isNaN(b.getTime())) return [];
      const kdDate = new Date(kd.getFullYear(), kd.getMonth(), kd.getDate());
      const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
      if (kdDate >= bDate) return [];
      return getDatesBetween(kdDate, bDate);
    });
  }, [entries]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .haid-root {
          min-height: 100vh;
          background: #fdf8f5;
          font-family: 'DM Sans', sans-serif;
          color: #2d1f1f;
          position: relative;
          overflow-x: hidden;
        }

        .haid-root::before {
          content: '';
          position: fixed;
          top: -200px; right: -200px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(198,134,114,0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .haid-root::after {
          content: '';
          position: fixed;
          bottom: -150px; left: -150px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(168,108,90,0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .haid-inner {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 24px 80px;
        }

        /* HEADER */
        .haid-header {
          text-align: center;
          margin-bottom: 48px;
        }

        .haid-header-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #b07060;
          margin-bottom: 16px;
        }

        .haid-header-eyebrow::before,
        .haid-header-eyebrow::after {
          content: '';
          display: block;
          width: 28px;
          height: 1px;
          background: #b07060;
          opacity: 0.6;
        }

        .haid-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(2rem, 5vw, 3.2rem);
          font-weight: 600;
          color: #2d1f1f;
          line-height: 1.1;
          margin-bottom: 20px;
          letter-spacing: -0.01em;
        }

        .haid-title em {
          font-style: italic;
          color: #a8604a;
        }

        .haid-legend {
          display: inline-flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 6px 16px;
          background: rgba(255,255,255,0.7);
          border: 1px solid rgba(176,112,96,0.2);
          border-radius: 100px;
          padding: 8px 20px;
          font-size: 12px;
          color: #7a5a52;
          margin-bottom: 12px;
        }

        .haid-legend span { white-space: nowrap; }
        .haid-legend strong { color: #a8604a; }

        .haid-user-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: white;
          border: 1px solid rgba(176,112,96,0.25);
          border-radius: 100px;
          padding: 5px 14px 5px 6px;
          font-size: 12px;
          color: #7a5a52;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .haid-user-avatar {
          width: 22px; height: 22px;
          background: linear-gradient(135deg, #c68672, #a8604a);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 10px; font-weight: 600;
        }

        /* FORM CARD */
        .haid-form-card {
          background: white;
          border-radius: 20px;
          border: 1px solid rgba(176,112,96,0.15);
          box-shadow: 0 4px 24px rgba(168,96,74,0.07);
          padding: 32px;
          margin-bottom: 32px;
        }

        .haid-form-card-title {
          font-family: 'Playfair Display', serif;
          font-size: 1rem;
          font-weight: 600;
          color: #2d1f1f;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .haid-form-card-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, rgba(176,112,96,0.3), transparent);
        }

        .haid-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        @media (max-width: 600px) {
          .haid-form-row { grid-template-columns: 1fr; }
        }

        .haid-form-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .haid-form-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #a8604a;
        }

        .haid-form-inputs {
          display: flex;
          gap: 8px;
        }

        .haid-form-inputs input {
          flex: 1;
          padding: 10px 14px;
          border: 1.5px solid rgba(176,112,96,0.25);
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #2d1f1f;
          background: #fdf8f5;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }

        .haid-form-inputs input:focus {
          border-color: #a8604a;
          box-shadow: 0 0 0 3px rgba(168,96,74,0.1);
          background: white;
        }

        /* BUTTONS */
        .haid-btn-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .haid-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 11px 24px;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.18s;
          letter-spacing: 0.01em;
        }

        .haid-btn-save {
          background: linear-gradient(135deg, #c68672, #a8604a);
          color: white;
          box-shadow: 0 3px 12px rgba(168,96,74,0.3);
        }

        .haid-btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 18px rgba(168,96,74,0.4);
        }

        .haid-btn-update {
          background: linear-gradient(135deg, #7a9e7e, #5a7d5e);
          color: white;
          box-shadow: 0 3px 12px rgba(90,125,94,0.3);
        }

        .haid-btn-update:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 18px rgba(90,125,94,0.4);
        }

        .haid-btn-cancel {
          background: white;
          color: #7a5a52;
          border: 1.5px solid rgba(176,112,96,0.3);
        }

        .haid-btn-cancel:hover {
          background: #fdf0eb;
          border-color: #a8604a;
        }

        /* SECTION TITLE */
        .haid-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d1f1f;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .haid-section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, rgba(176,112,96,0.3), transparent);
        }

        /* TABLE WRAPPER override */
        .haid-table-wrap {
          background: white;
          border-radius: 20px;
          border: 1px solid rgba(176,112,96,0.15);
          box-shadow: 0 4px 24px rgba(168,96,74,0.07);
          overflow: hidden;
          margin-bottom: 40px;
        }

        /* CALENDAR */
        .haid-calendar-wrap {
          background: white;
          border-radius: 20px;
          border: 1px solid rgba(176,112,96,0.15);
          box-shadow: 0 4px 24px rgba(168,96,74,0.07);
          padding: 28px;
        }

        .react-calendar {
          width: 100% !important;
          border: none !important;
          font-family: 'DM Sans', sans-serif !important;
          background: transparent !important;
        }

        .react-calendar__navigation button {
          font-family: 'Playfair Display', serif !important;
          font-size: 0.95rem !important;
          color: #2d1f1f !important;
          border-radius: 8px !important;
        }

        .react-calendar__navigation button:hover,
        .react-calendar__navigation button:focus {
          background: #fdf0eb !important;
        }

        .react-calendar__tile {
          border-radius: 8px !important;
          font-size: 12px !important;
          transition: background 0.15s !important;
        }

        .react-calendar__tile--active,
        .react-calendar__tile--active:enabled:hover {
          background: #a8604a !important;
          color: white !important;
        }

        .react-calendar__tile:enabled:hover {
          background: #fdf0eb !important;
        }

        .kd-day {
          background: linear-gradient(135deg, rgba(198,134,114,0.3), rgba(168,96,74,0.2)) !important;
          color: #a8604a !important;
          font-weight: 600 !important;
        }

        /* MODAL */
        .haid-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(45,31,31,0.4);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        .haid-modal {
          background: white;
          border-radius: 20px;
          padding: 36px;
          max-width: 380px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(45,31,31,0.2);
          text-align: center;
        }

        .haid-modal-icon {
          width: 52px; height: 52px;
          background: linear-gradient(135deg, #fde8e0, #f5c4b2);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          margin: 0 auto 16px;
        }

        .haid-modal h2 {
          font-family: 'Playfair Display', serif;
          font-size: 1.2rem;
          color: #2d1f1f;
          margin-bottom: 8px;
        }

        .haid-modal p {
          font-size: 13px;
          color: #7a5a52;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .haid-modal-btns {
          display: flex; gap: 10px; justify-content: center;
        }

        .haid-modal-confirm {
          padding: 10px 22px;
          background: linear-gradient(135deg, #e07055, #c04a2e);
          color: white;
          border: none;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
          box-shadow: 0 3px 10px rgba(192,74,46,0.3);
        }

        .haid-modal-confirm:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(192,74,46,0.4); }

        .haid-modal-cancel {
          padding: 10px 22px;
          background: white;
          color: #7a5a52;
          border: 1.5px solid rgba(176,112,96,0.3);
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.18s;
        }

        .haid-modal-cancel:hover { background: #fdf0eb; border-color: #a8604a; }

        /* editing indicator */
        .haid-editing-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #fff8e8;
          border: 1px solid #e8c870;
          color: #9a7820;
          border-radius: 100px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 500;
          margin-bottom: 16px;
        }
      `}</style>

      <div className="haid-root">
        <div className="haid-inner">

          {/* HEADER */}
          <header className="haid-header">
            <div className="haid-header-eyebrow">Catatan Haid</div>
            <h1 className="haid-title">Counter <em>Entries</em></h1>
            <div className="haid-legend">
              <span><strong>KD</strong> Keluar Darah</span>
              <span><strong>B</strong> Bersih</span>
              <span><strong>AH</strong> Asal Haid</span>
              <span><strong>AS</strong> Asal Suci</span>
            </div>
            {user && (
              <div style={{ marginTop: 10 }}>
                <div className="haid-user-badge">
                  <div className="haid-user-avatar">
                    {user.email?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  {user.email}
                </div>
              </div>
            )}
          </header>

          {/* FORM */}
          <div className="haid-form-card">
            <div className="haid-form-card-title">
              {editingIndex !== null ? '✏️ Edit Entry' : '＋ Entry Baru'}
            </div>

            {editingIndex !== null && (
              <div className="haid-editing-badge">
                ⚠️ Sedang mengedit data #{editingIndex + 1}
              </div>
            )}

            <div className="haid-form-row">
              {TABLE_HEADERS.map((label) => (
                <div key={label} className="haid-form-group">
                  <div className="haid-form-label">{label === 'KD' ? '🩸 Keluar Darah' : '✨ Bersih'}</div>
                  <div className="haid-form-inputs">
                    <input
                      type="date"
                      value={formData[label]?.date || ""}
                      onChange={(e) => handleInputChange(label, "date", e.target.value)}
                    />
                    <input
                      type="time"
                      value={formData[label]?.time || ""}
                      onChange={(e) => handleInputChange(label, "time", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="haid-btn-row">
              {editingIndex === null ? (
                <button className="haid-btn haid-btn-save" onClick={handleSave}>
                  Simpan Entry
                </button>
              ) : (
                <>
                  <button className="haid-btn haid-btn-update" onClick={handleUpdate}>
                    ✓ Update Entry
                  </button>
                  <button className="haid-btn haid-btn-cancel" onClick={handleCancelEdit}>
                    Batal
                  </button>
                </>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="haid-section-title">Riwayat Data</div>
          <div className="haid-table-wrap">
            <TableTemplate
              titles={TABLE_HEADERS}
              entries={entries}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* CALENDAR */}
          <div className="haid-section-title">Kalender Periode</div>
          <div className="haid-calendar-wrap">
            <Calendar
              tileClassName={({ date }) => {
                const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const isKD = kdHighlightDates.some((d) => d.getTime() === normalized.getTime());
                return isKD ? "kd-day" : null;
              }}
            />
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {showDeleteConfirmation && (
        <div className="haid-modal-overlay">
          <div className="haid-modal">
            <div className="haid-modal-icon">🗑️</div>
            <h2>Hapus Data?</h2>
            <p>Yakin ingin menghapus data ke-{entryToDeleteIndex + 1}? Tindakan ini tidak bisa dibatalkan.</p>
            <div className="haid-modal-btns">
              <button className="haid-modal-confirm" onClick={confirmDelete}>Ya, Hapus</button>
              <button className="haid-modal-cancel" onClick={cancelDelete}>Batal</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Counter;