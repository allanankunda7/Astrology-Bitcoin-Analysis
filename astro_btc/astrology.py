"""
astrology.py - Step 2: Astronomical Moon Phase Calculations & Ephemeris
========================================================================
Part of the "Astrology + Bitcoin Quantitative Backtesting System"

This module computes accurate astronomical Moon phases for every trading date.
It calculates:
1. Lunar cycle position (0.0 to 1.0, where 0.0=New Moon, 0.5=Full Moon).
2. Phase angle (0° to 360° elongation).
3. Illumination percentage (0% to 100%).
4. Classification into the 4 Major Phases:
   - New Moon (Conjunction ~0°)
   - First Quarter (Waxing Quadrature ~90°)
   - Full Moon (Opposition ~180°)
   - Last Quarter (Waning Quadrature ~270°)
"""

from typing import Optional, List, Dict, Any
import numpy as np
import pandas as pd

# Mean synodic month in days (standard astronomical value: 29.53058867 days)
SYNODIC_MONTH = 29.53058867

# Reference epoch for a known New Moon: Jan 17, 2018 02:17:00 UTC
# Timestamp: 1516155420.0 seconds
REF_NEW_MOON_TIMESTAMP = 1516155420.0


def compute_moon_phase_series(dates: pd.DatetimeIndex) -> pd.DataFrame:
    """
    Compute astronomical Moon phase metrics for a given DatetimeIndex.

    Parameters:
    -----------
    dates : pd.DatetimeIndex
        Time series index of dates (timezone-naive or UTC).

    Returns:
    --------
    pd.DataFrame
        DataFrame with columns:
        - 'Phase_Angle': Float [0, 360) degrees
        - 'Illumination': Float [0, 100] %
        - 'Phase_Name': String describing the phase
        - 'Major_Phase': String or NaN (one of: 'New Moon', 'First Quarter', 'Full Moon', 'Last Quarter')
        - 'Is_Major_Event': Boolean
    """
    # Convert dates to unix timestamps in seconds
    timestamps = dates.astype("int64") // 10**9
    diff_days = (timestamps - REF_NEW_MOON_TIMESTAMP) / (86400.0)

    # Position in lunar cycle [0.0, 1.0)
    cycle_pos = (diff_days % SYNODIC_MONTH) / SYNODIC_MONTH
    cycle_pos = np.where(cycle_pos < 0, cycle_pos + 1.0, cycle_pos)

    # Phase angle in degrees [0, 360)
    phase_angles = cycle_pos * 360.0

    # Lunar illumination percentage: (1 - cos(angle)) / 2 * 100
    # At New Moon (0°): (1 - 1)/2 = 0%
    # At Full Moon (180°): (1 - (-1))/2 = 100%
    # At Quarters (90°, 270°): (1 - 0)/2 = 50%
    illumination = (1.0 - np.cos(np.radians(phase_angles))) / 2.0 * 100.0

    # Classify phases into 4 major events (within ~18 degrees or ±1.5 days)
    # New Moon: 342° to 360° or 0° to 18°
    # First Quarter: 72° to 108°
    # Full Moon: 162° to 198°
    # Last Quarter: 252° to 288°
    major_phases: List[Optional[str]] = []
    phase_names: List[str] = []
    is_major: List[bool] = []

    for angle in phase_angles:
        if angle >= 342.0 or angle < 18.0:
            phase_names.append("New Moon")
            major_phases.append("New Moon")
            is_major.append(True)
        elif 18.0 <= angle < 72.0:
            phase_names.append("Waxing Crescent")
            major_phases.append(None)
            is_major.append(False)
        elif 72.0 <= angle < 108.0:
            phase_names.append("First Quarter")
            major_phases.append("First Quarter")
            is_major.append(True)
        elif 108.0 <= angle < 162.0:
            phase_names.append("Waxing Gibbous")
            major_phases.append(None)
            is_major.append(False)
        elif 162.0 <= angle < 198.0:
            phase_names.append("Full Moon")
            major_phases.append("Full Moon")
            is_major.append(True)
        elif 198.0 <= angle < 252.0:
            phase_names.append("Waning Gibbous")
            major_phases.append(None)
            is_major.append(False)
        elif 252.0 <= angle < 288.0:
            phase_names.append("Last Quarter")
            major_phases.append("Last Quarter")
            is_major.append(True)
        else:
            phase_names.append("Waning Crescent")
            major_phases.append(None)
            is_major.append(False)

    result_df = pd.DataFrame(
        {
            "Phase_Angle": np.round(phase_angles, 2),
            "Illumination": np.round(illumination, 2),
            "Phase_Name": phase_names,
            "Major_Phase": major_phases,
            "Is_Major_Event": is_major,
        },
        index=dates,
    )
    return result_df


def add_moon_phases_to_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge Moon phase metrics into an existing market DataFrame.
    """
    moon_metrics = compute_moon_phase_series(df.index)
    return df.join(moon_metrics)
