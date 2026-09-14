"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { createWantedEntry, deleteWantedEntry } from "@/lib/guides-client";
import type { WantedBlock, WantedEntry } from "@/lib/types";
import { ColumnFilterCombobox } from "@/components/column-filter-combobox";
import { FilterChipButton } from "@/components/filter-chip-button";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface WantedBoardProps {
  initialBlocks: WantedBlock[];
}

type WantedRow = WantedEntry & { set: string };

type WantedSetGroup = {
  set: string;
  entries: WantedRow[];
};

function compareWantedRows(a: WantedRow, b: WantedRow): number {
  const variationCmp = a.variation.localeCompare(b.variation);
  if (variationCmp !== 0) return variationCmp;
  const slotA = a.slot ?? Number.POSITIVE_INFINITY;
  const slotB = b.slot ?? Number.POSITIVE_INFINITY;
  if (slotA !== slotB) return slotA - slotB;
  return a.player.localeCompare(b.player);
}

export function WantedBoard({ initialBlocks }: WantedBoardProps) {
  const t = useTranslations();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [search, setSearch] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [variationFilter, setVariationFilter] = useState("");
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
    () =>
      [...new Set(blocks.map((block) => block.set))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [blocks]
  );

  const setCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.set, (counts.get(row.set) ?? 0) + 1);
    }
    return counts;
  }, [rows]);

  const variations = useMemo(() => {
    const source = setFilter
      ? rows.filter((row) => row.set === setFilter)
      : rows;
    return [...new Set(source.map((row) => row.variation))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows, setFilter]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (setFilter) {
      result = result.filter((row) => row.set === setFilter);
    }
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
  }, [rows, search, setFilter, variationFilter]);

  const groupedSets = useMemo((): WantedSetGroup[] => {
    const bySet = new Map<string, WantedRow[]>();
    for (const row of filteredRows) {
      const list = bySet.get(row.set);
      if (list) {
        list.push(row);
      } else {
        bySet.set(row.set, [row]);
      }
    }

    return [...bySet.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([set, entries]) => ({
        set,
        entries: [...entries].sort(compareWantedRows),
      }));
  }, [filteredRows]);

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
      const nextBlocks = await createWantedEntry({
        set: trimmedSet,
        variation: trimmedVariation,
        player: trimmedPlayer,
        slot: slotValue,
      });
      setBlocks(nextBlocks);
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
        const nextBlocks = await deleteWantedEntry(id);
        setBlocks(nextBlocks);
        setSuccess(t("guides.wanted.deleted"));
      } catch {
        setFormError(t("errors.updateFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

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
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {success}
            </p>
          ) : null}
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
        </div>
      </div>

      {setNames.length > 0 ? (
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("guides.wanted.filterSet")}
        >
          <FilterChipButton
            label={t("guides.wanted.allSets")}
            pressed={setFilter === ""}
            onPressedChange={() => {
              setSetFilter("");
            }}
          />
          {setNames.map((name) => (
            <FilterChipButton
              key={name}
              label={t("guides.wanted.setChip", {
                set: name,
                count: setCounts.get(name) ?? 0,
              })}
              pressed={setFilter === name}
              onPressedChange={(pressed) => {
                setSetFilter(pressed ? name : "");
                setVariationFilter("");
              }}
            />
          ))}
        </div>
      ) : null}

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
        {filteredRows.length !== rows.length
          ? ` ${t("common.filteredOf", { total: rows.length })}`
          : null}
      </p>

      {groupedSets.length === 0 ? (
        <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
          {t("common.noneFound")}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSets.map((group) => (
            <WantedSetSection
              key={group.set}
              set={group.set}
              entries={group.entries}
              loading={loading}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WantedSetSection({
  set,
  entries,
  loading,
  onDelete,
}: {
  set: string;
  entries: WantedRow[];
  loading: boolean;
  onDelete: (id: number) => void | Promise<void>;
}) {
  const t = useTranslations();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-border pb-2">
        <h2 id={headingId} className="text-sm font-medium text-foreground">
          {set}
        </h2>
        <p className="text-xs text-muted-foreground">
          {t("guides.wanted.setCount", { count: entries.length })}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <article className="flex h-full items-start justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-medium leading-snug">
                  {entry.player}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {entry.variation}
                  {entry.slot != null ? (
                    <span className="font-mono tabular-nums">
                      {` · #${entry.slot}`}
                    </span>
                  ) : null}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={loading}
                aria-label={t("guides.wanted.deleteEntry", {
                  player: entry.player,
                  set: entry.set,
                })}
                onClick={() => void onDelete(entry.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
