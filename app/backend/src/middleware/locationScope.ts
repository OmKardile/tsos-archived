import { query } from '../db/pool.js';

export function locationScope(userId: string, locationIds: string[]) {
  return {
    whereLocation: `location_id = ANY($1::uuid[])`,
    params: [locationIds],
  };
}

export function singleLocationScope(locationId: string) {
  return {
    whereLocation: `location_id = $1`,
    params: [locationId],
  };
}
