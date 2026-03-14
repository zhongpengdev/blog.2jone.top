export type ContentPagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
};

export const LIST_PAGE_SIZE = 15;

export const paginateItems = <T>(
  items: T[],
  currentPage: number,
  pageSize: number = LIST_PAGE_SIZE
) => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  return {
    items: items.slice(startIndex, endIndex),
    currentPage: safeCurrentPage,
    totalPages,
    totalItems,
    pageSize
  };
};
