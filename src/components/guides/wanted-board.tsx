"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import type { WantedBlock, WantedEntry } from "@/lib/types";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { SearchField } from "@/components/search-field";
import { useStableTablePagination } from "@/hooks/use-stable-table-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface WantedBoardProps {
  initialBlocks: WantedBlock[];
}

type WantedRow = WantedEntry & { set: string };

export function WantedBoard({ initialBlocks }: WantedBoardProps) {
  const t = useTranslations();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [search, setSearch] = useState("");
  const [variationFilter, setVariationFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "variation", desc: false },
    { id: "slot", desc: false },
  ]);
  const [setName, setSetName] = useState("");
  const [variation, setVariation] = useState("");
  const [slot, setSlot] = useState("");
  const [player, setPlayer] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const rows = useMemo(
    (): WantedRow[] =>
      blocks.flatMap((block) =>
        block.entries.map((entry) => ({ ...entry, set: block.set }))
      ),
    [blocks]
  );

  const setNames = useMemo(
    () => [...new Set(blocks.map((block) => block.set))].sort((a, b) =>
      a.localeCompare(b)
    ),
    [blocks]
  );

  const variations = useMemo(
    () =>
      [...new Set(rows.map((row) => row.variation))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  );

  const filteredRows = useMemo(() => {
    let result = rows;
    if (variationFilter) {
      result = result.filter((row) => row.variation === variationFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (row) =>
          row.player.toLowerCase().includes(q) ||
          row.variation.toLowerCase().includes(q) ||
          row.set.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rows, search, variationFilter]);

  async function handleAdd() {
    const trimmedSet = setName.trim();
    const trimmedVariation = variation.trim();
    const trimmedPlayer = player.trim();
    if (!trimmedSet || !trimmedVariation || !trimmedPlayer) {
      setFormError(t("guides.wanted.fieldsRequired"));
      return;
    }

    const slotValue =
      slot.trim() === "" ? null : Number.parseInt(slot.trim(), 10);
    if (slot.trim() !== "" && (!Number.isFinite(slotValue) || slotValue! <= 0)) {
      setFormError(t("guides.wanted.slotInvalid"));
      return;
    }

    setFormError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/wanted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          set: trimmedSet,
          variation: trimmedVariation,
          player: trimmedPlayer,
          slot: slotValue,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          typeof data.error === "string" ? data.error : t("errors.updateFailed")
        );
        return;
      }
      setBlocks(data.blocks as WantedBlock[]);
      setVariation("");
      setSlot("");
      setPlayer("");
      setSuccess(t("guides.wanted.added"));
    } catch {
      setFormError(t("errors.updateFailed"));
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = useCallback(
    async (id: number) => {
      setSuccess(null);
      setLoading(true);
      try {
        const res = await fetch(`/api/wanted?id=${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFormError(
            typeof data.error === "string"
              ? data.error
              : t("errors.updateFailed")
          );
          return;
        }
        setBlocks(data.blocks as WantedBlock[]);
        setSuccess(t("guides.wanted.deleted"));
      } catch {
        setFormError(t("errors.updateFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  const columns = useMemo<ColumnDef<WantedRow>[]>(
    () => [
      {
        accessorKey: "set",
        header: t("guides.wanted.set"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.set}</span>
        ),
      },
      {
        accessorKey: "variation",
        header: t("guides.wanted.variation"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.variation}
          </span>
        ),
      },
      {
        accessorKey: "slot",
        header: t("guides.wanted.slot"),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {row.original.slot ?? "—"}
          </span>
        ),
        sortingFn: (a, b) => (a.original.slot ?? 999) - (b.original.slot ?? 999),
      },
      {
        accessorKey: "player",
        header: t("guides.wanted.player"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.player}</span>
        ),
      },
      {
        id: "actions",
        header: t("guides.wanted.actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            disabled={loading}
            aria-label={t("guides.wanted.deleteEntry", {
              player: row.original.player,
            })}
            onClick={() => void handleDelete(row.original.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [handleDelete, loading, t]
  );

  const filterResetKey = `${search}\0${variationFilter}`;

  const tablePagination = useStableTablePagination({
    pageSize: 25,
    resetKey: filterResetKey,
    rowCount: filteredRows.length,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, pagination: tablePagination.pagination },
    onSortingChange: setSorting,
    onPaginationChange: tablePagination.onPaginationChange,
    autoResetPageIndex: tablePagination.autoResetPageIndex,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium">{t("guides.wanted.addEntry")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="wanted-set">{t("guides.wanted.set")}</Label>
            <Input
              id="wanted-set"
              list="wanted-set-suggestions"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              placeholder={t("guides.wanted.setPlaceholder")}
              disabled={loading}
            />
            <datalist id="wanted-set-suggestions">
              {setNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wanted-variation">{t("guides.wanted.variation")}</Label>
            <Input
              id="wanted-variation"
              value={variation}
              onChange={(e) => setVariation(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="wanted-slot">{t("guides.wanted.slot")}</Label>
            <Input
              id="wanted-slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              placeholder={t("guides.wanted.slotOptional")}
              disabled={loading}
              inputMode="numeric"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="wanted-player">{t("guides.wanted.player")}</Label>
            <Input
              id="wanted-player"
              value={player}
              onChange={(e) => setPlayer(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => void handleAdd()}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t("common.add")}
          </Button>
          {success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{success}</p>
          ) : null}
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </div>

      {blocks.map((block) => (
        <p
          key={block.set}
          className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium"
        >
          {block.set}
        </p>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchField
          label={t("guides.wanted.search")}
          placeholder={t("guides.wanted.search")}
          value={search}
          onChange={setSearch}
          className="min-w-0 flex-1 sm:max-w-sm"
        />
        <ColumnFilterCombobox
          value={variationFilter}
          onChange={setVariationFilter}
          placeholder={t("guides.wanted.filterVariation")}
          suggestions={variations}
          className="h-9 w-full sm:h-8 sm:w-56"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {t("guides.wanted.count", { count: filteredRows.length })}
        {filteredRows.length !== rows.length &&
          ` ${t("common.filteredOf", { total: rows.length })}`}
      </p>

      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{row.original.player}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.original.set} · {row.original.variation}
                  {row.original.slot != null ? ` · #${row.original.slot}` : ""}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={loading}
                aria-label={t("guides.wanted.deleteEntry", {
                  player: row.original.player,
                })}
                onClick={() => void handleDelete(row.original.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            {t("common.noneFound")}
          </div>
        )}
      </div>

      <div className="hidden rounded-md border border-border md:block md:overflow-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <SortableTableHead key={header.id} header={header} />
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t("common.noneFound")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination table={table} />
    </div>
  );
}
