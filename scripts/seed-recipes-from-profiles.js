#!/usr/bin/env node

/**
 * Seed recipes for users from profiles CSV
 * 
 * This script reads user profiles and creates realistic recipes for each user
 * based on their interests and bio information.
 * 
 * Usage:
 *   node scripts/seed-recipes-from-profiles.js
 */

const path = require('path');
const fs = require('fs');

// Try to load dependencies
let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  const serverSupabasePath = path.join(__dirname, '..', 'server', 'node_modules', '@supabase', 'supabase-js');
  if (fs.existsSync(serverSupabasePath)) {
    createClient = require(serverSupabasePath).createClient;
  } else {
    console.error('❌ Error: @supabase/supabase-js not found.');
    process.exit(1);
  }
}

// Try to load dotenv
let dotenv;
try {
  dotenv = require('dotenv');
} catch (e) {
  const serverDotenvPath = path.join(__dirname, '..', 'server', 'node_modules', 'dotenv');
  if (fs.existsSync(serverDotenvPath)) {
    dotenv = require(serverDotenvPath);
  }
}

// Load .env
if (dotenv) {
  const possibleEnvPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', 'server', '.env'),
    '.env'
  ];

  for (const envPath of possibleEnvPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      break;
    }
  }
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing required environment variables!');
  console.error('   Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load recipe icon utility
const { getRecipeIconConfig } = require('../server/utils/recipeIcons');

// Recipe templates organized by category
const recipeTemplates = {
  italian: [
    {
      title: 'Classic Spaghetti Carbonara',
      time: '30 min',
      tags: ['Italian', 'Pasta', 'Comfort Food'],
      ingredients: [
        '400g spaghetti',
        '200g pancetta or bacon, diced',
        '4 large eggs',
        '100g Pecorino Romano, grated',
        'Black pepper, freshly ground',
        '2 cloves garlic, minced',
        'Salt to taste'
      ],
      steps: [
        'Bring a large pot of salted water to boil and cook spaghetti until al dente.',
        'While pasta cooks, heat a large pan over medium heat and cook pancetta until crispy.',
        'In a bowl, whisk together eggs, grated cheese, and black pepper.',
        'Drain pasta, reserving a cup of pasta water.',
        'Add hot pasta to the pancetta pan, remove from heat.',
        'Quickly toss with egg mixture, adding pasta water as needed to create a creamy sauce.',
        'Serve immediately with extra cheese and pepper.'
      ]
    },
    {
      title: 'Margherita Pizza',
      time: '45 min',
      tags: ['Italian', 'Pizza', 'Vegetarian'],
      ingredients: [
        '500g pizza dough',
        '200g fresh mozzarella',
        '3 large tomatoes, sliced',
        'Fresh basil leaves',
        '2 tbsp olive oil',
        'Salt and pepper'
      ],
      steps: [
        'Preheat oven to 475°F (245°C).',
        'Roll out pizza dough on a floured surface.',
        'Place on pizza stone or baking sheet.',
        'Drizzle with olive oil and add tomato slices.',
        'Top with mozzarella and season with salt and pepper.',
        'Bake for 12-15 minutes until crust is golden.',
        'Garnish with fresh basil before serving.'
      ]
    },
    {
      title: 'Chicken Parmesan',
      time: '60 min',
      tags: ['Italian', 'Chicken', 'Comfort Food'],
      ingredients: [
        '4 chicken breasts',
        '1 cup breadcrumbs',
        '1 cup marinara sauce',
        '200g mozzarella, sliced',
        '100g Parmesan, grated',
        '2 eggs, beaten',
        'Flour for coating',
        'Oil for frying'
      ],
      steps: [
        'Preheat oven to 400°F (200°C).',
        'Pound chicken breasts to even thickness.',
        'Dip in flour, then egg, then breadcrumbs.',
        'Fry until golden brown on both sides.',
        'Place in baking dish and top with marinara.',
        'Add mozzarella and Parmesan.',
        'Bake for 20 minutes until cheese is bubbly.'
      ]
    }
  ],
  baking: [
    {
      title: 'Classic Chocolate Chip Cookies',
      time: '30 min',
      tags: ['Dessert', 'Baking', 'Cookies'],
      ingredients: [
        '2¼ cups all-purpose flour',
        '1 tsp baking soda',
        '1 cup butter, softened',
        '¾ cup granulated sugar',
        '¾ cup brown sugar',
        '2 large eggs',
        '2 tsp vanilla extract',
        '2 cups chocolate chips'
      ],
      steps: [
        'Preheat oven to 375°F (190°C).',
        'Mix flour and baking soda in a bowl.',
        'Cream butter and sugars until fluffy.',
        'Beat in eggs and vanilla.',
        'Gradually mix in flour mixture.',
        'Stir in chocolate chips.',
        'Drop rounded tablespoons onto ungreased baking sheets.',
        'Bake 9-11 minutes until golden brown.'
      ]
    },
    {
      title: 'Vanilla Cupcakes',
      time: '35 min',
      tags: ['Dessert', 'Baking', 'Cupcakes'],
      ingredients: [
        '1½ cups all-purpose flour',
        '1 cup granulated sugar',
        '1½ tsp baking powder',
        '½ cup butter, softened',
        '2 large eggs',
        '½ cup milk',
        '1 tsp vanilla extract'
      ],
      steps: [
        'Preheat oven to 350°F (175°C).',
        'Line muffin tin with cupcake liners.',
        'Mix dry ingredients in a bowl.',
        'Cream butter and sugar.',
        'Add eggs one at a time, then vanilla.',
        'Alternate adding flour mixture and milk.',
        'Fill liners ⅔ full.',
        'Bake 18-20 minutes until golden.'
      ]
    },
    {
      title: 'Apple Pie',
      time: '90 min',
      tags: ['Dessert', 'Baking', 'Pie'],
      ingredients: [
        '2 pie crusts',
        '6-8 apples, peeled and sliced',
        '¾ cup sugar',
        '2 tbsp flour',
        '1 tsp cinnamon',
        '¼ tsp nutmeg',
        '2 tbsp butter'
      ],
      steps: [
        'Preheat oven to 425°F (220°C).',
        'Mix apples with sugar, flour, and spices.',
        'Line pie dish with one crust.',
        'Fill with apple mixture and dot with butter.',
        'Cover with top crust and seal edges.',
        'Cut slits in top for steam.',
        'Bake 45-50 minutes until golden.'
      ]
    }
  ],
  bbq: [
    {
      title: 'Smoked Brisket',
      time: '8 hours',
      tags: ['BBQ', 'Beef', 'Smoked'],
      ingredients: [
        '5-6 lb beef brisket',
        '¼ cup brown sugar',
        '2 tbsp paprika',
        '1 tbsp garlic powder',
        '1 tbsp onion powder',
        '1 tbsp black pepper',
        '1 tbsp salt',
        'Wood chips for smoking'
      ],
      steps: [
        'Trim brisket, leaving ¼ inch fat cap.',
        'Mix dry rub ingredients and coat brisket thoroughly.',
        'Let rest in refrigerator overnight.',
        'Preheat smoker to 225°F (107°C).',
        'Smoke brisket fat-side down for 4 hours.',
        'Wrap in butcher paper and continue smoking 3-4 hours.',
        'Rest wrapped for 1 hour before slicing.'
      ]
    },
    {
      title: 'BBQ Pulled Pork',
      time: '6 hours',
      tags: ['BBQ', 'Pork', 'Comfort Food'],
      ingredients: [
        '4-5 lb pork shoulder',
        '2 tbsp brown sugar',
        '1 tbsp paprika',
        '1 tbsp chili powder',
        '1 tbsp cumin',
        '1 tbsp salt',
        '1 cup BBQ sauce'
      ],
      steps: [
        'Mix spices for dry rub and coat pork.',
        'Preheat smoker to 250°F (120°C).',
        'Smoke pork for 4-5 hours until internal temp reaches 195°F.',
        'Remove and wrap in foil, let rest 1 hour.',
        'Shred meat and mix with BBQ sauce.',
        'Serve on buns or as desired.'
      ]
    },
    {
      title: 'Grilled Ribs',
      time: '4 hours',
      tags: ['BBQ', 'Pork', 'Grilled'],
      ingredients: [
        '2 racks pork ribs',
        '2 tbsp brown sugar',
        '1 tbsp paprika',
        '1 tbsp garlic powder',
        '1 tbsp onion powder',
        'Salt and pepper',
        'BBQ sauce for glazing'
      ],
      steps: [
        'Remove membrane from back of ribs.',
        'Apply dry rub and let marinate 2 hours.',
        'Preheat grill to 225°F (107°C).',
        'Grill indirect heat for 3 hours.',
        'Baste with BBQ sauce and grill 30 more minutes.',
        'Rest 10 minutes before slicing.'
      ]
    }
  ],
  vegan: [
    {
      title: 'Vegan Buddha Bowl',
      time: '40 min',
      tags: ['Vegan', 'Healthy', 'Bowls'],
      ingredients: [
        '1 cup quinoa, cooked',
        '1 sweet potato, roasted',
        '1 cup chickpeas, roasted',
        '2 cups kale, massaged',
        '1 avocado, sliced',
        'Tahini dressing',
        'Sunflower seeds'
      ],
      steps: [
        'Preheat oven to 400°F (200°C).',
        'Cube sweet potato and toss with oil, roast 25 minutes.',
        'Toss chickpeas with spices and roast 20 minutes.',
        'Massage kale with lemon juice.',
        'Cook quinoa according to package directions.',
        'Assemble bowl with quinoa, vegetables, and avocado.',
        'Drizzle with tahini dressing and top with seeds.'
      ]
    },
    {
      title: 'Chickpea Curry',
      time: '35 min',
      tags: ['Vegan', 'Curry', 'Indian'],
      ingredients: [
        '2 cans chickpeas, drained',
        '1 can coconut milk',
        '1 onion, diced',
        '3 cloves garlic, minced',
        '1 tbsp curry powder',
        '1 tsp turmeric',
        '1 tsp cumin',
        '2 tomatoes, diced'
      ],
      steps: [
        'Sauté onion and garlic until fragrant.',
        'Add spices and toast for 1 minute.',
        'Add tomatoes and cook until soft.',
        'Add chickpeas and coconut milk.',
        'Simmer 15-20 minutes until thickened.',
        'Serve over rice with cilantro.'
      ]
    },
    {
      title: 'Vegan Chocolate Cake',
      time: '50 min',
      tags: ['Vegan', 'Dessert', 'Chocolate'],
      ingredients: [
        '1½ cups flour',
        '1 cup sugar',
        '⅓ cup cocoa powder',
        '1 tsp baking soda',
        '1 cup plant milk',
        '⅓ cup vegetable oil',
        '1 tbsp vinegar',
        '1 tsp vanilla'
      ],
      steps: [
        'Preheat oven to 350°F (175°C).',
        'Mix dry ingredients in a bowl.',
        'Whisk wet ingredients together.',
        'Combine wet and dry, mix until smooth.',
        'Pour into greased 9-inch pan.',
        'Bake 30-35 minutes until toothpick comes out clean.',
        'Cool completely before frosting.'
      ]
    }
  ],
  professional: [
    {
      title: 'Seared Scallops with Risotto',
      time: '45 min',
      tags: ['Seafood', 'Gourmet', 'Italian'],
      ingredients: [
        '12 large sea scallops',
        '1 cup arborio rice',
        '4 cups warm chicken stock',
        '½ cup white wine',
        '1 shallot, minced',
        '3 tbsp butter',
        '50g Parmesan, grated',
        'Fresh parsley'
      ],
      steps: [
        'Heat stock in a saucepan and keep warm.',
        'Sauté shallot in butter until translucent.',
        'Add rice and toast for 2 minutes.',
        'Add wine and stir until absorbed.',
        'Add stock one ladle at a time, stirring constantly.',
        'Meanwhile, pat scallops dry and sear 2 minutes per side.',
        'Finish risotto with butter and Parmesan.',
        'Serve scallops over risotto, garnished with parsley.'
      ]
    },
    {
      title: 'Beef Wellington',
      time: '3 hours',
      tags: ['Beef', 'Gourmet', 'Special'],
      ingredients: [
        '2 lb beef tenderloin',
        '1 lb puff pastry',
        '8 oz mushrooms, duxelles',
        '6 slices prosciutto',
        '2 tbsp Dijon mustard',
        'Egg wash',
        'Salt and pepper'
      ],
      steps: [
        'Season and sear beef on all sides.',
        'Brush with mustard and let cool.',
        'Sauté mushrooms until dry, season well.',
        'Roll out pastry and layer prosciutto and mushrooms.',
        'Wrap beef in pastry, seal edges.',
        'Brush with egg wash and score top.',
        'Bake at 400°F (200°C) for 25-30 minutes.',
        'Rest 10 minutes before slicing.'
      ]
    },
    {
      title: 'Lemon Tart',
      time: '90 min',
      tags: ['Dessert', 'French', 'Gourmet'],
      ingredients: [
        '1 pie crust, blind baked',
        '4 eggs',
        '1 cup sugar',
        '½ cup fresh lemon juice',
        'Zest of 2 lemons',
        '6 tbsp butter',
        'Powdered sugar for dusting'
      ],
      steps: [
        'Preheat oven to 350°F (175°C).',
        'Whisk eggs, sugar, lemon juice, and zest.',
        'Cook over double boiler, stirring constantly until thickened.',
        'Remove from heat and whisk in butter.',
        'Pour into cooled tart shell.',
        'Bake 10-15 minutes until set.',
        'Cool completely and dust with powdered sugar.'
      ]
    }
  ],
  general: [
    {
      title: 'Chicken Tikka Masala',
      time: '45 min',
      tags: ['Indian', 'Chicken', 'Spicy'],
      ingredients: [
        '2 lbs chicken breast, cubed',
        '1 cup yogurt',
        '2 tbsp garam masala',
        '1 can tomato sauce',
        '1 cup heavy cream',
        '1 onion, diced',
        '3 cloves garlic',
        'Ginger, grated'
      ],
      steps: [
        'Marinate chicken in yogurt and half the garam masala for 1 hour.',
        'Sauté onion, garlic, and ginger.',
        'Add remaining spices and tomato sauce.',
        'Add chicken and cook until done.',
        'Stir in cream and simmer 10 minutes.',
        'Serve over basmati rice with naan.'
      ]
    },
    {
      title: 'Avocado Toast Supreme',
      time: '15 min',
      tags: ['Breakfast', 'Healthy', 'Quick'],
      ingredients: [
        '4 slices sourdough bread',
        '2 avocados, mashed',
        '4 eggs',
        'Cherry tomatoes',
        'Red pepper flakes',
        'Salt and pepper',
        'Lemon juice'
      ],
      steps: [
        'Toast bread until golden.',
        'Mash avocado with lemon, salt, and pepper.',
        'Fry eggs to your preference.',
        'Spread avocado on toast.',
        'Top with egg and sliced tomatoes.',
        'Season with red pepper flakes.'
      ]
    },
    {
      title: 'Salmon Teriyaki',
      time: '25 min',
      tags: ['Seafood', 'Asian', 'Healthy'],
      ingredients: [
        '4 salmon fillets',
        '½ cup soy sauce',
        '¼ cup mirin',
        '2 tbsp brown sugar',
        '1 tbsp ginger, grated',
        '2 cloves garlic',
        'Sesame seeds'
      ],
      steps: [
        'Mix soy sauce, mirin, sugar, ginger, and garlic for marinade.',
        'Marinate salmon 15 minutes.',
        'Pan-sear salmon skin-side down 5 minutes.',
        'Flip and cook 3 more minutes.',
        'Pour remaining marinade and simmer until glazed.',
        'Garnish with sesame seeds and serve over rice.'
      ]
    }
  ]
};

// Map users to recipe categories based on their bio/username
function getRecipesForUser(user) {
  const username = (user.username || '').toLowerCase();
  const bio = (user.bio || '').toLowerCase();
  const displayName = (user.display_name || '').toLowerCase();
  
  let categories = [];
  
  // Determine categories based on username and bio
  if (username.includes('bbq') || bio.includes('bbq') || bio.includes('smoked')) {
    categories.push('bbq');
  }
  if (username.includes('baker') || bio.includes('baking') || bio.includes('cake') || bio.includes('cookies')) {
    categories.push('baking');
  }
  if (username.includes('vegan') || bio.includes('vegan') || bio.includes('plant-based')) {
    categories.push('vegan');
  }
  if (username.includes('chef') || bio.includes('chef') || bio.includes('professional')) {
    categories.push('professional');
  }
  if (username.includes('italian') || bio.includes('italian') || bio.includes('pasta')) {
    categories.push('italian');
  }
  
  // Default to general if no specific category
  if (categories.length === 0) {
    categories.push('general');
  }
  
  // Select recipes - mix of categories with 2-4 recipes per user
  const numRecipes = Math.floor(Math.random() * 3) + 2; // 2-4 recipes
  const selectedRecipes = [];
  
  for (let i = 0; i < numRecipes; i++) {
    const category = categories[i % categories.length];
    const recipes = recipeTemplates[category] || recipeTemplates.general;
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];
    
    // Create a unique variation by slightly modifying the title
    const variation = recipeTemplates[category].indexOf(recipe);
    const uniqueRecipe = { ...recipe };
    if (i > 0 && Math.random() > 0.5) {
      uniqueRecipe.title = `${user.display_name.split(' ')[0]}'s ${recipe.title}`;
    }
    
    selectedRecipes.push(uniqueRecipe);
  }
  
  return selectedRecipes;
}

