const { supabase } = require('../config/supabaseClient');

async function migrate() {
    // console.log('Starting migration...');

    // 1. Fetch all products with a category_id
    const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, category_id')
        .not('category_id', 'is', null);

    if (fetchError) {
        console.error('Error fetching products:', fetchError);
        return;
    }

    // console.log(`Found ${products.length} products to migrate.`);

    // 2. Insert into product_categories
    let successCount = 0;
    let errorCount = 0;

    for (const product of products) {
        // Check if already exists to avoid errors if unique constraint is hit (though ignoreDuplicates handles it usually, explicit check is safer if ignoreDuplicates isn't supported by client version fully or behaves differently)
        // Actually, .upsert or .insert with ignoreDuplicates is best.
        const { error: insertError } = await supabase
            .from('product_categories')
            .upsert({
                product_id: product.id,
                category_id: product.category_id
            }, { onConflict: 'product_id, category_id', ignoreDuplicates: true });

        if (insertError) {
            console.error(`Failed to migrate product ${product.id}:`, insertError);
            errorCount++;
        } else {
            successCount++;
        }
    }

    // console.log(`Migration complete. Success: ${successCount}, Errors: ${errorCount}`);
}

migrate();
