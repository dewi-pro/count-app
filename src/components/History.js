// src/components/History.js
import React, {
  useEffect,
  useState,
} from 'react';

import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';

const History = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const q = query(
        collection(db, 'history'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs.map((doc) => doc.data());
      setHistory(results);
    };
    fetchHistory();
  }, [user]);

  return (
    <div>
      <h2>History for {user.email}</h2>
      <ul>
        {history.map((item, index) => (
          <li key={index}>
            Count: {item.count} - {item.createdAt?.toDate().toLocaleString() || 'pending...'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default History;
