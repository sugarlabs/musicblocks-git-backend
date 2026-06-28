export interface Pagination {
    page: number;
    limit: number;
    offset: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 50;

const parsePositiveInteger = (value: unknown, fallback: number): number => {
    if (typeof value !== 'string') {
        return fallback;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }

    return parsed;
};

export const parsePagination = (pageValue: unknown, limitValue: unknown): Pagination => {
    const page = parsePositiveInteger(pageValue, DEFAULT_PAGE);
    const requestedLimit = parsePositiveInteger(limitValue, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    return {
        page,
        limit,
        offset: (page - 1) * limit,
    };
};
