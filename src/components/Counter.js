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
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import Calendar from 'react-calendar';

import { db } from '../firebase';
import TableTemplate from './Table';

const titles = ['KD', 'B'];

const Counter = () => {
  const [formData, setFormData] = useState({});
  const [savedEntries, setSavedEntries] = useState([]);
  const user = getAuth().currentUser;
const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
  if (!user) return;
  fetchEntries();
}, [user]);

const fetchEntries = async () => {
  const entriesColRef = collection(db, 'users', user.uid, 'entries');
  const querySnapshot = await getDocs(entriesColRef);
  const entries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // Sort newest on top if needed
  entries.sort((a, b) => new Date(b.B || 0) - new Date(a.B || 0));
  setSavedEntries(entries);
};

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
  const entryToDelete = savedEntries[index];
  if (!user || !entryToDelete?.id) return;

  await deleteDoc(doc(db, 'users', user.uid, 'entries', entryToDelete.id));
  fetchEntries();
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
  if (editingIndex === null || !user) return;

  const entryId = savedEntries[editingIndex].id;
  const updatedEntry = {};
  for (const label of titles) {
    const date = formData[label]?.date;
    const time = formData[label]?.time;
    updatedEntry[label] = (date && time) ? new Date(`${date}T${time}`).toISOString() : null;
  }

  await updateDoc(doc(db, 'users', user.uid, 'entries', entryId), updatedEntry);
  setEditingIndex(null);
  setFormData({});
  fetchEntries();
};

  const handleSave = async () => {
  if (!user) return;

  const newEntry = {};
  for (const label of titles) {
    const date = formData[label]?.date;
    const time = formData[label]?.time;
    newEntry[label] = (date && time) ? new Date(`${date}T${time}`).toISOString() : null;
  }

  await addDoc(collection(db, 'users', user.uid, 'entries'), newEntry);
  setFormData({});
  fetchEntries(); // refresh table
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

<TableTemplate
  titles={['KD', 'B']}
  entries={savedEntries}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

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
