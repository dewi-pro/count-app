import './Table.css';

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
import {
  convertDaysToDaysAndHours,
  diffBKD,
  formatDateTime,
  formatDecimalDays,
  getTotalBDays,
  parseDurationToDays,
} from './helper';

const WA_NUMBER = '620812992819912';

const parseHukumHaidPartFromString = (hukumStr) => {
  if (!hukumStr) return null;
  const match = hukumStr.match(/haid\s+([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
};

// const parseHukumIstihadohPartFromString = (hukumStr) => {
//   if (!hukumStr) return null;
//   const match = hukumStr.match(/ist(?:ihadoh)?\s+([\d.]+)/);
//   return match ? parseFloat(match[1]) : null;
// };

const EditableCell = ({ entryId, field, displayValue }) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const user = getAuth().currentUser;

  const startEdit = () => {
    setInputVal(displayValue === '-' ? '' : displayValue);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setInputVal('');
  };

  const saveEdit = async () => {
    if (!user || !entryId) return;
    setSaving(true);
    try {
      const entryRef = doc(db, 'users', user.uid, 'entries', entryId);
      await updateDoc(entryRef, {
        [field]: inputVal.trim() === '' ? null : inputVal.trim(),
      });
      setEditing(false);
    } catch (err) {
      console.error('Error saving override:', err);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="cth: 7 hari 0 jam"
          style={{
            width: '110px',
            padding: '2px 4px',
            fontSize: '0.8rem',
            border: '1px solid #aaa',
            borderRadius: '4px',
          }}
          autoFocus
        />
        <button
          onClick={saveEdit}
          disabled={saving}
          style={{
            padding: '2px 6px',
            fontSize: '0.75rem',
            background: '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {saving ? '...' : '✓'}
        </button>
        <button
          onClick={cancelEdit}
          style={{
            padding: '2px 6px',
            fontSize: '0.75rem',
            background: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span>{displayValue ?? '-'}</span>
      <button
        onClick={startEdit}
        title="Edit"
        style={{
          padding: '1px 5px',
          fontSize: '0.7rem',
          background: 'transparent',
          border: '1px solid #aaa',
          borderRadius: '3px',
          cursor: 'pointer',
          color: '#555',
          lineHeight: 1.4,
        }}
      >
        ✏️
      </button>
    </div>
  );
};

const TableTemplate = ({ titles, entries, onEdit, onDelete }) => {
  const processedTableData = useMemo(() => {
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.KD).getTime() - new Date(a.KD).getTime()
    );

    const tempProcessed = sortedEntries.map((entry, i) => ({
      ...entry,
      calculatedTotalKd: diffBKD(entry),
      calculatedTotalB: getTotalBDays(i, sortedEntries),
      haidHukum: '',
      istihadohHukum: '',
      siklusHaid: '-',
      ahValue: null,
      asValue: null,
      consultationLink: null,
      needsConsultation: false,
    }));

    // Step 1: Determine haidHukum
    tempProcessed.forEach((item) => {
      const totalKdDays = parseDurationToDays(item.calculatedTotalKd);
      if (totalKdDays !== null && totalKdDays <= 15) {
        let dec = formatDecimalDays(totalKdDays);
        item.haidHukum = `haid ${convertDaysToDaysAndHours(dec)}`;
      }
    });

    // Step 2: Calculate AH and AS
    for (let i = 0; i < tempProcessed.length; i++) {
      const item = tempProcessed[i];
      const totalKdDays = parseDurationToDays(item.calculatedTotalKd);
      const totalBDays = parseDurationToDays(item.calculatedTotalB);

      // Syarat valid AH/AS/Siklus tetap sama
      const kdValid = totalKdDays !== null && totalKdDays >= 1 && totalKdDays <= 15;
      const bValid = totalBDays !== null && totalBDays >= 15;

      // Kondisi konsultasi WA:
      // 1. KD > 15 hari, ATAU
      // 2. B < 15 hari DAN KD + B > 15 hari
      const totalBIsZero = totalBDays === null || totalBDays === 0;
      const totalKdIsZero = totalKdDays === null || totalKdDays === 0;
      const kdOver15 = !totalBIsZero && !totalKdIsZero && totalKdDays !== null && totalKdDays > 15;
      const kdPlusBOver15 =
        totalKdDays !== null &&
        totalBDays !== null &&
        !totalBIsZero && !totalKdIsZero &&
        totalBDays < 15 &&
        totalKdDays + totalBDays > 15;
      const needsWA = kdOver15 || kdPlusBOver15;

      const makeWaLink = (extraData = '') => {
        const msg =
          `Assalamualaikum,\n\nNama saya: (*silahkan isi nama anda*)\n` +
          `Saya ingin berkonsultasi mengenai istihadhoh.\n\n` +
          `Data:\n- Total KD: ${item.calculatedTotalKd}\n- Total B: ${item.calculatedTotalB}` +
          (extraData ? `\n${extraData}` : '') +
          `\n\nMohon bantuannya, terima kasih.`;
        return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
      };

      if (!kdValid) {
        item.siklusHaid = '-';
        if (!totalBIsZero && !totalKdIsZero) {
          item.needsConsultation = true;
          item.consultationLink = makeWaLink();
          item.ahValue = '-';
          item.asValue = '-';
        } else {
          item.ahValue = item.ahOverride ?? '-';
          item.asValue = item.asOverride ?? '-';
        }
        continue;
      }

      // --- AH --- (hitung selama kdValid, tidak peduli bValid)
      let ahNumeric = null;
      let ahDisplay = null;
      if (item.ahOverride != null) {
        ahDisplay = item.ahOverride;
        const parsed = parseDurationToDays(item.ahOverride);
        ahNumeric = parsed !== null ? parsed : parseHukumHaidPartFromString(`haid ${item.ahOverride}`);
      } else {
        ahNumeric = parseHukumHaidPartFromString(item.haidHukum);
        ahDisplay = ahNumeric !== null ? convertDaysToDaysAndHours(ahNumeric) : '-';
      }

      // Kalau bValid false, AS dan siklus tidak bisa dihitung
      if (!bValid) {
        if (needsWA) {
          item.needsConsultation = true;
          item.consultationLink = makeWaLink();
          item.ahValue = '-';
          item.asValue = '-';
        } else {
          item.ahValue = ahDisplay;
          item.asValue = item.asOverride ?? '-';
        }
        item.siklusHaid = '-';
        continue;
      }

      // --- AS ---
      // Ambil dari entry pertama (lookback ke lebih lama) yang Total B >= 15 hari
      let asNumeric = null;
      let asDisplay = null;
      if (item.asOverride != null) {
        asDisplay = item.asOverride;
        const parsed = parseDurationToDays(item.asOverride);
        asNumeric = parsed !== null ? parsed : totalBDays;
      } else {
        if (totalBDays !== null && totalBDays >= 15) {
          asNumeric = totalBDays;
        } else {
          // sortedEntries urutan desc (terbaru di atas), entry lebih lama ada di index lebih besar
          let lookbackIndex = i + 1;
          while (lookbackIndex < tempProcessed.length) {
            const olderEntry = tempProcessed[lookbackIndex];
            const olderTotalB = parseDurationToDays(olderEntry.calculatedTotalB);
            if (olderTotalB !== null && olderTotalB >= 15) {
              asNumeric = olderTotalB;
              break;
            }
            lookbackIndex++;
          }
        }
        asDisplay = asNumeric !== null ? convertDaysToDaysAndHours(asNumeric) : '-';
      }

      item.ahValue = ahDisplay;
      item.asValue = asDisplay;

      // --- Siklus Haid ---
      if (ahNumeric !== null && asNumeric !== null) {
        item.siklusHaid = `${formatDecimalDays(ahNumeric + asNumeric)} hari`;
      } else {
        item.siklusHaid = '-';
      }

      // Kondisi konsultasi WA
      if (needsWA) {
        item.needsConsultation = true;
        item.consultationLink = makeWaLink();
        item.ahValue = '-';
        item.asValue = '-';
        item.siklusHaid = '-';
      }
    }

    return tempProcessed;
  }, [entries]);

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {titles.map((title) => (
              <th key={title}>{title}</th>
            ))}
            <th>Total KD</th>
            <th>Total B</th>
            <th>AH</th>
            <th>AS</th>
            <th>Siklus Haid</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {processedTableData.length === 0 ? (
            <tr>
              <td colSpan={titles.length + 6} className="no-data">
                No entries yet.
              </td>
            </tr>
          ) : (
            processedTableData.map((entry, i) => (
              <tr key={entry.id || i}>
                <td className="card-title">{formatDateTime(entry.KD)}</td>
                <td data-label="KD">{formatDateTime(entry.KD)}</td>
                <td data-label="B">{formatDateTime(entry.B)}</td>
                <td data-label="Total KD">
                  {convertDaysToDaysAndHours(entry.calculatedTotalKd)}
                </td>
                <td data-label="Total B">
                  {convertDaysToDaysAndHours(entry.calculatedTotalB)}
                </td>

                <td data-label="AH">
                  <EditableCell
                    entryId={entry.id}
                    field="ahOverride"
                    displayValue={entry.ahValue ?? '-'}
                  />
                </td>

                <td data-label="AS">
                  <EditableCell
                    entryId={entry.id}
                    field="asOverride"
                    displayValue={entry.asValue ?? '-'}
                  />
                </td>

                <td data-label="Siklus Haid">
                  {entry.needsConsultation ? (
                    <span>
                      Anda terjangkit istihadhoh.{' '}
                      <a
                        href={entry.consultationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#25D366',
                          fontWeight: 'bold',
                          textDecoration: 'underline',
                        }}
                      >
                        Konsultasikan via WA
                      </a>
                    </span>
                  ) : (
                    entry.siklusHaid
                  )}
                </td>

                <td data-label="Actions">
                  <button onClick={() => onEdit(i)}>Edit</button>
                  <button onClick={() => onDelete(i)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TableTemplate;