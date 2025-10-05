import Store from 'electron-store';

export const store = new Store();

export const getStore = (key) => {
  // @ts-ignore
  return store.get(key);
}

export const setStore = (key, value) => {
  // @ts-ignore
  return store.set(key, value);
}
