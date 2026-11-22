import type { Card } from "@/lib/types";
import { deleteCardPhotoFile, updateCard, uploadCardPhoto } from "@/lib/cards-client";
import type { CardFormState } from "./use-card-form-state";

/** Uploads / deletes pending photos after save; returns the card with its final photo URLs. */
export async function syncPendingPhotos(
  saved: Card,
  { front, back }: CardFormState["photos"]
): Promise<Card> {
  let photoFront = saved.photoFront ?? null;
  let photoBack = saved.photoBack ?? null;
  let photosChanged = false;

  if (front.cleared && !front.file) {
    await deleteCardPhotoFile(saved.id, "front");
    photoFront = null;
    photosChanged = true;
  }
  if (back.cleared && !back.file) {
    await deleteCardPhotoFile(saved.id, "back");
    photoBack = null;
    photosChanged = true;
  }
  if (front.file) {
    photoFront = await uploadCardPhoto(saved.id, "front", front.file);
    photosChanged = true;
  }
  if (back.file) {
    photoBack = await uploadCardPhoto(saved.id, "back", back.file);
    photosChanged = true;
  }

  return photosChanged ? updateCard({ ...saved, photoFront, photoBack }) : saved;
}
