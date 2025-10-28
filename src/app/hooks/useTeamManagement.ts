import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { listStaffMembers, type StaffMember } from "../../lib/users";
import type { SupportedLanguage } from "../../locales/language";
import type { AuthenticatedAppCopy } from "../copy/authenticatedAppCopy";

type TeamCopy = AuthenticatedAppCopy[SupportedLanguage]["teamPage"];

type UseTeamManagementOptions = {
  teamCopy: TeamCopy;
  locale: string;
};

export function useTeamManagement({ teamCopy, locale }: UseTeamManagementOptions) {
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamFormVisible, setTeamFormVisible] = useState(false);

  const sortTeamMembers = useCallback(
    (list: StaffMember[]) =>
      [...list].sort((a, b) => {
        const nameA = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
        const nameB = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
        if (!nameA && !nameB) {
          return 0;
        }
        if (!nameA) {
          return 1;
        }
        if (!nameB) {
          return -1;
        }
        return nameA.localeCompare(nameB, locale, { sensitivity: "base" });
      }),
    [locale],
  );

  const loadTeamMembers = useCallback(async () => {
    setTeamLoading(true);
    try {
      const rows = await listStaffMembers();
      setTeamMembers(sortTeamMembers(rows));
    } catch (error: any) {
      console.error(error);
      Alert.alert(teamCopy.alerts.loadTitle, error?.message ?? String(error));
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [sortTeamMembers, teamCopy.alerts.loadTitle]);

  useEffect(() => {
    setTeamMembers((prev) => sortTeamMembers(prev));
  }, [sortTeamMembers]);

  const handleOpenTeamForm = useCallback(() => {
    setTeamFormVisible(true);
  }, []);

  const handleCloseTeamForm = useCallback(() => {
    setTeamFormVisible(false);
  }, []);

  return {
    teamMembers,
    teamLoading,
    teamFormVisible,
    loadTeamMembers,
    handleOpenTeamForm,
    handleCloseTeamForm,
  };
}

export type UseTeamManagementReturn = ReturnType<typeof useTeamManagement>;
