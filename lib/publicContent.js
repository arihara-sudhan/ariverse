export const PUBLIC_CONTENT_STATUS = Object.freeze({
  FOUND: 'found',
  MISSING: 'missing',
  UNAVAILABLE: 'unavailable',
});

export async function loadPublicContent(loader) {
  try {
    const value = await loader();
    return {
      status: value == null ? PUBLIC_CONTENT_STATUS.MISSING : PUBLIC_CONTENT_STATUS.FOUND,
      value: value ?? null,
    };
  } catch (error) {
    return {
      status: PUBLIC_CONTENT_STATUS.UNAVAILABLE,
      error,
      value: null,
    };
  }
}

export function throwIfPublicContentUnavailable(result) {
  if (result?.status === PUBLIC_CONTENT_STATUS.UNAVAILABLE) {
    throw result.error;
  }
  return result;
}
