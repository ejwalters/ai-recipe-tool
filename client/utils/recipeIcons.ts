/**
 * Recipe Icon and Color Mapping Utility
 * Maps recipe titles and tags to appropriate icons and colors
 * Uses MaterialCommunityIcons for better food-specific icons
 */


export type IconLibrary = 'MaterialCommunityIcons' | 'Ionicons';
export type IconConfig = {
  library: IconLibrary;
  name: string;
  backgroundColor: string;
  iconColor: string;
};

type CategoryConfig = IconConfig & {
  keywords: string[];
};

// Recipe category configurations with MaterialCommunityIcons
const RECIPE_CATEGORIES: Record<string, CategoryConfig> = {
  // Breakfast items
  breakfast: {
    library: 'MaterialCommunityIcons',
    name: 'food-croissant',
    backgroundColor: '#FFF8DC',
    iconColor: '#F4C430',
    keywords: ['breakfast', 'pancake', 'waffle', 'omelet', 'scrambled', 'french toast', 'eggs', 'bacon', 'brunch', 'cereal', 'toast', 'bagel', 'muffin', 'french toast'],
  },
  // Pancakes/Waffles specific
  pancakes: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF8DC',
    iconColor: '#FFB74D',
    keywords: ['pancake', 'waffle', 'hotcake', 'crepe'],
  },
  // Eggs specific
  eggs: {
    library: 'MaterialCommunityIcons',
    name: 'egg',
    backgroundColor: '#FFF9C4',
    iconColor: '#F9A825',
    keywords: ['egg', 'eggs', 'omelet', 'scrambled', 'fried egg', 'poached'],
  },
  // Pasta dishes
  pasta: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF7F50',
    keywords: ['pasta', 'spaghetti', 'penne', 'fettuccine', 'macaroni', 'lasagna', 'ravioli', 'gnocchi', 'noodles', 'carbonara', 'alfredo', 'linguine', 'rigatoni'],
  },
  // Salad and healthy
  salad: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#E0F4E0',
    iconColor: '#6DA98C',
    keywords: ['salad', 'green', 'lettuce', 'spinach', 'kale', 'caesar', 'greek', 'cobb', 'quinoa', 'healthy', 'vegetable', 'veggie'],
  },
  // Meat dishes
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
  // Desserts
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
  // Seafood
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
  // Pizza
  pizza: {
    library: 'MaterialCommunityIcons',
    name: 'pizza',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF5722',
    keywords: ['pizza', 'margherita', 'pepperoni', 'cheese pizza', 'neapolitan'],
  },
  // Soup
  soup: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF3E0',
    iconColor: '#FF9800',
    keywords: ['soup', 'stew', 'chili', 'chowder', 'broth', 'bisque', 'gazpacho', 'bouillon'],
  },
  // Bread/Baked
  bread: {
    library: 'MaterialCommunityIcons',
    name: 'bread-slice',
    backgroundColor: '#FFF8DC',
    iconColor: '#FBC02D',
    keywords: ['bread', 'bagel', 'croissant', 'roll', 'bun', 'dough', 'yeast', 'bake', 'baking', 'loaf'],
  },
  // Sandwiches
  sandwich: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF8DC',
    iconColor: '#F9A825',
    keywords: ['sandwich', 'sub', 'wrap', 'panini', 'club', 'grilled cheese'],
  },
  // Asian
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
  // Mexican
  mexican: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF6F00',
    keywords: ['taco', 'burrito', 'quesadilla', 'enchilada', 'fajita', 'salsa', 'guacamole'],
  },
  // Italian
  italian: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFE5D0',
    iconColor: '#FF7F50',
    keywords: ['risotto', 'gnocchi', 'parmesan', 'mozzarella', 'bruschetta'],
  },
  // Beverages
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
  // Snacks
  snack: {
    library: 'MaterialCommunityIcons',
    name: 'food-variant',
    backgroundColor: '#FFF3E0',
    iconColor: '#F57C00',
    keywords: ['snack', 'chips', 'cracker', 'pretzel', 'popcorn', 'nuts'],
  },
  // Vegetables
  vegetable: {
    library: 'MaterialCommunityIcons',
    name: 'carrot',
    backgroundColor: '#E0F4E0',
    iconColor: '#66BB6A',
    keywords: ['vegetable', 'carrot', 'broccoli', 'cauliflower', 'pepper', 'zucchini', 'asparagus'],
  },
  // Fruits
  fruit: {
    library: 'MaterialCommunityIcons',
    name: 'food-apple',
    backgroundColor: '#FFE0E6',
    iconColor: '#E91E63',
    keywords: ['fruit', 'apple', 'banana', 'berry', 'orange', 'strawberry', 'mango'],
  },
};

// Default fallback options
const DEFAULT_ICONS: IconConfig[] = [
  { library: 'MaterialCommunityIcons', name: 'food-variant', backgroundColor: '#F3F4F6', iconColor: '#9CA3AF' },
  { library: 'MaterialCommunityIcons', name: 'chef-hat', backgroundColor: '#E5E7EB', iconColor: '#6B7280' },
  { library: 'MaterialCommunityIcons', name: 'food-fork-drink', backgroundColor: '#E0F4E0', iconColor: '#6DA98C' },
  { library: 'MaterialCommunityIcons', name: 'silverware-fork-knife', backgroundColor: '#E6EEFF', iconColor: '#4A90E2' },
  { library: 'MaterialCommunityIcons', name: 'pot-steam', backgroundColor: '#FFE5D0', iconColor: '#F4C430' },
];

/**
 * Get icon and color configuration for a recipe
 * First checks if recipe has stored icon data in database
 * Falls back to computation if not available
 */
export const getRecipeIconConfig = (
  title: string, 
  tags: string[] = [], 
  index: number = 0,
  recipe?: any // Optional recipe object with stored icon data
): IconConfig => {
  // If recipe has stored icon data, use it (preferred)
  if (recipe?.icon_name && recipe?.icon_library) {
    return {
      library: recipe.icon_library as IconLibrary,
      name: recipe.icon_name,
      backgroundColor: recipe.icon_bg_color || '#F3F4F6',
      iconColor: recipe.icon_color || '#9CA3AF',
    };
  }
  
  // Otherwise, compute icon from title/tags (fallback for old recipes)
  const searchText = `${title} ${tags.join(' ')}`.toLowerCase();
  
  // Priority order: more specific categories first
  const priorityOrder = [
    // Most specific
    'sushi', 'ramen', 'pizza', 'cake', 'cookie', 'iceCream', 'turkey', 'chicken', 'beef', 'pork',
    'shrimp', 'curry', 'friedRice', 'coffee', 'sandwich', 'eggs', 'pancakes',
    // Medium specificity
    'breakfast', 'pasta', 'salad', 'seafood', 'soup', 'bread', 'dessert', 'mexican', 'italian',
    // Less specific
    'snack', 'drink', 'vegetable', 'fruit',
  ];
  
  // Check prioritized categories first for better matches
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
  
  // Fallback to indexed default
  const defaultConfig = DEFAULT_ICONS[index % DEFAULT_ICONS.length];
  return defaultConfig;
};

/**
 * Get difficulty level text and color based on recipe data
 */
export const getDifficultyLevel = (recipe: any) => {
  const time = recipe.time || recipe.prep_time || recipe.cooking_time || 0;
  
  if (time <= 15) return { text: 'Easy', color: '#10B981' };
  if (time <= 45) return { text: 'Medium', color: '#F59E0B' };
  return { text: 'Hard', color: '#EF4444' };
};