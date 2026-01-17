import Card from "./Components/Card";

import "./Homepage.css";

export default function Homepage() {
  return (
    <section className="content">
      <div>
            <div className="Label">
                <h1> Homepage </h1>
                <p> Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut. </p>
            </div>
        </div>

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
  );
}
