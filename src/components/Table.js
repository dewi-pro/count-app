import './Table.css';

import { useMemo } from 'react';

import {
  convertDaysToDaysAndHours,
  diffBKD,
  formatDateTime,
  formatDecimalDays,
  getTotalBDays,
  parseDurationToDays,
} from './helper';

const TableTemplate = ({ titles, entries, onEdit, onDelete }) => {
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
      ahValue: null,
      asValue: null,
      consultationLink: null,
    }));

    tempProcessed.forEach((item, i) => {
      const totalKdDays = parseDurationToDays(item.calculatedTotalKd);
      if (totalKdDays !== null && totalKdDays <= 15) {
        let dec = formatDecimalDays(totalKdDays)        
        item.haidHukum = `haid ${convertDaysToDaysAndHours(dec)}`;
      }
    });

    // for (let i = 0; i < tempProcessed.length; i++) {
    //   const currentEntry = tempProcessed[i];
    //   const prevEntry = tempProcessed[i - 1];
    //   const currentTotalBDays = parseDurationToDays(
    //     currentEntry.calculatedTotalB
    //   );
    //   const prevTotalKdDays = parseDurationToDays(prevEntry?.calculatedTotalKd);
    //   const currentHaidDays =
    //     parseHukumHaidPartFromString(currentEntry.haidHukum) || 0;
    //   const prevBleedingDays =
    //     parseDurationToDays(prevEntry?.calculatedTotalKd) || 0;
    //   const sumOfCurrentCycle = currentHaidDays + currentTotalBDays;

    //   if (parseDurationToDays(currentEntry.calculatedTotalKd) > 15) {
    //     let ist = parseDurationToDays(currentEntry.calculatedTotalKd) - 15;
    //     currentEntry.istihadohHukum = `ist ${convertDaysToDaysAndHours(ist)}`;
    //     currentEntry.haidHukum = `haid ${convertDaysToDaysAndHours(15)}`;
    //     currentEntry.calculatedTotalB = `${formatDecimalDays(
    //       ist + currentTotalBDays
    //     )} D`;
    //     if (currentTotalBDays !== null && prevTotalKdDays !== null) {
    //       const sumOfDurations = currentTotalBDays + prevTotalKdDays;
    //       if (sumOfDurations > 15) {
    //         const excessDays = sumOfDurations - 15;
    //         const haid = Math.min(excessDays, prevTotalKdDays);
    //         const istihadohPart = Math.max(0, 15 - currentTotalBDays);
    //         if (istihadohPart > 0) {
    //           prevEntry.istihadohHukum = `ist ${convertDaysToDaysAndHours(
    //             istihadohPart
    //           )}`;
    //         }
            
    //         prevEntry.haidHukum = `haid ${convertDaysToDaysAndHours(haid)}`;
    //       } else {
    //         prevEntry.istihadohHukum = `istihadoh ${convertDaysToDaysAndHours(
    //           prevTotalKdDays
    //         )}`;
    //         prevEntry.haidHukum = "";
    //       }
    //     }
    //   } else if (
    //     sumOfCurrentCycle < 15 &&
    //     sumOfCurrentCycle + prevBleedingDays < 15
    //   ) {
    //     // --- CORRECTED LOGIC IMPLEMENTATION ---
    //     if (currentHaidDays !== null) {
    //       let lookbackIndex = i - 1;
    //       let sumH = sumOfCurrentCycle;
       
    //       while (sumH <= 15 && lookbackIndex >= 0) {
    //         const previousEntry = tempProcessed[lookbackIndex];
    //         const haidOfPrevious = parseDurationToDays(
    //           previousEntry.calculatedTotalKd
    //         );
    //         // Check and add haid days
    //         if (sumH <= 15) {
    //           sumH += haidOfPrevious;
    //         }
    //         // Check and add clean days
    //         if (sumH <= 15) {
    //           const previousTotalB = parseDurationToDays(
    //             previousEntry.calculatedTotalB
    //           );
    //           if (previousTotalB !== null) {
    //             sumH += previousTotalB;                
    //           }
    //         }

    //         // Check for any other exit conditions you may have
    //         // If you have any other 'if' statements that use 'break', add a log before it
    //         // For example:
    //         if (sumH > 15) {
    //           break;
    //         }
    //         lookbackIndex--;
    //       }
          
    //       if(sumH>15){
    //           let ist = sumH - 15;
    //            const calculatedKdAsNumber = parseDurationToDays(tempProcessed[lookbackIndex].calculatedTotalKd);
    //           tempProcessed[lookbackIndex].istihadohHukum = `ist ${convertDaysToDaysAndHours(
    //             ist
    //           )}`;
            
    //         tempProcessed[lookbackIndex].haidHukum = `haid ${convertDaysToDaysAndHours(calculatedKdAsNumber-ist)}`;
    //       }
    //     }
    //   }else if(currentTotalBDays<15){
    //     let istihadoh =prevTotalKdDays>=(15-currentTotalBDays)?(15-currentTotalBDays):prevTotalKdDays;
        
    //     prevEntry.istihadohHukum = `istihadoh ${convertDaysToDaysAndHours(
    //           istihadoh
    //         )}`;
    //         prevEntry.haidHukum = `haid ${convertDaysToDaysAndHours(
    //           prevTotalKdDays-istihadoh
    //         )}`;
            
    //       }
    // }

    // for (let i = 1; i < tempProcessed.length; i++) {
    //   const currentItem = tempProcessed[i];
    //   const prevEntry = tempProcessed[i - 1];
    //   prevEntry.consultationLink = null;
    //   const currentHaidDays =
    //     parseHukumHaidPartFromString(currentItem.haidHukum) || 0;
    //   const currentPurityDays =
    //     parseDurationToDays(currentItem.calculatedTotalB) || 0;
    //   const prevBleedingDays =
    //     parseDurationToDays(prevEntry?.calculatedTotalKd) || 0;
    //   const sumOfCurrentCycle = currentHaidDays + currentPurityDays;
      
    //   if (sumOfCurrentCycle < 15 && sumOfCurrentCycle + prevBleedingDays > 15) {
        
    //     prevEntry.haidHukum = "taqottu'";
    //     prevEntry.istihadohHukum = "";
    //     const phoneNumber = "6285745175624";
    //     const message = `Assalamualaikum,\n\nNama saya: (*silahkan isi nama anda* )\n saya ingin konsultasi kasus taqottu'.\n\nData terkait:\n- Siklus saat ini: Haid ${formatDecimalDays(
    //       currentHaidDays
    //     )} hari, lalu suci ${formatDecimalDays(
    //       currentPurityDays
    //     )} hari.\n- Darah setelahnya: ${formatDecimalDays(
    //       prevBleedingDays
    //     )} hari.\n\nMohon bantuannya, terima kasih.`;
    //     prevEntry.consultationLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    //       message
    //     )}`;
    //   }
    // }

    //AH AS VALUE
    // for (let i = 0; i < tempProcessed.length; i++) {
    //   const item = tempProcessed[i];
    //   let ahValue = parseHukumHaidPartFromString(item.haidHukum);
    //   if (ahValue === null) {
    //     item.ahValue = "-";
    //     item.asValue = "-";
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
    //   item.ahValue = convertDaysToDaysAndHours(ahValue);
    //   item.asValue = asValue !== null ? convertDaysToDaysAndHours(asValue) : "-";
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
            {/* <th>hukum</th> */}
            <th>Total B</th>
            {/* <th>AH</th>
            <th>AS</th> */}
            {/* <th>Siklus Haid</th> */}
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
                <td data-label="Total KD">{convertDaysToDaysAndHours(entry.calculatedTotalKd)}</td>
                {/*<td data-label="hukum">
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
                </td>*/}
                <td data-label="Total B">{convertDaysToDaysAndHours(entry.calculatedTotalB)}</td>
                {/* <td data-label="AH">{entry.ahValue}</td> */}
                {/* <td data-label="AS">{entry.asValue}</td> */}
                {/* <td data-label="Siklus Haid">{entry.siklusHaid}</td> */}
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
