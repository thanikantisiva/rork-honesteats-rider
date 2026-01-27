# Active Orders Protection

## Feature Overview

Riders cannot go offline or logout when they have active orders (RIDER_ASSIGNED, PICKED_UP, or OUT_FOR_DELIVERY). This ensures riders complete their deliveries before ending their shift.

## Implementation

### 1. **Toggle Offline Prevention**

**Location:** `app/(tabs)/index.tsx` - `handleToggleOnline()`

**Logic:**
```typescript
if (!targetStatus && activeOrders.length > 0) {
  // Show warning alert
  showAlert(
    'Cannot Go Offline',
    `You have ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}. 
    Please complete all deliveries before going offline.`,
    undefined,
    'warning'
  );
  return; // Prevent toggle
}
```

**User Experience:**
- Rider taps toggle to go offline
- If active orders exist → Alert appears
- Toggle remains in "Online" position
- Rider must complete all orders first

### 2. **Logout Prevention**

**Location:** `app/(tabs)/account.tsx` - `handleLogout()`

**Logic:**
```typescript
if (activeOrders.length > 0) {
  showAlert(
    'Cannot Logout',
    `You have ${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}. 
    Please complete all deliveries before logging out.`,
    undefined,
    'warning'
  );
  return; // Prevent logout
}
```

**User Experience:**
- Rider taps "Logout" button
- If active orders exist → Alert appears
- Logout is prevented
- Rider must complete all orders first

### 3. **Active Orders Counter**

**Location:** `app/(tabs)/index.tsx` - Header subGreeting

**Display Logic:**
```typescript
{isOnline 
  ? (activeOrders.length > 0 
      ? `${activeOrders.length} active order${activeOrders.length > 1 ? 's' : ''}`
      : 'You are online')
  : 'You are offline'
}
```

**Visual Examples:**
```
Hello, Ravi
1 active order          [Online] 🟢

Hello, Ravi
3 active orders         [Online] 🟢

Hello, Ravi
You are online          [Online] 🟢  (no orders)

Hello, Ravi
You are offline         [Offline] ⚪
```

## User Flows

### Scenario 1: Try to Go Offline with Active Orders

```
1. Rider is online with 2 active orders
2. Header shows: "2 active orders"
3. Rider taps toggle to go offline
4. ⚠️ Alert appears:
   
   Cannot Go Offline
   You have 2 active orders. Please complete 
   all deliveries before going offline.
   
   [OK]

5. Toggle remains "Online"
6. Rider continues deliveries
```

### Scenario 2: Try to Logout with Active Orders

```
1. Rider is online with 1 active order
2. Goes to Account tab
3. Taps "Logout"
4. ⚠️ Alert appears:
   
   Cannot Logout
   You have 1 active order. Please complete 
   all deliveries before logging out.
   
   [OK]

5. Logout prevented
6. Rider must complete order first
```

### Scenario 3: Complete All Orders, Then Go Offline

```
1. Rider has 1 active order
2. Header shows: "1 active order"
3. Completes delivery → Order moved to "Completed"
4. Header updates: "You are online"
5. Rider taps toggle to go offline
6. ✅ Success:
   
   You're Offline
   You won't receive new orders
   
   [OK]

7. Toggle switched to "Offline"
8. Location tracking stopped
```

### Scenario 4: Complete All Orders, Then Logout

```
1. Rider has 1 active order
2. Completes delivery
3. Goes to Account tab
4. Taps "Logout"
5. ⚠️ Confirmation appears:
   
   Logout
   Are you sure you want to logout?
   
   [Cancel]  [Logout]

6. Taps "Logout"
7. ✅ Rider goes offline with final location
8. Session cleared
9. Redirected to welcome screen
```

## What Counts as "Active Orders"

**Active Statuses:**
- `RIDER_ASSIGNED` - Newly assigned, going to pickup
- `PICKED_UP` - Collected from restaurant, ready to deliver
- `OUT_FOR_DELIVERY` - On the way to customer

**Not Active (Can Go Offline):**
- `DELIVERED` - Completed
- `CANCELLED` - Order cancelled
- No orders at all

## Business Logic

### Why This Protection?

1. **Customer Satisfaction**: Ensures orders in progress are completed
2. **Order Integrity**: Prevents abandoned orders
3. **Accountability**: Riders finish what they start
4. **System Reliability**: No orphaned orders in the system

### Edge Cases Handled

**Case 1: All Orders Completed**
```
activeOrders.length === 0
→ Can go offline ✅
→ Can logout ✅
```

**Case 2: Last Order Just Delivered**
```
Order marked as DELIVERED
→ Removed from activeOrders
→ Counter updates to 0
→ Can now go offline ✅
```

**Case 3: New Order Arrives While Going Offline**
```
Rider taps toggle → Check happens
→ activeOrders.length > 0
→ Toggle prevented ❌
→ Must complete new order
```

**Case 4: Force Close App**
```
App force closed by user
→ No validation can run
→ Backend handles cleanup
→ Order reassigned if needed
```

## Technical Implementation

### Files Modified

1. **`app/(tabs)/index.tsx`**
   - Added active order count in header
   - Added validation in `handleToggleOnline()`
   - Destructured `activeOrders` from `useOrders()`

2. **`app/(tabs)/account.tsx`**
   - Added validation in `handleLogout()`
   - Imported and used `useOrders()` hook

### Dependencies

- `useOrders()` context provides `activeOrders`
- Active orders = orders with status in `['RIDER_ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY']`
- Updated in real-time via order polling (every 30 seconds)

## Testing Checklist

- [ ] Rider cannot toggle offline with active orders
- [ ] Warning alert shows correct order count
- [ ] Rider can toggle offline with 0 active orders
- [ ] Rider cannot logout with active orders
- [ ] Warning alert shows correct order count
- [ ] Rider can logout with 0 active orders
- [ ] Active order counter updates in real-time
- [ ] Counter shows correct pluralization (order vs orders)
- [ ] After completing last order, can go offline
- [ ] After completing last order, can logout
- [ ] Alert styling is consistent (warning yellow)

## Future Enhancements

- [ ] Show list of active orders in the warning alert
- [ ] Add "View Orders" button in the warning alert
- [ ] Disable toggle switch visually when active orders exist
- [ ] Show tooltip on hover/long-press explaining why offline is disabled
- [ ] Add admin override for emergency situations
- [ ] Log attempts to go offline with active orders (analytics)
