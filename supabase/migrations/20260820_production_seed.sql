-- ==============================================================================
-- Dough N Cheese — Production Data Seed Migration
-- Migration: 20260820_production_seed.sql
-- Idempotent, safe seed data for Categories, Products, Options, Branches, and Settings
-- ==============================================================================

DO $$
DECLARE
    -- Category IDs
    cat_pizzas_id UUID;
    cat_burgers_id UUID;
    cat_pastas_id UUID;
    cat_rolls_id UUID;
    cat_sandwiches_id UUID;
    cat_munchies_id UUID;
    cat_sharing_id UUID;
    cat_extras_id UUID;

    -- Product and Variant helper variables
    v_prod_id UUID;
    v_var_id UUID;
BEGIN
    -- --------------------------------------------------------------------------
    -- 1. CATEGORIES (8 core categories)
    -- --------------------------------------------------------------------------
    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Pizzas', 'pizzas', 1, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_pizzas_id;

    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Burgers', 'burgers', 2, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_burgers_id;

    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Pastas', 'pastas', 3, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_pastas_id;

    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Rolls', 'rolls', 4, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_rolls_id;

    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Sandwiches', 'sandwiches', 5, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_sandwiches_id;

    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Munchies', 'munchies', 6, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_munchies_id;

    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Sharing Meals', 'sharing-meals', 7, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_sharing_id;

    INSERT INTO categories (name, slug, display_order, is_active)
    VALUES ('Extras', 'extras', 8, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
    RETURNING id INTO cat_extras_id;

    -- --------------------------------------------------------------------------
    -- 2. BRANCHES (Kamoke flagship location)
    -- --------------------------------------------------------------------------
    INSERT INTO branches (
        name, slug, city, address, phone, whatsapp_number,
        google_maps_url, opening_time, closing_time, days_open, is_active
    ) VALUES (
        'Kamoke', 'kamoke', 'Kamoke',
        'Opposite Risen Store, G.T Road, Kamoke',
        '0308-680-0004', '923086800004',
        'https://www.google.com/maps/search/?api=1&query=Dough+N+Cheese+Kamoke+G.T+Road',
        '11:00:00', '01:00:00', 'Mon - Sun', true
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        whatsapp_number = EXCLUDED.whatsapp_number,
        google_maps_url = EXCLUDED.google_maps_url;

    -- --------------------------------------------------------------------------
    -- 3. RESTAURANT SETTINGS (Singleton configuration)
    -- --------------------------------------------------------------------------
    INSERT INTO restaurant_settings (
        is_singleton, restaurant_name, tagline,
        logo_url, hero_image_url, delivery_image_url, menu_pdf_url,
        instagram_url, tiktok_url, facebook_url, extra_data
    ) VALUES (
        true, 'Dough N Cheese', 'Meet. Eat. Repeat.',
        'https://doughncheesepk.com/wp-content/uploads/2025/04/Logo.png',
        '/public/hero.png',
        'https://doughncheesepk.com/wp-content/uploads/2025/04/delivery-man-1.png.webp',
        'https://doughncheesepk.com/wp-content/uploads/2025/05/dough-cheese-menu.pdf',
        'https://www.instagram.com/doughncheese.pk',
        'https://www.tiktok.com/@dough.n.cheese',
        'https://www.facebook.com/share/15CSfQ5T8b/',
        '{"contact_email": "contact@doughncheese.com", "contact_phone": "+92 312 3456789", "delivery_notice": "Free delivery on orders over Rs. 2,000 across Kamoke."}'::jsonb
    )
    ON CONFLICT (is_singleton) DO UPDATE SET
        restaurant_name = EXCLUDED.restaurant_name,
        tagline = EXCLUDED.tagline,
        logo_url = EXCLUDED.logo_url,
        hero_image_url = EXCLUDED.hero_image_url,
        delivery_image_url = EXCLUDED.delivery_image_url,
        menu_pdf_url = EXCLUDED.menu_pdf_url,
        instagram_url = EXCLUDED.instagram_url,
        tiktok_url = EXCLUDED.tiktok_url,
        facebook_url = EXCLUDED.facebook_url;

    -- --------------------------------------------------------------------------
    -- 4. PRODUCTS (42 Menu Items)
    -- --------------------------------------------------------------------------

    -- === PIZZAS ===

    -- 1. Midnight Tikka
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'Midnight Tikka', 'midnight-tikka', 'Pizza sauce, chicken tikka, onions, cheese.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Small', 700, 0),
    (v_prod_id, 'Medium', 1400, 1),
    (v_prod_id, 'Large', 2100, 2);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Thin Crust', 1), (v_var_id, 'Stuffed Crust', 2);

    -- 2. Sizzling Fajita
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'Sizzling Fajita', 'sizzling-fajita', 'Pizza sauce, fajita chicken, bell peppers, onions, cheese.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Fajita.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Small', 700, 0),
    (v_prod_id, 'Medium', 1400, 1),
    (v_prod_id, 'Large', 2100, 2);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Thin Crust', 1), (v_var_id, 'Stuffed Crust', 2);

    -- 3. The Royal Crust
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'The Royal Crust', 'the-royal-crust', 'A crown-crust pizza loaded with premium toppings and cheese.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0037_Crown-Crust-Pizza.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Large', 1650, 0),
    (v_prod_id, 'XL', 1950, 1);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Crown Crust', 0), (v_var_id, 'Classic', 1);

    -- 4. The House Favorite
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'The House Favorite', 'the-house-favorite', 'Our signature pizza with a special house blend of toppings and cheese.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0027_The-House-Favorite-1.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Small', 800, 0),
    (v_prod_id, 'Medium', 1500, 1),
    (v_prod_id, 'Large', 2300, 2);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Thin Crust', 1), (v_var_id, 'Stuffed Crust', 2);

    -- 5. Kebab Delight
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'Kebab Delight', 'kebab-delight', 'Behari kebab, onions, cheese on a rich pizza sauce base.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0000_Behari-Kabab-Pizza-1.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Large', 1650, 0),
    (v_prod_id, 'XL', 2450, 1);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Stuffed Crust', 1);

    -- 6. Dreamy Creamy
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'Dreamy Creamy', 'dreamy-creamy', 'Creamy white sauce, chicken, and a dreamy cheese blend.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0014_Dreamy-Creamy_-1.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Small', 800, 0),
    (v_prod_id, 'Medium', 1500, 1),
    (v_prod_id, 'Large', 2300, 2);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Thin Crust', 1), (v_var_id, 'Stuffed Crust', 2);

    -- 7. Tikka Takeover
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'Tikka Takeover', 'tikka-takeover', 'Loaded chicken tikka with extra cheese and bold spices.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0029_Tikka-Takeover-1.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Large', 1650, 0),
    (v_prod_id, 'XL', 2200, 1);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Stuffed Crust', 1);

    -- 8. Very Peri Intense
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'Very Peri Intense', 'very-peri-intense', 'Peri peri chicken with a fiery, cheesy kick.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0031_Very-Peri-Intense_-1.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Large', 1650, 0),
    (v_prod_id, 'XL', 2200, 1);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Stuffed Crust', 1);

    -- 9. The Signature
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pizzas_id, 'The Signature', 'the-signature', 'Our most premium pizza — a signature blend of flavors and cheese.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0028_The-Signature.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Large', 1700, 0),
    (v_prod_id, 'XL', 2250, 1);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Crust', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Classic', 0), (v_var_id, 'Stuffed Crust', 1);

    -- === BURGERS ===

    -- 10. Flip Patty
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_burgers_id, 'Flip Patty', 'flip-patty', 'A classic flip-grilled patty with cheese and fresh veggies.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-1.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 350, 0);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Meal', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Single', 0), (v_var_id, 'Double Patty', 1);

    -- 11. Patty Quest
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_burgers_id, 'Patty Quest', 'patty-quest', 'A beef patty adventure loaded with premium toppings.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0036_Peety-Quest-Beef-2.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 1000, 0);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Meal', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Single', 0), (v_var_id, 'Double Patty', 1);

    -- 12. Melty Beef
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_burgers_id, 'Melty Beef', 'melty-beef', 'Smashed beef patty with melty cheese and bold flavor.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/smash.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 1000, 0);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Meal', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Single', 0), (v_var_id, 'Double Patty', 1);

    -- 13. Zingro
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_burgers_id, 'Zingro', 'zingro', 'A zesty zinger-style chicken burger with a crispy crunch.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0050_Zingro-Burger-1.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 430, 0);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Meal', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Single', 0), (v_var_id, 'Double Patty', 1);

    -- 14. Ziggy Tower
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_burgers_id, 'Ziggy Tower', 'ziggy-tower', 'A towering double burger stacked with cheese and flavor.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/ziggy-tower.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 700, 0);

    DELETE FROM product_variants WHERE product_id = v_prod_id;
    INSERT INTO product_variants (product_id, name, display_order) VALUES (v_prod_id, 'Meal', 0) RETURNING id INTO v_var_id;
    INSERT INTO product_variant_options (variant_id, name, display_order) VALUES (v_var_id, 'Single', 0), (v_var_id, 'Double Patty', 1);

    -- === PASTAS ===

    -- 15. Extreme Macaroni
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pastas_id, 'Extreme Macaroni', 'extreme-macaroni', 'Macaroni in a rich, cheesy sauce with a satisfying bite.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0015_Extreme-Macaroni-Pasta-2.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 600, 0);

    -- 16. Cheesy Special
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pastas_id, 'Cheesy Special', 'cheesy-special', 'Our special creamy pasta loaded with cheese.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0006_Cheesy-Special-Pasta-2.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 650, 0);

    -- 17. Tender Crunchy
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_pastas_id, 'Tender Crunchy', 'tender-crunchy', 'Tender chicken with crunchy pasta in a creamy sauce.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0025_Tender-Crunchy-Pasta_-2.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 750, 0);

    -- === ROLLS ===

    -- 18. Epic Roll
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_rolls_id, 'Epic Roll', 'epic-roll', 'An epic wrap packed with flavor and fresh fillings.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0011_Epic-Roll.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 600, 0);

    -- 19. Crack Shawarma Roll
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_rolls_id, 'Crack Shawarma Roll', 'crack-shawarma-roll', 'A shawarma roll so good you will keep coming back.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0008_Crack-Shawarma-Roll.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 570, 0);

    -- 20. Snap Crunchy Roll
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_rolls_id, 'Snap Crunchy Roll', 'snap-crunchy-roll', 'A crunchy wrap with a satisfying snap in every bite.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0044_Snap-Crunchy-Roll_.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 550, 0);

    -- 21. Spiral Roll
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_rolls_id, 'Spiral Roll', 'spiral-roll', 'A spiraled wrap filled with savory goodness.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0043_Spiral-Roll.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 550, 0);

    -- === SANDWICHES ===

    -- 22. Grid Sandwich
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sandwiches_id, 'Grid Sandwich', 'grid-sandwich', 'A loaded sandwich stacked with flavor.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0022_IMG_6400.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 700, 0);

    -- 23. Top-Tier Sandwich
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sandwiches_id, 'Top-Tier Sandwich', 'top-tier-sandwich', 'A premium sandwich with top-tier fillings.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0051_Top-Tire-Sandwich-2.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 750, 0);

    -- 24. Kebabish Sandwich
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sandwiches_id, 'Kebabish Sandwich', 'kebabish-sandwich', 'Kebab-style filling in a toasted sandwich.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0041_Kebabish-Sandwich_-1.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 750, 0);

    -- 25. Crunchy Sandwich
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sandwiches_id, 'Crunchy Sandwich', 'crunchy-sandwich', 'A crunchy, toasted sandwich with a satisfying bite.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0012_Crunchy-Sandwich.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 800, 0);

    -- === MUNCHIES ===

    -- 26. BBQ Fries
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_munchies_id, 'BBQ Fries', 'bbq-fries', 'Crispy fries tossed in smoky BBQ seasoning.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0003_BBQ-Fries-2.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 700, 0);

    -- 27. Cheesy Fries
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_munchies_id, 'Cheesy Fries', 'cheesy-fries', 'Golden fries loaded with melted cheese.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0004_Cheesy-Fries-1.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 650, 0);

    -- 28. Plain Fries
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_munchies_id, 'Plain Fries', 'plain-fries', 'Classic golden crispy fries.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/plain-fries.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 320, 0);

    -- 29. Nuggets Bites
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_munchies_id, 'Nuggets Bites', 'nuggets-bites', 'Crispy chicken nuggets, perfect for dipping.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0046_nuggets-bite.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 550, 0);

    -- 30. Cheesy Sticks
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_munchies_id, 'Cheesy Sticks', 'cheesy-sticks', 'Golden fried mozzarella sticks with a cheesy pull.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0034_Jalapeno-Cheese-Stick-2.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 750, 0);

    -- 31. Golden Crumble Wings
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_munchies_id, 'Golden Crumble Wings', 'golden-crumble-wings', 'Crispy crumb-fried wings with a golden crunch.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/0045_Godlen-crumble-wings.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 700, 0);

    -- 32. Oven Roasted Fire Wings
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_munchies_id, 'Oven Roasted Fire Wings', 'oven-roasted-fire-wings', 'Oven-roasted wings with a fiery kick.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-2.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 600, 0);

    -- === SHARING MEALS ===

    -- 33. 5 Zinger Burger + 1.5L Drink
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sharing_id, '5 Zinger Burger + 1.5L Drink', '5-zinger-burger-meal', '5 zinger burgers with a 1.5 liter drink for the whole crew.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-6.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 2100, 0);

    -- 34. 3 Zinger Burger + 3 Bottles + Fries
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sharing_id, '3 Zinger Burger + 3 Bottles + Fries', '3-zinger-burger-meal', '3 zinger burgers, 3 glass bottles (330ml), and fries.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-7.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 1500, 0);

    -- 35. 2 Zinger Burger + 2 Bottles + Fries
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sharing_id, '2 Zinger Burger + 2 Bottles + Fries', '2-zinger-burger-meal', '2 zinger burgers, 2 glass bottles (330ml), and fries.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-8.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 1000, 0);

    -- 36. 2 Large Pizza + Fries + Drink
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sharing_id, '2 Large Pizza + Fries + Drink', '2-large-pizza-meal', '2 large pizzas (Fajita/Tikka, Kebab Delight), 1.5L drink, and large fries.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-4.png', true, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 3650, 0);

    -- 37. 2 Medium Pizza + Drink
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sharing_id, '2 Medium Pizza + Drink', '2-medium-pizza-meal', '2 medium pizzas (Fajita/Tikka, The House Favorite) and a 1.5L drink.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-5.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 2900, 0);

    -- 38. Large Pizza + Pasta + Rolls Meal
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sharing_id, 'Large Pizza + Pasta + Rolls Meal', 'large-pizza-family-meal', '1 large special pizza, 1 pasta, 1 cheese fries, epic rolls, and a 1.5L drink.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-2-1.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 4000, 0);

    -- 39. XL Special Pizza + Nuggets + Fries
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_sharing_id, 'XL Special Pizza + Nuggets + Fries', 'xl-special-pizza-meal', '1 XL special pizza (except beef patty), nuggets, fries, and a 1.5L drink.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-3.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 4180, 0);

    -- === EXTRAS ===

    -- 40. Add-On Dips
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_extras_id, 'Add-On Dips', 'add-on-dips', 'Extra dips for your meal — choose your favorites.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-9.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 80, 0);

    -- 41. Extra Veggies
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_extras_id, 'Extra Veggies', 'extra-veggies', 'Load up with extra fresh veggies.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-10.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES (v_prod_id, 'Regular', 100, 0);

    -- 42. Extra Cheese & Meat
    INSERT INTO products (category_id, name, slug, description, image_url, is_popular, is_active)
    VALUES (cat_extras_id, 'Extra Cheese & Meat', 'extra-cheese-meat', 'Add extra cheese or meat to any order.', 'https://doughncheesepk.com/wp-content/uploads/2025/05/Untitled-design-11.png', false, true)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, image_url = EXCLUDED.image_url, is_popular = EXCLUDED.is_popular
    RETURNING id INTO v_prod_id;

    DELETE FROM product_price_options WHERE product_id = v_prod_id;
    INSERT INTO product_price_options (product_id, label, price, display_order) VALUES
    (v_prod_id, 'Extra Cheese', 100, 0),
    (v_prod_id, 'Extra Meat', 350, 1);

END $$;
