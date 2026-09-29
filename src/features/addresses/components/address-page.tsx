"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import type { Locale } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PlusIcon } from "@/components/ui/icons";
import { LoadMoreButton } from "@/components/ui/load-more-button";
import { ConfirmDialog } from "@/components/ui/rafal-modal";
import { deleteAddress } from "@/features/addresses/actions/address-actions";
import {
  AddressListRequestError,
  addressInfiniteQueryOptions,
  addressListQueryKey,
} from "@/features/addresses/api/address-query";
import {
  AddressCard,
  type AddressCardCopy,
} from "@/features/addresses/components/address-card";
import {
  AddressForm,
  type AddressFormCopy,
} from "@/features/addresses/components/address-form";
import { AddressPageSkeleton } from "@/features/addresses/components/address-page-skeleton";
import type {
  Address,
  AddressPage as AddressPageData,
} from "@/features/addresses/types/address.types";
import { useRouter } from "@/i18n/navigation";
import { rafalToast } from "@/lib/rafal-toast";

export type AddressPageCopy = {
  title: string;
  helper: string;
  maximumReached: string;
  add: string;
  loadMore: string;
  loading: string;
  loadingMore: string;
  nextPageError: string;
  retry: string;
  empty: { title: string; description: string };
  error: { title: string; description: string };
  card: AddressCardCopy;
  form: AddressFormCopy;
  deleteDialog: {
    title: string;
    description: string;
    confirm: string;
    confirming: string;
    cancel: string;
    success: string;
    error: string;
  };
};

type AddressPageProps = {
  copy: AddressPageCopy;
  initialPage: AddressPageData | null;
  locale: Locale;
  maxAddresses: number;
};

type DeleteContext = {
  previousData: InfiniteData<AddressPageData, number> | undefined;
};

