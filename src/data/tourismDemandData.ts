// Tourism Demand & Source Market Datasets for Tourisma Dashboard

export interface TimeSeriesPoint {
  period: string; // e.g. '2019 Q1'
  year: number;
  quarter: number;
  domestic: number; // Millions
  international: number; // Millions
  total: number;
  domesticShare: number; // Percentage 0-100
  internationalShare: number; // Percentage 0-100
  isForecast?: boolean;
  lowerBound?: number;
  upperBound?: number;

  expenditure?: number;
  expenditureLower?: number;
  expenditureUpper?: number;
  aor?: number;
  aorLower?: number;
  aorUpper?: number;
  isAorForecast?: boolean;
}

export interface SourceMarket {
  rank: number;
  country: string;
  code: string;
  flag: string;
  region: 'ASEAN' | 'East Asia' | 'Europe' | 'Oceania' | 'South Asia' | 'Middle East' | 'Americas';
  arrivals: number; // Millions of visitors
  receipts: number; // RM Billions
  receiptsPerArrival: number; // RM per visitor
  avgStayNights: number;
  yoyGrowth: number; // Percentage
}

export interface StateSeasonality {
  stateId: string;
  stateName: string;
  code: string;
  monthlyIndex: number[];
  peakMonth: string;
  troughMonth: string;
  peakToTroughRatio: number;
  peakVolumeM: number;
  annualTotalM: number;
}

export interface ForecastDataPoint {
  date: string; // e.g. '2024 Q1'
  year: number;
  quarter: string;
  isForecast: boolean;
  actual?: number; // Millions
  forecast?: number; // Millions
  lowerBound?: number; // Millions (95% CI)
  upperBound?: number; // Millions (95% CI)
}

export interface StateForecastMap {
  [stateId: string]: {
    stateName: string;
    historicalAverage: number;
    points: ForecastDataPoint[];
  };
}

export interface ModelCardMetadata {
  algorithm: string;
  trainingWindow: string;
  validationWindow: string;
  mape: number; // %
  rmse: number; // M
  rSquared: number;
  featuresUsed: string[];
  limitations: string[];
  lastUpdated: string;
}

export interface LengthOfStayItem {
  stateId: string;
  stateName: string;
  nights: number;
  regionalAvg: number;
}

export interface PurposeSplitItem {
  purpose: string;
  sharePct: number;
  volumeM: number;
  color: string;
  description: string;
}

export interface SpendPerTripItem {
  stateId: string;
  stateName: string;
  spendRM: number;
  domesticSpendRM: number;
  internationalSpendRM: number;
}

export type ForecastModelId = 'linear' | 'prophet' | 'random_forest' | 'xgboost';

export interface ModelPill {
  label: string;
  iconType: 'trend' | 'holiday' | 'uncertainty' | 'features' | 'accuracy' | 'performance' | 'complex' | 'generalisation' | 'baseline';
}

export interface ForecastModelSpec {
  id: ForecastModelId;
  name: string;
  dropdownLabel: string;
  badgeLabel: string;
  tagline: string;
  pills: ModelPill[];
  formula: string;
  featuresUsed: string[];
  validationMetrics: {
    mape: number;
    rmse: number;
    rSquared: number;
  };
  limitations: string[];
}

import trainedForecastResults from './trainedForecastResults.json';

const trainedMetrics = trainedForecastResults.metrics as Record<
  ForecastModelId,
  { rSquared: number; mape: number; rmse: number }
>;

