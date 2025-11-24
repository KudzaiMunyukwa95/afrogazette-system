# API Testing Guide - Postman Collection

## Setup Postman

1. Open Postman
2. Create new Collection: "AfroGazette API"
3. Set Collection Variable:
   - Variable: `base_url`
   - Initial Value: `http://localhost:5000/api`
   - Current Value: `http://localhost:5000/api`

---

## 1. AUTHENTICATION

### 1.1 Login (Admin)

```
Method: POST
URL: {{base_url}}/auth/login
Headers:
  Content-Type: application/json

Body (JSON):
{
  "email": "admin@afrogazette.com",
  "password": "Admin@123"
}

Expected Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@afrogazette.com",
      "fullName": "System Administrator",
      "role": "admin"
    }
  }
}

✅ Save token from response to use in other requests!
```

**In Postman:**
- Go to Tests tab
- Add script:
```javascript
var jsonData = pm.response.json();
pm.collectionVariables.set("auth_token", jsonData.data.token);
```

### 1.2 Register New User (Admin Only)

```
Method: POST
URL: {{base_url}}/auth/register
Headers:
  Content-Type: application/json
  Authorization: Bearer {{auth_token}}

Body (JSON):
{
  "email": "john.sales@afrogazette.com",
  "password": "Sales123",
  "fullName": "John Sales",
  "role": "sales_rep"
}

Expected Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 2,
      "email": "john.sales@afrogazette.com",
      "fullName": "John Sales",
      "role": "sales_rep"
    }
  }
}
```

### 1.3 Get Profile

```
Method: GET
URL: {{base_url}}/auth/profile
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@afrogazette.com",
      "fullName": "System Administrator",
      "role": "admin",
      "createdAt": "2024-12-01T10:00:00.000Z"
    }
  }
}
```

---

## 2. USER MANAGEMENT (Admin Only)

### 2.1 Get All Users

```
Method: GET
URL: {{base_url}}/users
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "email": "admin@afrogazette.com",
        "fullName": "System Administrator",
        "role": "admin",
        "createdAt": "2024-12-01T10:00:00.000Z"
      },
      {
        "id": 2,
        "email": "john.sales@afrogazette.com",
        "fullName": "John Sales",
        "role": "sales_rep",
        "createdAt": "2024-12-01T11:00:00.000Z"
      }
    ]
  }
}
```

### 2.2 Create User

```
Method: POST
URL: {{base_url}}/users
Headers:
  Content-Type: application/json
  Authorization: Bearer {{auth_token}}

Body (JSON):
{
  "email": "jane.sales@afrogazette.com",
  "password": "Sales456",
  "fullName": "Jane Doe",
  "role": "sales_rep"
}

Expected Response (201):
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 3,
      "email": "jane.sales@afrogazette.com",
      "fullName": "Jane Doe",
      "role": "sales_rep"
    }
  }
}
```

### 2.3 Delete User

```
Method: DELETE
URL: {{base_url}}/users/3
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 3. ADVERTS

### 3.1 Create Advert (Sales Rep)

```
Method: POST
URL: {{base_url}}/adverts
Headers:
  Content-Type: application/json
  Authorization: Bearer {{auth_token}}

Body (JSON):
{
  "clientName": "ABC Motors",
  "category": "automotive",
  "caption": "Visit ABC Motors for unbeatable deals on new and used cars! Special financing available. Located in Midrand. Call 011-123-4567",
  "mediaUrl": "https://example.com/abc-motors-ad.jpg",
  "daysPaid": 7,
  "paymentDate": "2024-12-01",
  "amountPaid": 500.00,
  "startDate": "2024-12-05"
}

Expected Response (201):
{
  "success": true,
  "message": "Advert created successfully and pending approval",
  "data": {
    "advert": {
      "id": 1,
      "client_name": "ABC Motors",
      "category": "automotive",
      "status": "pending",
      "days_paid": 7,
      "start_date": "2024-12-05",
      "sales_rep_id": 2
    }
  }
}
```

**Test Different Categories:**
```json
Valid categories:
- automotive
- real_estate
- fashion
- food_beverage
- technology
- health_wellness
- education
- entertainment
- finance
- travel
- sports
- beauty
- home_garden
- other
```

### 3.2 Get All Adverts

```
Method: GET
URL: {{base_url}}/adverts
Headers:
  Authorization: Bearer {{auth_token}}

Query Parameters (optional):
  status=pending  (or active, expired)

Expected Response (200):
{
  "success": true,
  "data": {
    "adverts": [
      {
        "id": 1,
        "client_name": "ABC Motors",
        "category": "automotive",
        "status": "pending",
        "sales_rep_name": "John Sales",
        "slot_label": null
      }
    ]
  }
}
```

### 3.3 Get Pending Adverts (Admin Only)

```
Method: GET
URL: {{base_url}}/adverts/pending
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "data": {
    "adverts": [
      {
        "id": 1,
        "client_name": "ABC Motors",
        "category": "automotive",
        "caption": "Visit ABC Motors...",
        "days_paid": 7,
        "start_date": "2024-12-05",
        "sales_rep_name": "John Sales",
        "status": "pending"
      }
    ]
  }
}
```

### 3.4 Approve Advert & Assign Slot (Admin Only)

```
Method: POST
URL: {{base_url}}/adverts/1/approve
Headers:
  Content-Type: application/json
  Authorization: Bearer {{auth_token}}

