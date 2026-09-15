/* Archived dashboard feature: Overall Progress
   Removed from active dashboard to reduce duplicated summary information.
*/

  const pct=tot?Math.round((cls/tot)*100):0;
  document.getElementById('dash-total-display').textContent=tot;
  document.getElementById('dash-total-display-2').textContent=tot;
  document.getElementById('dash-closed-display').textContent=cls;
  document.getElementById('dash-open-display').textContent=opn;
  document.getElementById('dash-completed-percent').textContent=`${pct}% Completed`;
  document.getElementById('dash-progress-fill').style.width=`${pct}%`;

