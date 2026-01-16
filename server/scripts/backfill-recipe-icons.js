require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Copy of the icon matching logic from client/utils/recipeIcons.ts
// This ensures we use the exact same logic for consistency

const RECIPE_CATEGORIES = {
  breakfast: {
    library: 'MaterialCommunityIcons',
    name: 'food-croissant',
    backgroundColor: '#FFF8DC',
    iconColor: '#F4C430',
    keywords: ['breakfast', 'pancake', 'waffle', 'omelet', 'scrambled', 'french toast', 'eggs', 'bacon', 'brunch', 'cereal', 'toast', 'bagel', 'muffin', 'french toast'],
  },
  pancakes: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF8DC',
    iconColor: '#FFB74D',
    keywords: ['pancake', 'waffle', 'hotcake', 'crepe'],
  },
  eggs: {
    library: 'MaterialCommunityIcons',
    name: 'egg',
    backgroundColor: '#FFF9C4',
    iconColor: '#F9A825',
    keywords: ['egg', 'eggs', 'omelet', 'scrambled', 'fried egg', 'poached'],
  },
  pasta: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF7F50',
    keywords: ['pasta', 'spaghetti', 'penne', 'fettuccine', 'macaroni', 'lasagna', 'ravioli', 'gnocchi', 'noodles', 'carbonara', 'alfredo', 'linguine', 'rigatoni'],
  },
  salad: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#E0F4E0',
    iconColor: '#6DA98C',
    keywords: ['salad', 'green', 'lettuce', 'spinach', 'kale', 'caesar', 'greek', 'cobb', 'quinoa', 'healthy', 'vegetable', 'veggie'],
  },
  chicken: {
    library: 'MaterialCommunityIcons',
    name: 'food-drumstick',
    backgroundColor: '#FFE0E6',
    iconColor: '#E91E63',
    keywords: ['chicken', 'poultry', 'wing', 'breast', 'thigh', 'drumstick', 'roasted chicken', 'fried chicken', 'grilled chicken'],
  },
  beef: {
    library: 'MaterialCommunityIcons',
    name: 'food-steak',
    backgroundColor: '#FFCDD2',
    iconColor: '#C62828',
    keywords: ['beef', 'steak', 'burger', 'hamburger', 'meatball', 'roast beef', 'ribs', 'ribeye'],
  },
  pork: {
    library: 'MaterialCommunityIcons',
    name: 'food',
    backgroundColor: '#FFE0E6',
    iconColor: '#E91E63',
    keywords: ['pork', 'bacon', 'ham', 'sausage', 'pork chop', 'pulled pork'],
  },
  turkey: {
    library: 'MaterialCommunityIcons',
    name: 'food-turkey',
    backgroundColor: '#FFE0E6',
    iconColor: '#E91E63',
    keywords: ['turkey', 'turkey burger'],
  },
  dessert: {
    library: 'MaterialCommunityIcons',
    name: 'cupcake',
    backgroundColor: '#F3E5F5',
    iconColor: '#9C27B0',
    keywords: ['dessert', 'cake', 'cookie', 'pie', 'brownie', 'pudding', 'ice cream', 'sweet', 'chocolate', 'sugar', 'tart', 'muffin', 'cupcake', 'donut'],
  },
  cake: {
    library: 'MaterialCommunityIcons',
    name: 'cake',
    backgroundColor: '#F3E5F5',
    iconColor: '#BA68C8',
    keywords: ['cake', 'birthday', 'layer cake', 'cheesecake'],
  },
  cookie: {
    library: 'MaterialCommunityIcons',
    name: 'cookie',
    backgroundColor: '#FFF3E0',
    iconColor: '#F57C00',
    keywords: ['cookie', 'cookies', 'biscuit'],
  },
  iceCream: {
    library: 'MaterialCommunityIcons',
    name: 'ice-cream',
    backgroundColor: '#E1F5FE',
    iconColor: '#0288D1',
    keywords: ['ice cream', 'gelato', 'frozen yogurt', 'sorbet'],
  },
  seafood: {
    library: 'MaterialCommunityIcons',
    name: 'fish',
    backgroundColor: '#E6EEFF',
    iconColor: '#2196F3',
    keywords: ['fish', 'salmon', 'tuna', 'seafood', 'sashimi'],
  },
  shrimp: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#E6EEFF',
    iconColor: '#1976D2',
    keywords: ['shrimp', 'prawn', 'scampi'],
  },
  sushi: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#E8F5E9',
    iconColor: '#388E3C',
    keywords: ['sushi', 'sashimi', 'roll', 'maki', 'nigiri'],
  },
  pizza: {
    library: 'MaterialCommunityIcons',
    name: 'pizza',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF5722',
    keywords: ['pizza', 'margherita', 'pepperoni', 'cheese pizza', 'neapolitan'],
  },
  soup: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF3E0',
    iconColor: '#FF9800',
    keywords: ['soup', 'stew', 'chili', 'chowder', 'broth', 'bisque', 'gazpacho', 'bouillon'],
  },
  bread: {
    library: 'MaterialCommunityIcons',
    name: 'bread-slice',
    backgroundColor: '#FFF8DC',
    iconColor: '#FBC02D',
    keywords: ['bread', 'bagel', 'croissant', 'roll', 'bun', 'dough', 'yeast', 'bake', 'baking', 'loaf'],
  },
  sandwich: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF8DC',
    iconColor: '#F9A825',
    keywords: ['sandwich', 'sub', 'wrap', 'panini', 'club', 'grilled cheese'],
  },
  ramen: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF6F00',
    keywords: ['ramen', 'noodle soup'],
  },
  curry: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF3E0',
    iconColor: '#F57C00',
    keywords: ['curry', 'tikka', 'masala', 'korma', 'vindaloo'],
  },
  friedRice: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF6F00',
    keywords: ['fried rice', 'stir fry', 'lo mein', 'pad thai'],
  },
  mexican: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF6F00',
    keywords: ['taco', 'burrito', 'quesadilla', 'enchilada', 'fajita', 'salsa', 'guacamole'],
  },
  italian: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF7F50',
    keywords: ['risotto', 'gnocchi', 'parmesan', 'mozzarella', 'bruschetta'],
  },
  drink: {
    library: 'MaterialCommunityIcons',
    name: 'cup',
    backgroundColor: '#E3F2FD',
    iconColor: '#1976D2',
    keywords: ['drink', 'beverage', 'smoothie', 'juice', 'coffee', 'tea', 'milkshake'],
  },
  coffee: {
    library: 'MaterialCommunityIcons',
    name: 'coffee',
    backgroundColor: '#FFF3E0',
    iconColor: '#5D4037',
    keywords: ['coffee', 'latte', 'cappuccino', 'espresso', 'americano'],
  },
  snack: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF3E0',
    iconColor: '#F57C00',
    keywords: ['snack', 'chips', 'cracker', 'pretzel', 'popcorn', 'nuts'],
  },
  vegetable: {
    library: 'MaterialCommunityIcons',
    name: 'carrot',
    backgroundColor: '#E0F4E0',
    iconColor: '#66BB6A',
    keywords: ['vegetable', 'carrot', 'broccoli', 'cauliflower', 'pepper', 'zucchini', 'asparagus'],
  },
  fruit: {
    library: 'MaterialCommunityIcons',
    name: 'food-apple',
    backgroundColor: '#FFE0E6',
    iconColor: '#E91E63',
    keywords: ['fruit', 'apple', 'banana', 'berry', 'orange', 'strawberry', 'mango'],
  },
};

