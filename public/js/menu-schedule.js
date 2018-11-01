/* ------------------
*  getTimeOnly()
*  in the form:  9:00a  2:00p
--------------------- */
function getTimeOnly(_dt) {
  const dt = new Date(_dt); // this allows the dt param to be Date or String
  if (isNaN(dt)) {
    return "?";
  }
  let hrs = dt.getHours() + 1;
  const am = (hrs < 12);
  if (12 < hrs) hrs -= 12;
  const mins = dt.getMinutes();

  return `${hrs}:${(mins < 10 ? '0' : '')}${mins}${(am) ? 'a' : 'p'}`;
  // return `${dt.getHours() + 1}:${dt.getMinutes()}`;
}
// ------------------


$(function () {
  $('[data-toggle="tooltip"]').tooltip()
})

/* ==================================================
*  onMenuSchedule()
*  Initial Menu selection handler, this is where it all begins
*  when user clicks the top menu.
* =================================================== */
function onMenuSchedule() {
  changeMenuAndContentArea("nav--schedule", gelemContentSchedule);

  axios.get(`assignments/user/${gactiveUserId}`)
    .then((res) => {
      const elemTTTest = document.getElementById("tttest");
      // elemTTTest.tooltip();

      console.log("res: ", res);
      const aAssignments = res.data.assignments;

      aAssignments.sort((a, b) => {
        if (a.dow !== b.dow) return a.dow - b.dow;
        return a.start_time - b.start_time;
      });

      console.log("sorted: ", aAssignments);

      for (let dow = 0; dow <= 6; dow++) {
        const elemDow = document.getElementById(`assignment-${dow}`);
        elemDow.innerHTML = "";
        let html = "";
        for (const assignment of aAssignments) {
          if (assignment.dow === dow) {
            html += `
               <span data-toggle="tooltip" data-placement="top" title="${assignment.role}">
                 <a href='#'>${assignment.role.slice(0, 7)}..</a>
               </span><br>
               ${getTimeOnly(assignment.start_time)}<br>
               ${getTimeOnly(assignment.end_time)}<br><br>`;
          }
        }
        if (html === "") html = 'n/a';
        elemDow.innerHTML = html;
      }
      // get the tooltips added above to display properly
      $('[data-toggle="tooltip"]').tooltip();
    })
    .catch((error) => {
      handleError("renderRecentRequests", error);
    });

}