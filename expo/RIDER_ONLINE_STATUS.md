# Rider Online/Offline Status System

## Overview

When a rider toggles their online/offline status in the app, it updates the `isActive` flag in the `food-delivery-riders` DynamoDB table. This allows the backend to identify which riders are available for order assignment.

---

## How It Works

### 1. Backend API Endpoint

**Endpoint**: `PUT /api/v1/riders/{riderId}/status`

**Request Body**:
```json
{
  "isActive": true  // or false
}
```

**Response**:
```json
{
  "riderId": "RDR_123",
  "isActive": true,
  "lastSeen": "2026-01-24T10:30:00.000Z",
  "message": "Rider is now online"
}
```

**What it does**:
- Updates the `isActive` flag in the `food-delivery-riders` table
- Updates the `lastSeen` timestamp
- Returns the updated rider status

**Implementation**: `routes/rider_routes.py` → `RiderService.set_active_status()`

---

### 2. Frontend API Client

**File**: `lib/api.ts`

```typescript
export const riderStatusAPI = {
  toggleStatus: (riderId: string, isActive: boolean) =>
    api.put(`/api/v1/riders/${riderId}/status`, { isActive }),
}
```

---

### 3. Location Context

**File**: `contexts/LocationContext.tsx`

The `LocationContext` manages:
- **Online/Offline status**: `isOnline` state
- **Location tracking**: Starts when online, stops when offline
- **Toggle function**: `toggleOnline()` updates backend and local state

```typescript
const toggleOnline = async () => {
  const newStatus = !isOnline;
  await riderStatusAPI.toggleStatus(rider.riderId, newStatus);
  setIsOnline(newStatus);
};
```

**Key Features**:
- When rider goes **ONLINE**:
  - Updates backend: `isActive = true`
  - Starts location tracking (updates every 30 seconds)
  - Rider becomes available for order assignment

- When rider goes **OFFLINE**:
  - Updates backend: `isActive = false`
  - Stops location tracking
  - Rider won't receive new order assignments

---

### 4. Home Screen UI

**File**: `app/(tabs)/index.tsx`

The Orders screen (home screen) displays:
- **Header**: Shows rider name and online/offline status
- **Toggle Switch**: Green when online, gray when offline
- **Status Label**: "You are online" / "You are offline"

```tsx
<Switch
  value={isOnline}
  onValueChange={handleToggleOnline}
  trackColor={{ false: '#D1D5DB', true: '#10B981' }}
/>
```

When rider toggles the switch:
1. Calls `toggleOnline()` from LocationContext
2. Shows loading state while updating
3. Updates UI to reflect new status
4. If going online, starts location tracking
5. If going offline, stops location tracking

---

## Database Schema

**Table**: `food-delivery-riders`

**Updated Fields**:
- `isActive` (Boolean): `true` when rider is online, `false` when offline
- `lastSeen` (String): ISO timestamp of last status update

**Used For**:
- Finding available riders near a restaurant location
- Filtering riders who can accept new orders
- Tracking rider availability metrics

---

## Order Assignment Flow

1. Customer places order
2. Backend finds restaurant location
3. Backend queries `food-delivery-riders` table:
   ```
   isActive = true AND workingOnOrder is NULL
   ```
4. Filters riders within 5km radius
5. Assigns order to nearest available online rider
6. Sends push notification to rider

**Key Query**: `RiderService.find_available_riders_near(lat, lng, radius_km=5)`

This query only returns riders where `isActive = true`, ensuring only online riders receive order assignments.

---

## Testing

### Test the Online/Offline Toggle

1. **Login** to the rider app
2. Go to **Orders** tab (home screen)
3. **Toggle the switch** in the header
4. **Check logs**:
   ```
   📍 Location tracking started
   🔄 Rider status: ONLINE
   📍 Location updated: 12.9716, 77.5946
   ```

5. **Toggle offline**:
   ```
   📍 Location tracking stopped
   🔄 Rider status: OFFLINE
   ```

### Verify Backend Update

**Check DynamoDB**:
```bash
aws dynamodb get-item \
  --table-name food-delivery-riders-dev \
  --key '{"riderId": {"S": "RDR_123"}}'
```

**Look for**:
```json
{
  "isActive": { "BOOL": true },
  "lastSeen": { "S": "2026-01-24T10:30:00.000Z" }
}
```

### Test Order Assignment

1. **Go online** in rider app
2. **Place an order** from customer app
3. **Verify**:
   - Online rider receives push notification
   - Offline riders don't receive notification
   - Order appears in rider's "New" tab

---

## Location Tracking

When online, the rider app:
- **Updates location every 30 seconds** (or when moved 50+ meters)
- **Sends to backend**: `PUT /api/v1/riders/{riderId}/location`
- **Updates fields**: `lat`, `lng`, `speed`, `heading`, `lastSeen`

**Permissions Required**:
- Foreground location permission
- Background location permission (for tracking while app is in background)

**Battery Optimization**:
- Only tracks when online
- 30-second intervals (not continuous)
- 50-meter distance threshold

---

## Current Implementation Status

✅ **Backend**:
- API endpoint created: `PUT /api/v1/riders/{riderId}/status`
- Service method: `RiderService.set_active_status()`
- DynamoDB update: `isActive` and `lastSeen` fields

✅ **Frontend**:
- API client: `riderStatusAPI.toggleStatus()`
- Location context: Manages online/offline state
- UI toggle: Home screen header
- Location tracking: Auto-starts when online

✅ **Integration**:
- Toggle updates backend immediately
- Backend used for order assignment queries
- Only online riders receive new orders

---

## Next Steps (Optional Enhancements)

### 1. Auto-Offline Timer
- Set rider offline after 8 hours of inactivity
- Prevent battery drain from forgotten online status

### 2. Online Hours Tracking
- Track total hours online per day
- Display in earnings screen

### 3. Offline Reason
- When going offline, ask reason: "Break", "End of shift", etc.
- Helps with analytics

### 4. Force Offline
- If rider hasn't moved in 30 minutes while online
- Ask: "Are you still available?"

### 5. Push Notification on Assignment
- Only send if rider is truly online
- Verify `isActive = true` before sending FCM

---

**Last Updated**: January 24, 2026  
**Status**: ✅ Fully Implemented and Working
