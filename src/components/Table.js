import './Table.css';

import { useMemo } from 'react';

import moment from 'moment'; // Import moment.js here

const TableTemplate = ({ titles, entries, onEdit, onDelete }) => {
  // --- Helper Functions ---
  const formatDateTime = (iso) => {
    if (!iso) return "-";
    return moment(iso).format("DD/MM/YYYY HH:mm");
  };

  const formatDecimalDays = (num) => {
    if (num === null || isNaN(num)) return "-";
    const formatted = num.toFixed(2);
    if (formatted.endsWith(".00")) {
      return formatted.slice(0, -3);
    }
    return formatted;
  };

  const parseDurationToDays = (durationString) => {
    if (!durationString || durationString === "-") return null;
    const parts = durationString.split(" ");
    const value = parseFloat(parts[0]);
    const unit = parts[1];
    if (unit === "days") {
      return value;
    } else if (unit === "hours") {
      return value / 24;
    }
    return null;
  };

  const parseHukumHaidPartFromString = (hukumString) => {
    if (!hukumString) return null;
    const haidMatch = hukumString.match(/haid (\d+(\.\d+)?) days/);
    if (haidMatch && haidMatch[1]) {
      return parseFloat(haidMatch[1]);
    }
    return null;
  };

  const parseHukumIstihadohPartFromString = (hukumString) => {
    if (!hukumString) return null;
    let istihadohMatch = hukumString.match(/istihadoh (\d+(\.\d+)?) days/);
    if (!istihadohMatch) {
      istihadohMatch = hukumString.match(/ist (\d+(\.\d+)?) days/);
    }
    if (istihadohMatch && istihadohMatch[1]) {
      return parseFloat(istihadohMatch[1]);
    }
    return null;
  };

  const diffBKD = (entry) => {
    if (!entry.B || !entry.KD) return "-";
    const b = new Date(entry.B);
    const kd = new Date(entry.KD);
    const diff = b - kd;
    if (diff <= 0) return "-";

    const hours = diff / (1000 * 60 * 60);
    if (hours < 24) {
      return `${hours.toFixed(1)} hours`;
    } else {
      let days = hours / 24;
      return `${days.toFixed(2)} days`;
    }
  };

  const getTotalBDays = (i, sortedEntries) => {
    const b = sortedEntries[i]?.B;
    const nextKD = sortedEntries[i - 1]?.KD;
    if (!b || !nextKD) return "-";
    const bDate = new Date(b);
    const nextKDDate = new Date(nextKD);
    const diff = nextKDDate - bDate;
    const days = diff / (1000 * 60 * 60 * 24);
    return diff <= 0 ? "-" : `${formatDecimalDays(days)} days`;
  };

  // --- Main Data Processing Logic ---
  const processedTableData = useMemo(() => {
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(b.KD).getTime() - new Date(a.KD).getTime()
    );

    const tempProcessed = sortedEntries.map((entry, i) => ({
      ...entry,
      calculatedTotalKd: diffBKD(entry),
      calculatedTotalB: getTotalBDays(i, sortedEntries),
      haidHukum: "",
      istihadohHukum: "",
      siklusHaid: "-",
      ahAs: "-",
      consultationLink: null,
    }));

    tempProcessed.forEach((item, i) => {
      const totalKdDays = parseDurationToDays(item.calculatedTotalKd);
      if (totalKdDays !== null && totalKdDays <= 15) {
        item.haidHukum = `haid ${formatDecimalDays(totalKdDays)} days`;
      }
    });

    for (let i = 0; i < tempProcessed.length; i++) {
      const currentEntry = tempProcessed[i];
      const prevEntry = tempProcessed[i - 1];
      const currentTotalBDays = parseDurationToDays(
        currentEntry.calculatedTotalB
      );
      const prevTotalKdDays = parseDurationToDays(prevEntry?.calculatedTotalKd);
      const currentHaidDays =
        parseHukumHaidPartFromString(currentEntry.haidHukum) || 0;
      const prevBleedingDays =
        parseDurationToDays(prevEntry?.calculatedTotalKd) || 0;
      const sumOfCurrentCycle = currentHaidDays + currentTotalBDays;

      if (parseDurationToDays(currentEntry.calculatedTotalKd) > 15) {
        let ist = parseDurationToDays(currentEntry.calculatedTotalKd) - 15;
        currentEntry.istihadohHukum = `ist ${formatDecimalDays(ist)} days`;
        currentEntry.haidHukum = `haid ${formatDecimalDays(15)} days`;
        currentEntry.calculatedTotalB = `${formatDecimalDays(
          ist + currentTotalBDays
        )} days`;
        if (currentTotalBDays !== null && prevTotalKdDays !== null) {
          const sumOfDurations = currentTotalBDays + prevTotalKdDays;
          if (sumOfDurations > 15) {
            const excessDays = sumOfDurations - 15;
            const haid = Math.min(excessDays, prevTotalKdDays);
            const istihadohPart = Math.max(0, 15 - currentTotalBDays);
            if (istihadohPart > 0) {
              prevEntry.istihadohHukum = `ist ${formatDecimalDays(
                istihadohPart
              )} days`;
            }
            prevEntry.haidHukum = `haid ${formatDecimalDays(haid)} days`;
          } else {
            prevEntry.istihadohHukum = `istihadoh ${formatDecimalDays(
              prevTotalKdDays
            )} days`;
            prevEntry.haidHukum = "";
          }
        }
      } else if (
        sumOfCurrentCycle < 15 &&
        sumOfCurrentCycle + prevBleedingDays < 15
      ) {

        // --- CORRECTED LOGIC IMPLEMENTATION ---
        if (currentHaidDays !== null) {
          let lookbackIndex = i - 1;
          let sumH = sumOfCurrentCycle;
       
          while (sumH <= 15 && lookbackIndex >= 0) {

            const previousEntry = tempProcessed[lookbackIndex];
            const haidOfPrevious = parseDurationToDays(
              previousEntry.calculatedTotalKd
            );
            // Check and add haid days
            if (sumH <= 15) {
              sumH += haidOfPrevious;
            }
            // Check and add clean days
            if (sumH <= 15) {
              const previousTotalB = parseDurationToDays(
                previousEntry.calculatedTotalB
              );
              if (previousTotalB !== null) {
                sumH += previousTotalB;                
              }
            }

            // Check for any other exit conditions you may have
            // If you have any other 'if' statements that use 'break', add a log before it
            // For example:
            if (sumH > 15) {

              break;
            }

            lookbackIndex--;
          }
          if(sumH>15){
              let ist = sumH - 15;
               const calculatedKdAsNumber = parseDurationToDays(tempProcessed[lookbackIndex].calculatedTotalKd);
              tempProcessed[lookbackIndex].istihadohHukum = `ist ${formatDecimalDays(
                ist
              )} days`;
            
            tempProcessed[lookbackIndex].haidHukum = `haid ${formatDecimalDays(calculatedKdAsNumber-ist)} days`;
            
          }
        }
      }
    }

    for (let i = 1; i < tempProcessed.length; i++) {
      const currentItem = tempProcessed[i];
      const prevEntry = tempProcessed[i - 1];
      prevEntry.consultationLink = null;
      const currentHaidDays =
        parseHukumHaidPartFromString(currentItem.haidHukum) || 0;
      const currentPurityDays =
        parseDurationToDays(currentItem.calculatedTotalB) || 0;
      const prevBleedingDays =
        parseDurationToDays(prevEntry?.calculatedTotalKd) || 0;
      const sumOfCurrentCycle = currentHaidDays + currentPurityDays;

      if (sumOfCurrentCycle < 15 && sumOfCurrentCycle + prevBleedingDays > 15) {
        
        prevEntry.haidHukum = "taqottu'";
        prevEntry.istihadohHukum = "";
        const phoneNumber = "6285745175624";
        const message = `Assalamualaikum, saya ingin konsultasi kasus taqottu'.\n\nData terkait:\n- Siklus saat ini: Haid ${formatDecimalDays(
          currentHaidDays
        )} hari, lalu suci ${formatDecimalDays(
          currentPurityDays
        )} hari.\n- Darah setelahnya: ${formatDecimalDays(
          prevBleedingDays
        )} hari.\n\nMohon bantuannya, terima kasih.`;
        prevEntry.consultationLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
          message
        )}`;
      }
    }

    // //AH AS VALUE
    // for (let i = 0; i < tempProcessed.length; i++) {
    //   const item = tempProcessed[i];
    //   let ahValue = parseHukumHaidPartFromString(item.haidHukum);
    //   if (ahValue === null) {
    //     item.ahAs = "-";
    //     continue;
    //   }
    //   let asValue = parseDurationToDays(item.calculatedTotalB);
    //   if (asValue !== null) {
    //     let lookbackIndex = i - 1;
    //     while (asValue < 15 && lookbackIndex >= 0) {
    //       const previousEntry = tempProcessed[lookbackIndex];
    //       const istihadohOfPrevious = parseHukumIstihadohPartFromString(
    //         previousEntry.istihadohHukum
    //       );
    //       if (istihadohOfPrevious !== null) asValue += istihadohOfPrevious;
    //       if (asValue < 15) {
    //         const previousTotalB = parseDurationToDays(
    //           previousEntry.calculatedTotalB
    //         );
    //         if (previousTotalB !== null) asValue += previousTotalB;
    //       }
    //       lookbackIndex--;
    //     }
    //   }
    //   item.ahValue = ahValue;
    //   item.asValue = asValue;
    //   if (asValue !== null) {
    //     item.ahAs = `${formatDecimalDays(ahValue)} / ${formatDecimalDays(
    //       asValue
    //     )} days`;
    //   } else {
    //     item.ahAs = `${formatDecimalDays(ahValue)} / - days`;
    //   }
    // }

    // for (let i = 0; i < tempProcessed.length; i++) {
    //   const item = tempProcessed[i];
    //   const ah = item.ahValue;
    //   const as = item.asValue;
    //   if (ah !== null && as !== null) {
    //     const sum = ah + as;
    //     item.siklusHaid = `${formatDecimalDays(sum)} days`;
    //   } else {
    //     item.siklusHaid = "-";
    //   }
    // }

    return tempProcessed;
  }, [entries]);

  // --- JSX Rendering ---
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {titles.map((title) => (
              <th key={title}>{title}</th>
            ))}
            <th>Total KD</th>
            <th>hukum</th>
            <th>Total B</th>
            <th>AH AS</th>
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
                {/* The first cell is now the card header.
                  I've added the `card-title` class as per your CSS.
                  The `data-label` is not needed for this first cell.
                */}
                <td className="card-title">{formatDateTime(entry.KD)}</td>

                {/* The second title "B" is now its own cell to be rendered
                  on a new line in the mobile card view.
                */}
                <td data-label="KD">{formatDateTime(entry.KD)}</td>
                <td data-label="B">{formatDateTime(entry.B)}</td>
                <td data-label="Total KD">{entry.calculatedTotalKd}</td>
                <td data-label="hukum">
                  {entry.istihadohHukum && <span>{entry.istihadohHukum}</span>}
                  {entry.istihadohHukum && entry.haidHukum && <span> & </span>}
                  {entry.haidHukum &&
                    (entry.consultationLink ? (
                      <a
                        href={entry.consultationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "blue",
                          textDecoration: "underline",
                          fontWeight: "bold",
                        }}
                      >
                        {entry.haidHukum}
                      </a>
                    ) : (
                      <span style={{ color: "red" }}>{entry.haidHukum}</span>
                    ))}
                </td>
                <td data-label="Total B">{entry.calculatedTotalB}</td>
                <td data-label="AH AS">{entry.ahAs}</td>
                <td data-label="Siklus Haid">{entry.siklusHaid}</td>
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
