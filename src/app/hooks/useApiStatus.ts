import { useCallback, useEffect, useRef, useState } from "react";

import { checkApiStatuses, type ApiServiceStatus } from "../../lib/apiStatus";

export function useApiStatus() {
  const [apiStatuses, setApiStatuses] = useState<ApiServiceStatus[]>([]);
  const [apiStatusLoading, setApiStatusLoading] = useState(false);
  const [apiStatusError, setApiStatusError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchApiStatuses = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setApiStatusLoading(true);
    setApiStatusError(null);
    try {
      const results = await checkApiStatuses();
      if (requestIdRef.current === requestId) {
        setApiStatuses(results);
      }
    } catch (error: any) {
      if (requestIdRef.current === requestId) {
        setApiStatuses([]);
        setApiStatusError(error?.message ?? String(error));
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setApiStatusLoading(false);
      }
    }
  }, []);

  const cancelPendingRequests = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  useEffect(() => {
    return () => {
      cancelPendingRequests();
    };
  }, [cancelPendingRequests]);

  return {
    apiStatuses,
    apiStatusLoading,
    apiStatusError,
    fetchApiStatuses,
  };
}

export type UseApiStatusReturn = ReturnType<typeof useApiStatus>;
