---
name: Seller authentication
description: The two seller login paths and their seller-only routing constraint.
---

KisanDirect has two seller credentials: a fixed phone/OTP shortcut for the legacy seller login, and a second seller phone verified through the real SMS OTP flow. Both numbers are reserved for seller authentication and must not be allowed to create customer accounts.

**Why:** The legacy shortcut must remain available while the second seller needs real OTP delivery; treating both numbers as the same path either breaks the old login or bypasses SMS verification.

**How to apply:** Keep fixed credentials in the fixed verification branch. Send and verify the second seller number through the SMS session store and seller endpoint, and block both numbers from customer authentication.