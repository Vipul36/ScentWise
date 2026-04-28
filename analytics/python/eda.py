"""
ScentWise — Exploratory Data Analysis (EDA)
============================================

This script performs comprehensive exploratory analysis on the ScentWise
perfume dataset. Each visualization answers a specific business question.

Business Questions Answered:
1. What is the price distribution across all perfumes?
2. How are perfume ratings distributed?
3. Which fragrance families are most common?
4. Which fragrance notes appear most frequently?
5. How do prices vary across fragrance families?
6. Is there a relationship between price and rating?
7. Which seasons have the most perfumes?
8. Which occasions are most common?
9. How does intensity relate to longevity?
10. What is the brand distribution across price tiers?

Usage:
    python analytics/python/eda.py

Output:
    Charts saved to analytics/python/output/
"""

import json
import os
import sys
from collections import Counter
from pathlib import Path

import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import pandas as pd
import numpy as np

# ============================================================================
# CONFIGURATION
# ============================================================================

# Resolve paths relative to project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
DATA_PATH = PROJECT_ROOT / 'data' / 'cleaned' / 'cleaned_dataset.json'
OUTPUT_DIR = PROJECT_ROOT / 'analytics' / 'python' / 'output'

# Create output directory
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Style configuration
plt.style.use('seaborn-v0_8-whitegrid')
COLORS = {
    'primary': '#6C5CE7',
    'secondary': '#A29BFE',
    'accent': '#FD79A8',
    'dark': '#2D3436',
    'light': '#DFE6E9',
    'gradient': ['#6C5CE7', '#A29BFE', '#74B9FF', '#55EFC4', '#FFEAA7',
                 '#FAB1A0', '#FD79A8', '#E17055', '#D63031', '#636E72',
                 '#00B894', '#0984E3', '#E84393', '#FDCB6E', '#B2BEC3']
}

def load_data():
    """Load the cleaned dataset."""
    if not DATA_PATH.exists():
        print(f"❌ Dataset not found at {DATA_PATH}")
        print("   Run the data generation and cleaning pipeline first.")
        sys.exit(1)

    with open(DATA_PATH, 'r') as f:
        data = json.load(f)

    print(f"📂 Loaded dataset:")
    print(f"   Perfumes:     {len(data['perfumes'])}")
    print(f"   Users:        {len(data['users'])}")
    print(f"   Interactions: {len(data['interactions'])}")
    print(f"   Reviews:      {len(data['reviews'])}")
    return data


def create_perfume_df(data):
    """Convert perfume data to a pandas DataFrame."""
    df = pd.DataFrame(data['perfumes'])
    df['price'] = df['price'].astype(float)
    df['rating'] = df['rating'].astype(float)
    df['review_count'] = df['review_count'].astype(int)
    return df


def create_interactions_df(data):
    """Convert interactions data to a pandas DataFrame."""
    df = pd.DataFrame(data['interactions'])
    df['created_at'] = pd.to_datetime(df['created_at'])
    return df


def create_reviews_df(data):
    """Convert reviews data to a pandas DataFrame."""
    df = pd.DataFrame(data['reviews'])
    df['rating'] = df['rating'].astype(float)
    df['created_at'] = pd.to_datetime(df['created_at'])
    return df


# ============================================================================
# ANALYSIS FUNCTIONS — Each answers a business question
# ============================================================================

def analyze_price_distribution(df):
    """
    Business Question: What is the price distribution across all perfumes?
    Insight: Helps understand the market positioning and identify price segments.
    """
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Histogram
    axes[0].hist(df['price'], bins=40, color=COLORS['primary'], alpha=0.7, edgecolor='white')
    axes[0].set_title('Price Distribution', fontsize=14, fontweight='bold')
    axes[0].set_xlabel('Price (₹)')
    axes[0].set_ylabel('Count')
    axes[0].axvline(df['price'].median(), color=COLORS['accent'], linestyle='--',
                    label=f'Median: ₹{df["price"].median():,.0f}')
    axes[0].legend()

    # Box plot by tier
    df['price_tier'] = pd.cut(df['price'],
        bins=[0, 2000, 5000, 10000, 50000],
        labels=['Budget\n(<₹2K)', 'Mid-range\n(₹2K-5K)', 'Premium\n(₹5K-10K)', 'Luxury\n(₹10K+)']
    )
    tier_counts = df['price_tier'].value_counts().sort_index()
    axes[1].bar(range(len(tier_counts)), tier_counts.values,
                color=COLORS['gradient'][:len(tier_counts)], edgecolor='white')
    axes[1].set_xticks(range(len(tier_counts)))
    axes[1].set_xticklabels(tier_counts.index)
    axes[1].set_title('Perfumes by Price Tier', fontsize=14, fontweight='bold')
    axes[1].set_ylabel('Count')

    for i, v in enumerate(tier_counts.values):
        axes[1].text(i, v + 2, str(v), ha='center', fontweight='bold')

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '01_price_distribution.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 01_price_distribution.png")


