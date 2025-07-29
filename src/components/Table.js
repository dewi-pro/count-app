import './Table.css'; // Make sure to create this

// src/components/Login.js
import React from 'react';

const TableTemplate = ({ titles, entries, onEdit, onDelete }) => {
  const formatDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  const diffBKD = (entry) => {
    if (!entry.B || !entry.KD) return '-';
    const b = new Date(entry.B);
    const kd = new Date(entry.KD);
    const diff = b - kd;
    if (diff <= 0) return '-';
    const hours = diff / (1000 * 60 * 60);
    return hours < 24 ? `${hours.toFixed(1)} hours` : `${Math.floor(hours /24)} days`;
  };

  const getTotalBDays = (i) => {
    const b = entries[i]?.B;
    const nextKD = entries[i - 1]?.KD;
    if (!b || !nextKD) return '-';
    const bDate = new Date(b);
    const nextKDDate = new Date(nextKD);
    const diff = nextKDDate - bDate;
    return diff <= 0 ? '-' : `${Math.floor(diff / (1000 * 60 * 60 * 24))} days`;
  };

  return (
    <table className="table">
      <thead>
        <tr>
          {titles.map(title => (
            <th key={title}>{title}</th>
          ))}
          <th>Total KD</th>
          <th>Total B</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {entries.length === 0 ? (
          <tr>
            <td colSpan={titles.length + 3} className="no-data">No entries yet.</td>
          </tr>
        ) : (
          entries.map((entry, i) => (
            <tr key={entry.id || i}>
              {titles.map(label => (
                <td key={label}>{formatDateTime(entry[label])}</td>
              ))}
              <td>{diffBKD(entry)}</td>
              <td>{getTotalBDays(i)}</td>
              <td>
                <button onClick={() => onEdit(i)}>Edit</button>
                <button onClick={() => onDelete(i)}>Delete</button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

export default TableTemplate;