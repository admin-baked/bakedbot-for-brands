export function isProductionBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

export function getRuntimeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return String(error);
}

export function isFirestoreUnavailableError(error: unknown): boolean {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const numericCode =
    typeof candidate?.code === 'number'
      ? candidate.code
      : typeof candidate?.code === 'string' && /^\d+$/.test(candidate.code)
        ? Number(candidate.code)
        : null;
  const message = getRuntimeErrorMessage(error).toLowerCase();

  return (
    numericCode === 14 ||
    message.includes('unavailable') ||
    message.includes('name resolution failed') ||
    message.includes('firestore.googleapis.com')
  );
}
