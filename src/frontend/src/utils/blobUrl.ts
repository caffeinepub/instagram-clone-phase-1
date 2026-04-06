/**
 * Resolves a blob key (sha256: hash or direct URL) to a displayable image URL.
 * Uses the storage gateway URL pattern from the StorageClient.
 */
export function resolveBlobUrl(
  blobKey: string,
  storageGatewayUrl: string,
  backendCanisterId: string,
  projectId: string,
): string | null {
  if (!blobKey) return null;

  // Direct URLs (blob:, data:, http)
  if (
    blobKey.startsWith("blob:") ||
    blobKey.startsWith("data:") ||
    blobKey.startsWith("http")
  ) {
    return blobKey;
  }

  // sha256: hash — construct gateway URL
  if (blobKey.startsWith("sha256:")) {
    return `${storageGatewayUrl}/v1/blob/?blob_hash=${encodeURIComponent(blobKey)}&owner_id=${encodeURIComponent(backendCanisterId)}&project_id=${encodeURIComponent(projectId)}`;
  }

  return null;
}
