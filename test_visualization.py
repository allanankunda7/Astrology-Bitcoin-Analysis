"""
test_visualization.py - Verification for Moon Phase Price Chart
===============================================================
"""
import sys
import pandas as pd
from astro_btc.data import prepare_dataset
from astro_btc.astrology import add_moon_phases_to_df
from astro_btc.visualization import plot_btc_with_moon_phases

def run_test():
    print("[test_visualization.py] Fetching sample BTC data (2023-01-01 to 2023-12-31)...")
    df = prepare_dataset(start_date="2023-01-01", end_date="2023-12-31")
    
    print("[test_visualization.py] Calculating Moon phases...")
    enriched = add_moon_phases_to_df(df)
    
    major_counts = enriched["Major_Phase"].value_counts().to_dict()
    print(f"[test_visualization.py] Moon Phase counts: {major_counts}")

    print("[test_visualization.py] Generating chart 'btc_moon_chart_test.png'...")
    fig = plot_btc_with_moon_phases(
        enriched,
        start_date="2023-01-01",
        end_date="2023-12-31",
        save_path="btc_moon_chart_test.png"
    )
    assert fig is not None, "Failed to create matplotlib figure"
    print("[test_visualization.py] SUCCESS: Chart generated and saved to 'btc_moon_chart_test.png'!")

if __name__ == "__main__":
    try:
        run_test()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
