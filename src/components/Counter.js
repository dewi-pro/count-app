import './Counter.css';
import 'react-calendar/dist/Calendar.css';

import React, {
  useCallback,
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
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import Calendar from 'react-calendar';

import { db } from '../firebase';
import QodhoSection from './QodhoSection';
import TableTemplate from './Table';

const TABLE_HEADERS  = ["KD", "B"];
const WARNA_OPTIONS  = ['Hitam', 'Merah', 'Coklat', 'Kuning', 'Keruh'];
const TEKSTUR_OPTIONS = ['Kental', 'Cair'];
const BAU_OPTIONS    = ['Busuk', 'Tidak'];

const WARNA_COLORS = {
  Hitam: '#222222', Merah: '#e53935',
  Coklat: '#8d4e2a', Kuning: '#f9a825', Keruh: '#9e9e9e',
};

const Counter = () => {
  const [formData, setFormData]           = useState({});
  const [entries, setEntries]             = useState([]);
  const [editingIndex, setEditingIndex]   = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDeleteIndex, setEntryToDeleteIndex]         = useState(null);

  // Daily notes (warna/tekstur/bau), independent from KD-B entries
  const [dailyNotes, setDailyNotes]       = useState({}); // { "YYYY-MM-DD": { warna, tekstur, bau } }

  // Calendar day editor state
  const [selectedDay, setSelectedDay]     = useState(null); // "YYYY-MM-DD"
  const [dayRecords, setDayRecords]       = useState([]); // [{ time, warna, tekstur, bau }]
  const [newRecord, setNewRecord]         = useState({ time: '', warna: '', tekstur: '', bau: '' });
  const [daySaving, setDaySaving]         = useState(false);

  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) { setEntries([]); return; }
    const ref = collection(db, "users", user.uid, "entries");
    const unsub = onSnapshot(ref, (snap) => {
      const fetched = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      fetched.sort((a, b) => new Date(b.KD || 0) - new Date(a.KD || 0));
      setEntries(fetched);
    });
    return () => unsub();
  }, [user]);

  // Listen to dailyNotes collection: users/{uid}/dailyNotes/{date}
  useEffect(() => {
    if (!user) { setDailyNotes({}); return; }
    const ref = collection(db, "users", user.uid, "dailyNotes");
    const unsub = onSnapshot(ref, (snap) => {
      const map = {};
      snap.docs.forEach((d) => { map[d.id] = d.data(); });
      setDailyNotes(map);
    });
    return () => unsub();
  }, [user]);

  // Calendar coloring now comes purely from dailyNotes, independent of KD-B entries
  const calendarData = dailyNotes;

  // Click ANY calendar day (not restricted to KD-B range)
  const handleDayClick = useCallback((date) => {
    const key = date.toISOString().split('T')[0];
    const info = dailyNotes[key];
    setSelectedDay(key);
    setDayRecords(info?.records || []);
    setNewRecord({ time: '', warna: '', tekstur: '', bau: '' });
  }, [dailyNotes]);

  // Add a new timestamped record to the current day, then persist immediately
  const handleAddRecord = async () => {
    if (!user || !selectedDay) return;
    if (!newRecord.time) return; // jam wajib diisi
    setDaySaving(true);
    try {
      const updatedRecords = [...dayRecords, { ...newRecord }].sort((a, b) => a.time.localeCompare(b.time));
      const noteRef = doc(db, 'users', user.uid, 'dailyNotes', selectedDay);
      await setDoc(noteRef, { records: updatedRecords }, { merge: true });
      setDayRecords(updatedRecords);
      setNewRecord({ time: '', warna: '', tekstur: '', bau: '' });
    } catch (e) { console.error(e); }
    finally { setDaySaving(false); }
  };

  // Remove one record (by index) from the day
  const handleRemoveRecord = async (index) => {
    if (!user || !selectedDay) return;
    setDaySaving(true);
    try {
      const updatedRecords = dayRecords.filter((_, i) => i !== index);
      const noteRef = doc(db, 'users', user.uid, 'dailyNotes', selectedDay);
      if (updatedRecords.length === 0) {
        await deleteDoc(noteRef);
      } else {
        await setDoc(noteRef, { records: updatedRecords }, { merge: true });
      }
      setDayRecords(updatedRecords);
    } catch (e) { console.error(e); }
    finally { setDaySaving(false); }
  };

  const createDateFromForm = (label) => {
    const date = formData[label]?.date;
    const time = formData[label]?.time;
    return date && time ? new Date(`${date}T${time}`).toISOString() : null;
  };

  const handleInputChange = (label, field, value) =>
    setFormData((prev) => ({ ...prev, [label]: { ...prev[label], [field]: value } }));

  const handleSave = async () => {
    if (!user) return;
    const newEntry = {};
    for (const label of TABLE_HEADERS) { newEntry[label] = createDateFromForm(label); }
    if (Object.values(newEntry).every((v) => v === null)) return;
    try { await addDoc(collection(db, "users", user.uid, "entries"), newEntry); setFormData({}); }
    catch (e) { console.error(e); }
  };

  const handleUpdate = async () => {
    if (editingIndex === null || !user) return;
    const entryToUpdate = entries[editingIndex];
    const updatedData = { ...entryToUpdate };
    for (const label of TABLE_HEADERS) { updatedData[label] = createDateFromForm(label); }
    try {
      await updateDoc(doc(db, "users", user.uid, "entries", entryToUpdate.id), updatedData);
      setEditingIndex(null); setFormData({});
    } catch (e) { console.error(e); }
  };

  const handleCancelEdit = () => { setEditingIndex(null); setFormData({}); };

  const handleDelete = (index) => { setShowDeleteConfirmation(true); setEntryToDeleteIndex(index); };

  const confirmDelete = async () => {
    if (entryToDeleteIndex === null || !user) { setShowDeleteConfirmation(false); setEntryToDeleteIndex(null); return; }
    const entryToDelete = entries[entryToDeleteIndex];
    try { await deleteDoc(doc(db, "users", user.uid, "entries", entryToDelete.id)); }
    catch (e) { console.error(e); }
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
        if (!isNaN(dateObj.getTime()))
          newForm[label] = { date: dateObj.toISOString().split("T")[0], time: dateObj.toTimeString().slice(0, 5) };
      }
    }
    setFormData(newForm);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const Chip = ({ value, options, onChange, colorMap }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => {
        const active = value === o;
        const color  = colorMap?.[o];
        return (
          <button key={o} onClick={() => onChange(active ? '' : o)}
            style={{
              padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500,
              border: `1.5px solid ${active ? (color || '#a8604a') : 'rgba(176,112,96,0.25)'}`,
              background: active ? (color || '#a8604a') : 'white',
              color: active ? 'white' : '#7a5a52',
              cursor: 'pointer', transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {color && <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />}
            {o}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .haid-root { min-height: 100vh; background: #fdf8f5; font-family: 'DM Sans', sans-serif; color: #2d1f1f; position: relative; overflow-x: hidden; }
        .haid-root::before { content: ''; position: fixed; top: -200px; right: -200px; width: 600px; height: 600px; background: radial-gradient(circle, rgba(198,134,114,0.12) 0%, transparent 70%); pointer-events: none; z-index: 0; }
        .haid-root::after  { content: ''; position: fixed; bottom: -150px; left: -150px; width: 500px; height: 500px; background: radial-gradient(circle, rgba(168,108,90,0.08) 0%, transparent 70%); pointer-events: none; z-index: 0; }
        .haid-inner { position: relative; z-index: 1; max-width: 1200px; margin: 0 auto; padding: 48px 24px 80px; }
        .haid-header { text-align: center; margin-bottom: 48px; }
        .haid-header-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #b07060; margin-bottom: 16px; }
        .haid-header-eyebrow::before, .haid-header-eyebrow::after { content: ''; display: block; width: 28px; height: 1px; background: #b07060; opacity: 0.6; }
        .haid-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 600; color: #2d1f1f; line-height: 1.1; margin-bottom: 20px; }
        .haid-title em { font-style: italic; color: #a8604a; }
        .haid-legend { display: inline-flex; flex-wrap: wrap; justify-content: center; gap: 6px 16px; background: rgba(255,255,255,0.7); border: 1px solid rgba(176,112,96,0.2); border-radius: 100px; padding: 8px 20px; font-size: 12px; color: #7a5a52; margin-bottom: 12px; }
        .haid-legend span { white-space: nowrap; }
        .haid-legend strong { color: #a8604a; }
        .haid-user-badge { display: inline-flex; align-items: center; gap: 6px; background: white; border: 1px solid rgba(176,112,96,0.25); border-radius: 100px; padding: 5px 14px 5px 6px; font-size: 12px; color: #7a5a52; }
        .haid-user-avatar { width: 22px; height: 22px; background: linear-gradient(135deg, #c68672, #a8604a); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: 600; }
        .haid-form-card { background: white; border-radius: 20px; border: 1px solid rgba(176,112,96,0.15); box-shadow: 0 4px 24px rgba(168,96,74,0.07); padding: 32px; margin-bottom: 32px; }
        .haid-form-card-title { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 600; color: #2d1f1f; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
        .haid-form-card-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(to right, rgba(176,112,96,0.3), transparent); }
        .haid-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        @media (max-width: 600px) { .haid-form-row { grid-template-columns: 1fr; } }
        .haid-form-group { display: flex; flex-direction: column; gap: 10px; }
        .haid-form-label { font-size: 11px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #a8604a; }
        .haid-form-inputs { display: flex; gap: 8px; }
        .haid-form-inputs input { flex: 1; padding: 10px 14px; border: 1.5px solid rgba(176,112,96,0.25); border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #2d1f1f; background: #fdf8f5; outline: none; }
        .haid-form-inputs input:focus { border-color: #a8604a; box-shadow: 0 0 0 3px rgba(168,96,74,0.1); background: white; }
        .haid-btn-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .haid-btn { display: inline-flex; align-items: center; gap: 6px; padding: 11px 24px; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; border: none; cursor: pointer; transition: all 0.18s; }
        .haid-btn-save { background: linear-gradient(135deg, #c68672, #a8604a); color: white; box-shadow: 0 3px 12px rgba(168,96,74,0.3); }
        .haid-btn-save:hover { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(168,96,74,0.4); }
        .haid-btn-update { background: linear-gradient(135deg, #7a9e7e, #5a7d5e); color: white; box-shadow: 0 3px 12px rgba(90,125,94,0.3); }
        .haid-btn-update:hover { transform: translateY(-1px); }
        .haid-btn-cancel { background: white; color: #7a5a52; border: 1.5px solid rgba(176,112,96,0.3); }
        .haid-btn-cancel:hover { background: #fdf0eb; border-color: #a8604a; }
        .haid-section-title { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 600; color: #2d1f1f; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .haid-section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(to right, rgba(176,112,96,0.3), transparent); }
        .haid-table-wrap { background: white; border-radius: 20px; border: 1px solid rgba(176,112,96,0.15); box-shadow: 0 4px 24px rgba(168,96,74,0.07); overflow: hidden; margin-bottom: 40px; }
        .haid-calendar-wrap { background: white; border-radius: 20px; border: 1px solid rgba(176,112,96,0.15); box-shadow: 0 4px 24px rgba(168,96,74,0.07); padding: 28px; }
        .react-calendar { width: 100% !important; border: none !important; font-family: 'DM Sans', sans-serif !important; background: transparent !important; }
        .react-calendar__navigation button { font-family: 'Playfair Display', serif !important; font-size: 0.95rem !important; color: #2d1f1f !important; border-radius: 8px !important; }
        .react-calendar__navigation button:hover { background: #fdf0eb !important; }
        .react-calendar__tile { border-radius: 8px !important; font-size: 12px !important; transition: background 0.15s !important; position: relative; }
        .react-calendar__tile--active { background: #a8604a !important; color: white !important; }
        .react-calendar__tile:enabled:hover { background: #fdf0eb !important; }

        /* Solid color block tiles per warna */
        .haid-day-blocked { font-weight: 700 !important; color: white !important; }
        .haid-warna-hitam  { background: #222222 !important; }
        .haid-warna-merah  { background: #e53935 !important; }
        .haid-warna-coklat { background: #8d4e2a !important; }
        .haid-warna-kuning { background: #f9a825 !important; color: #2d1f1f !important; }
        .haid-warna-keruh  { background: #9e9e9e !important; }
        .haid-warna-default{ background: #e53935 !important; }
        .haid-day-blocked:hover { opacity: 0.85; }
        .haid-cal-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(176,112,96,0.15); }
        .haid-cal-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #7a5a52; }
        .haid-cal-legend-dot { width: 12px; height: 12px; border-radius: 50%; }
        .haid-day-panel { margin-top: 20px; background: #fdf8f5; border: 1px solid rgba(176,112,96,0.2); border-radius: 16px; padding: 20px; }
        .haid-day-panel-title { font-family: 'Playfair Display', serif; font-size: 1rem; font-weight: 600; color: #2d1f1f; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
        .haid-day-panel-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #7a5a52; padding: 0; }
        .haid-day-panel-row { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
        .haid-day-panel-group { display: flex; flex-direction: column; gap: 6px; }
        .haid-day-panel-label { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #a8604a; }
        .haid-day-panel-info { font-size: 13px; color: #2d1f1f; padding: 8px 12px; background: white; border-radius: 8px; border: 1px solid rgba(176,112,96,0.15); }
        .haid-day-panel-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .haid-btn-day-save { padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; background: linear-gradient(135deg, #c68672, #a8604a); color: white; transition: all 0.15s; }
        .haid-btn-day-save:disabled { opacity: 0.6; }
        .haid-btn-day-delete { padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; background: white; color: #c04a2e; border: 1.5px solid #c04a2e; transition: all 0.15s; }
        .haid-btn-day-delete:hover { background: #fff0ee; }
        .haid-modal-overlay { position: fixed; inset: 0; background: rgba(45,31,31,0.4); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
        .haid-modal { background: white; border-radius: 20px; padding: 36px; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(45,31,31,0.2); text-align: center; }
        .haid-modal-icon { width: 52px; height: 52px; background: linear-gradient(135deg, #fde8e0, #f5c4b2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 16px; }
        .haid-modal h2 { font-family: 'Playfair Display', serif; font-size: 1.2rem; color: #2d1f1f; margin-bottom: 8px; }
        .haid-modal p { font-size: 13px; color: #7a5a52; margin-bottom: 24px; line-height: 1.5; }
        .haid-modal-btns { display: flex; gap: 10px; justify-content: center; }
        .haid-modal-confirm { padding: 10px 22px; background: linear-gradient(135deg, #e07055, #c04a2e); color: white; border: none; border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; }
        .haid-modal-cancel { padding: 10px 22px; background: white; color: #7a5a52; border: 1.5px solid rgba(176,112,96,0.3); border-radius: 10px; font-size: 13px; font-weight: 500; cursor: pointer; }
        .haid-modal-cancel:hover { background: #fdf0eb; }
        .haid-editing-badge { display: inline-flex; align-items: center; gap: 6px; background: #fff8e8; border: 1px solid #e8c870; color: #9a7820; border-radius: 100px; padding: 4px 12px; font-size: 11px; font-weight: 500; margin-bottom: 16px; }
      `}</style>

      <div className="haid-root">
        <div className="haid-inner">

          {/* HEADER */}
          <header className="haid-header">
            <div className="haid-header-eyebrow">Catatan Haid</div>
            <h1 className="haid-title">Haid <em>Calculator</em></h1>
            <div className="haid-legend">
              <span><strong>KD</strong> Keluar Darah</span>
              <span><strong>B</strong> Bersih</span>
              <span><strong>AH</strong> Adat Haid</span>
              <span><strong>AS</strong> Adat Suci</span>
            </div>
            {user && (
              <div style={{ marginTop: 10 }}>
                <div className="haid-user-badge">
                  <div className="haid-user-avatar">{user.email?.[0]?.toUpperCase() ?? '?'}</div>
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
              <div className="haid-editing-badge">⚠️ Sedang mengedit data #{editingIndex + 1}</div>
            )}
            <div className="haid-form-row">
              {TABLE_HEADERS.map((label) => (
                <div key={label} className="haid-form-group">
                  <div className="haid-form-label">{label === 'KD' ? '🩸 Keluar Darah' : '✨ Bersih'}</div>
                  <div className="haid-form-inputs">
                    <input type="date" value={formData[label]?.date || ""} onChange={(e) => handleInputChange(label, "date", e.target.value)} />
                    <input type="time" value={formData[label]?.time || ""} onChange={(e) => handleInputChange(label, "time", e.target.value)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="haid-btn-row">
              {editingIndex === null ? (
                <button className="haid-btn haid-btn-save" onClick={handleSave}>Simpan Entry</button>
              ) : (
                <>
                  <button className="haid-btn haid-btn-update" onClick={handleUpdate}>✓ Update Entry</button>
                  <button className="haid-btn haid-btn-cancel" onClick={handleCancelEdit}>Batal</button>
                </>
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="haid-section-title">Riwayat Data</div>
          <div className="haid-table-wrap">
            <TableTemplate titles={TABLE_HEADERS} entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
          </div>

          {/* QODHO SHOLAT & PUASA */}
          <div className="haid-section-title">Qodho Sholat & Puasa</div>
          <div className="haid-table-wrap" style={{ padding: 20 }}>
            <QodhoSection entries={entries} />
          </div>

          {/* CALENDAR */}
          <div className="haid-section-title">Kalender Periode</div>
          <div className="haid-calendar-wrap">
            <Calendar
              onClickDay={handleDayClick}
              tileClassName={({ date }) => {
                const key = date.toISOString().split('T')[0];
                const info = calendarData[key];
                if (!info?.records?.length) return null;
                const latest = info.records[info.records.length - 1];
                return `haid-day-blocked haid-warna-${(latest.warna || 'default').toLowerCase()}`;
              }}
            />

            {/* Color legend */}
            <div className="haid-cal-legend">
              {WARNA_OPTIONS.map((w) => (
                <div key={w} className="haid-cal-legend-item">
                  <div className="haid-cal-legend-dot" style={{ background: WARNA_COLORS[w] }} />
                  {w}
                </div>
              ))}
              <div className="haid-cal-legend-item">
                <div className="haid-cal-legend-dot" style={{ background: 'rgba(176,112,96,0.25)' }} />
                Belum diisi
              </div>
            </div>

            {/* Day editor panel */}
            {selectedDay && (
              <div className="haid-day-panel">
                <div className="haid-day-panel-title">
                  <span>📅 {selectedDay}</span>
                  <button className="haid-day-panel-close" onClick={() => setSelectedDay(null)}>✕</button>
                </div>

                {/* Existing records for this day, sorted by time */}
                {dayRecords.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div className="haid-day-panel-label" style={{ marginBottom: 8 }}>📋 Catatan Hari Ini</div>
                    {dayRecords.map((rec, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'white', border: '1px solid rgba(176,112,96,0.15)',
                        borderRadius: 10, padding: '8px 12px', marginBottom: 6, fontSize: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <strong style={{ color: '#a8604a', minWidth: 42 }}>{rec.time}</strong>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: WARNA_COLORS[rec.warna] || '#ccc' }} />
                            {rec.warna || '-'}
                          </span>
                          <span>{rec.tekstur || '-'}</span>
                          <span>Bau: {rec.bau || '-'}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveRecord(idx)}
                          disabled={daySaving}
                          style={{ background: 'none', border: 'none', color: '#c04a2e', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                        >🗑</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new record form */}
                <div className="haid-day-panel-label" style={{ marginBottom: 8 }}>➕ Tambah Catatan Baru</div>
                <div className="haid-day-panel-row">
                  <div className="haid-day-panel-group">
                    <div className="haid-day-panel-label">⏰ Jam</div>
                    <input
                      type="time"
                      value={newRecord.time}
                      onChange={(e) => setNewRecord((p) => ({ ...p, time: e.target.value }))}
                      style={{
                        padding: '8px 12px', borderRadius: 10,
                        border: '1.5px solid rgba(176,112,96,0.25)',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                        background: '#fdf8f5', outline: 'none', width: 140,
                      }}
                    />
                  </div>

                  <div className="haid-day-panel-group">
                    <div className="haid-day-panel-label">🎨 Warna</div>
                    <Chip
                      value={newRecord.warna}
                      options={WARNA_OPTIONS}
                      onChange={(v) => setNewRecord((p) => ({ ...p, warna: v }))}
                      colorMap={WARNA_COLORS}
                    />
                  </div>

                  <div className="haid-day-panel-group">
                    <div className="haid-day-panel-label">💧 Tekstur</div>
                    <Chip
                      value={newRecord.tekstur}
                      options={TEKSTUR_OPTIONS}
                      onChange={(v) => setNewRecord((p) => ({ ...p, tekstur: v }))}
                    />
                  </div>

                  <div className="haid-day-panel-group">
                    <div className="haid-day-panel-label">👃 Bau</div>
                    <Chip
                      value={newRecord.bau}
                      options={BAU_OPTIONS}
                      onChange={(v) => setNewRecord((p) => ({ ...p, bau: v }))}
                    />
                  </div>
                </div>

                <div className="haid-day-panel-actions">
                  <button
                    className="haid-btn-day-save"
                    onClick={handleAddRecord}
                    disabled={daySaving || !newRecord.time}
                  >
                    {daySaving ? 'Menyimpan...' : '✓ Tambah Catatan'}
                  </button>
                  <button className="haid-btn haid-btn-cancel" style={{ padding: '9px 18px' }} onClick={() => setSelectedDay(null)}>
                    Tutup
                  </button>
                </div>
              </div>
            )}
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