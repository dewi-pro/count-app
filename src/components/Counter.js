import React, {
  useEffect,
  useState,
} from 'react';

import { getAuth } from 'firebase/auth';
import {
  deleteField,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

const titles = ['KD', 'B', 'AH', 'AS'];

const Counter = () => {
  const [formData, setFormData] = useState({});
  const [savedData, setSavedData] = useState({});
  const user = getAuth().currentUser;

  useEffect(() => {
    const fetchSaved = async () => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setSavedData(snap.data()?.timestamps || {});
      }
    };
    fetchSaved();
  }, [user]);

  const handleChange = (label, field, value) => {
    setFormData(prev => ({
      ...prev,
      [label]: {
        ...prev[label],
        [field]: value
      }
    }));
  };

  const handleSubmit = async (label) => {
    if (!user || !formData[label]?.date || !formData[label]?.time) return;

    const combinedISO = new Date(`${formData[label].date}T${formData[label].time}`).toISOString();
    const userRef = doc(db, 'users', user.uid);

    await setDoc(userRef, {
      timestamps: {
        ...savedData,
        [label]: combinedISO
      }
    }, { merge: true });

    setSavedData(prev => ({
      ...prev,
      [label]: combinedISO
    }));
  };

  const handleDelete = async (label) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      [`timestamps.${label}`]: deleteField()
    });

    const updated = { ...savedData };
    delete updated[label];
    setSavedData(updated);
  };

  const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="max-w-md mx-auto space-y-6 p-4">
      {titles.map(label => (
        <div key={label} className="p-4 bg-gray-100 rounded shadow space-y-2">
          <h2 className="text-lg font-semibold">{label}</h2>
          <div className="flex flex-col gap-2">
            <input
              type="date"
              value={formData[label]?.date || ''}
              onChange={(e) => handleChange(label, 'date', e.target.value)}
              className="border p-2 rounded"
            />
            <input
              type="time"
              value={formData[label]?.time || ''}
              onChange={(e) => handleChange(label, 'time', e.target.value)}
              className="border p-2 rounded"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit(label)}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
              <button
                onClick={() => handleDelete(label)}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Delete
              </button>
            </div>
            {savedData[label] && (
              <p className="text-sm text-gray-700">
                Last saved: <strong>{formatDateTime(savedData[label])}</strong>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Counter;
