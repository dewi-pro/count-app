import './Counter.css';

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

import { db } from '../firebase';

const titles = ['KD', 'B'];

const Counter = () => {
  const [formData, setFormData] = useState({});
  const [savedEntries, setSavedEntries] = useState([]);
  const user = getAuth().currentUser;

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

  // Calculate difference between B and KD in hours or days
  const diffBKD = (entry) => {
    if (!entry.B || !entry.KD) return '-';
    const bDate = new Date(entry.B);
    const kdDate = new Date(entry.KD);
    const diffMs = bDate - kdDate;
    if (diffMs < 0) return '-'; // B earlier than KD — no negative difference

    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 24) {
      return `${diffHours.toFixed(1)} hours`;
    } else {
      const diffDays = diffHours / 24;
      return `${diffDays.toFixed(2)} days`;
    }
  };

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

      <button className="save-button" onClick={handleSave}>
        Save Entry
      </button>

      <table className="table">
        <thead>
          <tr>
            {titles.map(label => (
              <th key={label}>{label}</th>
            ))}
            <th>B - KD</th>
          </tr>
        </thead>
        <tbody>
          {savedEntries.length === 0 && (
            <tr>
              <td colSpan={titles.length + 1} className="no-data">
                No entries yet.
              </td>
            </tr>
          )}
          {savedEntries.map((entry, i) => (
            <tr key={i}>
              {titles.map(label => (
                <td key={label}>{formatDateTime(entry[label])}</td>
              ))}
              <td>{diffBKD(entry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Counter;
