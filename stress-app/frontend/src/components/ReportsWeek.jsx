import StressSlider from "./StressSlider";
import EnergySlider from "./EnergySlider";
import StatsSection from "./StatsSection";
import "../styles/reportsWeek.css";

const weekTimeline = [
  {
    id: 1,
    day: "Maandag",
    summary: "Je start de week met hoge stress en energie, maar neemt voldoende pauzes om het tempo vol te houden.",
  },
  {
    id: 2,
    day: "Dinsdag",
    summary: "Door minder pauzes zakt je energie, terwijl het stressniveau tijdelijk lager blijft.",
  },
  {
    id: 3,
    day: "Woensdag",
    summary: "Drukke vergaderingen zorgen voor een gemiddeld stressniveau en een lichte heropleving van je energie.",
  },
  {
    id: 4,
    day: "Donderdag",
    summary: "Extra pauzemomenten, zoals een lunchpauze, helpen om hogere stress onder controle te houden.",
  },
  {
    id: 5,
    day: "Vrijdag",
    summary: "Je stress daalt richting het weekend, maar je energieniveau blijft beperkt door vermoeidheid.",
  },
  {
    id: 6,
    day: "Zaterdag",
    summary: "Lage stress en veel rustmomenten zorgen voor een duidelijk herstel van je energie.",
  },
  {
    id: 7,
    day: "Zondag",
    summary: "Ondanks voldoende rust stijgt de stress opnieuw door de voorbereiding op de komende week.",
  },
];

const pauseBehaviorData = [
  { day: "Ma", taken: 4, worked: 0, notWorked: 0 },
  { day: "Di", taken: 3, worked: 1, notWorked: 0 },
  { day: "Wo", taken: 2, worked: 2, notWorked: 0 },
  { day: "Do", taken: 4, worked: 0, notWorked: 0 },
  { day: "Vr", taken: 3, worked: 1, notWorked: 0 },
  { day: "Za", taken: 0, worked: 0, notWorked: 4 },
  { day: "Zo", taken: 0, worked: 0, notWorked: 4 },
];

const stressEnergyData = [
  { day: "Ma", stress: 4.7, energy: 4.0 },
  { day: "Di", stress: 1.6, energy: 3.6 },
  { day: "Wo", stress: 2.7, energy: 2.0 },
  { day: "Do", stress: 4.0, energy: 2.5 },
  { day: "Vr", stress: 3.4, energy: 2.9 },
  { day: "Za", stress: 2.0, energy: 3.6 },
  { day: "Zo", stress: 4.7, energy: 3.0 },
];

const chartWidth = 720;
const pauseChartHeight = 300;
const lineChartHeight = 320;

const chartColors = {
  taken: "var(--primary)",
  worked: "var(--error)",
  notWorked: "var(--highlight)",
  stressLine: "var(--error-dark)",
  stressDot: "var(--error)",
  energyLine: "var(--primary-dark)",
  energyDot: "var(--primary)",
};