const DEFAULT_ICONS = [
  { library: 'MaterialCommunityIcons', name: 'food-variant', backgroundColor: '#F3F4F6', iconColor: '#9CA3AF' },
  { library: 'MaterialCommunityIcons', name: 'chef-hat', backgroundColor: '#E5E7EB', iconColor: '#6B7280' },
  { library: 'MaterialCommunityIcons', name: 'food-fork-drink', backgroundColor: '#E0F4E0', iconColor: '#6DA98C' },
  { library: 'MaterialCommunityIcons', name: 'silverware-fork-knife', backgroundColor: '#E6EEFF', iconColor: '#4A90E2' },
  { library: 'MaterialCommunityIcons', name: 'pot-steam', backgroundColor: '#FFE5D0', iconColor: '#F4C430' },
];

function getRecipeIconConfig(title, tags = [], index = 0) {
  const searchText = `${title} ${Array.isArray(tags) ? tags.join(' ') : tags}`.toLowerCase();
  
  const priorityOrder = [
    'sushi', 'ramen', 'pizza', 'cake', 'cookie', 'iceCream', 'turkey', 'chicken', 'beef', 'pork',
    'shrimp', 'curry', 'friedRice', 'coffee', 'sandwich', 'eggs', 'pancakes',
    'breakfast', 'pasta', 'salad', 'seafood', 'soup', 'bread', 'dessert', 'mexican', 'italian',
    'snack', 'drink', 'vegetable', 'fruit',
  ];
  
  // Check prioritized categories first
  for (const category of priorityOrder) {
    const config = RECIPE_CATEGORIES[category];
    if (config && config.keywords.some(keyword => searchText.includes(keyword))) {
      return {
        library: config.library,
        name: config.name,
        backgroundColor: config.backgroundColor,
        iconColor: config.iconColor,
      };
    }
  }
  
  // Check remaining categories
  for (const [category, config] of Object.entries(RECIPE_CATEGORIES)) {
    if (!priorityOrder.includes(category) && config.keywords.some(keyword => searchText.includes(keyword))) {
      return {
        library: config.library,
        name: config.name,
        backgroundColor: config.backgroundColor,
        iconColor: config.iconColor,
      };
    }
  }
  
  // Fallback to indexed default (use hash of title for deterministic fallback)
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const defaultConfig = DEFAULT_ICONS[hash % DEFAULT_ICONS.length];
  return defaultConfig;
}

