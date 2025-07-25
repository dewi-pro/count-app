// src/components/History.js
import React, {
  useEffect,
  useState,
} from 'react';

import {
  doc,
  getDoc,
} from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

const History = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
  const fetchHistory = async () => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const timestamps = data.timestamps || {};
      // Convert object to array of { label, time }
      const historyArray = Object.entries(timestamps).map(([label, time]) => ({
        label,
        time,
      }));
      setHistory(historyArray);
    } else {
      console.warn('User document not found');
    }
  };

  fetchHistory();
}, [user]);

  return (
    <div>
      <h2>History for {user.email}</h2>
      <ul>
        {history.map((item) => (
            <div key={item.label} className="p-2 border-b">
                <strong>{item.label}:</strong> {new Date(item.time).toLocaleString()}
            </div>
            ))}
      </ul>
    </div>
  );
};

export default History;
