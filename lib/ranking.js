/**
 * Rank products based on weighted scores and randomization.
 * 
 * Formula:
 * Total Score = (Relevance * 0.4) + (Trust * 0.2) + (Freshness * 0.2) + (Diversity * 0.2)
 * 
 * Components:
 * - Relevance: Avg(Normalized Views, Normalized Product Rating)
 * - Trust: Normalized Vendor Rating
 * - Freshness: Normalized (1 / (Days Since Added + 1))
 * - Diversity: Random Factor (0-1)
 * 
 * @param {Array} products - List of product objects
 * @returns {Array} - Sorted list of products
 */
function rankProducts(products) {
    if (!products || products.length === 0) return [];

    // 1. Extract metrics for normalization
    let maxViews = 0;
    let minViews = Infinity;
    let maxProdRating = 0;
    let minProdRating = Infinity;
    let maxVendorRating = 0;
    let minVendorRating = Infinity;

    // For freshness, we calculate "days since added" first
    // We want to normalize the decay value: 1 / (days + 1)
    // Max decay value is 1 (0 days old), Min decay value approaches 0
    let maxFreshness = 0;
    let minFreshness = Infinity;

    const now = new Date();

    // First pass: Calculate raw values and find min/max
    const productsWithMetrics = products.map(p => {
        const views = p.views_count || 0;
        const prodRating = p.product_rating || 0;
        // Handle nested vendor/business object structure
        // productController.js joins business:product_owner_id(...)
        // We assume vendor_rating is on the business object or we might need to fetch it.
        // Based on migration, it's on business_profile table.
        // The join in productController is: business:product_owner_id(id, business_name, cover_image)
        // We need to ensure vendor_rating is selected in the controller.
        // For now, we'll access it safely, defaulting to 0 if missing.
        const vendorRating = p.business?.vendor_rating || 0;

        const dateAdded = new Date(p.created_at);
        const diffTime = Math.abs(now - dateAdded);
        const daysSinceAdded = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const freshnessRaw = 1 / (daysSinceAdded + 1);

        // Update min/max
        if (views > maxViews) maxViews = views;
        if (views < minViews) minViews = views;

        if (prodRating > maxProdRating) maxProdRating = prodRating;
        if (prodRating < minProdRating) minProdRating = prodRating;

        if (vendorRating > maxVendorRating) maxVendorRating = vendorRating;
        if (vendorRating < minVendorRating) minVendorRating = vendorRating;

        if (freshnessRaw > maxFreshness) maxFreshness = freshnessRaw;
        if (freshnessRaw < minFreshness) minFreshness = freshnessRaw;

        return {
            ...p,
            _metrics: {
                views,
                prodRating,
                vendorRating,
                freshnessRaw
            }
        };
    });

    // Helper to normalize value between 0 and 1
    const normalize = (val, min, max) => {
        if (max === min) return 0.5; // Avoid division by zero, default to mid-range
        return (val - min) / (max - min);
    };

    // Second pass: Calculate scores
    const rankedProducts = productsWithMetrics.map(p => {
        const m = p._metrics;

        // A. Normalization
        const normViews = normalize(m.views, minViews, maxViews);
        const normProdRating = normalize(m.prodRating, minProdRating, maxProdRating);
        const normVendorRating = normalize(m.vendorRating, minVendorRating, maxVendorRating);
        const normFreshness = normalize(m.freshnessRaw, minFreshness, maxFreshness);

        // B. Component Scores
        // Relevance: Avg of Views and Product Rating
        const relevanceScore = (normViews + normProdRating) / 2;

        // Trust: Vendor Rating
        const trustScore = normVendorRating;

        // Freshness
        const freshnessScore = normFreshness;

        // Diversity: Random
        const diversityScore = Math.random();

        // C. Total Score
        // Weights: Relevance 0.4, Trust 0.2, Freshness 0.2, Diversity 0.2
        const totalScore =
            (relevanceScore * 0.4) +
            (trustScore * 0.2) +
            (freshnessScore * 0.2) +
            (diversityScore * 0.2);

        return {
            ...p,
            _rankingScore: totalScore, // Store for debugging/verification
            _debugScores: {
                relevance: relevanceScore,
                trust: trustScore,
                freshness: freshnessScore,
                diversity: diversityScore
            }
        };
    });

    // Sort descending by total score
    rankedProducts.sort((a, b) => b._rankingScore - a._rankingScore);

    // Remove internal metrics before returning (optional, but cleaner)
    // Keeping _rankingScore might be useful for debugging, but let's clean up _metrics
    return rankedProducts.map(p => {
        const { _metrics, ...rest } = p;
        // console.log(_metrics.views);

        return rest;
    });
}

module.exports = { rankProducts };
