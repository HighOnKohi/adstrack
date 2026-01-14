import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Card from "../components/Card";

import "../css/Homepage.css";

export default function Homepage() {
  return (
    <div className="layout">
      <Sidebar />

      <main className="main">
        <Header />

        <section className="content">
          <h1>Homepage</h1>
          <p className="subtitle">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut.
          </p>

          <div className="card-grid">
            <Card
              title="MISSION"
              icon="🎯"
              text="As an OP-Siena school, Siena College of Taytay is engaged in the pursuit of developing individuals who are GOD-CENTERED TRUTH SEEKERS, SERVANT LEADERS and COMMUNITY BUILDERS."
            />
            <Card
              title="VISION"
              icon="👁️"
              text="Siena College of Taytay aspires to form graduates who are active contributors at the forefront of global change."
            />
            <Card
              title="OBJECTIVES"
              icon="✔️"
              list={[
                "Continuously strengthen integration of values",
                "Consistently achieve excellence in education",
                "Systematically ensure sustainability",
              ]}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
