import "./DashboardCards.css";

function DashboardCards() {
  return (
    <div className="dashboard-cards">

      {/* Total Complaints */}
      <div className="dashboard-card total-card">
        <h3>Total Complaints</h3>
        <h2>1280</h2>
      </div>

      {/* Pending */}
      <div className="dashboard-card pending-card">
        <h3>Pending</h3>
        <h2>245</h2>
      </div>

      {/* Completed */}
      <div className="dashboard-card completed-card">
        <h3>Completed</h3>
        <h2>1035</h2>
      </div>

      {/* Alerts */}
      <div className="dashboard-card alerts-card">
        <h3>Alerts</h3>
        <h2>18</h2>
      </div>

    </div>
  );
}

export default DashboardCards;