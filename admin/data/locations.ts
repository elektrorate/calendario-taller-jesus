
export const countriesData: Record<string, string[]> = {
  "España": ["Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao"],
  "México": ["Ciudad de México", "Guadalajara", "Monterrey", "Puebla", "Toluca", "Tijuana", "León", "Ciudad Juárez"],
  "Argentina": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "Tucumán", "La Plata", "Mar del Plata"],
  "Colombia": ["Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Cúcuta", "Bucaramanga"],
  "Chile": ["Santiago", "Valparaíso", "Concepción", "La Serena", "Antofagasta", "Temuco"],
  "Perú": ["Lima", "Arequipa", "Trujillo", "Chiclayo", "Piura", "Cusco"],
  "Portugal": ["Lisboa", "Oporto", "Braga", "Coímbra", "Funchal", "Setúbal"],
  "Francia": ["París", "Marsella", "Lyon", "Toulouse", "Niza", "Nantes", "Estrasburgo"],
  "Italia": ["Roma", "Milán", "Nápoles", "Turín", "Palermo", "Génova", "Florencia"],
  "Alemania": ["Berlín", "Hamburgo", "Múnich", "Colonia", "Frankfurt", "Stuttgart"],
  "Reino Unido": ["Londres", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds"],
  "Estados Unidos": ["Nueva York", "Los Ángeles", "Chicago", "Houston", "Phoenix", "Filadelfia", "Miami"],
  "Canadá": ["Toronto", "Montreal", "Vancouver", "Ottawa", "Calgary", "Edmonton"],
  "Brasil": ["São Paulo", "Río de Janeiro", "Brasilia", "Salvador", "Fortaleza", "Belo Horizonte"],
  "Japón": ["Tokio", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka"],
  "China": ["Pekín", "Shanghái", "Cantón", "Shenzhen", "Tianjin", "Wuhan"],
  "Australia": ["Sídney", "Melbourne", "Brisbane", "Perth", "Adelaida", "Canberra"],
  "Uruguay": ["Montevideo", "Salto", "Ciudad de la Costa", "Paysandú"],
  "Ecuador": ["Quito", "Guayaquil", "Cuenca", "Santo Domingo", "Machala"],
  "Venezuela": ["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay"],
  "Bolivia": ["La Paz", "Santa Cruz", "Cochabamba", "El Alto", "Sucre"],
  "Paraguay": ["Asunción", "Ciudad del Este", "San Lorenzo", "Luque"],
  "Costa Rica": ["San José", "Alajuela", "Cartago", "Heredia"],
  "Panamá": ["Ciudad de Panamá", "San Miguelito", "Tocumen", "David"],
  "Guatemala": ["Ciudad de Guatemala", "Mixco", "Villa Nueva", "Quetzaltenango"]
};

export const countryList = Object.keys(countriesData).sort();
