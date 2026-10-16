"""
Real Machine Learning Model Training Pipeline for Tourism Demand Forecasting
Algorithms:
1. Linear Regression (Ordinary Least Squares with Trend & Seasonality)
2. Prophet (Bayesian Additive Seasonality & Changepoint Model)
3. Random Forest Regression (Multi-factor Ensemble Bagging)
4. XGBoost (Gradient Boosted Trees with Regularization)
"""

import os
import re
import json
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score, mean_squared_error
import xgboost as xgb
from prophet import Prophet

# 1. Historical Actual Quarterly Dataset (2022 Q1 – 2025 Q4, 16 quarters)
HISTORICAL_DATA = [
    {"period": "2022 Q1", "year": 2022, "quarter": 1, "visitors": 36.36, "expenditure": 140.85, "aor": 46.26},
    {"period": "2022 Q2", "year": 2022, "quarter": 2, "visitors": 45.47, "expenditure": 152.20, "aor": 46.26},
    {"period": "2022 Q3", "year": 2022, "quarter": 3, "visitors": 43.00, "expenditure": 136.71, "aor": 46.26},
    {"period": "2022 Q4", "year": 2022, "quarter": 4, "visitors": 46.77, "expenditure": 153.94, "aor": 46.26},
    {"period": "2023 Q1", "year": 2023, "quarter": 1, "visitors": 49.26, "expenditure": 152.84, "aor": 48.41},
    {"period": "2023 Q2", "year": 2023, "quarter": 2, "visitors": 55.28, "expenditure": 155.13, "aor": 48.41},
    {"period": "2023 Q3", "year": 2023, "quarter": 3, "visitors": 54.16, "expenditure": 145.25, "aor": 48.41},
    {"period": "2023 Q4", "year": 2023, "quarter": 4, "visitors": 55.03, "expenditure": 169.38, "aor": 48.41},
    {"period": "2024 Q1", "year": 2024, "quarter": 1, "visitors": 58.61, "expenditure": 160.94, "aor": 50.21},
    {"period": "2024 Q2", "year": 2024, "quarter": 2, "visitors": 68.44, "expenditure": 161.16, "aor": 50.21},
    {"period": "2024 Q3", "year": 2024, "quarter": 3, "visitors": 66.26, "expenditure": 151.24, "aor": 50.21},
    {"period": "2024 Q4", "year": 2024, "quarter": 4, "visitors": 66.82, "expenditure": 170.05, "aor": 50.21},
    {"period": "2025 Q1", "year": 2025, "quarter": 1, "visitors": 69.68, "expenditure": 165.32, "aor": 51.52},
    {"period": "2025 Q2", "year": 2025, "quarter": 2, "visitors": 73.75, "expenditure": 155.23, "aor": 51.52},
    {"period": "2025 Q3", "year": 2025, "quarter": 3, "visitors": 72.60, "expenditure": 161.11, "aor": 51.52},
    {"period": "2025 Q4", "year": 2025, "quarter": 4, "visitors": 73.07, "expenditure": 180.20, "aor": 51.52},
]

df_hist = pd.DataFrame(HISTORICAL_DATA)
df_hist['t'] = np.arange(len(df_hist))

# 2. Future Forecast Horizon (2026 Q1 – 2030 Q4, 20 quarters)
future_rows = []
for year in range(2026, 2031):
    for q in range(1, 5):
        future_rows.append({
            "period": f"{year} Q{q}",
            "year": year,
            "quarter": q,
            "t": len(df_hist) + len(future_rows)
        })
df_future = pd.DataFrame(future_rows)

def make_features(df):
    X = pd.DataFrame()
    X['t'] = df['t'].values
    X['t_norm'] = df['t'].values / 16.0
    q = df['quarter'].values
    X['q1'] = (q == 1).astype(float)
    X['q2'] = (q == 2).astype(float)
    X['q3'] = (q == 3).astype(float)
    X['q4'] = (q == 4).astype(float)
    X['sin_q'] = np.sin(2 * np.pi * q / 4)
    X['cos_q'] = np.cos(2 * np.pi * q / 4)
    return X

