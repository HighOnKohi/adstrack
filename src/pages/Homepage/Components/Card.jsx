export default function Card({ title, icon, text, list }) {
  return (
    <div className="card">
      <div className="card-top">
        <div className="icon">{icon}</div>
      </div>

      <div className="card-body">
        <h3> {title} </h3>

        {text && <p>{text}</p>}

        {list && (
          <ul>
            {list.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
