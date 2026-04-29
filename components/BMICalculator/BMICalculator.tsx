'use client';

import { useState, useMemo } from 'react';
import styles from './BMICalculator.module.css';

type Unit = 'metric' | 'imperial';
type Gender = 'male' | 'female' | 'prefer-not-to-say' | '';

const GAUGE_MIN = 15;
const GAUGE_MAX = 40;

const CATEGORIES = [
  { label: 'Underweight', range: 'Below 18.5', min: 0,    max: 18.5,    color: '#3b82f6' },
  { label: 'Normal weight', range: '18.5 – 24.9', min: 18.5, max: 25,   color: '#22c55e' },
  { label: 'Overweight',  range: '25.0 – 29.9', min: 25,   max: 30,     color: '#f59e0b' },
  { label: 'Obese',       range: '30.0 and above', min: 30, max: Infinity, color: '#ef4444' },
];

// Gauge segment widths (GAUGE range = 15–40, span = 25)
const GAUGE_SEGMENTS = [
  { label: 'Underweight', color: '#3b82f6', width: ((18.5 - 15) / 25) * 100 },
  { label: 'Normal',      color: '#22c55e', width: ((25 - 18.5) / 25) * 100 },
  { label: 'Overweight',  color: '#f59e0b', width: ((30 - 25) / 25) * 100  },
  { label: 'Obese',       color: '#ef4444', width: ((40 - 30) / 25) * 100  },
];

function getCategory(bmi: number) {
  return CATEGORIES.find(c => bmi < c.max) ?? CATEGORIES[CATEGORIES.length - 1];
}

function gaugePercent(bmi: number) {
  const pct = ((bmi - GAUGE_MIN) / (GAUGE_MAX - GAUGE_MIN)) * 100;
  return Math.min(97, Math.max(3, pct));
}