def eval_metrics(y_true, y_pred):
    r2 = r2_score(y_true, y_pred)
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    return {
        "rSquared": round(float(r2), 3),
        "mape": round(float(mape), 2),
        "rmse": round(float(rmse), 2)
    }

def train_and_export():
    targets = ['visitors', 'expenditure', 'aor']

    X_train = make_features(df_hist)
    X_future = make_features(df_future)

    # ----------------------------------------------------
    # Model 1: Linear Regression (OLS)
    # ----------------------------------------------------
    preds_linear, bounds_linear, metrics_linear = {}, {}, {}
    for target in targets:
        y_train = df_hist[target].values
        cols = ['t', 'q1', 'q2', 'q4']
        lr = LinearRegression()
        lr.fit(X_train[cols], y_train)
        y_fit = lr.predict(X_train[cols])
        metrics_linear[target] = eval_metrics(y_train, y_fit)

        future_pred = lr.predict(X_future[cols])
        residuals = y_train - y_fit
        std_err = np.std(residuals, ddof=4)

        n = len(y_train)
        mean_t = np.mean(X_train['t'])
        ss_t = np.sum((X_train['t'] - mean_t)**2)
        ci = 1.96 * std_err * np.sqrt(1 + 1/n + (X_future['t'] - mean_t)**2 / ss_t)

        preds_linear[target] = future_pred
        bounds_linear[target] = {
            "lower": np.maximum(0, future_pred - ci),
            "upper": future_pred + ci
        }

    # ----------------------------------------------------
    # Model 2: Prophet
    # ----------------------------------------------------
    dates_train = [f"{r['year']}-{(r['quarter'])*3:02d}-28" for _, r in df_hist.iterrows()]
    dates_future = [f"{r['year']}-{(r['quarter'])*3:02d}-28" for _, r in df_future.iterrows()]
    
    preds_prophet, bounds_prophet, metrics_prophet = {}, {}, {}
    for target in targets:
        df_p_train = pd.DataFrame({'ds': pd.to_datetime(dates_train), 'y': df_hist[target].values})
        m = Prophet(yearly_seasonality=True, interval_width=0.95, daily_seasonality=False, weekly_seasonality=False)
        m.fit(df_p_train)
        fit_res = m.predict(df_p_train)
        metrics_prophet[target] = eval_metrics(df_hist[target].values, fit_res['yhat'].values)

        df_p_future = pd.DataFrame({'ds': pd.to_datetime(dates_future)})
        f_res = m.predict(df_p_future)
        preds_prophet[target] = f_res['yhat'].values
        bounds_prophet[target] = {
            "lower": np.maximum(0, f_res['yhat_lower'].values),
            "upper": f_res['yhat_upper'].values
        }

    # ----------------------------------------------------
    # Model 3: Random Forest Regression
    # ----------------------------------------------------
    preds_rf, bounds_rf, metrics_rf = {}, {}, {}
    for target in targets:
        y_train = df_hist[target].values
        rf = RandomForestRegressor(n_estimators=200, max_depth=4, random_state=42)
        rf.fit(X_train, y_train)
        y_fit = rf.predict(X_train)
        metrics_rf[target] = eval_metrics(y_train, y_fit)

        # Baseline linear component + RF residual interaction
        lr_base = LinearRegression().fit(X_train[['t']], y_train)
        trend_future = lr_base.predict(X_future[['t']])
        rf_future = trend_future + (rf.predict(X_future) - np.mean(y_fit)) * 0.45

        tree_preds = np.array([tree.predict(X_future.values) for tree in rf.estimators_])
        std_tree = np.std(tree_preds, axis=0)
        ci_rf = 1.96 * (std_tree + np.std(y_train - y_fit))

        preds_rf[target] = rf_future
        bounds_rf[target] = {
            "lower": np.maximum(0, rf_future - ci_rf),
            "upper": rf_future + ci_rf
        }

    # ----------------------------------------------------
    # Model 4: XGBoost
    # ----------------------------------------------------
    preds_xgb, bounds_xgb, metrics_xgb = {}, {}, {}
    for target in targets:
        y_train = df_hist[target].values
        xgb_mod = xgb.XGBRegressor(
            n_estimators=100,
            learning_rate=0.08,
            max_depth=3,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42
        )
        xgb_mod.fit(X_train, y_train)
        y_fit = xgb_mod.predict(X_train)
        metrics_xgb[target] = eval_metrics(y_train, y_fit)

        lr_base = LinearRegression().fit(X_train[['t']], y_train)
        trend_future = lr_base.predict(X_future[['t']])
        xgb_future = trend_future + (xgb_mod.predict(X_future) - np.mean(y_fit)) * 0.5

        residuals = y_train - y_fit
        rmse_val = np.std(residuals)
        horizon_penalty = np.sqrt(1 + 0.05 * np.arange(len(df_future)))
        ci_xgb = 1.96 * rmse_val * horizon_penalty

        preds_xgb[target] = xgb_future
        bounds_xgb[target] = {
            "lower": np.maximum(0, xgb_future - ci_xgb),
            "upper": xgb_future + ci_xgb
        }

    # Metric rankings based on visitors model
    trained_metrics = {
        'xgboost': metrics_xgb['visitors'],
        'prophet': metrics_prophet['visitors'],
        'linear': metrics_linear['visitors'],
        'random_forest': metrics_rf['visitors']
    }

    print("\n=== REAL TRAINED MODEL EVALUATION (MALAYSIA TOURISM DEMAND) ===")
    for m_id, m_vals in sorted(trained_metrics.items(), key=lambda x: -x[1]['rSquared']):
        print(f"Algorithm: {m_id:15s} | R²: {m_vals['rSquared']:<6} | MAPE: {m_vals['mape']:<5}% | RMSE: {m_vals['rmse']}M")

    # Format into TS data points
    all_models_data = {}
    model_maps = {
        'linear': (preds_linear, bounds_linear),
        'prophet': (preds_prophet, bounds_prophet),
        'random_forest': (preds_rf, bounds_rf),
        'xgboost': (preds_xgb, bounds_xgb)
    }

    for m_id, (m_preds, m_bounds) in model_maps.items():
        points = []
        # 16 Historical points
        for r in HISTORICAL_DATA:
            points.append({
                "period": r["period"],
                "year": r["year"],
                "quarter": r["quarter"],
                "domestic": r["visitors"],
                "international": 0,
                "total": r["visitors"],
                "domesticShare": 100,
                "internationalShare": 0,
                "expenditure": r["expenditure"],
                "aor": r["aor"],
                "isForecast": False,
                "isAorForecast": False
            })

        # Future forecast points
        for idx, r in df_future.iterrows():
            vis = round(float(m_preds['visitors'][idx]), 2)
            vis_low = round(float(m_bounds['visitors']['lower'][idx]), 2)
            vis_up = round(float(m_bounds['visitors']['upper'][idx]), 2)

            exp = round(float(m_preds['expenditure'][idx]), 2)
            exp_low = round(float(m_bounds['expenditure']['lower'][idx]), 2)
            exp_up = round(float(m_bounds['expenditure']['upper'][idx]), 2)

            aor_val = round(float(m_preds['aor'][idx]), 2)
            aor_low = round(float(m_bounds['aor']['lower'][idx]), 2)
            aor_up = round(float(m_bounds['aor']['upper'][idx]), 2)

            points.append({
                "period": r["period"],
                "year": int(r["year"]),
                "quarter": int(r["quarter"]),
                "domestic": vis,
                "international": 0,
                "total": vis,
                "domesticShare": 100,
                "internationalShare": 0,
                "expenditure": exp,
                "aor": aor_val,
                "isForecast": True,
                "lowerBound": vis_low,
                "upperBound": vis_up,
                "expenditureLower": exp_low,
                "expenditureUpper": exp_up,
                "isAorForecast": True,
                "aorLower": aor_low,
                "aorUpper": aor_up
            })
        all_models_data[m_id] = points

    # Save trained results to JSON
    json_path = os.path.join("src", "data", "trainedForecastResults.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump({
            "metrics": trained_metrics,
            "modelsData": all_models_data
        }, f, indent=2)

    print(f"\nTrained forecast results successfully exported to {json_path}")
    return trained_metrics, all_models_data

if __name__ == '__main__':
    train_and_export()
