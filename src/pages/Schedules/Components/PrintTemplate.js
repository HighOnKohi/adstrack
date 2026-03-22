export function buildPagesHtml(selectedData, schoolData, perPage = 3) {
  const buildSched = (meeting) => {
    const school = schoolData[meeting.School_ID] || {};
    const contactPersonStr = school.Contact_Person
      ? school.Contact_Person + (school.Designation ? " - " + school.Designation : "")
      : "_________________________";
    const contactInfoStr = [school.Contact_Num, school.Email].filter(Boolean).join(" / ") || "N/A";

    return `
      <div class="sched-block">
        <div class="print-header">SCHOOL CAREER TALK FORM</div>
        <div class="sched-row">
          <div class="sched-col">
            <div class="field-label">CONFIRMED DATE OF CO:</div>
            <div class="field-value">${formatDateSafe(meeting.DoC)}</div>
          </div>
          <div class="sched-col">
            <div class="field-label">ETD:</div>
            <div class="field-value">${formatDateTimeSafe(meeting.ETD)}</div>
          </div>
          <div class="sched-col">
            <div class="field-label">ETA:</div>
            <div class="field-value">${formatDateTimeSafe(meeting.ETA)}</div>
          </div>
        </div>

        <div class="name">
          <div class="field-label">NAME OF SCHOOL:</div>
          <div class="field-value">${escapeHtml(school.Name || "N/A")}</div>
        </div>

        <div class="location">
          <div class="field-label">SCHOOL LOCATION:</div>
          <div class="field-value">${escapeHtml(school.Address || "N/A")}</div>
        </div>

        <div class="sched-row">
          <div class="sched-col">
            <div class="field-label">CONTACT PERSON AND DESIGNATION:</div>
            <div class="field-value">${escapeHtml(contactPersonStr)}</div>
          </div>
          <div class="sched-col">
            <div class="field-label">CONTACT:</div>
            <div class="field-value">${escapeHtml(contactInfoStr)}</div>
          </div>
        </div>

        <div class="sched-row">
          <div class="sched-col">
            <div class="field-label">LEVEL OF CO:</div>
            <div class="field-value">${escapeHtml(meeting.Level || "N/A")}</div>
          </div>
          <div class="sched-col">
            <div class="field-label">EST. ATTENDEES:</div>
            <div class="field-value">${escapeHtml(meeting.Attendee_Est || "N/A")}</div>
          </div>
        </div>

        <div class="sched-row">
          <div class="sched-col">
            <div class="field-label">STATUS:</div>
            <div class="field-value">${escapeHtml(meeting.Status || "Pending")}</div>
          </div>
          <div class="sched-col">
            <div class="field-label">COMPANION:</div>
            <div class="field-value">${escapeHtml(meeting.Companions || "N/A")}</div>
          </div>
        </div>

        <div class="note">
          <div class="field-label">NOTE:</div>
          <div class="field-value-long">${escapeHtml(meeting.Notes || "N/A")}</div>
        </div>
      </div>
    `;
  };

  const pages = [];
  for (let i = 0; i < selectedData.length; i += perPage) {
    const chunk = selectedData.slice(i, i + perPage);
    const blocks = chunk.map((m) => buildSched(m)).join('\n');
    const pageHtml = `
      <div class="print-page">
        ${blocks}
      </div>
    `;
    pages.push(pageHtml);
  }
  return pages;
}

// small helpers exported here so the template module is standalone
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateSafe(dateInput) {
  try {
    if (!dateInput) return 'N/A';
    if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput) return dateInput.toDate().toLocaleDateString('en-US', { year:'numeric', month: '2-digit', day: '2-digit'});
    if (typeof dateInput === 'string') return new Date(dateInput).toLocaleDateString('en-US', { year:'numeric', month: '2-digit', day: '2-digit'});
    if (dateInput instanceof Date) return dateInput.toLocaleDateString('en-US', { year:'numeric', month: '2-digit', day: '2-digit'});
  } catch (err) {
    console.warn('formatDateSafe parse error', err);
    return 'N/A';
  }
  return 'N/A';
}

function formatDateTimeSafe(dateInput) {
  try {
    if (!dateInput) return 'N/A';
    if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput) return dateInput.toDate().toLocaleString('en-US', { year:'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'});
    if (typeof dateInput === 'string') return new Date(dateInput).toLocaleString('en-US', { year:'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'});
    if (dateInput instanceof Date) return dateInput.toLocaleString('en-US', { year:'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'});
  } catch (err) {
    console.warn('formatDateTimeSafe parse error', err);
    return 'N/A';
  }
  return 'N/A';
}