def analyze_rating_distribution(df):
    """
    Business Question: How are perfume ratings distributed?
    Insight: Reveals rating skew and overall catalog quality.
    """
    fig, ax = plt.subplots(figsize=(10, 5))

    ax.hist(df['rating'].dropna(), bins=30, color=COLORS['secondary'],
            alpha=0.7, edgecolor='white')
    ax.set_title('Rating Distribution', fontsize=14, fontweight='bold')
    ax.set_xlabel('Rating (out of 5)')
    ax.set_ylabel('Count')
    ax.axvline(df['rating'].mean(), color=COLORS['accent'], linestyle='--',
               label=f'Mean: {df["rating"].mean():.2f}')
    ax.axvline(df['rating'].median(), color=COLORS['dark'], linestyle=':',
               label=f'Median: {df["rating"].median():.2f}')
    ax.legend()

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '02_rating_distribution.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 02_rating_distribution.png")


def analyze_fragrance_families(df):
    """
    Business Question: Which fragrance families are most common?
    Insight: Shows catalog composition and market focus areas.
    """
    family_counts = df['fragrance_family'].value_counts()

    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.barh(range(len(family_counts)), family_counts.values,
                   color=COLORS['gradient'][:len(family_counts)])
    ax.set_yticks(range(len(family_counts)))
    ax.set_yticklabels(family_counts.index.str.title())
    ax.set_xlabel('Number of Perfumes')
    ax.set_title('Perfumes by Fragrance Family', fontsize=14, fontweight='bold')
    ax.invert_yaxis()

    for i, v in enumerate(family_counts.values):
        ax.text(v + 1, i, str(v), va='center', fontweight='bold', fontsize=9)

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '03_fragrance_families.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 03_fragrance_families.png")


def analyze_popular_notes(df):
    """
    Business Question: Which fragrance notes appear most frequently?
    Insight: Identifies the most commonly used ingredients in the catalog.
    """
    all_notes = []
    for notes_list in df['top_notes']:
        if isinstance(notes_list, list):
            all_notes.extend(notes_list)
    for notes_list in df['middle_notes']:
        if isinstance(notes_list, list):
            all_notes.extend(notes_list)
    for notes_list in df['base_notes']:
        if isinstance(notes_list, list):
            all_notes.extend(notes_list)

    note_counts = Counter(all_notes).most_common(20)
    notes, counts = zip(*note_counts)

    fig, ax = plt.subplots(figsize=(12, 7))
    ax.barh(range(len(notes)), counts, color=COLORS['primary'], alpha=0.8)
    ax.set_yticks(range(len(notes)))
    ax.set_yticklabels([n.title() for n in notes])
    ax.set_xlabel('Frequency')
    ax.set_title('Top 20 Most Common Fragrance Notes', fontsize=14, fontweight='bold')
    ax.invert_yaxis()

    for i, v in enumerate(counts):
        ax.text(v + 2, i, str(v), va='center', fontsize=9)

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '04_popular_notes.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 04_popular_notes.png")


def analyze_price_by_family(df):
    """
    Business Question: How do prices vary across fragrance families?
    Insight: Reveals pricing patterns by category.
    """
    fig, ax = plt.subplots(figsize=(14, 6))

    families = df.groupby('fragrance_family')['price'].median().sort_values(ascending=False).index
    data_to_plot = [df[df['fragrance_family'] == f]['price'].values for f in families]

    bp = ax.boxplot(data_to_plot, labels=[f.title() for f in families],
                    patch_artist=True, vert=True)

    for patch, color in zip(bp['boxes'], COLORS['gradient'][:len(families)]):
        patch.set_facecolor(color)
        patch.set_alpha(0.7)

    ax.set_ylabel('Price (₹)')
    ax.set_title('Price Distribution by Fragrance Family', fontsize=14, fontweight='bold')
    plt.xticks(rotation=45, ha='right')

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '05_price_by_family.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 05_price_by_family.png")