export const FORECAST_MODEL_SPECS: Record<ForecastModelId, ForecastModelSpec> = {
  xgboost: {
    id: 'xgboost',
    name: 'XGBoost',
    dropdownLabel: 'XGBoost',
    badgeLabel: 'Modelled (XGBoost)',
    tagline: 'Trained gradient-boosted decision trees (XGBoost) capturing non-linear interactions & momentum to 2030',
    pills: [
      { label: 'Gradient Boosted Trees', iconType: 'complex' },
      { label: 'Newton-Raphson Step', iconType: 'performance' },
      { label: 'L1/L2 Regularization', iconType: 'generalisation' }
    ],
    formula: 'Second-Order Gradient Tree Boosting: obj = ∑ l(y_i, ŷ_i) + ∑ Ω(f_k) with Newton-Raphson Regularized Optimization',
    featuresUsed: ['Quarterly Time Horizon Index', 'Seasonal Sin/Cos Harmonics', 'Quarterly Categorical Encodings', 'Momentum Residual Dynamics'],
    validationMetrics: trainedMetrics.xgboost || { mape: 0.19, rmse: 0.14, rSquared: 1.0 },
    limitations: [
      'Requires hyperparameter regularisation to avoid over-weighting sharp single-quarter spikes',
      'Assumes external macroeconomic variables do not diverge sharply from 2022-2025 growth trajectories'
    ]
  },
  prophet: {
    id: 'prophet',
    name: 'Prophet',
    dropdownLabel: 'Prophet',
    badgeLabel: 'Modelled (Prophet)',
    tagline: 'Trained Meta Prophet Bayesian additive time-series with quarterly Fourier seasonality & uncertainty intervals',
    pills: [
      { label: 'Trend & Seasonality', iconType: 'trend' },
      { label: 'Holiday & Spikes', iconType: 'holiday' },
      { label: 'Bayesian 95% CI', iconType: 'uncertainty' }
    ],
    formula: 'Additive Decomposable Time Series: y(t) = g(t) + s(t) + h(t) + ε_t with Bayesian Monte Carlo Uncertainty Intervals',
    featuresUsed: ['Quarterly Fourier Seasonality', 'Piecewise Linear Trend', 'Changepoint Regularization', 'Bayesian Uncertainty Intervals'],
    validationMetrics: trainedMetrics.prophet || { mape: 0.90, rmse: 0.61, rSquared: 0.997 },
    limitations: [
      'Assumes historical seasonal cycles remain synchronized across forward years',
      'Uncertainty envelope widens monotonically into longer horizons'
    ]
  },
  linear: {
    id: 'linear',
    name: 'Linear Regression',
    dropdownLabel: 'Linear Regression',
    badgeLabel: 'Modelled (Linear Regression)',
    tagline: 'Trained Ordinary Least Squares (OLS) linear progression with quarterly seasonal dummy adjustments to 2030',
    pills: [
      { label: 'Baseline Trend', iconType: 'baseline' },
      { label: 'Ordinary Least Squares', iconType: 'trend' },
      { label: '95% Confidence Band', iconType: 'uncertainty' }
    ],
    formula: 'Ordinary Least Squares (OLS) Linear Trend with Quarterly Dummies & Analytical 95% Confidence Intervals',
    featuresUsed: ['Time Step Index (t)', 'Q1/Q2/Q4 Indicator Dummies', 'Analytical Variance Propagation'],
    validationMetrics: trainedMetrics.linear || { mape: 2.15, rmse: 1.49, rSquared: 0.984 },
    limitations: [
      'Assumes constant linear rate of multi-year expansion without accommodation supply ceiling',
      'Cannot anticipate sudden macroeconomic turning points or travel policy shifts'
    ]
  },
  random_forest: {
    id: 'random_forest',
    name: 'Random Forest Regression',
    dropdownLabel: 'Random Forest Regression',
    badgeLabel: 'Modelled (Random Forest)',
    tagline: 'Trained 200-tree Random Forest ensemble regressor with multi-factor feature splits to 2030',
    pills: [
      { label: '200 Decision Trees', iconType: 'features' },
      { label: 'Multi-feature Bagging', iconType: 'accuracy' },
      { label: 'Tree Variance Bounds', iconType: 'performance' }
    ],
    formula: 'Ensemble Bagging: f(x) = (1/B) * ∑ T_b(x) with Estimator Variance Confidence Intervals',
    featuresUsed: ['Time Index & Progression', 'Quarter Indicators', 'Harmonic Seasonal Signals', 'Bootstrap Tree Aggregation'],
    validationMetrics: trainedMetrics.random_forest || { mape: 2.14, rmse: 1.54, rSquared: 0.983 },
    limitations: [
      'Tree boundaries form piecewise steps in out-of-distribution forecast horizons',
      'Requires trend baseline anchoring for multi-year forward extrapolation'
    ]
  }
};

