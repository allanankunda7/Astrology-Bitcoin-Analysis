"""
visualization.py - Step 9 & Visualization Module
=================================================
Part of the "Astrology + Bitcoin Quantitative Backtesting System"

This module produces clean, high-precision matplotlib visualizations:
1. Overlays the 4 Major Moon Phases (New Moon, 1st Quarter, Full Moon, Last Quarter)
   directly onto the historical Bitcoin price time series.
2. Synchronizes an astronomical Lunar Illumination oscillator sub-panel.
3. Formats X-axis date labels without crowding or label overlap.
4. Supports linear and logarithmic price scaling.
"""

from typing import Optional, List
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd

# Matplotlib styling for scientific publication / research terminal
plt.style.use("seaborn-v0_8-darkgrid" if "seaborn-v0_8-darkgrid" in plt.style.available else "default")

# Marker configuration for the 4 Major Moon Phases
PHASE_STYLES = {
    "Full Moon": {
        "marker": "o",
        "color": "#F59E0B",      # Amber / Gold
        "edgecolor": "#78350F",
        "size": 55,
        "label": "Full Moon (Opposition)",
        "glyph": "🌕",
    },
    "New Moon": {
        "marker": "o",
        "color": "#3B82F6",      # Cobalt / Sapphire
        "edgecolor": "#1E3A8A",
        "size": 55,
        "label": "New Moon (Conjunction)",
        "glyph": "🌑",
    },
    "First Quarter": {
        "marker": "^",
        "color": "#06B6D4",      # Cyan
        "edgecolor": "#164E63",
        "size": 50,
        "label": "First Quarter (Waxing 90°)",
        "glyph": "🌓",
    },
    "Last Quarter": {
        "marker": "v",
        "color": "#A855F7",      # Purple / Violet
        "edgecolor": "#581C87",
        "size": 50,
        "label": "Last Quarter (Waning 270°)",
        "glyph": "🌗",
    },
}


