import type { City } from "@/features/location/types";

export type CityTransitionStatus = "idle" | "persisting" | "syncing" | "failed";

export type CityTransitionState = Readonly<{
  committedCity: City | null;
  pendingCity: City | null;
  status: CityTransitionStatus;
  generation: number;
  error: boolean;
}>;

export type CityTransitionAction =
  | Readonly<{ type: "selection-started"; city: City; generation: number }>
  | Readonly<{ type: "persistence-succeeded"; generation: number }>
  | Readonly<{ type: "persistence-failed"; generation: number }>
  | Readonly<{ type: "server-city-received"; city: City | null }>;

export function createCityTransitionState(
  serverCity: City | null,
): CityTransitionState {
  return {
    committedCity: serverCity,
    pendingCity: null,
    status: "idle",
    generation: 0,
    error: false,
  };
}

function sameCity(left: City | null, right: City | null) {
  return left?.id === right?.id;
}

export function canStartCityTransition(
  state: CityTransitionState,
  city: City,
  hasActiveGeneration: boolean,
) {
  return (
    !hasActiveGeneration &&
    state.status !== "persisting" &&
    state.status !== "syncing" &&
    !sameCity(state.committedCity, city)
  );
}

export function shouldShowStorefrontSyncVeil(status: CityTransitionStatus) {
  return status === "syncing";
}

export function isBrowsingCityTransitionActive(status: CityTransitionStatus) {
  return status === "persisting" || status === "syncing";
}

export function cityTransitionReducer(
  state: CityTransitionState,
  action: CityTransitionAction,
): CityTransitionState {
  switch (action.type) {
    case "selection-started":
      if (
        state.status === "persisting" ||
        state.status === "syncing" ||
        sameCity(state.committedCity, action.city)
      ) {
        return state;
      }
      return {
        ...state,
        pendingCity: action.city,
        status: "persisting",
        generation: action.generation,
        error: false,
      };

    case "persistence-succeeded":
      if (
        state.status !== "persisting" ||
        state.generation !== action.generation ||
        state.pendingCity === null
      ) {
        return state;
      }
      return {
        ...state,
        committedCity: state.pendingCity,
        status: "syncing",
      };

    case "persistence-failed":
      if (
        state.status !== "persisting" ||
        state.generation !== action.generation
      ) {
        return state;
      }
      return {
        ...state,
        pendingCity: null,
        status: "failed",
        error: true,
      };

    case "server-city-received":
      if (state.status === "persisting") return state;
      if (state.status === "syncing") {
        if (!sameCity(state.pendingCity, action.city)) return state;
        return {
          ...state,
          committedCity: action.city,
          pendingCity: null,
          status: "idle",
          error: false,
        };
      }
      if (sameCity(state.committedCity, action.city)) return state;
      return {
        ...state,
        committedCity: action.city,
        pendingCity: null,
        status: "idle",
        error: false,
      };
  }
}

