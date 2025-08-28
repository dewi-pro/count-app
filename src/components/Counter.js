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
  onSnapshot,
  updateDoc,
} from 'firebase/firestore';
import Calendar from 'react-calendar';

import { db } from '../firebase';
import TableTemplate from './Table';

// Constants for table headers
const TABLE_HEADERS = ["KD", "B"];

const Counter = () => {
  const [formData, setFormData] = useState({});
  const [entries, setEntries] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [entryToDeleteIndex, setEntryToDeleteIndex] = useState(null);
  const user = getAuth().currentUser;

  // Use onSnapshot for real-time updates and sort by KD date to match the table component
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }
    const entriesColRef = collection(db, "users", user.uid, "entries");
    const unsubscribe = onSnapshot(entriesColRef, (querySnapshot) => {
      const fetchedEntries = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort entries by the 'KD' field in descending order (newest first)
      fetchedEntries.sort((a, b) => new Date(b.KD || 0) - new Date(a.KD || 0));
      setEntries(fetchedEntries);
    });

    // Cleanup function to detach the listener when the component unmounts
    return () => unsubscribe();
  }, [user]);

  // Helper function to create a date object from form data
  const createDateFromForm = (label) => {
    const date = formData[label]?.date;
    const time = formData[label]?.time;
    return date && time ? new Date(`${date}T${time}`).toISOString() : null;
  };

  const handleInputChange = (label, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [label]: {
        ...prev[label],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    // Create the new entry object
    const newEntry = {};
    for (const label of TABLE_HEADERS) {
      newEntry[label] = createDateFromForm(label);
    }

    // Check if at least one field has data
    if (Object.values(newEntry).every((v) => v === null)) {
      return; // Prevent saving empty entries
    }

    try {
      await addDoc(collection(db, "users", user.uid, "entries"), newEntry);
      setFormData({}); // Clear form after saving
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleUpdate = async () => {
    if (editingIndex === null || !user) return;

    const entryToUpdate = entries[editingIndex];
    const entryId = entryToUpdate.id;

    // Create a partial update object, merging old data with new form data.
    const updatedData = { ...entryToUpdate };
    for (const label of TABLE_HEADERS) {
      updatedData[label] = createDateFromForm(label);
    }

    try {
      await updateDoc(
        doc(db, "users", user.uid, "entries", entryId),
        updatedData
      );
      setEditingIndex(null); // Exit edit mode
      setFormData({}); // Clear form after updating
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  // New handler to cancel the edit process
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setFormData({});
  };

  // Function to show the confirmation modal
  const handleDelete = (index) => {
    setShowDeleteConfirmation(true);
    setEntryToDeleteIndex(index);
  };

  // Function to confirm and perform the deletion
  const confirmDelete = async () => {
    if (entryToDeleteIndex === null || !user) {
      // If no entry is selected, just close the modal
      setShowDeleteConfirmation(false);
      setEntryToDeleteIndex(null);
      return;
    }
    const entryToDelete = entries[entryToDeleteIndex];
    try {
      await deleteDoc(doc(db, "users", user.uid, "entries", entryToDelete.id));
    } catch (error) {
      console.error("Error deleting document: ", error);
    } finally {
      // Close the modal and reset the state
      setShowDeleteConfirmation(false);
      setEntryToDeleteIndex(null);
    }
  };

  // Function to cancel the deletion
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
    setEntryToDeleteIndex(null);
  };

  // This is the missing function to handle editing. It populates the form with the selected entry's data.
  const handleEdit = (index) => {
    setEditingIndex(index);
    const entry = entries[index];
    if (!entry) return; // Guard against a non-existent entry

    const newForm = {};
    for (const label of TABLE_HEADERS) {
      if (entry[label]) {
        const dateObj = new Date(entry[label]);
        // Handle potential invalid date objects gracefully
        if (!isNaN(dateObj.getTime())) {
          newForm[label] = {
            date: dateObj.toISOString().split("T")[0],
            time: dateObj.toTimeString().slice(0, 5),
          };
        }
      }
    }
    setFormData(newForm);

    // Scroll to the top of the page smoothly
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Memoize the calculation for calendar highlight dates to improve performance
  const kdHighlightDates = React.useMemo(() => {
    const getDatesBetween = (start, end) => {
      const dates = [];
      const current = new Date(start);
      while (current < end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    return entries.flatMap((entry) => {
      if (!entry.KD || !entry.B) return [];

      const kd = new Date(entry.KD);
      const b = new Date(entry.B);

      // Ensure valid dates before proceeding
      if (isNaN(kd.getTime()) || isNaN(b.getTime())) return [];

      const kdDate = new Date(kd.getFullYear(), kd.getMonth(), kd.getDate());
      const bDate = new Date(b.getFullYear(), b.getMonth(), b.getDate());

      if (kdDate >= bDate) return [];

      return getDatesBetween(kdDate, bDate);
    });
  }, [entries]);

  return (
    <div className="container">
      <h1 className="title">Counter Entries</h1>
      {user && (
  <div className="user-info">
    <span className="user-label">Logged in as:</span>
    <span className="user-email">{user.email}</span>
  </div>
)}
      <div className="form-row">
        {TABLE_HEADERS.map((label) => (
          <div key={label} className="form-group">
            <h3>{label}</h3>
            <input
              type="date"
              value={formData[label]?.date || ""}
              onChange={(e) => handleInputChange(label, "date", e.target.value)}
            />
            <input
              type="time"
              value={formData[label]?.time || ""}
              onChange={(e) => handleInputChange(label, "time", e.target.value)}
            />
          </div>
        ))}
      </div>
      {/* Conditionally render either the 'Save' button or the 'Update' and 'Cancel' buttons */}
      {editingIndex === null ? (
        <button className="btn btn-save" onClick={handleSave}>
          Save New Entry
        </button>
      ) : (
        <div className="button-group">
          <button className="btn btn-update" onClick={handleUpdate}>
            Update Entry
          </button>
          <button className="btn btn-cancel" onClick={handleCancelEdit}>
            Cancel
          </button>
        </div>
      )}
      <TableTemplate
        titles={TABLE_HEADERS}
        entries={entries}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <div className="calendar-container">
        <h2 className="calendar-title">KD Period Calendar</h2>
        <Calendar
          tileClassName={({ date }) => {
            const normalized = new Date(
              date.getFullYear(),
              date.getMonth(),
              date.getDate()
            );
            const isKD = kdHighlightDates.some(
              (d) => d.getTime() === normalized.getTime()
            );
            return isKD ? "kd-day" : null;
          }}
        />
      </div>

      {showDeleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Confirm Deletion</h2>
            <p>Are you sure you want to delete this data {" "+(entryToDeleteIndex+1)+" "}?</p>
            <div className="modal-buttons">
              <button className="confirm-button" onClick={confirmDelete}>
                Yes, Delete
              </button>
              <button className="cancel-button" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Counter;