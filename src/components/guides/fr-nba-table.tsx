"use client";

import { useMemo, useState } from "react";
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
import type { FrNbaPlayer } from "@/lib/types";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { FilterChipButton } from "@/components/filter-chip-button";
import { FrNbaPlayerForm } from "@/components/guides/fr-nba-player-form";
import { SearchField } from "@/components/search-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface FrNbaTableProps {
  initialPlayers: FrNbaPlayer[];
}

function BoolCell({ value, yesLabel }: { value: boolean | null; yesLabel: string }) {
  if (value === true) {
    return (
      <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
        {yesLabel}
      </Badge>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

export function FrNbaTable({ initialPlayers }: FrNbaTableProps) {
  const t = useTranslations();
  const [players, setPlayers] = useState(initialPlayers);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<FrNbaPlayer | null>(null);
  const [search, setSearch] = useState("");
  const [rookieOnly, setRookieOnly] = useState(false);
  const [patchOnly, setPatchOnly] = useState(false);
  const [immaculateOnly, setImmaculateOnly] = useState(false);
  const [autoOnly, setAutoOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "player", desc: false },
  ]);

  const filteredPlayers = useMemo(() => {
    let result = players;
    if (rookieOnly) result = result.filter((p) => p.rookieCard === true);
    if (patchOnly) result = result.filter((p) => p.patch === true);
    if (immaculateOnly) result = result.filter((p) => p.immaculate === true);
    if (autoOnly) result = result.filter((p) => Boolean(p.auto));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.player.toLowerCase().includes(q) ||
          p.draftedBy.toLowerCase().includes(q) ||
          p.draftYear.includes(q)
      );
    }
    return result;
  }, [players, search, rookieOnly, patchOnly, immaculateOnly, autoOnly]);

  const columns = useMemo<ColumnDef<FrNbaPlayer>[]>(
    () => [
      {
        accessorKey: "player",
        header: t("guides.frNba.player"),
        cell: ({ row }) => <span className="font-medium">{row.original.player}</span>,
      },
      {
        accessorKey: "draftYear",
        header: t("guides.frNba.draftYear"),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">{row.original.draftYear}</span>
        ),
      },
      {
        accessorKey: "draftedBy",
        header: t("guides.frNba.draftedBy"),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.draftedBy}</span>
        ),
      },
      {
        accessorKey: "rookieCard",
        header: t("guides.frNba.rookieCard"),
        cell: ({ row }) => (
          <BoolCell value={row.original.rookieCard} yesLabel={t("guides.frNba.yes")} />
        ),
      },
      {
        accessorKey: "auto",
        header: t("guides.frNba.auto"),
        cell: ({ row }) =>
          row.original.auto ? (
            <span className="text-sm">{row.original.auto}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "patch",
        header: t("guides.frNba.patch"),
        cell: ({ row }) => (
          <BoolCell value={row.original.patch} yesLabel={t("guides.frNba.yes")} />
        ),
      },
      {
        accessorKey: "immaculate",
        header: t("guides.frNba.immaculate"),
        cell: ({ row }) => (
          <BoolCell value={row.original.immaculate} yesLabel={t("guides.frNba.yes")} />
        ),
      },
      {
        id: "actions",
        header: t("guides.frNba.actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t("guides.frNba.editPlayer", { player: row.original.player })}
            onClick={() => {
              setEditingPlayer(row.original);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [t]
  );

  function handlePlayerSaved(saved: FrNbaPlayer) {
    setPlayers((current) => {
      const index = current.findIndex((item) => item.id === saved.id);
      if (index === -1) {
        return [...current, saved].sort((a, b) =>
          a.player.localeCompare(b.player)
        );
      }
      const next = [...current];
      next[index] = saved;
      return next;
    });
  }

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data: filteredPlayers,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingPlayer(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("guides.frNba.addPlayer")}
        </Button>
      </div>

      <SearchField
        label={t("guides.frNba.search")}
        placeholder={t("guides.frNba.search")}
        value={search}
        onChange={setSearch}
        className="max-w-md"
      />

      <div className="flex flex-wrap gap-2">
        <FilterChipButton
          label={t("guides.frNba.rookieCard")}
          pressed={rookieOnly}
          onPressedChange={setRookieOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.auto")}
          pressed={autoOnly}
          onPressedChange={setAutoOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.patch")}
          pressed={patchOnly}
          onPressedChange={setPatchOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.immaculate")}
          pressed={immaculateOnly}
          onPressedChange={setImmaculateOnly}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {t("guides.frNba.count", { count: filteredPlayers.length })}
        {filteredPlayers.length !== players.length &&
          ` ${t("common.filteredOf", { total: players.length })}`}
      </p>

      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => {
            const p = row.original;
            const tags = [
              p.rookieCard ? t("guides.frNba.rookieCard") : null,
              p.auto,
              p.patch ? t("guides.frNba.patch") : null,
              p.immaculate ? t("guides.frNba.immaculate") : null,
            ].filter(Boolean);

            return (
              <div
                key={row.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">{p.player}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.draftYear} · {p.draftedBy}
                  </p>
                  {tags.length > 0 && (
                    <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                      {tags.join(" · ")}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label={t("guides.frNba.editPlayer", { player: p.player })}
                  onClick={() => {
                    setEditingPlayer(p);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
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

      <FrNbaPlayerForm
        player={editingPlayer}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPlayer(null);
        }}
        onSaved={handlePlayerSaved}
      />
    </div>
  );
}
