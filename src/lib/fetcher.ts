export async function fetcher<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.text();
    console.error(`Error fetching ${url}:`, err);
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText} - ${err}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
