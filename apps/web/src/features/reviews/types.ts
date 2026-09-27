export interface Review {
  id: string;
  rating: number;
  text: string;
  createdAt: string;
  user: { id: string; displayName: string };
}

export interface ReviewList {
  items: Review[];
  total: number;
  averageRating: number | null;
}