Body (JSON):
{
  "slotId": 5
}

Expected Response (200):
{
  "success": true,
  "message": "Advert approved and scheduled successfully",
  "data": {
    "advert": {
      "id": 1,
      "status": "active",
      "assigned_slot_id": 5,
      "slot_label": "10:00 AM",
      "end_date": "2024-12-11",
      "remaining_days": 7
    }
  }
}

Error Response (400) - Slot Full:
{
  "success": false,
  "message": "Slot is full on 2024-12-05. Maximum 2 adverts per slot allowed."
}

Error Response (400) - Category Conflict:
{
  "success": false,
  "message": "Category conflict on 2024-12-05. Another 'automotive' advert is already scheduled in this slot."
}
```

### 3.5 Extend Advert (Admin Only)

```
Method: POST
URL: {{base_url}}/adverts/1/extend
Headers:
  Content-Type: application/json
  Authorization: Bearer {{auth_token}}

Body (JSON):
{
  "additionalDays": 5,
  "amountPaid": 300.00
}

Expected Response (200):
{
  "success": true,
  "message": "Advert extended by 5 days",
  "data": {
    "newEndDate": "2024-12-16",
    "newDaysPaid": 12,
    "newRemainingDays": 12
  }
}
```

### 3.6 Update Advert (Admin Only)

```
Method: PATCH
URL: {{base_url}}/adverts/1
Headers:
  Content-Type: application/json
  Authorization: Bearer {{auth_token}}

Body (JSON):
{
  "clientName": "ABC Motors Ltd",
  "caption": "Updated caption text"
}

Expected Response (200):
{
  "success": true,
  "message": "Advert updated successfully",
  "data": {
    "advert": {
      "id": 1,
      "client_name": "ABC Motors Ltd",
      "caption": "Updated caption text"
    }
  }
}
```

### 3.7 Delete Advert

```
Method: DELETE
URL: {{base_url}}/adverts/1
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "message": "Advert deleted successfully"
}

Note: Sales reps can only delete their own PENDING adverts
```

---

## 4. TIME SLOTS

### 4.1 Get All Time Slots

```
Method: GET
URL: {{base_url}}/slots
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "data": {
    "slots": [
      {"id": 1, "slot_time": "06:00:00", "slot_label": "06:00 AM"},
      {"id": 2, "slot_time": "07:00:00", "slot_label": "07:00 AM"},
      ...
      {"id": 15, "slot_time": "20:00:00", "slot_label": "08:00 PM"}
    ]
  }
}
```

### 4.2 Get Today's Schedule

```
Method: GET
URL: {{base_url}}/slots/today
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "data": {
    "date": "2024-12-05",
    "schedule": [
      {
        "slotId": 1,
        "slotTime": "06:00:00",
        "slotLabel": "06:00 AM",
        "adverts": []
      },
      {
        "slotId": 5,
        "slotTime": "10:00:00",
        "slotLabel": "10:00 AM",
        "adverts": [
          {
            "advertId": 1,
            "clientName": "ABC Motors",
            "category": "automotive",
            "remainingDays": 7
          }
        ]
      }
    ]
  }
}
```

### 4.3 Get Calendar Schedule

```
Method: GET
URL: {{base_url}}/slots/calendar?date=2024-12-10
Headers:
  Authorization: Bearer {{auth_token}}

Query Parameters:
  date=2024-12-10  (required, format: YYYY-MM-DD)

Expected Response (200):
{
  "success": true,
  "data": {
    "date": "2024-12-10",
    "schedule": [
      {
        "slotId": 5,
        "slotLabel": "10:00 AM",
        "adverts": [...],
        "available": 1
      }
    ]
  }
}
```

### 4.4 Get Vacant Slots

```
Method: GET
URL: {{base_url}}/slots/vacant?startDate=2024-12-05&endDate=2024-12-12
Headers:
  Authorization: Bearer {{auth_token}}

Query Parameters:
  startDate=2024-12-05  (required)
  endDate=2024-12-12    (optional, defaults to startDate)

Expected Response (200):
{
  "success": true,
  "data": {
    "vacantSlots": [
      {
        "check_date": "2024-12-05",
        "slot_id": 1,
        "slot_label": "06:00 AM",
        "occupied_count": 0,
        "available_capacity": 2
      },
      {
        "check_date": "2024-12-05",
        "slot_id": 5,
        "slot_label": "10:00 AM",
        "occupied_count": 1,
        "available_capacity": 1
      }
    ]
  }
}
```

### 4.5 Check Slot Availability

```
Method: GET
URL: {{base_url}}/slots/check-availability?advertId=1&slotId=5
Headers:
  Authorization: Bearer {{auth_token}}

