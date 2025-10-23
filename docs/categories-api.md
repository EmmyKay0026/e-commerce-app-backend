# Categories API Documentation

Base path: /api/categories

Notes: Category model (TypeScript interface)

export interface Category {
id: string;
name: string;
slug: string;
parent_category_id?: string[]; // array of parent IDs (supports multiple-parent model or hierarchy)
child_categories?: string[];
description?: string;
icon?: string;
image?: string;
status?: string; // e.g. active | suspended | deleted
created_at: string;
updated_at: string;
}

---

## Authentication

- Public: list and get endpoints
- Admin-only: create, update, delete
- Authentication: Bearer token in `Authorization` header

---

## Endpoints

### 1) List categories

- GET /api/categories
- Public
- Query parameters:
  - page (number) - default 1
  - limit (number) - default 50
  - parent (string) - filter by parent_category_id
  - search (string) - search by name

Request example:
GET /api/categories?page=1&limit=20&search=home

Response 200:
{
"success": true,
"data": [
{
"id": "uuid",
"name": "Home & Living",
"slug": "home-living",
"parent_category_id": null,
"child_categories": ["uuid-1","uuid-2"],
"description": "...",
"icon": "https://...",
"image": "https://...",
"status": "active",
"created_at": "2025-10-21T12:00:00Z",
"updated_at": "2025-10-21T12:00:00Z"
}
]
}

Errors:

- 500: { success: false, message: "Failed to fetch categories", error }

---

### 2) List parent categories only

- GET /api/categories/parent-cats
- Public
- Query params: page, limit, search
- Returns only categories with parent_category_id IS NULL (top-level categories)

Response 200:
{
"success": true,
"data": [ /* top-level categories */ ]
}

---

### 3) Get single category

- GET /api/categories/:id
- Public
- Path params: id (string)

Response 200:
{
"success": true,
"data": {
"id": "uuid",
"name": "Subcategory",
"slug": "subcategory",
"parent_category_id": ["parent-uuid"],
"child_categories": ["child-uuid"],
"description": "...",
"status": "active",
"created_at": "...",
"updated_at": "..."
}
}

Errors:

- 404 if not found
- 500 server error

---

### 4) Get category with parent categories

- GET /api/categories/:id/with-parent-cats
- Public
- Returns the category and its parent categories (if parent_category_id is an array)

Response 200:
{
"success": true,
"data": {
"id": "...",
"name": "...",
"parent_category_id": ["p1","p2"],
"parent_categories": [ /* parent objects in same order */ ]
}
}

---

### 5) Get category with child categories

- GET /api/categories/:id/with-child-cats
- Public
- Returns the category and resolved child_categories array as objects

Response 200:
{
"success": true,
"data": {
"id": "...",
"name": "...",
"child_categories": [ /* category objects */ ]
}
}

---

### 6) Get category with parent & child categories

- GET /api/categories/:id/with-parent-child-cats
- Public
- Returns the category with both resolved parents and children

---

### 7) Create category

- POST /api/categories
- Admin-only
- Request body:
  {
  "name": "string",
  "parentCategoryId": ["parentId1", "parentId2"] (optional),
  "description": "string (optional)",
  "icon": "url (optional)",
  "image": "url (optional)"
  }

Response 201:
{
"success": true,
"data": { /_ newly created category object _/ }
}

Errors:

- 400 if missing name
- 500 on DB error

---

### 8) Update category

- PATCH /api/categories/:id
- Admin-only
- Request body: any of the allowed fields (name, parentCategoryId, description, icon, image)

Response 200:
{
"success": true,
"data": { /_ updated category _/ }
}

---

### 9) Delete category

- DELETE /api/categories/:id
- Admin-only
- Soft-deletes by setting status="deleted" (current implementation)

Response 200:
{ "success": true, "message": "Category deleted" }

---

## Implementation notes & gotchas

- `parent_category_id` in this project may be stored as an array (multiple-parents) or as null for top-level categories. Many functions expect arrays (see `plan.md`).
- Use `.is('parent_category_id', null)` when checking for top-level categories — don't use `.eq(..., null)`.
- If `parent_category_id` or `child_categories` are arrays, use `.in()` or `.overlaps()` carefully:
  - `.in('id', ids)` expects `ids` to be an array of scalar ids and compares `id IN (..ids)`
  - If the column itself is an array type, use `.overlaps('parent_category_id', ids)`
- For recursive fetching of descendants prefer Postgres recursive CTEs for performance if supported by your Supabase permissions.
- The controllers filter by `status = 'active'` in many read endpoints; ensure your front-end reflects that.

---

## Example curl (create category)

curl -X POST http://localhost:5000/api/categories \
 -H "Authorization: Bearer <ADMIN_TOKEN>" \
 -H "Content-Type: application/json" \
 -d '{"name":"Home & Living","parentCategoryId":null}'

---

Last updated: 2025-10-22