def analyze_price_vs_rating(df):
    """
    Business Question: Is there a relationship between price and rating?
    Insight: Tests whether expensive perfumes actually get better reviews.
    """
    fig, ax = plt.subplots(figsize=(10, 6))

    scatter = ax.scatter(df['price'], df['rating'], alpha=0.3,
                         c=df['price'], cmap='viridis', s=20)
    ax.set_xlabel('Price (₹)')
    ax.set_ylabel('Rating')
    ax.set_title('Price vs Rating Correlation', fontsize=14, fontweight='bold')

    # Add trend line
    z = np.polyfit(df['price'].dropna(), df['rating'].dropna(), 1)
    p = np.poly1d(z)
    x_line = np.linspace(df['price'].min(), df['price'].max(), 100)
    ax.plot(x_line, p(x_line), '--', color=COLORS['accent'], linewidth=2,
            label=f'Trend (slope: {z[0]:.6f})')

    corr = df['price'].corr(df['rating'])
    ax.text(0.05, 0.95, f'Correlation: {corr:.3f}',
            transform=ax.transAxes, fontsize=11,
            verticalalignment='top',
            bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))

    ax.legend()
    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '06_price_vs_rating.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 06_price_vs_rating.png")


def analyze_seasonal_distribution(df):
    """
    Business Question: Which seasons have the most perfumes suitable for them?
    Insight: Identifies seasonal catalog gaps and opportunities.
    """
    season_counts = Counter()
    for seasons in df['seasons']:
        if isinstance(seasons, list):
            for s in seasons:
                season_counts[s] += 1

    season_order = ['spring', 'summer', 'autumn', 'winter']
    counts = [season_counts.get(s, 0) for s in season_order]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.bar(
        [s.title() for s in season_order], counts,
        color=[COLORS['gradient'][2], COLORS['gradient'][4],
               COLORS['gradient'][7], COLORS['gradient'][0]],
        edgecolor='white', linewidth=1.5
    )

    for bar, count in zip(bars, counts):
        ax.text(bar.get_x() + bar.get_width()/2., bar.get_height() + 5,
                str(count), ha='center', fontweight='bold')

    ax.set_ylabel('Number of Perfumes')
    ax.set_title('Perfumes by Season Suitability', fontsize=14, fontweight='bold')

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '07_seasonal_distribution.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 07_seasonal_distribution.png")


def analyze_occasion_distribution(df):
    """
    Business Question: Which occasions are most commonly served?
    Insight: Shows where the catalog has depth vs. gaps.
    """
    occasion_counts = Counter()
    for occasions in df['occasions']:
        if isinstance(occasions, list):
            for o in occasions:
                occasion_counts[o] += 1

    sorted_occasions = sorted(occasion_counts.items(), key=lambda x: x[1], reverse=True)
    labels, counts = zip(*sorted_occasions)

    fig, ax = plt.subplots(figsize=(10, 5))
    ax.bar([l.replace('_', '\n').title() for l in labels], counts,
           color=COLORS['gradient'][:len(labels)], edgecolor='white')

    for i, v in enumerate(counts):
        ax.text(i, v + 5, str(v), ha='center', fontweight='bold')

    ax.set_ylabel('Number of Perfumes')
    ax.set_title('Perfumes by Occasion Suitability', fontsize=14, fontweight='bold')

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '08_occasion_distribution.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 08_occasion_distribution.png")


def analyze_interaction_patterns(interactions_df):
    """
    Business Question: What types of interactions are most common?
    Insight: Shows the engagement funnel from viewing to purchase.
    """
    event_counts = interactions_df['event_type'].value_counts()

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Bar chart
    axes[0].barh(range(len(event_counts)), event_counts.values,
                 color=COLORS['gradient'][:len(event_counts)])
    axes[0].set_yticks(range(len(event_counts)))
    axes[0].set_yticklabels([e.replace('_', ' ').title() for e in event_counts.index])
    axes[0].set_xlabel('Count')
    axes[0].set_title('Interactions by Type', fontsize=14, fontweight='bold')
    axes[0].invert_yaxis()

    # Funnel metrics
    funnel_events = ['recommendation_viewed', 'perfume_clicked', 'perfume_saved', 'add_to_cart', 'purchase']
    funnel_values = [int(event_counts.get(e, 0)) for e in funnel_events]
    funnel_labels = ['Viewed\nRecs', 'Clicked\nPerfume', 'Saved', 'Added\nto Cart', 'Purchased']

    axes[1].bar(funnel_labels, funnel_values,
                color=[COLORS['primary'], COLORS['secondary'], '#74B9FF', '#55EFC4', '#00B894'],
                edgecolor='white')

    for i, v in enumerate(funnel_values):
        axes[1].text(i, v + 5, str(v), ha='center', fontweight='bold')

    axes[1].set_title('Engagement Funnel', fontsize=14, fontweight='bold')
    axes[1].set_ylabel('Count')

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '09_interaction_patterns.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 09_interaction_patterns.png")