Query Parameters:
  advertId=1  (required)
  slotId=5    (required)

Expected Response (200) - Available:
{
  "success": true,
  "data": {
    "available": true,
    "conflicts": [],
    "message": "Slot is available for all days"
  }
}

Expected Response (200) - Has Conflicts:
{
  "success": true,
  "data": {
    "available": false,
    "conflicts": [
      {
        "date": "2024-12-05",
        "reason": "Slot is full (2/2 capacity)",
        "type": "capacity"
      },
      {
        "date": "2024-12-06",
        "reason": "Category conflict: 'automotive' already scheduled",
        "type": "category",
        "conflictingClient": "XYZ Auto"
      }
    ],
    "message": "Found 2 conflict(s)"
  }
}
```

---

## 5. ANALYTICS

### 5.1 Get Admin Dashboard (Admin Only)

```
Method: GET
URL: {{base_url}}/analytics/dashboard
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "data": {
    "statusStats": [
      {"status": "pending", "count": "5"},
      {"status": "active", "count": "12"},
      {"status": "expired", "count": "8"}
    ],
    "revenueStats": {
      "total_adverts": "25",
      "total_revenue": "12500.00",
      "average_revenue": "500.00"
    },
    "categoryStats": [
      {"category": "automotive", "count": "5", "revenue": "2500.00"},
      {"category": "real_estate", "count": "3", "revenue": "1500.00"}
    ],
    "salesRepStats": [
      {
        "id": 2,
        "full_name": "John Sales",
        "email": "john.sales@afrogazette.com",
        "total_adverts": "10",
        "pending_count": "2",
        "active_count": "5",
        "expired_count": "3",
        "total_revenue": "5000.00"
      }
    ],
    "expiringSoon": [
      {
        "id": 1,
        "client_name": "ABC Motors",
        "category": "automotive",
        "remaining_days": 3,
        "end_date": "2024-12-08",
        "slot_label": "10:00 AM",
        "sales_rep_name": "John Sales"
      }
    ],
    "slotUtilization": [
      {
        "slot_label": "06:00 AM",
        "occupied": 0,
        "available": 2
      },
      {
        "slot_label": "10:00 AM",
        "occupied": 2,
        "available": 0
      }
    ]
  }
}
```

### 5.2 Get Sales Rep Dashboard

```
Method: GET
URL: {{base_url}}/analytics/my-dashboard
Headers:
  Authorization: Bearer {{auth_token}}

Expected Response (200):
{
  "success": true,
  "data": {
    "summary": {
      "pending_count": "2",
      "active_count": "5",
      "expired_count": "3",
      "total_revenue": "5000.00"
    },
    "pending": [
      {
        "id": 2,
        "client_name": "XYZ Store",
        "category": "retail",
        "start_date": "2024-12-10",
        "days_paid": 5,
        "amount_paid": "250.00"
      }
    ],
    "active": [
      {
        "id": 1,
        "client_name": "ABC Motors",
        "category": "automotive",
        "slot_label": "10:00 AM",
        "remaining_days": 7,
        "end_date": "2024-12-11"
      }
    ],
    "expired": [
      {
        "id": 3,
        "client_name": "Old Client",
        "category": "fashion",
        "end_date": "2024-11-30"
      }
    ]
  }
}
```

---

## Testing Workflow

### Complete Test Sequence

**1. Setup (Admin)**
```
→ POST /auth/login (admin)
→ POST /users (create sales rep)
→ GET /slots (verify time slots exist)
```

**2. Sales Rep Creates Advert**
```
→ POST /auth/login (sales rep)
→ POST /adverts (create advert - status: pending)
→ GET /adverts (verify advert is pending)
→ GET /analytics/my-dashboard (check pending count)
```

**3. Admin Approves**
```
→ POST /auth/login (admin)
→ GET /adverts/pending (see pending advert)
→ GET /slots/check-availability?advertId=1&slotId=5
→ POST /adverts/1/approve (approve with slot 5)
→ GET /slots/calendar?date=2024-12-05 (verify scheduled)
```

**4. Verify Active**
```
→ POST /auth/login (sales rep)
→ GET /adverts?status=active (see approved advert)
→ GET /analytics/my-dashboard (check active count)
```

**5. Admin Extends**
```
→ POST /auth/login (admin)
→ POST /adverts/1/extend (add 5 more days)
→ GET /adverts (verify new end date)
```

---

## Error Codes Reference

```
200 OK - Success
201 Created - Resource created
400 Bad Request - Validation error or business rule violation
401 Unauthorized - Missing or invalid token
403 Forbidden - Insufficient permissions
404 Not Found - Resource doesn't exist
500 Internal Server Error - Server error
```

---

## Postman Collection Variables

Set these in Collection Variables:

```
base_url: http://localhost:5000/api
auth_token: (auto-set by login script)
admin_email: admin@afrogazette.com
admin_password: Admin@123
```

---

## Save Postman Collection

1. Click "..." next to collection name
2. Export
3. Save as: `AfroGazette_API_Collection.json`
4. Share with team!

---

Happy Testing! 🚀