async function seedRecipes() {
  console.log('🌱 Starting recipe seeding...\n');
  
  // Read CSV file
  // Try multiple possible locations
  const possiblePaths = [
    '/Users/ericwalters/Downloads/profiles_rows.csv',
    path.join(__dirname, '..', '..', '..', 'Downloads', 'profiles_rows.csv'),
    path.join(process.cwd(), 'profiles_rows.csv'),
    path.join(__dirname, 'profiles_rows.csv')
  ];
  
  let csvPath = null;
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      csvPath = possiblePath;
      break;
    }
  }
  
  if (!csvPath) {
    console.error('❌ Error: CSV file not found. Tried the following locations:');
    possiblePaths.forEach(p => console.error(`   - ${p}`));
    console.error('\n   Please ensure the file exists or update the path in the script.');
    console.error('   You can also copy the CSV file to the scripts directory.');
    process.exit(1);
  }
  
  console.log(`📁 Reading CSV from: ${csvPath}\n`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Parse CSV
  const users = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const user = {};
    headers.forEach((header, index) => {
      user[header.trim()] = values[index]?.trim() || '';
    });
    if (user.id) {
      users.push(user);
    }
  }
  
  console.log(`📋 Found ${users.length} users in CSV\n`);
  
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  for (const user of users) {
    try {
      console.log(`👤 Processing: ${user.display_name || user.username || user.email}`);
      
      // Get recipes for this user
      const recipes = getRecipesForUser(user);
      console.log(`   📝 Generating ${recipes.length} recipes...`);
      
      let userCreated = 0;
      let userSkipped = 0;
      
      for (const recipe of recipes) {
        try {
          // Get icon configuration
          const iconConfig = getRecipeIconConfig(recipe.title, recipe.tags || []);
          
          // Insert recipe
          const { data, error } = await supabase
            .from('recipes')
            .insert({
              user_id: user.id,
              title: recipe.title,
              time: recipe.time,
              tags: recipe.tags,
              ingredients: recipe.ingredients,
              steps: recipe.steps,
              icon_name: iconConfig.name,
              icon_library: iconConfig.library,
              icon_color: iconConfig.iconColor,
              icon_bg_color: iconConfig.backgroundColor,
              created_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (error) {
            if (error.message.includes('duplicate') || error.message.includes('unique')) {
              console.log(`     ⏭️  Skipped: ${recipe.title} (already exists)`);
              userSkipped++;
            } else {
              throw error;
            }
          } else {
            console.log(`     ✅ Created: ${recipe.title}`);
            userCreated++;
          }
          
          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`     ❌ Failed: ${recipe.title} - ${error.message}`);
          totalFailed++;
        }
      }
      
      totalCreated += userCreated;
      totalSkipped += userSkipped;
      console.log(`   ✅ ${userCreated} created, ${userSkipped} skipped\n`);
      
    } catch (error) {
      console.error(`❌ Error processing user ${user.id}:`, error.message);
      totalFailed++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Total recipes created: ${totalCreated}`);
  console.log(`   ⏭️  Total recipes skipped: ${totalSkipped}`);
  console.log(`   ❌ Total recipes failed: ${totalFailed}`);
  console.log('\n🎉 Recipe seeding complete!');
}

seedRecipes().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
