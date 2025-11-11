// Simple global store for recipe editing
let currentEditRecipe: any = null;

export const recipeStore = {
  setEditRecipe: (recipe: any) => {
    currentEditRecipe = recipe;
  },
  
  getEditRecipe: () => {
    return currentEditRecipe;
  },
  
  clearEditRecipe: () => {
    currentEditRecipe = null;
  }
}; 