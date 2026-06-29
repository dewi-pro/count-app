import {
  useMemo,
  useState,
} from 'react';

import { getAuth } from 'firebase/auth';
import {
  doc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

const SHOLAT_LIST = [
  { key: 'subuh', label: 'Subuh' },
  { key: 'dzuhur', label: 'Dzuhur' },
  { key: 'ashar', label: 'Ashar' },
  { key: 'maghrib', label: 'Maghrib' },
  { key: 'isya', label: 'Isya' },
];

// (logika jam-per-sholat tidak dipakai lagi; sekarang full 5 waktu di hari KD & B)

// Estimasi rentang tanggal Masehi bulan Ramadhan (perkiraan kalender Hijriah).
const RAMADHAN_RANGES = [
  { year: 2023, start: '2023-03-23', end: '2023-04-20' },
  { year: 2024, start: '2024-03-11', end: '2024-04-09' },
  { year: 2025, start: '2025-03-01', end: '2025-03-30' },
  { year: 2026, start: '2026-02-18', end: '2026-03-19' },
  { year: 2027, start: '2027-02-08', end: '2027-03-09' },
  { year: 2028, start: '2028-01-28', end: '2028-02-26' },
];

const isInRamadhan = (dateKey) => {
  const d = new Date(dateKey);
  return RAMADHAN_RANGES.some((r) => d >= new Date(r.start) && d <= new Date(r.end));
};

const getDatesBetween = (start, end) => {
  const dates = [];
  const current = new Date(start);
  while (current < end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const dateKey = (d) => d.toISOString().split('T')[0];

const QodhoSection = ({ entries }) => {
  const user = getAuth().currentUser;
  const [savingKey, setSavingKey] = useState(null);
  const [expandedEntry, setExpandedEntry] = useState(null);

  // Build per-entry data: full day list (for puasa) + 2 edge-sholat (KD day & B day)
  const entriesWithDays = useMemo(() => {
    return entries
      .map((entry) => {
        if (!entry.KD || !entry.B) return null;
        const kd = new Date(entry.KD);
        const b = new Date(entry.B);
        if (isNaN(kd.getTime()) || isNaN(b.getTime())) return null;
        const kdDate = new Date(kd.getFullYear(), kd.getMonth(), kd.getDate());
        const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());
        if (kdDate >= bDate) return null;

        // Semua hari (untuk puasa)
        const days = getDatesBetween(kdDate, bDate).map((d) => dateKey(d));

        // Sholat qodho: FULL 5 waktu di hari KD dan hari B (hari tengah tidak ada qodho sholat)
        const kdDay = dateKey(kdDate);
        const bDay = dateKey(bDate);

        return {
          ...entry,
          days,
          edgeDays: [
            { day: kdDay, label: 'Awal Haid (KD)', time: kd },
            { day: bDay, label: 'Akhir Haid (B)', time: b },
          ],
        };
      })
      .filter(Boolean);
  }, [entries]);

  const toggleSholat = async (entry, day, sholatKey) => {
    if (!user) return;
    const fieldKey = `${entry.id}-${day}-${sholatKey}`;
    setSavingKey(fieldKey);
    try {
      const current = entry.qodhoSholat?.[day]?.[sholatKey] || false;
      const updatedQodho = {
        ...(entry.qodhoSholat || {}),
        [day]: {
          ...(entry.qodhoSholat?.[day] || {}),
          [sholatKey]: !current,
        },
      };
      const entryRef = doc(db, 'users', user.uid, 'entries', entry.id);
      await updateDoc(entryRef, { qodhoSholat: updatedQodho });
    } catch (e) {
      console.error('Error updating qodho sholat:', e);
    } finally {
      setSavingKey(null);
    }
  };

  const togglePuasa = async (entry, day) => {
    if (!user) return;
    const fieldKey = `${entry.id}-${day}-puasa`;
    setSavingKey(fieldKey);
    try {
      const current = entry.qodhoPuasa?.[day] || false;
      const updatedPuasa = {
        ...(entry.qodhoPuasa || {}),
        [day]: !current,
      };
      const entryRef = doc(db, 'users', user.uid, 'entries', entry.id);
      await updateDoc(entryRef, { qodhoPuasa: updatedPuasa });
    } catch (e) {
      console.error('Error updating qodho puasa:', e);
    } finally {
      setSavingKey(null);
    }
  };

  const getSholatProgress = (entry) => {
    let done = 0;
    const total = entry.edgeDays.length * SHOLAT_LIST.length; // 2 hari x 5 waktu = 10
    entry.edgeDays.forEach(({ day }) => {
      SHOLAT_LIST.forEach(({ key }) => {
        if (entry.qodhoSholat?.[day]?.[key]) done++;
      });
    });
    return { done, total };
  };

  const getPuasaDays = (entry) => entry.days.filter((d) => isInRamadhan(d));

  const getPuasaProgress = (entry) => {
    const puasaDays = getPuasaDays(entry);
    const done = puasaDays.filter((d) => entry.qodhoPuasa?.[d]).length;
    return { done, total: puasaDays.length };
  };

  if (entriesWithDays.length === 0) {
    return <div className="qodho-empty">Belum ada data KD untuk menghitung qodho.</div>;
  }

  return (
    <div className="qodho-wrap">
      <style>{`
        .qodho-empty { padding: 20px; text-align: center; color: #7a5a52; font-size: 13px; }
        .qodho-entry-card { border: 1px solid rgba(176,112,96,0.15); border-radius: 14px; margin-bottom: 14px; overflow: hidden; background: #fdf8f5; }
        .qodho-entry-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; background: white; transition: background 0.15s; }
        .qodho-entry-header:hover { background: #fff8f5; }
        .qodho-entry-title { font-size: 13px; font-weight: 600; color: #2d1f1f; }
        .qodho-entry-sub { font-size: 11px; color: #7a5a52; margin-top: 2px; }
        .qodho-progress-pill { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .qodho-badge { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 100px; white-space: nowrap; }
        .qodho-badge-sholat { background: #eaf2ea; color: #5a7d5e; }
        .qodho-badge-puasa { background: #fdeee8; color: #c04a2e; }
        .qodho-badge-complete { background: #e6f4ea; color: #2e7d32; }
        .qodho-chevron { color: #a8604a; font-size: 12px; transition: transform 0.2s; }
        .qodho-chevron.open { transform: rotate(180deg); }
        .qodho-entry-body { padding: 4px 20px 18px; }
        .qodho-section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #a8604a; margin: 14px 0 8px; }
        .qodho-edge-block { padding: 10px 0; border-top: 1px dashed rgba(176,112,96,0.2); }
        .qodho-edge-block:first-of-type { border-top: none; }
        .qodho-edge-meta { font-size: 11px; color: #7a5a52; margin-bottom: 6px; }
        .qodho-day-block { padding: 8px 0; border-top: 1px dashed rgba(176,112,96,0.15); }
        .qodho-day-label { font-size: 12px; font-weight: 600; color: #a8604a; margin-bottom: 6px; }
        .qodho-checks-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .qodho-check-chip { padding: 6px 12px; border-radius: 100px; font-size: 11px; font-weight: 500; border: 1.5px solid rgba(176,112,96,0.25); background: white; color: #7a5a52; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 5px; }
        .qodho-check-chip.done { background: #5a7d5e; border-color: #5a7d5e; color: white; }
        .qodho-check-chip.puasa-chip { min-width: 90px; justify-content: center; }
        .qodho-check-chip.puasa-chip.done { background: #c04a2e; border-color: #c04a2e; }
        .qodho-puasa-grid { display: flex; flex-wrap: wrap; gap: 6px; }
      `}</style>

      {entriesWithDays.map((entry) => {
        const sholatProg = getSholatProgress(entry);
        const puasaDays = getPuasaDays(entry);
        const puasaProg = getPuasaProgress(entry);
        const isOpen = expandedEntry === entry.id;
        const sholatComplete = sholatProg.total > 0 && sholatProg.done === sholatProg.total;
        const puasaComplete = puasaProg.total > 0 && puasaProg.done === puasaProg.total;

        return (
          <div key={entry.id} className="qodho-entry-card">
            <div className="qodho-entry-header" onClick={() => setExpandedEntry(isOpen ? null : entry.id)}>
              <div>
                <div className="qodho-entry-title">
                  🩸 {new Date(entry.KD).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="qodho-entry-sub">{entry.days.length} hari haid</div>
              </div>
              <div className="qodho-progress-pill">
                <span className={`qodho-badge ${sholatComplete ? 'qodho-badge-complete' : 'qodho-badge-sholat'}`}>
                  🕌 {sholatProg.done}/{sholatProg.total} sholat
                </span>
                {puasaProg.total > 0 && (
                  <span className={`qodho-badge ${puasaComplete ? 'qodho-badge-complete' : 'qodho-badge-puasa'}`}>
                    🌙 {puasaProg.done}/{puasaProg.total} puasa
                  </span>
                )}
                <span className={`qodho-chevron ${isOpen ? 'open' : ''}`}>▾</span>
              </div>
            </div>

            {isOpen && (
              <div className="qodho-entry-body">

                {/* Qodho Sholat: FULL 5 waktu di hari KD & hari B */}
                <div className="qodho-section-label">🕌 Qodho Sholat (hari awal & akhir haid)</div>
                {entry.edgeDays.map(({ day, label, time }) => (
                  <div key={day} className="qodho-edge-block">
                    <div className="qodho-edge-meta">
                      {label} — {time.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="qodho-checks-row">
                      {SHOLAT_LIST.map(({ key, label: sLabel }) => {
                        const done = entry.qodhoSholat?.[day]?.[key] || false;
                        const saving = savingKey === `${entry.id}-${day}-${key}`;
                        return (
                          <button
                            key={key}
                            className={`qodho-check-chip ${done ? 'done' : ''}`}
                            onClick={() => toggleSholat(entry, day, key)}
                            disabled={saving}
                          >
                            {done ? '✓' : ''} {sLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Qodho Puasa: semua hari dalam Ramadhan */}
                {puasaDays.length > 0 && (
                  <>
                    <div className="qodho-section-label">🌙 Qodho Puasa (hari Ramadhan)</div>
                    <div className="qodho-puasa-grid">
                      {puasaDays.map((day) => {
                        const done = entry.qodhoPuasa?.[day] || false;
                        const saving = savingKey === `${entry.id}-${day}-puasa`;
                        const dayDate = new Date(day);
                        return (
                          <button
                            key={day}
                            className={`qodho-check-chip puasa-chip ${done ? 'done' : ''}`}
                            onClick={() => togglePuasa(entry, day)}
                            disabled={saving}
                          >
                            {done ? '✓' : ''} {dayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default QodhoSection;