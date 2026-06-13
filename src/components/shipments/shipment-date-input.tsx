"use client";

import {
  formatShipmentDateForInput,
  parseShipmentDateInput,
} from "@/lib/shipment-utils";
import { LocaleDateInput } from "@/components/locale-date-input";

interface ShipmentDateInputProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function ShipmentDateInput(props: ShipmentDateInputProps) {
  return (
    <LocaleDateInput
      {...props}
      formatForInput={formatShipmentDateForInput}
      parseInput={parseShipmentDateInput}
    />
  );
}
