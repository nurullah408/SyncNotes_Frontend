export interface Note {
  id: string;
  title: string;
  content: string;
  searchContent: string;
  updatedAt: string;
  isDeleted?: boolean;
}
