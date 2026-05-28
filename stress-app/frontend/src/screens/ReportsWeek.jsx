import { useEffect, useState } from "react";
import StressSlider from "../components/StressSlider";
import EnergySlider from "../components/EnergySlider";
import StatsSection from "../components/StatsSection";
import breakIcon from "../assets/break.svg";
import highEnergyIcon from "../assets/highEnergy.svg";
import highStressIcon from "../assets/highStress.svg";
import warningIcon from "../assets/warning.svg";
import { addEnergyCheck, addStressCheck, loadWeeklyWellbeingReport } from "../lib/session";
import "../styles/reportsWeek.css";

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

function renderTimelineIcon(iconType) {
  if (iconType === "break") return breakIcon;
  if (iconType === "warning") return warningIcon;
  if (iconType === "highStress") return highStressIcon;
  return highEnergyIcon;
}

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
  const innerHeight = height - topPadding - bottomPadding;
  const barGroupWidth = 48;
  const barWidth = 14;
  const xPositions = getBandPositions(series.length, width, leftPadding + barGroupWidth / 2, rightPadding + barGroupWidth / 2);

  return series.map((entry, index) => {
    const groupX = xPositions[index];
    const baseX = groupX - barGroupWidth / 2;
    const scale = innerHeight / axisMax;

    return {
      day: entry.day,
      bars: [
        { key: "taken", value: entry.taken, x: baseX, fill: chartColors.taken },
        { key: "suggested", value: entry.suggested, x: baseX + 16, fill: chartColors.worked },
        { key: "missed", value: entry.missed, x: baseX + 32, fill: chartColors.notWorked },
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

function PauseBehaviorChart({ data }) {
  const width = chartWidth;
  const height = pauseChartHeight;
  const leftPadding = 40;
  const rightPadding = 22;
  const topPadding = 16;
  const bottomPadding = 34;
  const axisMax = Math.max(4, ...data.map((entry) => Math.max(entry.taken, entry.suggested, entry.missed, 0)));
  const tickValues = Array.from({ length: Math.max(2, Math.ceil(axisMax) + 1) }, (_, value) => value);

  if (!data.length) {
    return (
      <div className="chart-card">
        <p>Geen pauzedata beschikbaar.</p>
      </div>
    );
  }

  const bars = buildBarSeries(data, axisMax, width, height, leftPadding, rightPadding, topPadding, bottomPadding);
  const ticks = tickValues.map((value) => ({ value, max: axisMax }));

  return (
    <div className="chart-card">
      <svg className="weekly-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Pauzegedrag over de week">
        <ChartGrid width={width} height={height} leftPadding={leftPadding} rightPadding={rightPadding} topPadding={topPadding} bottomPadding={bottomPadding} ticks={ticks} labels={data.map((entry) => entry.day)} />

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
        <span><i className="legend-swatch legend-worked" />Geadviseerde pauzes</span>
        <span><i className="legend-swatch legend-not-worked" />Gemiste pauzes</span>
      </div>
    </div>
  );
}

function StressEnergyChart({ data }) {
  const width = chartWidth;
  const height = lineChartHeight;
  const leftPadding = 42;
  const rightPadding = 22;
  const topPadding = 16;
  const bottomPadding = 38;
  const maxValue = 5;

  if (!data.length) {
    return (
      <div className="chart-card">
        <p>Geen stress- of energiedata beschikbaar.</p>
      </div>
    );
  }

  const stressPoints = buildLineSeries(data, width, height, leftPadding, rightPadding, topPadding, bottomPadding, "stress", maxValue);
  const energyPoints = buildLineSeries(data, width, height, leftPadding, rightPadding, topPadding, bottomPadding, "energy", maxValue);
  const stressPath = createSmoothPath(stressPoints);
  const energyPath = createSmoothPath(energyPoints);
  const ticks = [0, 1, 2, 3, 4, 5].map((value) => ({ value, max: maxValue }));

  return (
    <div className="chart-card">
      <svg className="weekly-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stress en energie verloop over de week">
        <ChartGrid width={width} height={height} leftPadding={leftPadding} rightPadding={rightPadding} topPadding={topPadding} bottomPadding={bottomPadding} ticks={ticks} labels={data.map((entry) => entry.day)} />

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
          <circle key={`energy-${data[index].day}`} cx={point.x} cy={point.y} r="8" fill={chartColors.energyDot} />
        ))}

        {stressPoints.map((point, index) => (
          <circle key={`stress-${data[index].day}`} cx={point.x} cy={point.y} r="8" fill={chartColors.stressDot} />
        ))}
      </svg>

      <div className="chart-legend">
        <span><i className="legend-swatch legend-stress" />Stress</span>
        <span><i className="legend-swatch legend-energy" />Energie</span>
      </div>
    </div>
  );
}

export default function ReportsWeek({ profile, user, reportUserId = null }) {
  const [reportData, setReportData] = useState({
    weekTimeline: [],
    pauseBehaviorData: [],
    stressEnergyData: [],
    stressLevel: 3,
    energyLevel: 2,
    pausesTaken: 0,
    pausesSkipped: 0,
  });
  const [loading, setLoading] = useState(true);

  async function refreshReport() {
    const { data, error } = await loadWeeklyWellbeingReport(reportUserId || profile?.id || user?.id || null);

    if (error) {
      console.error("Failed to load weekly report data:", error);
      return;
    }

    if (data) {
      setReportData(data);
    }
  }

  async function handleStressChange(value) {
    setReportData((previous) => ({ ...previous, stressLevel: value }));
    const { error } = await addStressCheck(value, null, reportUserId || profile?.id || user?.id || null);
    if (error) {
      console.error("Failed to save stress check-in:", error);
      return;
    }

    await refreshReport();
  }

  async function handleEnergyChange(value) {
    setReportData((previous) => ({ ...previous, energyLevel: value }));
    const { error } = await addEnergyCheck(value, null, reportUserId || profile?.id || user?.id || null);
    if (error) {
      console.error("Failed to save energy check-in:", error);
      return;
    }

    await refreshReport();
  }

  useEffect(() => {
    let active = true;

    async function loadReport() {
      const { data, error } = await loadWeeklyWellbeingReport(reportUserId || profile?.id || user?.id || null);

      if (!active) return;

      if (error) {
        console.error("Failed to load weekly report data:", error);
      }

      if (data) {
        setReportData(data);
      }

      setLoading(false);
    }

    loadReport();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="reports-layout reports-week-layout">
      <aside className="reports-left">
        <div className="rating-cards-container">
          <StressSlider label="Hoe hoog is je stressniveau nu?" value={reportData.stressLevel} onStressChange={handleStressChange} />
          <EnergySlider label="Wat is jouw energie level nu?" value={reportData.energyLevel} onEnergyChange={handleEnergyChange} />
        </div>

        <StatsSection
          stress={reportData.stressLevel}
          energy={reportData.energyLevel}
          pausesTaken={reportData.pausesTaken}
          pausesSkipped={reportData.pausesSkipped}
        />
      </aside>

      <section className="reports-right reports-week-right">
        <h1>De week in momenten</h1>
        <p className="reports-desc">Je wekelijkse tijdlijn met check-ins, pauzes en belangrijke momenten</p>

        {loading && reportData.weekTimeline.length === 0 ? <p>Weekgegevens laden...</p> : null}

        <div className="timeline weekly-timeline">
          {reportData.weekTimeline.map((item) => (
            <div key={item.id} className="timeline-item weekly-timeline-item">
              <div className="timeline-icon weekly-timeline-icon">
                <img src={renderTimelineIcon(item.icon)} alt="icon" />
              </div>

              <div className="weekly-timeline-content">
                <div className="weekly-timeline-day">{item.day}</div>
                <div className="timeline-info weekly-timeline-summary">{item.summary}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="weekly-graphs-scroll">
          <section className="weekly-analytics-section">
            <h2>Pauzegedrag</h2>
            <p>De grafiek volgt de opgeslagen pauzes, de geadviseerde pauzes en de gemiste pauzemomenten per dag.</p>
            <PauseBehaviorChart data={reportData.pauseBehaviorData} />
          </section>

          <section className="weekly-analytics-section">
            <h2>Stress en energie verloop</h2>
            <p>Deze lijn grafiek toont de gemiddelde stress- en energieniveaus per opgeslagen werkdag.</p>
            <StressEnergyChart data={reportData.stressEnergyData} />
          </section>
        </div>
      </section>
    </div>
  );
}
