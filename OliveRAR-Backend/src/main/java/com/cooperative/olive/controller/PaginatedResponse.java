package com.cooperative.olive.controller;

import java.util.List;

public class PaginatedResponse<T> {
    private final List<T> items;
    private final long totalItems;
    private final int totalPages;
    private final int page;
    private final int limit;
    private final boolean hasNext;
    private final boolean hasPrevious;

    public PaginatedResponse(List<T> items, long totalItems, int totalPages, int page, int limit) {
        this.items = items;
        this.totalItems = totalItems;
        this.totalPages = totalPages;
        this.page = page;
        this.limit = limit;
        this.hasNext = page < totalPages;
        this.hasPrevious = page > 1;
    }

    public List<T> getItems() {
        return items;
    }

    public long getTotalItems() {
        return totalItems;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public int getPage() {
        return page;
    }

    public int getLimit() {
        return limit;
    }

    public boolean isHasNext() {
        return hasNext;
    }

    public boolean isHasPrevious() {
        return hasPrevious;
    }
}
