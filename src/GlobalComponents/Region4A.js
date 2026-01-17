export const provinces4A = ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"];
export const cities4A = [
  "Antipolo", // Rizal
  "Bacoor", // Cavite
  "Batangas City", // Batangas
  "Biñan", // Laguna
  "Cabuyao", // Laguna
  "Calaca", // Batangas
  "Calamba", // Laguna
  "Carmona", // Cavite
  "Cavite City", // Cavite
  "Dasmariñas", // Cavite
  "General Trias", // Cavite
  "Imus", // Cavite
  "Lipa", // Batangas
  "Lucena", // Quezon (HUC)
  "San Pablo", // Laguna
  "San Pedro", // Laguna
  "Santa Rosa", // Laguna
  "Santo Tomas", // Batangas
  "Tagaytay", // Cavite
  "Tanauan", // Batangas
  "Trece Martires", // Cavite
  "Tayabas", // Quezon
];
export const batangasMunicipalities = [
  "Agoncillo",
  "Alitagtag",
  "Balayan",
  "Balete",
  "Bauan",
  "Calatagan",
  "Cuenca",
  "Ibaan",
  "Laurel",
  "Lemery",
  "Lian",
  "Lobo",
  "Mabini",
  "Malvar",
  "Mataasnakahoy",
  "Nasugbu",
  "Padre Garcia",
  "Rosario",
  "San Jose",
  "San Juan",
  "San Luis",
  "San Nicolas",
  "San Pascual",
  "Santa Teresita",
  "Santo Tomas", // also City but included here for reference
  "Taal",
  "Talisay",
  "Taysan",
  "Tingloy",
  "Tuy",
];
export const caviteMunicipalities = [
  "Alfonso",
  "Amadeo",
  "General Emilio Aguinaldo",
  "Indang",
  "Magallanes",
  "Mendez",
  "Naic",
  "Tanza",
  "Ternate",
  "Silang",
  "General Mariano Alvarez (GMA)",
  "Kawit",
  "Noveleta",
  "Rosario",
  "Tanza",
  "Ternate",
];
export const lagunaMunicipalities = [
  "Alaminos",
  "Bay",
  "Calauan",
  "Cavinti",
  "Famy",
  "Kalayaan",
  "Liliw",
  "Los Baños",
  "Luisiana",
  "Lumban",
  "Mabitac",
  "Magdalena",
  "Majayjay",
  "Nagcarlan",
  "Paete",
  "Pagsanjan",
  "Pakil",
  "Pangil",
  "Pila",
  "Rizal",
  "Santa Cruz",
  "Santa Maria",
  "Siniloan",
  "Victoria",
];
export const quezonMunicipalities = [
  "Alabat",
  "Atimonan",
  "Buenavista",
  "Candelaria",
  "Catanauan",
  "Dolores",
  "General Luna",
  "Gumaca",
  "Infanta",
  "Jomalig",
  "Lopez",
  "Lucban",
  "Macalelon",
  "Mauban",
  "Mulanay",
  "Padre Burgos",
  "Pagbilao",
  "Panukulan",
  "Patnanungan",
  "Perez",
  "Pitogo",
  "Plaridel",
  "Polillo",
  "Real",
  "Sampaloc",
  "San Andres",
  "San Antonio",
  "San Francisco",
  "San Narciso",
  "Sariaya",
  "Tagkawayan",
  "Tayabas", // city included here
  "Tiaong",
  "Unisan",
  "Buenavista",
  "Lu CBEN",
  "General Nakar",
  "Macalelon",
  "San Juan",
  "San Francisco",
];
export const rizalMunicipalities = [
  "Baras",
  "Binangonan",
  "Cainta",
  "Cardona",
  "Jalajala",
  "Morong",
  "Pililla",
  "Rodriguez",
  "San Mateo",
  "Tanay",
  "Taytay",
  "Teresa",
  "Angono",
];

// EXAMPLE USAGE

// import {
//   provinces4A,
//   batangasMunicipalities,
//   caviteMunicipalities,
//   lagunaMunicipalities,
//   quezonMunicipalities,
//   rizalMunicipalities,
//   cities4A,
// } from "./Region4A.js";

// const provinceToMunicipalities = {
//   Batangas: batangasMunicipalities,
//   Cavite: caviteMunicipalities,
//   Laguna: lagunaMunicipalities,
//   Quezon: quezonMunicipalities,
//   Rizal: rizalMunicipalities,
// };

// function ProvinceSelector({ onSelect }) {
//   return (
//     <select onChange={(e) => onSelect(e.target.value)}>
//       {provinces4A.map((p) => (
//         <option key={p}>{p}</option>
//       ))}
//     </select>
//   );
// }

// function MunicipalitySelector({ province }) {
//   const list = provinceToMunicipalities[province] || [];
//   return (
//     <select>
//       {list.map((m) => (
//         <option key={m}>{m}</option>
//       ))}
//     </select>
//   );
// }
