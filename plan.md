export interface User {
id: string;
firstName: string;
lastName: string;
email: string;
phoneNumber?: string;
whatsappNumber?: string;
profilePicture?: string;
role: "buyer" | "vendor" | "admin";
isVerified: boolean; // For email or ID verification
status: "active" | "suspended" | "deleted";
createdAt: string;
updatedAt: string;
lastLogin?: string;
businessProfileId?: string; // FK → VendorProfile.id
shopLink?: string; // optional for vendor
profileLink?: string; // personal profile link
savedItems?:string[]; FK Produdct.id
}

export interface BusinessProfile {
id: string;
ownerId: string; // FK → User.id
businessName: string;
businessEmail?: string;
businessPhone?: string;
whatsAppNumber?: string;
coverImage?: string;
profileImage?: string;
address?: string;
description?: string;
rating?: number; // Average from customer reviews
totalProducts?: number;
status: "active" | "suspended" | "pending_verification";
featuredProducts:string[];
createdAt: string;
updatedAt: string;
}

export interface Product {
id: string;
vendorId: string; // FK → VendorProfile.id
name: string;
description: string;
price: string;
images: string[];
categoryId?: string;
tags?: string[]; // store tag IDs or slugs
status: "active" | "inactive" | "deleted" | "pending_review";
viewsCount?: number;
createdAt: string;
updatedAt: string;
metadata?: Record<string, any>;

<!-- currency: string; // "USD", "NGN", etc. -->
<!-- stock?: number; -->

<!-- sku?: string; // unique product code -->

<!-- isFeatured?: boolean; -->

}

export interface Category {
id: string;
name: string;
slug: string;
parentCategoryId?: string[]; // single FK (easier hierarchy)
description?: string;
icon?: string; // optional for UI
image?:string;
createdAt: string;
updatedAt: string;
}

export interface WishlistItem {
id: string;
userId: string;
productId: string;
createdAt: string;
productSnapshot?: {
name: string;
price: number;
image: string;
};
}

export interface AdminLog {
id: string;
adminId: string; // FK → User.id
action: string; // e.g. "DELETE_PRODUCT", "SUSPEND_USER"
targetId?: string;
targetType?: "user" | "product" | "category" | "vendor";
createdAt: string;
}

export interface ProductReview {
id: string;
userId: string;
productId: string;
rating: number; // 1-5
comment?: string;
createdAt: string;
}

1. User Module

GET /users/me → fetch profile

PATCH /users/me → update info

DELETE /users/me → deactivate account

2. Vendor Module

POST /vendors → create vendor profile

GET /vendors/:id → public view
→ Hide phone/WhatsApp if not authenticated

PATCH /vendors/:id → edit vendor details

GET /vendors/:id/products → vendor’s product list

3. Product Module

POST /products → vendor creates product

GET /products → public product listings (search/filter)

GET /products/:id → product detail

PATCH /products/:id → edit product

DELETE /products/:id → soft delete

4. Category & Tag Module

CRUD for categories/tags (admin-only)

5. Wishlist Module

POST /wishlist/:productId

GET /wishlist

DELETE /wishlist/:id

6. Admin Module

POST /admin/login

GET /admin/users

PATCH /admin/users/:id/suspend

GET /admin/products

PATCH /admin/products/:id/deactivate

POST /admin/categories

7. Notification Module

Save in-app notifications

GET /notifications

PATCH /notifications/:id/mark-read