export function AddressPage({
  copy,
  initialPage,
  locale,
  maxAddresses,
}: AddressPageProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const queryKey = addressListQueryKey(locale);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const pendingDeleteIdsRef = useRef(new Set<string>());
  const [formAddress, setFormAddress] = useState<Address | null | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const query = useInfiniteQuery({
    ...addressInfiniteQueryOptions(locale),
    initialData: initialPage
      ? { pages: [initialPage], pageParams: [1] }
      : undefined,
  });

  useEffect(() => {
    if (
      query.error instanceof AddressListRequestError &&
      query.error.code === "unauthorized"
    ) {
      router.refresh();
    }
  }, [query.error, router]);

  const setDeletePending = (addressId: string, pending: boolean) => {
    if (pending) pendingDeleteIdsRef.current.add(addressId);
    else pendingDeleteIdsRef.current.delete(addressId);
    setPendingDeleteIds(new Set(pendingDeleteIdsRef.current));
  };

  const deleteMutation = useMutation<void, Error, string, DeleteContext>({
    mutationKey: ["account", "addresses", "delete"],
    mutationFn: async (addressId) => {
      const result = await deleteAddress(addressId, locale);
      if (!result.ok) throw new Error(result.error.code);
    },
    retry: false,
    onMutate: async (addressId) => {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previousData = queryClient.getQueryData<
        InfiniteData<AddressPageData, number>
      >(queryKey);

      queryClient.setQueryData<InfiniteData<AddressPageData, number>>(
        queryKey,
        (current) =>
          current
            ? {
                ...current,
                pages: current.pages.map((page) => ({
                  ...page,
                  items: page.items.filter((address) => address.id !== addressId),
                  pagination: {
                    ...page.pagination,
                    total: Math.max(0, page.pagination.total - 1),
                  },
                })),
              }
            : current,
      );
      return { previousData };
    },
    onError: (error, _addressId, context) => {
      if (context?.previousData) queryClient.setQueryData(queryKey, context.previousData);
      if (error.message === "unauthorized") router.refresh();
      rafalToast.error(copy.deleteDialog.error);
    },
    onSuccess: async () => {
      setDeleteTarget(null);
      rafalToast.success(copy.deleteDialog.success);
      await queryClient.refetchQueries({ queryKey, exact: true, type: "active" });
    },
    onSettled: (_data, _error, addressId) => setDeletePending(addressId, false),
  });

  const openForm = (address: Address | null, trigger: HTMLElement) => {
    dialogTriggerRef.current = trigger;
    setFormAddress(address);
  };

  const openDelete = (address: Address, trigger: HTMLElement) => {
    dialogTriggerRef.current = trigger;
    setDeleteTarget(address);
  };

  const confirmDelete = () => {
    if (!deleteTarget || pendingDeleteIdsRef.current.has(deleteTarget.id)) return;
    setDeletePending(deleteTarget.id, true);
    deleteMutation.mutate(deleteTarget.id);
  };

  if (query.isPending) {
    return (
      <div aria-busy="true" aria-label={copy.loading}>
        <AddressPageSkeleton />
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div>
        <h1 className="text-h2 font-bold text-gray-1000">{copy.title}</h1>
        <ErrorState
          className="mt-6"
          role="alert"
          title={copy.error.title}
          description={copy.error.description}
          action={<Button onClick={() => void query.refetch()}>{copy.retry}</Button>}
        />
      </div>
    );
  }

  const pages = query.data?.pages ?? [];
  const addresses = Array.from(
    new Map(
      pages.flatMap((page) => page.items).map((address) => [address.id, address]),
    ).values(),
  );
  const total = pages[0]?.pagination.total ?? 0;
  const canAddAddress = total < maxAddresses;

  const addButton = (
    <Button
      disabled={!canAddAddress}
      aria-describedby={!canAddAddress ? "address-limit-message" : undefined}
      onClick={(event) => openForm(null, event.currentTarget)}
    >
      <PlusIcon aria-hidden="true" className="size-4" />
      {copy.add}
    </Button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-h2 font-bold text-gray-1000">{copy.title}</h1>
          <p className="mt-3 type-body text-gray-500">
            {copy.helper
              .replace("{count}", String(total))
              .replace("{maximum}", String(maxAddresses))}
          </p>
          {!canAddAddress ? (
            <p id="address-limit-message" className="mt-1 type-body-sm text-gold-700">
              {copy.maximumReached}
            </p>
          ) : null}
        </div>
        {addButton}
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          className="mt-6"
          role="status"
          title={copy.empty.title}
          description={copy.empty.description}
        >
          <div className="mt-5">{addButton}</div>
        </EmptyState>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              copy={copy.card}
              deletePending={pendingDeleteIds.has(address.id)}
              onDelete={openDelete}
              onEdit={openForm}
            />
          ))}
        </div>
      )}

      {query.isFetchNextPageError ? (
        <p className="mt-6 text-center type-body text-destructive" role="alert">
          {copy.nextPageError}
        </p>
      ) : null}
      <div className="mt-10 flex justify-center">
        <LoadMoreButton
          disabled={pendingDeleteIds.size > 0}
          hasNextPage={query.hasNextPage === true}
          isLoading={query.isFetchingNextPage}
          label={query.isFetchNextPageError ? copy.retry : copy.loadMore}
          loadingLabel={copy.loadingMore}
          onClick={() => {
            if (!query.isFetchingNextPage) void query.fetchNextPage();
          }}
        />
      </div>

      {formAddress !== undefined ? (
        <AddressForm
          key={formAddress?.id ?? "new"}
          address={formAddress}
          copy={copy.form}
          locale={locale}
          open
          returnFocusRef={dialogTriggerRef}
          onClose={() => setFormAddress(undefined)}
        />
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteTarget(null);
        }}
        title={copy.deleteDialog.title}
        description={copy.deleteDialog.description.replace(
          "{label}",
          deleteTarget?.label ?? "",
        )}
        confirmLabel={copy.deleteDialog.confirm}
        loading={deleteMutation.isPending}
        loadingLabel={copy.deleteDialog.confirming}
        cancelLabel={copy.deleteDialog.cancel}
        onConfirm={confirmDelete}
        returnFocusRef={dialogTriggerRef}
        dismissible={!deleteMutation.isPending}
        destructive
      />
    </div>
  );
}
