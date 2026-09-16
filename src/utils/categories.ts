import { Category } from '../types';

/**
 * Checks whether a category identifier/name refers to "All" or "All Items".
 */
export const isAllCategory = (name?: string | null): boolean => {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  return normalized === 'all items' || normalized === 'all';
};

/**
 * Guarantees that "All Items" is always present and is strictly the FIRST item in the category list.
 * If "All Items" exists somewhere in the array, it is moved to index 0.
 * If it does not exist, it is created and prepended at index 0.
 */
export function ensureAllItemsFirst<T extends Category | string>(categories: T[]): T[] {
  if (!Array.isArray(categories) || categories.length === 0) {
    return [{ id: 'cat-all', name: 'All Items' } as unknown as T];
  }

  const list = [...categories];
  const allIndex = list.findIndex((cat) => {
    const name = typeof cat === 'string' ? cat : cat?.name;
    return isAllCategory(name);
  });

  if (allIndex > 0) {
    // Found in the list, move to first position
    const [allCat] = list.splice(allIndex, 1);
    list.unshift(allCat);
  } else if (allIndex === -1) {
    // Not found, prepend "All Items"
    const firstCat = list[0];
    const isStringType = typeof firstCat === 'string';
    const allItem = isStringType
      ? ('All Items' as unknown as T)
      : ({ id: 'cat-all', name: 'All Items' } as unknown as T);
    list.unshift(allItem);
  }

  return list;
}