function createSmoothPath(points) {
  if (!points.length) return "";

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const midX = (current.x + next.x) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${(current.y + next.y) / 2}`;
    path += ` T ${next.x} ${next.y}`;
  }

  return path;
}

function getBandPositions(count, width, leftPadding, rightPadding) {
  const innerWidth = width - leftPadding - rightPadding;
  const step = innerWidth / Math.max(count - 1, 1);

  return Array.from({ length: count }, (_, index) => leftPadding + step * index);
}

function buildBarSeries(series, axisMax, width, height, leftPadding, rightPadding, topPadding, bottomPadding) {
  const xPositions = getBandPositions(series.length, width, leftPadding, rightPadding);
  const innerHeight = height - topPadding - bottomPadding;
  const barGroupWidth = 48;
  const barWidth = 14;

  return series.map((entry, index) => {
    const groupX = xPositions[index];
    const baseX = groupX - barGroupWidth / 2;
    const scale = innerHeight / axisMax;

    return {
      day: entry.day,
      bars: [
        { key: "taken", value: entry.taken, x: baseX, fill: chartColors.taken },
        { key: "worked", value: entry.worked, x: baseX + 16, fill: chartColors.worked },
        { key: "notWorked", value: entry.notWorked, x: baseX + 32, fill: chartColors.notWorked },
      ].map((bar) => ({
        ...bar,
        height: Math.max(bar.value * scale, 0),
        y: height - bottomPadding - bar.value * scale,
        width: barWidth,
      })),
      x: groupX,
    };
  });
}

function buildLineSeries(series, width, height, leftPadding, rightPadding, topPadding, bottomPadding, valueKey, maxValue) {
  const xPositions = getBandPositions(series.length, width, leftPadding, rightPadding);
  const innerHeight = height - topPadding - bottomPadding;

  return series.map((entry, index) => {
    const y = height - bottomPadding - (entry[valueKey] / maxValue) * innerHeight;
    return { x: xPositions[index], y, value: entry[valueKey], day: entry.day };
  });
}

function ChartGrid({ width, height, leftPadding, rightPadding, topPadding, bottomPadding, ticks, labels }) {
  const innerHeight = height - topPadding - bottomPadding;
  const xPositions = getBandPositions(labels.length, width, leftPadding, rightPadding);

  return (
    <>
      {ticks.map((tick) => {
        const y = topPadding + innerHeight - (tick.value / tick.max) * innerHeight;
        return <line key={tick.value} x1={leftPadding} x2={width - rightPadding} y1={y} y2={y} className="chart-grid-line" />;
      })}

      {xPositions.map((x, index) => (
        <g key={labels[index]}>
          <line x1={x} x2={x} y1={topPadding} y2={height - bottomPadding} className="chart-grid-line x-grid" />
          <text x={x} y={height - 8} textAnchor="middle" className="chart-axis-label">
            {labels[index]}
          </text>
        </g>
      ))}
    </>
  );
}

function PauseBehaviorChart() {
  const width = chartWidth;
  const height = pauseChartHeight;
  const leftPadding = 40;
  const rightPadding = 22;
  const topPadding = 16;
  const bottomPadding = 34;
  const axisMax = 4;

  const bars = buildBarSeries(pauseBehaviorData, axisMax, width, height, leftPadding, rightPadding, topPadding, bottomPadding);
  const ticks = [0, 1, 2, 3, 4].map((value) => ({ value, max: axisMax }));

  return (
    <div className="chart-card">
      <svg className="weekly-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pauzegedrag over de week">
        <ChartGrid width={width} height={height} leftPadding={leftPadding} rightPadding={rightPadding} topPadding={topPadding} bottomPadding={bottomPadding} ticks={ticks} labels={pauseBehaviorData.map((entry) => entry.day)} />

        {ticks.map((tick) => {
          const y = topPadding + (height - topPadding - bottomPadding) - (tick.value / axisMax) * (height - topPadding - bottomPadding);
          return (
            <text key={tick.value} x={leftPadding - 8} y={y + 4} textAnchor="end" className="chart-axis-label">
              {tick.value}
            </text>
          );
        })}

        {bars.map((group) =>
          group.bars.map((bar) =>
            bar.value > 0 ? <rect key={`${group.day}-${bar.key}`} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx="2" fill={bar.fill} /> : null,
          ),
        )}
      </svg>

      <div className="chart-legend">
        <span><i className="legend-swatch legend-taken" />Genomen pauzes</span>
        <span><i className="legend-swatch legend-worked" />Doorgewerkt</span>
        <span><i className="legend-swatch legend-not-worked" />Niet gewerkt</span>
      </div>
    </div>
  );
}

function StressEnergyChart() {
  const width = chartWidth;
  const height = lineChartHeight;
  const leftPadding = 42;
  const rightPadding = 22;
  const topPadding = 16;
  const bottomPadding = 38;
  const maxValue = 5;

  const stressPoints = buildLineSeries(stressEnergyData, width, height, leftPadding, rightPadding, topPadding, bottomPadding, "stress", maxValue);
  const energyPoints = buildLineSeries(stressEnergyData, width, height, leftPadding, rightPadding, topPadding, bottomPadding, "energy", maxValue);
  const stressPath = createSmoothPath(stressPoints);
  const energyPath = createSmoothPath(energyPoints);
  const ticks = [0, 1, 2, 3, 4, 5].map((value) => ({ value, max: maxValue }));

  return (
    <div className="chart-card">
      <svg className="weekly-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stress en energie verloop over de week">
        <ChartGrid width={width} height={height} leftPadding={leftPadding} rightPadding={rightPadding} topPadding={topPadding} bottomPadding={bottomPadding} ticks={ticks} labels={stressEnergyData.map((entry) => entry.day)} />

        {ticks.map((tick) => {
          const y = topPadding + (height - topPadding - bottomPadding) - (tick.value / maxValue) * (height - topPadding - bottomPadding);
          return (
            <text key={tick.value} x={leftPadding - 8} y={y + 4} textAnchor="end" className="chart-axis-label">
              {tick.value}
            </text>
          );
        })}

        <path d={energyPath} fill="none" stroke={chartColors.energyLine} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={stressPath} fill="none" stroke={chartColors.stressLine} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {energyPoints.map((point, index) => (
          <circle key={`energy-${stressEnergyData[index].day}`} cx={point.x} cy={point.y} r="8" fill={chartColors.energyDot} />
        ))}

        {stressPoints.map((point, index) => (
          <circle key={`stress-${stressEnergyData[index].day}`} cx={point.x} cy={point.y} r="8" fill={chartColors.stressDot} />
        ))}
      </svg>

      <div className="chart-legend">
        <span><i className="legend-swatch legend-stress" />Stress</span>
        <span><i className="legend-swatch legend-energy" />Energie</span>
      </div>
    </div>
  );
}

export default function ReportsWeek() {
  return (
    <div className="reports-layout reports-week-layout">
      <aside className="reports-left">
        <div className="rating-cards-container">
          <StressSlider label="Hoe hoog is je stressniveau nu?" />
          <EnergySlider label="Wat is jouw energie level nu?" />
        </div>

        <StatsSection stress={3} energy={2} pausesTaken={3} pausesSkipped={1} />
      </aside>

      <section className="reports-right reports-week-right">
        <h1>De week in momenten</h1>
        <p className="reports-desc">Je wekelijkse tijdlijn met check-ins, pauzes en belangrijke momenten</p>

        <div className="timeline weekly-timeline">
          {weekTimeline.map((item) => (
            <div key={item.id} className="timeline-item weekly-timeline-item">
              <div className="timeline-icon weekly-timeline-icon" />

              <div className="weekly-timeline-content">
                <div className="weekly-timeline-day">{item.day}</div>
                <div className="timeline-info weekly-timeline-summary">{item.summary}</div>
              </div>
            </div>
          ))}
        </div>

        <section className="weekly-analytics-section">
          <h2>Pauzegedrag</h2>
          <p>Je nam vooral pauzes aan het begin van de week. Naar het einde toe werden pauzes vaker genegeerd.</p>
          <PauseBehaviorChart />
        </section>

        <section className="weekly-analytics-section">
          <h2>Stress en energie verloop</h2>
          <p>Je stress piekte midden in de week, terwijl je energie pas later volgde. Op zaterdag zie je een duidelijke ontkoppeling.</p>
          <StressEnergyChart />
        </section>
      </section>
    </div>
  );
}