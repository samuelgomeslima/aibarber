import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

import type { Service, ServicePackage } from "../../lib/domain";
import { deleteService, listServices } from "../../lib/services";
import { deleteServicePackage, listServicePackages } from "../../lib/servicePackages";
import type { SupportedLanguage } from "../../locales/language";
import type { AuthenticatedAppCopy } from "../copy/authenticatedAppCopy";

type ServicesCopy = AuthenticatedAppCopy[SupportedLanguage]["servicesPage"];
type PackagesCopy = AuthenticatedAppCopy[SupportedLanguage]["packagesPage"];

type UseServicesManagementOptions = {
  servicesCopy: ServicesCopy;
  packagesCopy: PackagesCopy;
  getServiceDisplayName: (service: Service) => string;
};

export function useServicesManagement({
  servicesCopy,
  packagesCopy,
  getServiceDisplayName,
}: UseServicesManagementOptions) {
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceFormVisible, setServiceFormVisible] = useState(false);
  const [serviceFormMode, setServiceFormMode] = useState<"create" | "edit">("create");
  const [serviceBeingEdited, setServiceBeingEdited] = useState<Service | null>(null);
  const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);
  const [servicePackagesLoading, setServicePackagesLoading] = useState(false);
  const servicePackagesRequestId = useRef(0);
  const [packageFormVisible, setPackageFormVisible] = useState(false);
  const [packageFormMode, setPackageFormMode] = useState<"create" | "edit">("create");
  const [packageBeingEdited, setPackageBeingEdited] = useState<ServicePackage | null>(null);

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const rows = await listServices();
      setServices(rows);
      setSelectedServiceId((prev) => {
        if (prev && rows.some((service) => service.id === prev)) {
          return prev;
        }
        return rows[0]?.id ?? null;
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert(servicesCopy.alerts.loadTitle, error?.message ?? String(error));
      setServices([]);
      setSelectedServiceId(null);
    } finally {
      setServicesLoading(false);
    }
  }, [servicesCopy.alerts.loadTitle]);

  const handleServiceFormClose = useCallback(() => {
    setServiceFormVisible(false);
    setServiceBeingEdited(null);
    setServiceFormMode("create");
  }, []);

  const handleOpenCreateService = useCallback(() => {
    setServiceFormMode("create");
    setServiceBeingEdited(null);
    setServiceFormVisible(true);
  }, []);

  const handleOpenEditService = useCallback((service: Service) => {
    setServiceFormMode("edit");
    setServiceBeingEdited(service);
    setServiceFormVisible(true);
  }, []);

  const handleServiceCreated = useCallback(
    (service: Service) => {
      setSelectedServiceId((prev) => prev ?? service.id);
      handleServiceFormClose();
      void loadServices();
    },
    [handleServiceFormClose, loadServices],
  );

  const handleServiceUpdated = useCallback(
    (service: Service) => {
      setSelectedServiceId((prev) => prev ?? service.id);
      handleServiceFormClose();
      void loadServices();
    },
    [handleServiceFormClose, loadServices],
  );

  const handleDeleteService = useCallback(
    (service: Service) => {
      if (!service?.id) {
        return;
      }

      const displayName = getServiceDisplayName(service);
      const confirmPrompt = `${servicesCopy.alerts.deleteTitle}\n\n${servicesCopy.alerts.deleteMessage(displayName)}`;

      const executeDelete = async () => {
        try {
          await deleteService(service.id);
          setSelectedServiceId((prev) => (prev === service.id ? null : prev));
          void loadServices();
        } catch (error: any) {
          console.error(error);
          Alert.alert(servicesCopy.alerts.deleteErrorTitle, error?.message ?? String(error));
        }
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const confirmed = window.confirm(confirmPrompt);
        if (confirmed) {
          void executeDelete();
        }
        return;
      }

      Alert.alert(servicesCopy.alerts.deleteTitle, servicesCopy.alerts.deleteMessage(displayName), [
        { text: servicesCopy.alerts.cancel, style: "cancel" },
        {
          text: servicesCopy.alerts.confirm,
          style: "destructive",
          onPress: () => void executeDelete(),
        },
      ]);
    },
    [getServiceDisplayName, loadServices, servicesCopy],
  );

  const loadServicePackages = useCallback(async () => {
    const requestId = ++servicePackagesRequestId.current;
    setServicePackagesLoading(true);
    try {
      const rows = await listServicePackages();
      if (servicePackagesRequestId.current === requestId) {
        setServicePackages(rows);
      }
    } catch (error: any) {
      console.error(error);
      if (servicePackagesRequestId.current === requestId) {
        Alert.alert(packagesCopy.alerts.loadTitle, error?.message ?? String(error));
        setServicePackages([]);
      }
    } finally {
      if (servicePackagesRequestId.current === requestId) {
        setServicePackagesLoading(false);
      }
    }
  }, [packagesCopy.alerts.loadTitle]);

  const handlePackageFormClose = useCallback(() => {
    setPackageFormVisible(false);
    setPackageBeingEdited(null);
    setPackageFormMode("create");
  }, []);

  const handleOpenCreatePackage = useCallback(() => {
    setPackageFormMode("create");
    setPackageBeingEdited(null);
    setPackageFormVisible(true);
  }, []);

  const handleOpenEditPackage = useCallback((servicePackage: ServicePackage) => {
    setPackageFormMode("edit");
    setPackageBeingEdited(servicePackage);
    setPackageFormVisible(true);
  }, []);

  const handlePackageCreated = useCallback(() => {
    handlePackageFormClose();
    void loadServicePackages();
  }, [handlePackageFormClose, loadServicePackages]);

  const handlePackageUpdated = useCallback(() => {
    handlePackageFormClose();
    void loadServicePackages();
  }, [handlePackageFormClose, loadServicePackages]);

  const handleDeletePackage = useCallback(
    (servicePackage: ServicePackage) => {
      if (!servicePackage?.id) {
        return;
      }

      const executeDelete = async () => {
        try {
          await deleteServicePackage(servicePackage.id);
          void loadServicePackages();
        } catch (error: any) {
          console.error(error);
          Alert.alert(packagesCopy.alerts.deleteErrorTitle, error?.message ?? String(error));
        }
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const confirmed = window.confirm(
          `${packagesCopy.alerts.deleteTitle}\n\n${packagesCopy.alerts.deleteMessage(servicePackage.name)}`,
        );
        if (confirmed) {
          void executeDelete();
        }
        return;
      }

      Alert.alert(packagesCopy.alerts.deleteTitle, packagesCopy.alerts.deleteMessage(servicePackage.name), [
        { text: packagesCopy.alerts.cancel, style: "cancel" },
        {
          text: packagesCopy.alerts.confirm,
          style: "destructive",
          onPress: () => void executeDelete(),
        },
      ]);
    },
    [loadServicePackages, packagesCopy],
  );

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  useEffect(() => {
    void loadServicePackages();
  }, [loadServicePackages]);

  return {
    services,
    servicesLoading,
    selectedServiceId,
    setSelectedServiceId,
    serviceFormVisible,
    serviceFormMode,
    serviceBeingEdited,
    loadServices,
    handleServiceFormClose,
    handleOpenCreateService,
    handleOpenEditService,
    handleServiceCreated,
    handleServiceUpdated,
    handleDeleteService,
    servicePackages,
    servicePackagesLoading,
    loadServicePackages,
    packageFormVisible,
    packageFormMode,
    packageBeingEdited,
    handlePackageFormClose,
    handleOpenCreatePackage,
    handleOpenEditPackage,
    handlePackageCreated,
    handlePackageUpdated,
    handleDeletePackage,
  };
}

export type UseServicesManagementReturn = ReturnType<typeof useServicesManagement>;
