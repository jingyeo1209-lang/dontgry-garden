import type { AdSlotKey } from "@/lib/ads";
import { getAdSlotId, getAdsenseClient } from "@/lib/ads";
import { AdSenseUnit } from "@/components/AdSenseUnit";

type Props = {
  unit: AdSlotKey;
};

export function AdSlot({ unit }: Props) {
  const client = getAdsenseClient();
  const slot = getAdSlotId(unit);
  if (!client || !slot) return null;
  return <AdSenseUnit client={client} slot={slot} />;
}
