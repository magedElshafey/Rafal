"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

import { setGuestCityId } from "@/features/location/actions/set-guest-city";
import {
  canStartCityTransition,
  cityTransitionReducer,
  createCityTransitionState,
  isBrowsingCityTransitionActive,
  type CityTransitionStatus,
} from "@/features/location/city-transition-state";
import type { City } from "@/features/location/types";
import { useRouter } from "@/i18n/navigation";

export type CityTransitionCopy = Readonly<{
  changing: string;
  syncing: string;
  failed: string;
  failedWithoutCommittedCity: string;
}>;

type BrowsingCityContextValue = Readonly<{
  committedCity: City | null;
  pendingCity: City | null;
  status: CityTransitionStatus;
  error: boolean;
  isChanging: boolean;
  selectCity: (city: City) => boolean;
  statusMessage: string;
}>;

const BrowsingCityContext = createContext<BrowsingCityContextValue | null>(null);

function formatCityMessage(template: string, city: City | null) {
  return template.replace("{city}", city?.name ?? "");
}

export function BrowsingCityProvider({
  children,
  copy,
  serverCity,
}: {
  children: ReactNode;
  copy: CityTransitionCopy;
  serverCity: City | null;
}) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    cityTransitionReducer,
    serverCity,
    createCityTransitionState,
  );
  const generationRef = useRef(0);
  const activeGenerationRef = useRef<number | null>(null);

  useEffect(() => {
    dispatch({ type: "server-city-received", city: serverCity });
    if (
      state.status === "syncing" &&
      state.pendingCity?.id === serverCity?.id
    ) {
      activeGenerationRef.current = null;
    }
  }, [serverCity, state.pendingCity?.id, state.status]);

  const selectCity = useCallback(
    (city: City) => {
      if (!canStartCityTransition(
        state,
        city,
        activeGenerationRef.current !== null,
      )) {
        return false;
      }

      const generation = ++generationRef.current;
      activeGenerationRef.current = generation;
      dispatch({ type: "selection-started", city, generation });

      void setGuestCityId(city.id).then(
        () => {
          if (activeGenerationRef.current !== generation) return;
          dispatch({ type: "persistence-succeeded", generation });
          router.refresh();
        },
        () => {
          if (activeGenerationRef.current !== generation) return;
          activeGenerationRef.current = null;
          dispatch({ type: "persistence-failed", generation });
        },
      );
      return true;
    },
    [router, state],
  );

  const statusMessage =
    state.status === "persisting"
      ? formatCityMessage(copy.changing, state.pendingCity)
      : state.status === "syncing"
        ? formatCityMessage(copy.syncing, state.committedCity)
        : state.status === "failed"
          ? state.committedCity === null
            ? copy.failedWithoutCommittedCity
            : formatCityMessage(copy.failed, state.committedCity)
          : "";
  const value = useMemo<BrowsingCityContextValue>(
    () => ({
      committedCity: state.committedCity,
      pendingCity: state.pendingCity,
      status: state.status,
      error: state.error,
      isChanging: isBrowsingCityTransitionActive(state.status),
      selectCity,
      statusMessage,
    }),
    [selectCity, state, statusMessage],
  );

  return (
    <BrowsingCityContext.Provider value={value}>
      {children}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </p>
    </BrowsingCityContext.Provider>
  );
}

export function useBrowsingCity() {
  const context = useContext(BrowsingCityContext);
  if (!context) {
    throw new Error("useBrowsingCity must be used within BrowsingCityProvider.");
  }
  return context;
}