async function backfillRecipeIcons() {
  console.log('🔄 Starting recipe icon backfill...');
  
  try {
    // Fetch all recipes without icons (where icon_name IS NULL)
    const { data: recipes, error: fetchError } = await supabase
      .from('recipes')
      .select('id, title, tags')
      .is('icon_name', null);
    
    if (fetchError) {
      throw new Error(`Failed to fetch recipes: ${fetchError.message}`);
    }
    
    if (!recipes || recipes.length === 0) {
      console.log('✅ No recipes need icon backfill!');
      return;
    }
    
    console.log(`📊 Found ${recipes.length} recipes to update`);
    
    // Process in batches of 50 to avoid overwhelming the database
    const BATCH_SIZE = 50;
    let updated = 0;
    let errors = 0;
    
    for (let i = 0; i < recipes.length; i += BATCH_SIZE) {
      const batch = recipes.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recipes.length / BATCH_SIZE)} (${batch.length} recipes)...`);
      
      const updates = batch.map((recipe, batchIndex) => {
        const iconConfig = getRecipeIconConfig(recipe.title, recipe.tags || [], i + batchIndex);
        return {
          id: recipe.id,
          icon_library: iconConfig.library,
          icon_name: iconConfig.name,
          icon_bg_color: iconConfig.backgroundColor,
          icon_color: iconConfig.iconColor,
        };
      });
      
      // Update each recipe individually (Supabase doesn't support bulk update easily)
      for (const update of updates) {
        const { error: updateError } = await supabase
          .from('recipes')
          .update({
            icon_library: update.icon_library,
            icon_name: update.icon_name,
            icon_bg_color: update.icon_bg_color,
            icon_color: update.icon_color,
          })
          .eq('id', update.id);
        
        if (updateError) {
          const recipeTitle = recipes.find(r => r.id === update.id)?.title || 'unknown';
          console.error(`❌ Error updating recipe ${update.id} (${recipeTitle}):`, updateError.message);
          errors++;
        } else {
          updated++;
          process.stdout.write(`\r✅ Updated ${updated}/${recipes.length} recipes...`);
        }
      }
    }
    
    console.log(`\n\n✨ Backfill complete!`);
    console.log(`   ✅ Successfully updated: ${updated} recipes`);
    if (errors > 0) {
      console.log(`   ❌ Errors: ${errors} recipes`);
    }
    
  } catch (error) {
    console.error('💥 Fatal error during backfill:', error.message);
    process.exit(1);
  }
}

// Run the backfill
backfillRecipeIcons()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
