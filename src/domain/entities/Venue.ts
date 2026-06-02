export interface Venue {
  id: string;
  name: string;
  city_id: string;
  nickname: string | null;
  neighborhood: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  photo_url: string | null;
}
