import { useQuery } from "@tanstack/react-query";
import { loadConfig } from "../config";

interface StorageConfig {
  storageGatewayUrl: string;
  backendCanisterId: string;
  projectId: string;
  bucketName: string;
}

const FALLBACK: StorageConfig = {
  storageGatewayUrl: "https://blob.caffeine.ai",
  backendCanisterId: "",
  projectId: "",
  bucketName: "default-bucket",
};

export function useStorageConfig(): StorageConfig {
  const { data } = useQuery<StorageConfig>({
    queryKey: ["storageConfig"],
    queryFn: async () => {
      const c = await loadConfig();
      return {
        storageGatewayUrl: c.storage_gateway_url,
        backendCanisterId: c.backend_canister_id,
        projectId: c.project_id,
        bucketName: c.bucket_name,
      };
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
  return data ?? FALLBACK;
}
