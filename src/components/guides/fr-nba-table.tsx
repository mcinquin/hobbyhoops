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
import {
  computeFrNbaCollectionStats,
  playerHasAutoStyle,
  playerHasHoldingType,
  playerHasRookieHolding,
} from "@/lib/fr-nba";
import { SortableTableHead } from "@/components/data-table/sortable-table-head";
import { TablePagination } from "@/components/data-table/table-pagination";
import { FilterChipButton } from "@/components/filter-chip-button";
import { useStableTablePagination } from "@/hooks/use-stable-table-pagination";
import { FrNbaPlayerForm } from "@/components/guides/fr-nba-player-form";
import { FrNbaHoldingChips } from "@/components/guides/fr-nba-holding-chips";
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

function RpaObjectiveCell({
  value,
  yesLabel,
  noLabel,
}: {
  value: boolean | null;
  yesLabel: string;
  noLabel: string;
}) {
  if (value === true) {
    return (
      <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
        {yesLabel}
      </Badge>
    );
  }
  if (value === false) {
    return (
      <Badge variant="outline" className="text-amber-600 dark:text-amber-400">
        {noLabel}
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
  const [rpaAcquiredOnly, setRpaAcquiredOnly] = useState(false);
  const [rpaMissingOnly, setRpaMissingOnly] = useState(false);
  const [immaculateOnly, setImmaculateOnly] = useState(false);
  const [autoOnly, setAutoOnly] = useState(false);
  const [patchOnly, setPatchOnly] = useState(false);
  const [rookieOnly, setRookieOnly] = useState(false);
  const [onCardOnly, setOnCardOnly] = useState(false);
  const [stickerOnly, setStickerOnly] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: "player", desc: false },
  ]);

  const stats = useMemo(
    () => computeFrNbaCollectionStats(players),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    let result = players;
    if (rpaAcquiredOnly) result = result.filter((p) => p.rpa === true);
    if (rpaMissingOnly) result = result.filter((p) => p.rpa !== true);
    if (immaculateOnly) {
      result = result.filter((p) => playerHasHoldingType(p, "immaculate"));
    }
    if (autoOnly) {
      result = result.filter(
        (p) =>
          playerHasHoldingType(p, "auto") || playerHasHoldingType(p, "rpa")
      );
    }
    if (patchOnly) {
      result = result.filter(
        (p) =>
          playerHasHoldingType(p, "patch") || playerHasHoldingType(p, "rpa")
      );
    }
    if (rookieOnly) result = result.filter((p) => playerHasRookieHolding(p));
    if (onCardOnly) result = result.filter((p) => playerHasAutoStyle(p, "on_card"));
    if (stickerOnly) result = result.filter((p) => playerHasAutoStyle(p, "sticker"));
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
  }, [
    players,
    search,
    rpaAcquiredOnly,
    rpaMissingOnly,
    immaculateOnly,
    autoOnly,
    patchOnly,
    rookieOnly,
    onCardOnly,
    stickerOnly,
  ]);

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
        id: "holdings",
        header: t("guides.frNba.holdings"),
        enableSorting: false,
        cell: ({ row }) => <FrNbaHoldingChips holdings={row.original.holdings} />,
      },
      {
        accessorKey: "rpa",
        header: t("guides.frNba.rpaObjective"),
        cell: ({ row }) => (
          <RpaObjectiveCell
            value={row.original.rpa}
            yesLabel={t("guides.frNba.yes")}
            noLabel={t("guides.frNba.no")}
          />
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

  const filterResetKey = [
    search,
    rpaAcquiredOnly,
    rpaMissingOnly,
    immaculateOnly,
    autoOnly,
    patchOnly,
    rookieOnly,
    onCardOnly,
    stickerOnly,
  ].join("\0");

  const tablePagination = useStableTablePagination({
    pageSize: 20,
    resetKey: filterResetKey,
    rowCount: filteredPlayers.length,
  });

  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data: filteredPlayers,
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
      <div className="rounded-lg border border-border bg-card p-4 text-sm">
        <p>{t("guides.frNba.goalDescription")}</p>
        <p className="mt-2 text-muted-foreground">{t("guides.frNba.licenseNote")}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("guides.frNba.chipLegend")}
        </p>
      </div>

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
          label={t("guides.frNba.filterRpaAcquired")}
          pressed={rpaAcquiredOnly}
          onPressedChange={setRpaAcquiredOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.filterRpaMissing")}
          pressed={rpaMissingOnly}
          onPressedChange={setRpaMissingOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.filterImmaculate")}
          pressed={immaculateOnly}
          onPressedChange={setImmaculateOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.filterAuto")}
          pressed={autoOnly}
          onPressedChange={setAutoOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.filterPatch")}
          pressed={patchOnly}
          onPressedChange={setPatchOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.filterRookie")}
          pressed={rookieOnly}
          onPressedChange={setRookieOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.filterOnCard")}
          pressed={onCardOnly}
          onPressedChange={setOnCardOnly}
        />
        <FilterChipButton
          label={t("guides.frNba.filterSticker")}
          pressed={stickerOnly}
          onPressedChange={setStickerOnly}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {t("guides.frNba.stats", {
          players: stats.total,
          rpaAcquired: stats.rpaAcquired,
          rpaTotal: stats.total,
          immaculate: stats.immaculateCount,
          holdings: stats.holdingsCount,
        })}
        {filteredPlayers.length !== players.length &&
          ` ${t("common.filteredOf", { total: players.length })}`}
      </p>

      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => {
            const p = row.original;
            return (
              <div
                key={row.id}
                className="rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.player}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {p.draftYear} · {p.draftedBy}
                    </p>
                    <div className="mt-2">
                      <FrNbaHoldingChips holdings={p.holdings} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("guides.frNba.rpaObjective")}:{" "}
                      <RpaObjectiveCell
                        value={p.rpa}
                        yesLabel={t("guides.frNba.yes")}
                        noLabel={t("guides.frNba.no")}
                      />
                    </p>
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
                    <TableCell key={cell.id} className="py-2 align-top">
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
