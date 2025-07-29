import './Counter.css';
import 'react-calendar/dist/Calendar.css';

import React, {
  useEffect,
  useState,
} from 'react';

import { getAuth } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import Calendar from 'react-calendar';

import { db } from '../firebase';

const titles = ['KD', 'B'];

const Counter = () => {
  const [formData, setFormData] = useState({});
  const [savedEntries, setSavedEntries] = useState([]);
  const user = getAuth().currentUser;
const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const userDocRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSavedEntries(data.timestampsArray || []);
      }
    };
    fetchData();
  }, [user]);

  const handleChange = (label, field, value) => {
    setFormData(prev => ({
      ...prev,
      [label]: {
        ...prev[label],
        [field]: value,
      },
    }));
  };
const handleDelete = async (index) => {
  const updatedEntries = savedEntries.filter((_, i) => i !== index);
  setSavedEntries(updatedEntries);
  if (user) {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { timestampsArray: updatedEntries }, { merge: true });
  }
};

const handleEdit = (index) => {
  setEditingIndex(index);
  const entry = savedEntries[index];
  const newForm = {};
  for (const label of titles) {
    if (entry[label]) {
      const dateObj = new Date(entry[label]);
      newForm[label] = {
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toTimeString().slice(0, 5),
      };
    }
  }
  setFormData(newForm);
};

const handleUpdate = async () => {
  if (editingIndex === null) return;

  const updatedEntry = {};
  for (const label of titles) {
    const date = formData[label]?.date;
    const time = formData[label]?.time;
    updatedEntry[label] = date && time ? new Date(`${date}T${time}`).toISOString() : null;
  }

  const updatedEntries = savedEntries.map((entry, i) =>
    i === editingIndex ? updatedEntry : entry
  );

  if (user) {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, { timestampsArray: updatedEntries }, { merge: true });
  }

  setSavedEntries(updatedEntries);
  setEditingIndex(null);
  setFormData({});
};

  const handleSave = async () => {
    if (!user) return;

    const newEntry = {};
    for (const label of titles) {
      const date = formData[label]?.date;
      const time = formData[label]?.time;
      if (date && time) {
        newEntry[label] = new Date(`${date}T${time}`).toISOString();
      } else {
        newEntry[label] = null;
      }
    }

    const userDocRef = doc(db, 'users', user.uid);
    const updatedEntries = [...savedEntries, newEntry];

    await setDoc(userDocRef, { timestampsArray: updatedEntries }, { merge: true });

    setSavedEntries(updatedEntries);
    setFormData({});
  };

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const diffBKD = (entry) => {
    if (!entry.B || !entry.KD) return '-';
    const bDate = new Date(entry.B);
    const kdDate = new Date(entry.KD);
    const diffMs = bDate - kdDate;
    if (diffMs < 0) return '-';

    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 24
      ? `${Math.floor(diffHours)} hours`
      : `${Math.floor(diffHours/24)} days`;
  };

  const getTotalB = (i) => {
  const b = savedEntries[i]?.B;
  const nextKD = savedEntries[i + 1]?.KD;

  if (!b || !nextKD) return '-';

  const bDate = new Date(b);
  const nextKDDate = new Date(nextKD);

  const diffMs = nextKDDate - bDate;
  if (diffMs <= 0) return '-';

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return `${Math.floor(diffDays)} days`;
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

  const kdHighlightDates = savedEntries.flatMap(entry => {
    if (!entry.KD || !entry.B) return [];

    const kd = new Date(entry.KD);
    const b = new Date(entry.B);

    const kdDate = new Date(kd.getFullYear(), kd.getMonth(), kd.getDate());
    const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());

    if (kdDate >= bDate) return [];

    return getDatesBetween(kdDate, bDate);
  });

  return (
    <div className="container">
      <h1 className="title">Counter Entries</h1>

      <div className="form-row">
        {titles.map(label => (
          <div key={label} className="form-group">
            <h3>{label}</h3>
            <input
              type="date"
              value={formData[label]?.date || ''}
              onChange={e => handleChange(label, 'date', e.target.value)}
            />
            <input
              type="time"
              value={formData[label]?.time || ''}
              onChange={e => handleChange(label, 'time', e.target.value)}
            />
          </div>
        ))}
      </div>

      <button className="save-button" onClick={editingIndex === null ? handleSave : handleUpdate}>
  {editingIndex === null ? 'Save Entry' : 'Update Entry'}
</button>


      <table className="table">
        <thead>
  <tr>
    {titles.map(label => (
      <th key={label}>{label}</th>
    ))}
    <th>total KD</th>
    <th>TOTAL B</th>
    <th>Actions</th>
  </tr>
</thead>
<tbody>
  {savedEntries.length === 0 ? (
    <tr>
      <td colSpan={titles.length + 3} className="no-data">
        No entries yet.
      </td>
    </tr>
  ) : (
    savedEntries.map((entry, i) => (
      <tr key={i}>
        {titles.map(label => (
          <td key={label}>{formatDateTime(entry[label])}</td>
        ))}
        <td>{diffBKD(entry)}</td>
        <td>{getTotalB(i)}</td>
        <td>
          <button onClick={() => handleEdit(i)}>Edit</button>
          <button onClick={() => handleDelete(i)}>Delete</button>
        </td>
      </tr>
    ))
  )}
</tbody>


      </table>

      <div className="calendar-container">
        <h2 className="calendar-title">KD Period Calendar</h2>
        <Calendar
            tileClassName={({ date }) => {
            const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const isKD = kdHighlightDates.some(
                d => d.getTime() === normalized.getTime()
            );
            return isKD ? 'kd-day' : null;
            }}
        />
        </div>

    </div>
  );
};

export default Counter;
