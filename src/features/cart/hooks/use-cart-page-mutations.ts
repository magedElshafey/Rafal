"use client";

import { isCancelledError, useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { clearCart } from "@/features/cart/actions/clear-cart";
import { removeCartLine } from "@/features/cart/actions/remove-cart-line";
import { updateCartLine } from "@/features/cart/actions/update-cart-line";
import {
  currentCartQueryKey,
  currentCartQueryOptions,
  setCurrentCartQueryData,
  updateCurrentCartQueryData,
  registerCartWriteOverlay,
  currentCartDisplayData,
} from "@/features/cart/api/cart-query";
import {
  cartMutationKey,
  cartMutationScope,
  cartMutationFilters,
} from "@/features/cart/api/cart-mutation";
import type {
  CartMutationError,
  CartSnapshot,
} from "@/features/cart/types/cart.types";

type CartPageMutationOptions = {
  locale: Locale;
  maxQuantity: number;
  onError: (error: CartMutationError) => void;
  selectedCityId: number | null;
};

type PendingQuantity = {
  desired: number;
  promise: Promise<boolean> | null;
  availability: CartSnapshot["lines"][number]["availability"];
};

const serviceUnavailable: CartMutationError = {
  code: "service-unavailable",
};

function withOptimisticQuantity(
  cart: CartSnapshot,
  lineId: string,
  quantity: number,
): CartSnapshot {
  const currentLine = cart.lines.find((line) => line.id === lineId);
  if (!currentLine || currentLine.quantity === quantity) return cart;

  return {
    ...cart,
    lines: cart.lines.map((line) => {
      if (line.id !== lineId) return line;
      return { ...line, quantity };
    }),
    summary: {
      ...cart.summary,
      totalQuantity:
        cart.summary.totalQuantity + quantity - currentLine.quantity,
    },
  };
}

function withoutLine(cart: CartSnapshot, lineId: string): CartSnapshot {
  const removedLine = cart.lines.find((line) => line.id === lineId);
  if (!removedLine) return cart;

  return {
    ...cart,
    lines: cart.lines.filter((line) => line.id !== lineId),
    summary: {
      ...cart.summary,
      lineCount: Math.max(0, cart.summary.lineCount - 1),
      totalQuantity: Math.max(
        0,
        cart.summary.totalQuantity - removedLine.quantity,
      ),
    },
  };
}

function visuallyEmpty(cart: CartSnapshot): CartSnapshot {
  return {
    ...cart,
    lines: [],
    summary: { ...cart.summary, lineCount: 0, totalQuantity: 0 },
  };
}

export function useCartPageMutations({
  locale,
  maxQuantity,
  onError,
  selectedCityId,
}: CartPageMutationOptions) {
  const queryClient = useQueryClient();
  const onErrorRef = useRef(onError);
  const quantitiesRef = useRef(new Map<string, PendingQuantity>());
  const operationsRef = useRef(new Set<Promise<boolean>>());
  const removedLineIdsRef = useRef(new Set<string>());
  const clearPendingRef = useRef(false);
  const failuresRef = useRef(0);
  const revisionRef = useRef(0);
  const dirtyRef = useRef(false);
  const [projectionDirty, setProjectionDirty] = useState(false);
  const [pendingOperationCount, setPendingOperationCount] = useState(0);
  const [attemptedProjection, setAttemptedProjection] = useState("");
  const [revision, setRevision] = useState(0);
  const [projectionPending, setProjectionPending] = useState(false);
  const mutationCount = useIsMutating(cartMutationFilters);
  const attemptedRef = useRef("");
  const projectionRequestRef = useRef(0);
  const activeCityRef = useRef(selectedCityId);
  const notify = useCallback(() => setRevision(++revisionRef.current), []);
  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
    setProjectionDirty(dirty);
  }, []);
  const trackOperation = useCallback((promise: Promise<boolean>, onSettled?: () => void) => {
    operationsRef.current.add(promise);
    setPendingOperationCount(operationsRef.current.size);
    const settle = () => {
      operationsRef.current.delete(promise);
      setPendingOperationCount(operationsRef.current.size);
      onSettled?.();
      notify();
    };
    void promise.then(settle, settle);
  }, [notify]);
  const markDirty = useCallback(() => {
    setDirty(true);
    notify();
  }, [notify, setDirty]);
  const reportFailure = useCallback((error: CartMutationError) => {
    failuresRef.current += 1;
    onErrorRef.current(error);
  }, []);
  const cancelProjection = useCallback(() => queryClient.cancelQueries({
    queryKey: currentCartQueryKey(locale, selectedCityId), exact: true,
  }), [locale, queryClient, selectedCityId]);

  useEffect(() => {
    if (activeCityRef.current !== selectedCityId) {
      activeCityRef.current = selectedCityId;
      markDirty();
    }
  }, [markDirty, selectedCityId]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const updateMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateCartLine(lineId, quantity, locale),
    retry: false,
  });
  const removeMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: (lineId: string) => removeCartLine(lineId, locale),
    retry: false,
  });
  const clearMutation = useMutation({
    mutationKey: cartMutationKey,
    scope: cartMutationScope,
    mutationFn: () => clearCart(locale),
    retry: false,
  });

  const overlayPendingIntent = useCallback(
    (canonical: CartSnapshot): CartSnapshot => {
      if (clearPendingRef.current) return visuallyEmpty(canonical);

      let next = canonical;
      for (const lineId of removedLineIdsRef.current) {
        next = withoutLine(next, lineId);
      }
      for (const [lineId, pending] of quantitiesRef.current) {
        if (!removedLineIdsRef.current.has(lineId)) {
          next = withOptimisticQuantity(next, lineId, pending.desired);
          if (pending.availability) next = {
            ...next,
            lines: next.lines.map((line) => line.id === lineId
              ? { ...line, availability: pending.availability } : line),
          };
        }
      }
      return next;
    },
    [],
  );

  useEffect(() => registerCartWriteOverlay(queryClient, locale, {
    overlay: overlayPendingIntent,
    canonicalChanged: () => {
      void cancelProjection();
      markDirty();
    },
  }), [cancelProjection, locale, markDirty, overlayPendingIntent, queryClient]);

  const applyCanonicalCart = useCallback(
    (canonical: CartSnapshot) => {
      setCurrentCartQueryData(
        queryClient,
        locale,
        canonical,
      );
    },
    [locale, queryClient],
  );

  const refreshProjection = useCallback(async () => {
    const startedRevision = revisionRef.current;
    await cancelProjection();
    await queryClient.invalidateQueries({
      exact: true,
      queryKey: currentCartQueryKey(locale, selectedCityId),
      refetchType: "none",
    });
    const projected = await queryClient.fetchQuery(
      currentCartQueryOptions(locale, selectedCityId),
    );
    if (activeCityRef.current === selectedCityId && startedRevision === revisionRef.current && operationsRef.current.size === 0 &&
        queryClient.isMutating(cartMutationFilters) === 0) {
      setDirty(false);
    }
    return projected;
  }, [cancelProjection, locale, queryClient, selectedCityId, setDirty]);

  useEffect(() => {
    const attempt = `${selectedCityId}:${revision}`;
    if (!dirtyRef.current || mutationCount > 0 || operationsRef.current.size > 0 || attemptedRef.current === attempt) return;
    attemptedRef.current = attempt;
    setAttemptedProjection(attempt);
    setProjectionPending(true);
    const request = ++projectionRequestRef.current;
    void refreshProjection().catch((error: unknown) => {
      if (!isCancelledError(error) && !(error instanceof DOMException && error.name === "AbortError")) {
        reportFailure(serviceUnavailable);
      }
    }).finally(() => {
      if (projectionRequestRef.current === request) setProjectionPending(false);
    });
  }, [mutationCount, refreshProjection, reportFailure, revision, selectedCityId]);

  const recoverAuthoritativeCart = useCallback(async () => {
    try {
      await refreshProjection();
    } catch {
      await queryClient.invalidateQueries({
        queryKey: currentCartQueryKey(locale, selectedCityId),
        exact: true,
        refetchType: "none",
      });
    }
  }, [locale, queryClient, refreshProjection, selectedCityId]);

  const syncLine = useCallback(
    (lineId: string) => {
      const pending = quantitiesRef.current.get(lineId);
      if (!pending || pending.promise) {
        return pending?.promise ?? Promise.resolve(true);
      }

      const promise = (async () => {
        let succeeded = true;
        while (
          !clearPendingRef.current &&
          !removedLineIdsRef.current.has(lineId)
        ) {
          const current = quantitiesRef.current.get(lineId);
          if (!current) return succeeded;
          const sentQuantity = current.desired;

          try {
            const result = await updateMutation.mutateAsync({
              lineId,
              quantity: sentQuantity,
            });
            if (!result.ok) {
              succeeded = false;
              reportFailure(result.error);
              if (quantitiesRef.current.get(lineId)?.desired !== sentQuantity &&
                  quantitiesRef.current.has(lineId) && !clearPendingRef.current &&
                  !removedLineIdsRef.current.has(lineId)) {
                // A newer absolute intent is a new operation, not a retry of the rejected quantity.
                continue;
              }
              quantitiesRef.current.delete(lineId);
              await recoverAuthoritativeCart();
              return false;
            }

            const latest = quantitiesRef.current.get(lineId);
            if (
              !latest ||
              clearPendingRef.current ||
              removedLineIdsRef.current.has(lineId)
            ) {
              applyCanonicalCart(result.cart);
              return succeeded;
            }

            if (latest.desired === sentQuantity) {
              quantitiesRef.current.delete(lineId);
              applyCanonicalCart(result.cart);
              return succeeded;
            }

            applyCanonicalCart(result.cart);
          } catch {
            succeeded = false;
            reportFailure(serviceUnavailable);
            const latest = quantitiesRef.current.get(lineId);
            if (latest && latest.desired !== sentQuantity && !clearPendingRef.current &&
                !removedLineIdsRef.current.has(lineId)) continue;
            quantitiesRef.current.delete(lineId);
            await recoverAuthoritativeCart();
            return false;
          }
        }
        return succeeded;
      })();

      pending.promise = promise;
      trackOperation(promise, () => {
        const latest = quantitiesRef.current.get(lineId);
        if (latest?.promise === promise) latest.promise = null;
      });
      return promise;
    },
    [
      applyCanonicalCart,
      recoverAuthoritativeCart,
      updateMutation,
      trackOperation,
      reportFailure,
    ],
  );

  const changeQuantity = useCallback(
    (lineId: string, delta: -1 | 1) => {
      if (clearPendingRef.current || removedLineIdsRef.current.has(lineId)) {
        return;
      }

      const cart = currentCartDisplayData(queryClient, locale, selectedCityId);
      const line = cart?.lines.find((candidate) => candidate.id === lineId);
      if (!line) return;
      const quantity = (quantitiesRef.current.get(lineId)?.desired ?? line.quantity) + delta;
      if (quantity < 1 || (delta > 0 && quantity > maxQuantity)) return;
      // Canonical responses omit availability; retain the selected city's last
      // confirmed projection as a control ceiling, never as Checkout eligibility.
      const projectedLine = queryClient.getQueryData<CartSnapshot>(
        currentCartQueryKey(locale, selectedCityId),
      )?.lines.find((candidate) => candidate.id === lineId);
      const availability = projectedLine?.availability ?? line.availability;
      if (selectedCityId !== null && availability?.cityId === selectedCityId) {
        if (!availability.inStock || availability.available <= 0) return;
        if (delta > 0 && quantity > availability.available) return;
      }

      // TanStack cancels/reverts synchronously before returning its completion promise.
      void cancelProjection();
      markDirty();

      const existing = quantitiesRef.current.get(lineId);
      if (existing) existing.desired = quantity;
      else {
        quantitiesRef.current.set(lineId, { desired: quantity, promise: null, availability });
      }

      updateCurrentCartQueryData(
        queryClient,
        locale,
        selectedCityId,
        overlayPendingIntent,
      );
      void syncLine(lineId);
    }, [cancelProjection, locale, markDirty, maxQuantity, overlayPendingIntent, queryClient, selectedCityId, syncLine],
  );

  const removeLine = useCallback(
    (lineId: string) => {
      if (clearPendingRef.current || removedLineIdsRef.current.has(lineId)) {
        return;
      }

      void cancelProjection();
      markDirty();
      quantitiesRef.current.delete(lineId);
      removedLineIdsRef.current.add(lineId);
      updateCurrentCartQueryData(
        queryClient,
        locale,
        selectedCityId,
        overlayPendingIntent,
      );

      const promise = (async () => {
        try {
          const result = await removeMutation.mutateAsync(lineId);
          removedLineIdsRef.current.delete(lineId);
          if (result.ok) {
            applyCanonicalCart(result.cart);
          } else {
            reportFailure(result.error);
            await recoverAuthoritativeCart();
          }
          return result.ok;
        } catch {
          removedLineIdsRef.current.delete(lineId);
          reportFailure(serviceUnavailable);
          await recoverAuthoritativeCart();
          return false;
        }
      })();
      trackOperation(promise);
    },
    [
      applyCanonicalCart,
      locale,
      queryClient,
      recoverAuthoritativeCart,
      removeMutation,
      selectedCityId,
      cancelProjection,
      markDirty,
      trackOperation,
      reportFailure,
      overlayPendingIntent,
    ],
  );

  const clear = useCallback(() => {
    if (clearPendingRef.current) return;

    void cancelProjection();
    markDirty();
    clearPendingRef.current = true;
    quantitiesRef.current.clear();
    removedLineIdsRef.current.clear();
    updateCurrentCartQueryData(
      queryClient,
      locale,
      selectedCityId,
      visuallyEmpty,
    );

    const promise = (async () => {
      try {
        const result = await clearMutation.mutateAsync();
        clearPendingRef.current = false;
        if (result.ok) applyCanonicalCart(result.cart);
        else {
          reportFailure(result.error);
          await recoverAuthoritativeCart();
        }
        return result.ok;
      } catch {
        clearPendingRef.current = false;
        reportFailure(serviceUnavailable);
        await recoverAuthoritativeCart();
        return false;
      }
    })();
    trackOperation(promise);
  }, [
    applyCanonicalCart,
    clearMutation,
    locale,
    queryClient,
    recoverAuthoritativeCart,
    selectedCityId,
    cancelProjection,
    markDirty,
    trackOperation,
    reportFailure,
  ]);

  const flushPendingMutations = useCallback(async () => {
    const failuresBefore = failuresRef.current;
    let rejected = false;
    while (true) {
      const pending = [...operationsRef.current];
      if (pending.length === 0) return { ok: !rejected && failuresBefore === failuresRef.current };
      const results = await Promise.allSettled(pending);
      rejected ||= results.some((result) => result.status === "rejected" || !result.value);
    }
  }, []);

  return {
    changeQuantity,
    clear,
    flushPendingMutations,
    refreshProjection,
    removeLine,
    projectionDirty,
    projectionPending: projectionPending || pendingOperationCount > 0 || mutationCount > 0 ||
      (projectionDirty && attemptedProjection !== `${selectedCityId}:${revision}`),
    canNavigate: () => !dirtyRef.current && operationsRef.current.size === 0 && queryClient.isMutating(cartMutationFilters) === 0,
  };
}