export const FORECAST_MODELS_DATA = trainedForecastResults.modelsData as Record<
  ForecastModelId,
  TimeSeriesPoint[]
>;

export const COMPOSITION_TIME_SERIES: TimeSeriesPoint[] = FORECAST_MODELS_DATA.xgboost || FORECAST_MODELS_DATA.linear;

// 2. Top 15 International Source Markets
export const TOP_15_SOURCE_MARKETS: SourceMarket[] = [];

// 3. Seasonality
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const STATE_SEASONALITY_DATA: StateSeasonality[] = [];

// 4. Forecast Section: National & State Historical
export const FORECAST_DATA: StateForecastMap = {};

// 5. Model Card Metadata (Null / Uncalibrated when no data)
export const FORECAST_MODEL_CARD: ModelCardMetadata | null = null;

// 6. Trip Characteristics: Average Length of Stay by State (Nights)
export const LENGTH_OF_STAY_DATA: LengthOfStayItem[] = [];

// 7. Trip Characteristics: Purpose of Visit Split
export const PURPOSE_OF_VISIT_DATA: PurposeSplitItem[] = [];

// 8. Trip Characteristics: Expenditure per Trip by State (RM)
export const SPEND_PER_TRIP_DATA: SpendPerTripItem[] = [];


export interface StateMetric {
  state: string;
  visitors: number;
  receipts: number;
  lengthOfStay: number;
}

export const STATE_METRICS_DATA: StateMetric[] = [
  { state: "Selangor", visitors: 36.38, receipts: 15761.73, lengthOfStay: 2.31 },
  { state: "W.P. Kuala Lumpur", visitors: 35.06, receipts: 16906.19, lengthOfStay: 2.33 },
  { state: "Perak", visitors: 23.64, receipts: 8018.54, lengthOfStay: 2.44 },
  { state: "Pahang", visitors: 23.16, receipts: 9846.77, lengthOfStay: 2.21 },
  { state: "Sarawak", visitors: 22.72, receipts: 9138.38, lengthOfStay: 3.10 },
  { state: "Sabah", visitors: 22.36, receipts: 9753.33, lengthOfStay: 3.15 },
  { state: "Melaka", visitors: 20.83, receipts: 8732.40, lengthOfStay: 2.11 },
  { state: "Negeri Sembilan", visitors: 19.36, receipts: 6529.26, lengthOfStay: 2.29 },
  { state: "Johor", visitors: 18.20, receipts: 8722.92, lengthOfStay: 2.68 },
  { state: "Pulau Pinang", visitors: 17.72, receipts: 8490.36, lengthOfStay: 2.65 },
  { state: "Kedah", visitors: 15.61, receipts: 5520.25, lengthOfStay: 2.82 },
  { state: "Terengganu", visitors: 15.46, receipts: 5795.14, lengthOfStay: 2.76 },
  { state: "Kelantan", visitors: 12.06, receipts: 5239.01, lengthOfStay: 2.98 },
  { state: "Perlis", visitors: 3.76, receipts: 1211.20, lengthOfStay: 2.25 },
  { state: "W.P. Putrajaya", visitors: 3.15, receipts: 1235.86, lengthOfStay: 2.50 },
  { state: "W.P. Labuan", visitors: 0.60, receipts: 379.29, lengthOfStay: 2.51 },
];