export default function BMICalculator() {
  const [unit, setUnit] = useState<Unit>('metric');
  const [weightKg, setWeightKg]   = useState('');
  const [heightCm, setHeightCm]   = useState('');
  const [weightLbs, setWeightLbs] = useState('');
  const [heightFt, setHeightFt]   = useState('');
  const [heightIn, setHeightIn]   = useState('');
  const [age, setAge]             = useState('');
  const [gender, setGender]       = useState<Gender>('');

  const { bmi, heightForRange } = useMemo(() => {
    if (unit === 'metric') {
      const w = parseFloat(weightKg);
      const hm = parseFloat(heightCm) / 100;
      if (!w || !hm || w <= 0 || hm <= 0) return { bmi: null, heightForRange: hm || null };
      return { bmi: w / (hm * hm), heightForRange: hm };
    } else {
      const w = parseFloat(weightLbs);
      const totalIn = (parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0);
      if (!w || !totalIn || w <= 0 || totalIn <= 0) return { bmi: null, heightForRange: totalIn || null };
      return { bmi: (703 * w) / (totalIn * totalIn), heightForRange: totalIn };
    }
  }, [unit, weightKg, heightCm, weightLbs, heightFt, heightIn]);

  const healthyRange = useMemo(() => {
    if (!heightForRange || heightForRange <= 0) return null;
    if (unit === 'metric') {
      const h = heightForRange;
      return { min: (18.5 * h * h).toFixed(1), max: (24.9 * h * h).toFixed(1), unit: 'kg' };
    } else {
      const t = heightForRange;
      return {
        min: ((18.5 * t * t) / 703).toFixed(1),
        max: ((24.9 * t * t) / 703).toFixed(1),
        unit: 'lbs',
      };
    }
  }, [unit, heightForRange]);

  const category  = bmi != null ? getCategory(bmi) : null;
  const gaugePct  = bmi != null ? gaugePercent(bmi) : null;
  const ageNum    = parseInt(age) || 0;

  function switchUnit(next: Unit) {
    setUnit(next);
    setWeightKg(''); setHeightCm('');
    setWeightLbs(''); setHeightFt(''); setHeightIn('');
  }

  return (
    <div className={styles.wrapper}>
      {/* Unit toggle */}
      <div className={styles.unitToggle}>
        <button
          className={`${styles.toggleBtn} ${unit === 'metric' ? styles.active : ''}`}
          onClick={() => switchUnit('metric')}
        >
          Metric (kg / cm)
        </button>
        <button
          className={`${styles.toggleBtn} ${unit === 'imperial' ? styles.active : ''}`}
          onClick={() => switchUnit('imperial')}
        >
          Imperial (lbs / ft)
        </button>
      </div>

      {/* Inputs */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Your Measurements</h2>

        <div className={styles.fieldRow}>
          {unit === 'metric' ? (
            <>
              <div className={styles.field}>
                <label htmlFor="weight-kg">Weight (kg)</label>
                <input
                  id="weight-kg"
                  type="number"
                  min="1"
                  max="500"
                  placeholder="e.g. 70"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="height-cm">Height (cm)</label>
                <input
                  id="height-cm"
                  type="number"
                  min="50"
                  max="300"
                  placeholder="e.g. 175"
                  value={heightCm}
                  onChange={e => setHeightCm(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.field}>
                <label htmlFor="weight-lbs">Weight (lbs)</label>
                <input
                  id="weight-lbs"
                  type="number"
                  min="1"
                  max="1000"
                  placeholder="e.g. 154"
                  value={weightLbs}
                  onChange={e => setWeightLbs(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Height</label>
                <div className={styles.heightImperial}>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="ft"
                    value={heightFt}
                    onChange={e => setHeightFt(e.target.value)}
                    aria-label="Height feet"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    placeholder="in"
                    value={heightIn}
                    onChange={e => setHeightIn(e.target.value)}
                    aria-label="Height inches"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="age">Age (optional)</label>
            <input
              id="age"
              type="number"
              min="1"
              max="120"
              placeholder="e.g. 30"
              value={age}
              onChange={e => setAge(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Gender (optional)</label>
            <div className={styles.radioGroup}>
              {(['male', 'female', 'prefer-not-to-say'] as const).map(g => (
                <label key={g} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={() => setGender(g)}
                  />
                  {g === 'prefer-not-to-say'
                    ? 'Prefer not to say'
                    : g.charAt(0).toUpperCase() + g.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Result card */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Your BMI Result</h2>

        <div className={styles.resultDisplay}>
          <div
            className={styles.bmiNumber}
            style={{ color: category ? category.color : '#bbb' }}
          >
            {bmi != null ? bmi.toFixed(1) : '—'}
          </div>
          <div
            className={styles.categoryLabel}
            style={{ color: category ? category.color : '#999' }}
          >
            {category ? category.label : 'Enter your measurements above'}
          </div>
        </div>

        {/* Gauge bar */}
        <div className={styles.gaugeWrapper}>
          <div className={styles.gaugeBar}>
            {GAUGE_SEGMENTS.map(seg => (
              <div
                key={seg.label}
                className={styles.gaugeSegment}
                style={{ width: `${seg.width}%`, background: seg.color }}
              />
            ))}
            {gaugePct != null && (
              <div
                className={styles.gaugeIndicator}
                style={{ left: `${gaugePct}%` }}
                aria-label={`BMI indicator at ${bmi?.toFixed(1)}`}
              />
            )}
          </div>
          <div className={styles.gaugeLabels}>
            <span>Underweight</span>
            <span>Normal</span>
            <span>Overweight</span>
            <span>Obese</span>
          </div>
          <div className={styles.gaugeScale}>
            <span>15</span>
            <span>18.5</span>
            <span>25</span>
            <span>30</span>
            <span>40</span>
          </div>
        </div>

        {healthyRange && (
          <div className={styles.healthyRange}>
            For your height, a healthy weight is{' '}
            <strong>
              {healthyRange.min} – {healthyRange.max} {healthyRange.unit}
            </strong>
          </div>
        )}
      </div>

      {/* Category table */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>BMI Categories</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>BMI Range</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map(row => {
              const active = bmi != null && bmi >= row.min && bmi < row.max;
              return (
                <tr
                  key={row.label}
                  className={active ? styles.activeRow : ''}
                  style={
                    active
                      ? {
                          background: `${row.color}18`,
                          borderLeft: `3px solid ${row.color}`,
                        }
                      : {}
                  }
                >
                  <td>{row.range}</td>
                  <td style={{ color: row.color, fontWeight: active ? 700 : 400 }}>
                    {row.label}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info section */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>About BMI</h2>
        <p className={styles.infoText}>
          Body Mass Index (BMI) is a simple calculation using your height and weight to estimate
          whether you are at a healthy weight. It is widely used as a screening tool to identify
          potential weight-related health risks.
        </p>
        <p className={styles.infoText}>
          <strong>Limitations:</strong> BMI does not account for muscle mass, bone density, age,
          sex, or body fat distribution. Athletes may have a high BMI without excess body fat, and
          older adults may have a normal BMI while carrying more fat than is healthy.
        </p>

        {(ageNum > 0 || gender) && (
          <div className={styles.contextNote}>
            {ageNum > 0 && ageNum < 18 && (
              <p>
                <strong>Note on age:</strong> BMI interpretation differs for children and
                teenagers. Standard BMI ranges apply to adults (18+). Consult a healthcare
                provider for age-appropriate assessment.
              </p>
            )}
            {ageNum >= 65 && (
              <p>
                <strong>Note on age:</strong> For adults 65 and older, a slightly higher BMI
                (up to 27) may be associated with better health outcomes.
              </p>
            )}
            {gender === 'female' && (
              <p>
                <strong>Note on gender:</strong> Women naturally carry more body fat than men at
                the same BMI. This is normal and accounted for in standard BMI health
                assessments.
              </p>
            )}
            {gender === 'male' && (
              <p>
                <strong>Note on gender:</strong> Men tend to carry less body fat than women at
                the same BMI, so the standard ranges are the same for both sexes in most
                guidelines.
              </p>
            )}
          </div>
        )}

        <p className={styles.disclaimer}>
          This tool is for informational purposes only and is not medical advice. Consult a
          qualified healthcare professional for personalized guidance.
        </p>
      </div>
    </div>
  );
}
