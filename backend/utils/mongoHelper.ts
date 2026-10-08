import { ObjectId } from 'mongodb';

export function buildIdFilter(id: string): any {
  if (!id) return { _id: id };
  const filters: any[] = [{ _id: id }, { id: id }];
  try {
    if (ObjectId.isValid(id) && id.length === 24) {
      filters.unshift({ _id: new ObjectId(id) });
    }
  } catch (_) {}
  return { $or: filters };
}