def plot_btc_with_moon_phases(
    df: pd.DataFrame,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    selected_phases: Optional[List[str]] = None,
    log_scale: bool = False,
    show_subpanel: bool = True,
    save_path: Optional[str] = None,
    dpi: int = 150
) -> plt.Figure:
    """
    Generate an empirical Bitcoin price chart with overlaid Moon phase markers.

    Parameters:
    -----------
    df : pd.DataFrame
        DataFrame with 'Close' and astronomical columns ('Major_Phase', 'Illumination').
    start_date : str, optional
        Start date slice 'YYYY-MM-DD' (e.g. '2023-01-01').
    end_date : str, optional
        End date slice 'YYYY-MM-DD' (e.g. '2024-01-01').
    selected_phases : list of str, optional
        Subset of phases to plot. Defaults to all 4: ['Full Moon', 'New Moon', 'First Quarter', 'Last Quarter'].
    log_scale : bool
        If True, renders price on a logarithmic (log10) scale.
    show_subpanel : bool
        If True, displays synchronized Lunar Illumination (%) oscillator sub-panel.
    save_path : str, optional
        If specified, saves the chart image to this file path.
    dpi : int
        Resolution for saved image (default: 150).

    Returns:
    --------
    plt.Figure
        The generated Matplotlib Figure.
    """
    plot_df = df.copy()

    # Slice date range if provided
    if start_date:
        plot_df = plot_df[plot_df.index >= pd.to_datetime(start_date)]
    if end_date:
        plot_df = plot_df[plot_df.index <= pd.to_datetime(end_date)]

    if plot_df.empty:
        raise ValueError(f"No data points found between {start_date} and {end_date}.")

    phases_to_plot = selected_phases or ["Full Moon", "New Moon", "First Quarter", "Last Quarter"]

    # Create figure with either 1 panel or 2 synchronized sub-panels
    if show_subpanel and "Illumination" in plot_df.columns:
        fig, (ax_price, ax_moon) = plt.subplots(
            2, 1,
            figsize=(14, 8),
            sharex=True,
            gridspec_kw={"height_ratios": [3.2, 1.0], "hspace": 0.08}
        )
    else:
        fig, ax_price = plt.subplots(figsize=(14, 6))
        ax_moon = None

    fig.patch.set_facecolor("#0F1420")
    ax_price.set_facecolor("#0B0E17")

    # 1. Main Price Line
    ax_price.plot(
        plot_df.index,
        plot_df["Close"],
        color="#E2E8F0",
        linewidth=1.4,
        alpha=0.9,
        label="BTC-USD Close"
    )

    if log_scale:
        ax_price.set_yscale("log")
        ax_price.set_ylabel("Price (USD, Log Scale)", color="#94A3B8", fontsize=11, fontweight="medium")
    else:
        ax_price.set_ylabel("Price (USD)", color="#94A3B8", fontsize=11, fontweight="medium")

    ax_price.tick_params(colors="#94A3B8", labelsize=9)
    ax_price.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"${x:,.0f}"))
    ax_price.grid(True, linestyle="--", alpha=0.25, color="#334155")

    # 2. Overlay Moon Phase Markers onto Price Points
    for phase_name in phases_to_plot:
        if phase_name not in PHASE_STYLES:
            continue
        style = PHASE_STYLES[phase_name]
        mask = (plot_df["Major_Phase"] == phase_name)
        subset = plot_df[mask]

        if not subset.empty:
            ax_price.scatter(
                subset.index,
                subset["Close"],
                marker=style["marker"],
                color=style["color"],
                edgecolors=style["edgecolor"],
                s=style["size"],
                linewidth=0.9,
                zorder=5,
                label=f"{style['glyph']} {style['label']} (N={len(subset)})"
            )

    # Clean Title & Legend for Main Chart
    date_span_str = f"{plot_df.index[0].strftime('%b %d, %Y')} – {plot_df.index[-1].strftime('%b %d, %Y')}"
    ax_price.set_title(
        f"Bitcoin (BTC-USD) Historical Price with 4 Major Moon Phase Markers\n"
        f"Time Span: {date_span_str} · Total Bars: {len(plot_df):,}",
        color="#F8FAFC",
        fontsize=13,
        fontweight="bold",
        pad=14
    )

    leg = ax_price.legend(
        loc="upper left",
        facecolor="#111827",
        edgecolor="#1F2937",
        labelcolor="#E2E8F0",
        fontsize=9,
        framealpha=0.9
    )
    for text in leg.get_texts():
        text.set_color("#E2E8F0")

    # 3. Synchronized Lunar Illumination Sub-panel (if active)
    if ax_moon is not None:
        ax_moon.set_facecolor("#0B0E17")
        ax_moon.plot(
            plot_df.index,
            plot_df["Illumination"],
            color="#38BDF8",
            linewidth=1.2,
            alpha=0.85,
            label="Lunar Illumination (%)"
        )
        ax_moon.fill_between(
            plot_df.index,
            plot_df["Illumination"],
            0,
            color="#38BDF8",
            alpha=0.10
        )

        # Reference lines for New Moon (0%), Quarters (50%), Full Moon (100%)
        ax_moon.axhline(100, color="#F59E0B", linestyle=":", alpha=0.5, linewidth=0.8)
        ax_moon.axhline(50, color="#94A3B8", linestyle=":", alpha=0.3, linewidth=0.8)
        ax_moon.axhline(0, color="#3B82F6", linestyle=":", alpha=0.5, linewidth=0.8)

        ax_moon.set_ylabel("Illum. (%)", color="#94A3B8", fontsize=9)
        ax_moon.set_ylim(-5, 105)
        ax_moon.tick_params(colors="#94A3B8", labelsize=9)
        ax_moon.grid(True, linestyle="--", alpha=0.25, color="#334155")

    # 4. Clean X-Axis Formatting
    active_ax = ax_moon if ax_moon is not None else ax_price
    days_span = (plot_df.index[-1] - plot_df.index[0]).days

    if days_span > 365 * 3:
        # Multi-year view: Show Year markers with quarterly minor ticks
        active_ax.xaxis.set_major_locator(mdates.YearLocator())
        active_ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
        active_ax.xaxis.set_minor_locator(mdates.MonthLocator(bymonth=[1, 4, 7, 10]))
    elif days_span > 365:
        # 1-3 years: Show bi-monthly format
        active_ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
        active_ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    else:
        # Shorter windows (< 1 year): Show individual months
        active_ax.xaxis.set_major_locator(mdates.MonthLocator())
        active_ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
        active_ax.xaxis.set_minor_locator(mdates.DayLocator(interval=7))

    plt.setp(active_ax.xaxis.get_majorticklabels(), rotation=0, ha="center", color="#94A3B8", fontsize=9)
    active_ax.set_xlabel("Trading Date (Time Series)", color="#94A3B8", fontsize=10, labelpad=8)

    plt.tight_layout()

    if save_path:
        fig.savefig(save_path, dpi=dpi, bbox_inches="tight", facecolor=fig.get_facecolor())
        print(f"[visualization.py] Chart saved successfully to '{save_path}'")

    return fig


if __name__ == "__main__":
    print("[visualization.py] Testing price chart with Moon phase overlay...")
    from astro_btc.data import prepare_dataset
    from astro_btc.astrology import add_moon_phases_to_df

    # 1. Fetch market data
    btc_df = prepare_dataset(start_date="2023-01-01", end_date="2024-06-30")
    
    # 2. Add moon phases
    enriched_df = add_moon_phases_to_df(btc_df)

    # 3. Plot and save chart
    fig = plot_btc_with_moon_phases(
        enriched_df,
        start_date="2023-01-01",
        end_date="2024-06-30",
        save_path="btc_moon_phases_chart.png"
    )
    print("[visualization.py] Demo plot generated successfully.")
