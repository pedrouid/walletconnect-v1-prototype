export function setLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  return true;
}

export function getLocal(key) {
  const data = JSON.parse(localStorage.getItem(key));
  return data;
}

export function removeLocal(key) {
  localStorage.removeItem(key);
  return true;
}
