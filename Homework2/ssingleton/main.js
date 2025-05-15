// -------------------------------------------------------------------------------------------
// Global Config & Constants
// -------------------------------------------------------------------------------------------

const statKeys = ["HP", "Attack", "Defense", "Speed", "Sp_Def", "Sp_Atk"];
const levels = 5;
const sprite_directory = "sprites/"; // Ensure this matches folder name exactly

let pokemonData = [];

let selectedPokemons = {
  p1: null,
  p2: null
};

// -------------------------------------------------------------------------------------------
// Load CSV Data
// -------------------------------------------------------------------------------------------

d3.csv("data/pokemon_alopez247.csv", d => {
  statKeys.forEach(key => d[key] = +d[key]);
  return d;
}).then(data => {
  pokemonData = data;
  initSearch();
  setupRadarChart();
});


// -------------------------------------------------------------------------------------------
// Some Pokemon have weird names
//        Ended up writing this into the function itself, keeping for memory for final project
// -------------------------------------------------------------------------------------------
function normalizeNameForSprite(name) {
  return name
    .toLowerCase()
    .replace(/♀/g, "f") // Nidoran female and male, are nidoran-f and -m in our directory
    .replace(/♂/g, "m")
    .replace(/[\s._']/g, "")  // Replace space, period, underscore, apostrophe with hyphen
    .replace(/[^a-z0-9-]/g, ""); // Strip any other remaining weird characters
}

// -------------------------------------------------------------------------------------------
// Initialize Search Bars
// -------------------------------------------------------------------------------------------

function initSearch() {
  d3.select("#pokemon1-search").property("value", "");
  d3.select("#pokemon2-search").property("value", "");
  clearSuggestions();

  ["pokemon1-search", "pokemon2-search"].forEach(id => {
    d3.select(`#${id}`)
      .on("input", () => handleSearchInput(id))
      .on("focus", () => handleSearchInput(id));
  });
}

// -------------------------------------------------------------------------------------------
// Handle Search Input
// -------------------------------------------------------------------------------------------

function handleSearchInput(searchId) {
  const input = d3.select(`#${searchId}`).property("value").toLowerCase();
  const matchingPokemons = pokemonData.filter(pokemon =>
    pokemon.Name.toLowerCase().includes(input)
  );

  if (input === "") {
    clearSuggestions();
    return;
  }

  displaySuggestions(matchingPokemons, searchId);
}

// -------------------------------------------------------------------------------------------
// Display Suggestions
// -------------------------------------------------------------------------------------------

function displaySuggestions(matchingPokemons, searchId) {
  const searchElement = document.getElementById(searchId);
  const rect = searchElement.getBoundingClientRect();

  const suggestionList = d3.select("#suggestion-list");
  suggestionList.style("display", "block")
    .style("top", `${rect.bottom + window.scrollY}px`)
    .style("left", `${rect.left + window.scrollX}px`);
  suggestionList.selectAll("li").remove();

  matchingPokemons.forEach(pokemon => {
    suggestionList.append("li")
      .text(pokemon.Name)
      .on("click", () => selectPokemon(searchId, pokemon));
  });
}

// -------------------------------------------------------------------------------------------
// Select Pokemon
// -------------------------------------------------------------------------------------------

function selectPokemon(searchId, pokemon) {
  d3.select(`#${searchId}`).property("value", pokemon.Name);
  clearSuggestions();

  const playerId = searchId === "pokemon1-search" ? "p1" : "p2";
  selectedPokemons[playerId] = pokemon; // Store selected Pokemon

  updateSprite(playerId === "p1" ? "pokemon1-sprite" : "pokemon2-sprite", pokemon.Name);
  updateRadarChart(playerId, pokemon);
}

// -------------------------------------------------------------------------------------------
// Clear Suggestions
// -------------------------------------------------------------------------------------------

function clearSuggestions() {
  d3.select("#suggestion-list").style("display", "none");
  d3.select("#suggestion-list").selectAll("li").remove();
}

// -------------------------------------------------------------------------------------------
// Update Sprites (Local)
// -------------------------------------------------------------------------------------------

function updateSprite(imgId, pokemonName) {
  const formattedName = pokemonName
    .toLowerCase()
    .replace("._", "-")           // Fix Mr._Mime → mr-mime
    //                            .replace(/\s|\./g, "-") OLD, cutting this out
    .replace("♀", "f")
    .replace("♂", "m");

  d3.select(`#${imgId}`).attr("src", `${sprite_directory}${formattedName}.png`);
}

// -------------------------------------------------------------------------------------------
// Setup Radar Chart with Resizing
// -------------------------------------------------------------------------------------------

function setupRadarChart() {
  const container = d3.select("#radar-chart").node();
  const width = container.getBoundingClientRect().width; // NEW: 1 use container width instead of window
  const height = container.getBoundingClientRect().height; // NEW: 1 use container height

  const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

  // Clear previous chart group if present
  svg.selectAll("g").remove(); // Ensure we don’t stack old groups

  const chartGroup = svg.append("g")
    .attr("id", "radar-group") // NEW: 1 added ID for easy selection
    .attr("transform", `translate(${width / 2}, ${height / 2})`); // centered in container

  const radius = Math.min(width, height) / 2.5; // NEW: Responsive radius
  chartGroup.node().__radius__ = radius;
  drawRadarAxes(radius);

  window.addEventListener("resize", resizeLayout);

  if (selectedPokemons.p1) updateRadarChart("p1", selectedPokemons.p1);
  if (selectedPokemons.p2) updateRadarChart("p2", selectedPokemons.p2);
}

// -------------------------------------------------------------------------------------------
// Resize Layout Dynamically on Window Resize
// -------------------------------------------------------------------------------------------

function resizeLayout() {
  setupRadarChart(); // NEW: 1 Simply re-run full layout
}

// -------------------------------------------------------------------------------------------
// Draw Radar Axes + Labels
// -------------------------------------------------------------------------------------------

function drawRadarAxes(radius) {
  const angleSlice = (Math.PI * 2) / statKeys.length;

  const group = d3.select("#radar-group");
  group.selectAll("*").remove();

  for (let level = 1; level <= levels; level++) {
    const r = (radius / levels) * level;
    const levelPoints = statKeys.map((_, i) => {
      const angle = i * angleSlice;
      return [
        r * Math.cos(angle - Math.PI / 2),
        r * Math.sin(angle - Math.PI / 2)
      ];
    });

    group.append("polygon")
      .attr("points", levelPoints.map(d => d.join(",")).join(" "))
      .attr("stroke", "#ccc")
      .attr("fill", "none");
  }

  statKeys.forEach((key, i) => {
    const angle = i * angleSlice;
    const x = radius * Math.cos(angle - Math.PI / 2);
    const y = radius * Math.sin(angle - Math.PI / 2);

    group.append("line")
      .attr("x1", 0).attr("y1", 0)
      .attr("x2", x).attr("y2", y)
      .attr("stroke", "#999");

    group.append("text")
      .attr("x", x * 1.1)
      .attr("y", y * 1.1)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .text(key.replace("_", ". "));
  });
}

// -------------------------------------------------------------------------------------------
// Update Radar Chart
// -------------------------------------------------------------------------------------------

function updateRadarChart(playerId, pokemon) {
  const angleSlice = (Math.PI * 2) / statKeys.length;

  const group = d3.select("#radar-group");
  const radius = group.node().__radius__ || 150; // fallback just in case

  const scale = d3.scaleLinear()
    .domain([0, 160])
    .range([0, radius]);

  const points = statKeys.map((key, i) => {
    const angle = i * angleSlice;
    const val = scale(pokemon[key]);
    return [
      val * Math.cos(angle - Math.PI / 2),
      val * Math.sin(angle - Math.PI / 2)
    ];
  });

  const polygonId = `polygon-${playerId}`;
  const color = playerId === "p1" ? "#0096FF" : "#D2042D";

  const existing = group.select(`#${polygonId}`);

  if (!existing.empty()) {
    existing
      .datum(points)
      .transition()
      .duration(300)
      .attr("points", d => d.map(p => p.join(",")).join(" "));
  } else {
    group.append("polygon")
      .attr("id", polygonId)
      .datum(points)
      .attr("points", d => d.map(p => p.join(",")).join(" "))
      .attr("fill", color)
      .attr("stroke", color)
      .attr("opacity", 0.5);
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------------------------------------------
//                        DOUBLE SIDED BAR CHART WITH TEAM BUILDER!
// -------------------------------------------------------------------------------------------
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

// -------------------------------------------------------------------------------------------
//  Team Builder: Globals
// -------------------------------------------------------------------------------------------

// Max 6 slots
const team = new Array(6).fill(null); // Each slot: { name, spriteUrl } or null
const teamSearchInput = document.getElementById('team-search');
const teamSlotsContainer = document.getElementById('team-slots');

// Simple data access helper (assumes global `pokemonData` exists)
function findPokemonByName(name) {
  return pokemonData.find(p => p.Name.toLowerCase() === name.toLowerCase());
}

// Get sprite URL from name using global normalization logic
function getSpriteUrl(name) {
  return `sprites/${normalizeNameForSprite(name)}.png`;
}

// Render all 6 team slots
function renderTeam() {
  const slotDivs = teamSlotsContainer.querySelectorAll('.team-member-slot');
  slotDivs.forEach((div, i) => {
    const sprite = div.querySelector('img');
    const nameSpan = div.querySelector('span');

    // Clear previous click/hover listeners
    div.onclick = null;
    div.classList.remove('hover-removable');

    if (team[i]) {
      sprite.src = getSpriteUrl(team[i].name);
      sprite.alt = team[i].name;
      nameSpan.textContent = team[i].name;

      // Enable removal interaction
      div.onclick = () => {
        team[i] = null;
        renderTeam();
      };

      div.classList.add('hover-removable');
    } else {
      sprite.src = 'sprites/pokeball.png';
      sprite.alt = 'Pokémon';
      nameSpan.textContent = `Member ${i + 1}`;
    }
  });
}

// -------------------------------------------------------------------------------------------
//   Team Builder: Search Logic
// -------------------------------------------------------------------------------------------

// Add Pokemon to team
function addPokemonToTeam(pokemon) {
  const emptyIndex = team.findIndex(member => member === null);
  if (emptyIndex === -1) {
    alert("Team is full.");
    return;
  }

  team[emptyIndex] = {
    name: pokemon.Name,
    spriteUrl: getSpriteUrl(pokemon.Name)
  };

  renderTeam();
}

// Suggestion behavior (dedicated to team builder)
function handleTeamSearchInput() {
  const input = teamSearchInput.value.trim().toLowerCase();
  const matches = pokemonData.filter(p => p.Name.toLowerCase().includes(input));

  if (input === "") {
    clearSuggestions();
    return;
  }

  displayTeamSuggestions(matches);
}

// Display suggestions under input
function displayTeamSuggestions(matches) {
  const rect = teamSearchInput.getBoundingClientRect();
  const suggestionList = d3.select("#suggestion-list");

  suggestionList.style("display", "block")
    .style("top", `${rect.bottom + window.scrollY}px`)
    .style("left", `${rect.left + window.scrollX}px`);

  suggestionList.selectAll("li").remove();

  matches.forEach(pokemon => {
    suggestionList.append("li")
      .text(pokemon.Name)
      .on("click", () => {
        addPokemonToTeam(pokemon);
        clearSuggestions();
        teamSearchInput.value = "";
      });
  });
}

// Clear suggestions
function clearSuggestions() {
  d3.select("#suggestion-list").style("display", "none").selectAll("li").remove();
}

// Event listeners
teamSearchInput.addEventListener("input", handleTeamSearchInput);
teamSearchInput.addEventListener("focus", handleTeamSearchInput);

teamSearchInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    const name = teamSearchInput.value.trim();
    if (!name) return;

    const poke = findPokemonByName(name);
    if (!poke) {
      alert('Pokémon not found.');
      return;
    }

    addPokemonToTeam(poke);
    teamSearchInput.value = '';
    clearSuggestions();
  }
});

// Initial render
renderTeam();

// -------------------------------------------------------------------------------------------
//  Type Chart: Defensive Multipliers
// -------------------------------------------------------------------------------------------
// Used for the weaknesses and resistances bar chart.
// This isn't in the data csv, so we're pulling out the types and doing our own calcs.
const defensiveTypeChart = {
  Normal:   { Fighting: 2, Ghost: 0 },
  Fire:     { Water: 2, Ground: 2, Rock: 2, Fire: 0.5, Grass: 0.5, Ice: 0.5, Bug: 0.5, Steel: 0.5, Fairy: 0.5 },
  Water:    { Electric: 2, Grass: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Steel: 0.5 },
  Electric: { Ground: 2, Electric: 0.5, Flying: 0.5, Steel: 0.5 },
  Grass:    { Fire: 2, Ice: 2, Poison: 2, Flying: 2, Bug: 2, Water: 0.5, Electric: 0.5, Grass: 0.5, Ground: 0.5 },
  Ice:      { Fire: 2, Fighting: 2, Rock: 2, Steel: 2, Ice: 0.5 },
  Fighting: { Flying: 2, Psychic: 2, Fairy: 2, Bug: 0.5, Rock: 0.5, Dark: 0.5 },
  Poison:   { Ground: 2, Psychic: 2, Fighting: 0.5, Poison: 0.5, Bug: 0.5, Grass: 0.5, Fairy: 0.5 },
  Ground:   { Water: 2, Ice: 2, Grass: 2, Poison: 0.5, Rock: 0.5, Electric: 0 },
  Flying:   { Electric: 2, Ice: 2, Rock: 2, Fighting: 0.5, Bug: 0.5, Grass: 0.5, Ground: 0 },
  Psychic:  { Bug: 2, Ghost: 2, Dark: 2, Fighting: 0.5, Psychic: 0.5 },
  Bug:      { Fire: 2, Flying: 2, Rock: 2, Fighting: 0.5, Grass: 0.5, Ground: 0.5 },
  Rock:     { Water: 2, Grass: 2, Fighting: 2, Ground: 2, Normal: 0.5, Fire: 0.5, Poison: 0.5, Flying: 0.5 },
  Ghost:    { Ghost: 2, Dark: 2, Poison: 0.5, Bug: 0.5, Normal: 0, Fighting: 0 },
  Dragon:   { Ice: 2, Dragon: 2, Fairy: 2, Fire: 0.5, Water: 0.5, Electric: 0.5, Grass: 0.5 },
  Dark:     { Fighting: 2, Bug: 2, Fairy: 2, Ghost: 0.5, Dark: 0.5, Psychic: 0 },
  Steel:    { Fire: 2, Fighting: 2, Ground: 2, Normal: 0.5, Grass: 0.5, Ice: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 0.5, Dragon: 0.5, Fairy: 0.5, Poison: 0 },
  Fairy:    { Poison: 2, Steel: 2, Fighting: 0.5, Bug: 0.5, Dark: 0.5, Dragon: 0 }
};

// -------------------------------------------------------------------------------------------
//   Type Spread Calculations
// -------------------------------------------------------------------------------------------

/*
  This function was very complicated. For this Homework, I wanted it to be practice for our group project;
  We are the Pokemon competitive battling group. I saw the Pokemon dataset for this HW, and wanted to use it as practice.
  My "Story"/main character is the team builder helper, centered around this team weakness/resistance calculator.
  However my dataset didn't have weaknesses or resistances.
  So I have to create logic to convert a Pokemon's complete typing into a net +/- for each type that can hit it.
*/
function getDefensiveProfile(types) {
  const profile = {};

  // Initialize all attack types with a default resistance of 1 (neutral hits).
  // This means no effect, no resistance or weakness, until we adjust based on the types.
  for (const atkType in defensiveTypeChart) {
    profile[atkType] = 1;                             // Default multiplier is 1 (neutral).
  }

  // Loop through each type in the Pokemon's defense set.
  // For each type, we look up its defensive values from the defensiveTypeChart and modify
  // the profile based on its resistances or weaknesses.
  types.forEach(defType => {
    const chart = defensiveTypeChart[defType];        // Get the defensive values for this type.
    for (const atkType in chart) {
      profile[atkType] *= chart[atkType];             // Adjust the multiplier for each attacking type based on the defensive type's values.
    }
  });

  return profile;                                     // Return the final defensive profile that tells us how each attack type is resisted by the Pokemon.
}

// This function calculates the overall defensive spread for the entire team.
// The defensive spread is an aggregate of all the weaknesses/resistances/immunities for each team member, 
// showing how the team as a whole handles different types of attacks.
function calculateTeamDefensiveSpread() {
  const spread = {};

  // Initialize the spread object where each attacking type starts with a value of 0.
  // This spread will track the team’s overall resistances and weaknesses to each type.
  for (const type in defensiveTypeChart) {
    spread[type] = 0;                                   // Set each attacking type's initial value to 0.
  }

  // Loop through each team member and calculate their defensive profile.
  team.forEach(member => {
    if (!member) return;                                // If the member is empty (or not defined), skip.

    // Look up the Pokemon object in the database based on the member’s name.
    const poke = findPokemonByName(member.name);
    if (!poke) return;                                  // If the Pokemon can't be found, skip this member.

    // Determine the types of the current Pokemon.
    let types = [];
    if (poke.Types) {
      // split it into an array of individual types. Handle errors in data potentially. Plan to use concept for final project
      types = poke.Types.split(',').map(t => t.trim());
    } else if (poke.Type_1) {
      // If only 'Type_1' and 'Type_2' are available as separate properties,
      // manually add them to the types array.
      types.push(poke.Type_1);
      if (poke.Type_2 && poke.Type_2 !== "") {
        types.push(poke.Type_2);
      }
    }

    if (types.length === 0) return;                       // Skip if no valid types were found.

    const profile = getDefensiveProfile(types);


    // Loop through each attacking type's effectiveness in the profile from the "defensive profile" of the Pokemon
    for (const [atkType, multiplier] of Object.entries(profile)) {
      //The only complicated case; immunities can override weaknesses.
      if (multiplier === 0) {
        spread[atkType] -= 1;
      } 
      // Resist's the type of damage
      else if (multiplier < 1) {
        spread[atkType] -= 1;
      } 
      // Weak to the type of damage
      else if (multiplier > 1) {
        spread[atkType] += 1;
      }
    }
  });

  return spread;
}

// -------------------------------------------------------------------------------------------
//   Bar Chart Render
// -------------------------------------------------------------------------------------------

function renderTypeBarChart() {
  const container = document.getElementById("type-bar-chart");
  const svg = d3.select("#bar-chart-svg");
  const width = container.clientWidth;
  const height = container.clientHeight;

  svg.attr("width", width).attr("height", height);

  svg.selectAll("*").remove(); // Clear prior chart

  const margin = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const data = Object.entries(calculateTeamDefensiveSpread()).map(([type, value]) => ({ type, value }));

  const x = d3.scaleBand().domain(data.map(d => d.type)).range([0, chartWidth]).padding(0.2);
  const y = d3.scaleLinear().domain([-6, 6]).range([chartHeight, 0]);

  // Draw bars
  g.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.type))
    .attr("width", x.bandwidth())
    .attr("y", d => d.value >= 0 ? y(d.value) : y(0))
    .attr("height", d => Math.abs(y(d.value) - y(0)))
    .attr("fill", d => d.value >= 0 ? "#e74c3c" : "#3498db");

  // X Axis (at zero line)
  g.append("g")
    .attr("transform", `translate(0,${y(0)})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "clamp(8px, 1.5vw, 13px)")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-90)")
    .attr("dx", "-0.8em")
    .attr("dy", "0.15em");

  // Y Axis (ticks only, no grid lines)
  g.append("g")
  .call(d3.axisLeft(y)
    .tickValues(d3.range(-6, 7, 1)) // Show every integer from -6 to +6
    .tickSize(0)
    .tickFormat(d => d === 0 ? "" : d));
}

const originalRenderTeam = renderTeam;
renderTeam = function () {
  originalRenderTeam();
  setTimeout(() => renderTypeBarChart(), 0);
};

// Initial render on load
window.addEventListener("DOMContentLoaded", () => {
  renderTypeBarChart();
});

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------------------------------------------
// PIE CHART: My Team’s Type Makeup
// -------------------------------------------------------------------------------------------
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

// Setup SVG & Pie Container
const pieWidth = 260;
const pieHeight = 260;
const pieRadius = Math.min(pieWidth, pieHeight) / 2;

const pieSvg = d3.select("#type-pie-chart")
  .select("svg")  // Use the existing SVG element in the HTML
  .attr("width", pieWidth + 100) // Toying around with +100 for future legend space
  .attr("height", pieHeight + 40)
  .append("g")
  .attr("transform", `translate(${(pieWidth + 100) / 2}, ${(pieHeight / 2) + 10})`);

const pie = d3.pie().value(d => d.count);
const arc = d3.arc().innerRadius(0).outerRadius(pieRadius);

const pieGroup = pieSvg.append("g").attr("class", "pie-slices");

// Color scheme for types
const typeColors = {
  Grass:     "darkgreen",
  Poison:    "indigo",
  Fire:      "red",
  Flying:    "#F0FFFF",
  Water:     "blue",
  Bug:       "lightgreen",
  Normal:    "silver",
  Electric:  "yellow",
  Ground:    "tan",
  Fairy:     "pink",
  Fighting:  "#6E260E",
  Psychic:   "rebeccapurple",
  Rock:      "#B87333",
  Steel:     "grey",
  Ice:       "lightblue",
  Ghost:     "#CCCCFF",
  Dragon:    "gold",
  Dark:      "black"
};

// -------------------------------------------------------------------------------------------
// Utility: Normalize Pokemon Names for Consistency
// -------------------------------------------------------------------------------------------

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, ''); // Normalize names by lowercasing and removing special characters
}

// -------------------------------------------------------------------------------------------
// Utility: Count Type Frequencies in Current Team
// -------------------------------------------------------------------------------------------

function getTeamTypeCounts() {
  const typeCounts = {};

  // Loop through each Pokemon in the team array
  team.forEach(member => {
    if (!member) return; // Skip empty slots in team
    const poke = pokemonData.find(p => normalizeName(p.Name) === normalizeName(member.name)); // Match the name with CSV

    if (!poke) return; // Skip if Pokemon not found

    // Count types (Type1 and Type2)
    [poke.Type_1, poke.Type_2].forEach(type => {
      if (type) {
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    });
  });

  return Object.entries(typeCounts).map(([type, count]) => ({ type, count }));
}

// -------------------------------------------------------------------------------------------
// Update Pie Chart Dynamically
// -------------------------------------------------------------------------------------------

function updatePieChart() {
  const data = getTeamTypeCounts();
  console.log('Pie chart data:', data);  // Debugging: Log the pie chart data to check if it's correct

  if (data.length === 0) {
    console.warn('No valid data available for pie chart'); // Warn if no valid data found
    return;
  }

  // Clear old slices before drawing the new chart
  pieGroup.selectAll("path").remove();  // Remove old pie slices
  pieGroup.selectAll("circle").remove();  // Remove the initial circle (if still there)

  // Create the pie chart slices from the data
  const arcs = pieGroup.selectAll("path")
    .data(pie(data), d => d.data.type);

  // Remove old slices (if any)
  arcs.exit().remove();

  // Update existing slices with transitions
  arcs.transition()
    .duration(400)
    .attr("d", arc);

  // Add new slices if necessary
  arcs.enter()
    .append("path")
    .attr("d", arc)
    .attr("fill", (d) => typeColors[d.data.type] || "grey") // Use the color scheme based on type
    .attr("stroke", "#fff")
    .attr("stroke-width", 1);

  // Update the legend
  updateLegend(data);
}

// -------------------------------------------------------------------------------------------
// Update Legend Dynamically
// -------------------------------------------------------------------------------------------

function updateLegend(data) {
  // Select the legend container and make sure it's visible
  const legendWrapper = d3.select("#legend-wrapper");
  legendWrapper.style("display", "flex");  // Show the legend

  // Clear any existing legend items
  legendWrapper.selectAll(".legend-item").remove();

  // Create a legend item for each type in the pie chart
  const legendItems = legendWrapper.selectAll(".legend-item")
    .data(data)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .style("display", "flex")
    .style("align-items", "center")
    .style("margin-bottom", "5px");

  // Add color box and type label to each legend item
  legendItems.append("div")
    .attr("class", "legend-color-box")
    .style("background-color", d => typeColors[d.type] || "grey");

  legendItems.append("span")
    .attr("class", "legend-text")
    .text(d => `${d.type} (${d.count})`);  // Display type and count
}

// -------------------------------------------------------------------------------------------
// Handle Button Click to "Import Team"
// -------------------------------------------------------------------------------------------

d3.select("#import-team-button").on("click", function () {
  console.log("Importing team...");

  // Ensure the team array isn't empty
  if (team.every(member => !member)) {
    alert("Your team is empty! Visit Professor Oak before you go in the tall grass! :)");
    return;
  }

  // Update Pie Chart once the button is clicked
  updatePieChart();
});