def analyze_brand_distribution(df):
    """
    Business Question: Which brands dominate the catalog?
    Insight: Shows catalog diversity and brand concentration.
    """
    top_brands = df['brand'].value_counts().head(20)

    fig, ax = plt.subplots(figsize=(12, 7))
    ax.barh(range(len(top_brands)), top_brands.values,
            color=COLORS['primary'], alpha=0.8)
    ax.set_yticks(range(len(top_brands)))
    ax.set_yticklabels(top_brands.index)
    ax.set_xlabel('Number of Perfumes')
    ax.set_title('Top 20 Brands by Catalog Size', fontsize=14, fontweight='bold')
    ax.invert_yaxis()

    for i, v in enumerate(top_brands.values):
        ax.text(v + 0.5, i, str(v), va='center', fontsize=9)

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / '10_brand_distribution.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("  ✅ 10_brand_distribution.png")


# ============================================================================
# SUMMARY STATISTICS
# ============================================================================

def print_summary_stats(df, interactions_df, reviews_df):
    """Print a formatted summary of key metrics."""
    print("\n" + "="*60)
    print("📊 DATASET SUMMARY STATISTICS")
    print("="*60)
    
    print(f"\n📦 Catalog Overview:")
    print(f"   Total perfumes:          {len(df)}")
    print(f"   Unique brands:           {df['brand'].nunique()}")
    print(f"   Fragrance families:      {df['fragrance_family'].nunique()}")
    print(f"   Gender split:            M:{(df['gender']=='male').sum()} / F:{(df['gender']=='female').sum()} / U:{(df['gender']=='unisex').sum()}")
    
    print(f"\n💰 Pricing:")
    print(f"   Min price:               ₹{df['price'].min():,.0f}")
    print(f"   Max price:               ₹{df['price'].max():,.0f}")
    print(f"   Mean price:              ₹{df['price'].mean():,.0f}")
    print(f"   Median price:            ₹{df['price'].median():,.0f}")
    
    print(f"\n⭐ Ratings:")
    print(f"   Mean rating:             {df['rating'].mean():.2f}")
    print(f"   Median rating:           {df['rating'].median():.2f}")
    print(f"   Std deviation:           {df['rating'].std():.2f}")
    print(f"   Perfumes rated ≥4.0:     {(df['rating'] >= 4.0).sum()}")
    
    print(f"\n📱 Interactions:")
    print(f"   Total interactions:      {len(interactions_df)}")
    print(f"   Unique event types:      {interactions_df['event_type'].nunique()}")
    
    print(f"\n📝 Reviews:")
    print(f"   Total reviews:           {len(reviews_df)}")
    print(f"   Mean review rating:      {reviews_df['rating'].mean():.2f}")
    
    print(f"\n🏆 Top Fragrance Family:    {df['fragrance_family'].value_counts().index[0].title()}")
    print(f"🏆 Top Brand:               {df['brand'].value_counts().index[0]}")
    print("="*60)


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("📊 ScentWise — Exploratory Data Analysis")
    print("=" * 40 + "\n")

    data = load_data()
    
    df = create_perfume_df(data)
    interactions_df = create_interactions_df(data)
    reviews_df = create_reviews_df(data)

    print(f"\n🎨 Generating visualizations...\n")

    analyze_price_distribution(df)
    analyze_rating_distribution(df)
    analyze_fragrance_families(df)
    analyze_popular_notes(df)
    analyze_price_by_family(df)
    analyze_price_vs_rating(df)
    analyze_seasonal_distribution(df)
    analyze_occasion_distribution(df)
    analyze_interaction_patterns(interactions_df)
    analyze_brand_distribution(df)

    print_summary_stats(df, interactions_df, reviews_df)

    print(f"\n📁 All charts saved to: {OUTPUT_DIR}")
    print("✅ EDA complete!\n")


if __name__ == '__main__':
    main()
