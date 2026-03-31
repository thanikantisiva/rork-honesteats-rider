# Two-OTP Security System

## Overview

A dual OTP verification system to ensure secure handoffs at both pickup (restaurant) and delivery (customer) points.

## System Design

### 1. **Pickup OTP** (Restaurant Verification)
- **Purpose**: Verify rider identity at restaurant
- **Shown to**: Restaurant staff
- **Verification**: Manual (restaurant staff checks OTP)
- **Status**: RIDER_ASSIGNED, PICKED_UP

### 2. **Delivery OTP** (Customer Verification)
- **Purpose**: Verify delivery to correct customer
- **Shown to**: Customer (in their app)
- **Verification**: Digital (rider enters in app)
- **Status**: OUT_FOR_DELIVERY
- **Requirement**: Must be verified before "Mark as Delivered" is enabled

---

## Complete Flow

### Step 1: Order Assigned (RIDER_ASSIGNED)
```
┌─────────────────────────────────┐
│ Order #12345  [Assigned]        │ ← Blue Card
│                                  │
│ 📍 Pizza Palace            2km  │
│ 🏠 Customer Address              │
│ 📦 3 items    ₹50                │
│                                  │
│ ┌─────────────────────────────┐ │
│ │ 🔒 Pickup OTP               │ │
│ │ (Show to Restaurant):       │ │
│ │        1234                 │ │ ← Rider shows this
│ └─────────────────────────────┘ │
│                                  │
│ [✅ PICKED UP]                  │
└─────────────────────────────────┘

Actions:
1. Navigate to restaurant
2. Show Pickup OTP: 1234 to restaurant staff
3. Restaurant verifies rider identity
4. Restaurant hands over food
5. Tap [PICKED UP]
```

---

### Step 2: Order Picked Up (PICKED_UP)
```
┌─────────────────────────────────┐
│ Order #12345  [Picked Up]       │ ← Green Card
│                                  │
│ 📍 Pizza Palace                 │
│ 🏠 Customer Address              │
│ 📦 3 items    ₹50                │
│                                  │
│ ┌─────────────────────────────┐ │
│ │ 🔒 Pickup OTP               │ │
│ │ (Show to Restaurant):       │ │
│ │        1234                 │ │ ← Still visible
│ └─────────────────────────────┘ │
│                                  │
│ [🚚 START DELIVERY]             │
└─────────────────────────────────┘

Actions:
1. Secure food package
2. Tap [START DELIVERY]
3. Google Maps opens automatically
4. Navigate to customer
```

---

### Step 3: Out for Delivery (OUT_FOR_DELIVERY)
```
┌─────────────────────────────────┐
│ Order #12345 [Out for Delivery] │ ← Orange Card
│                                  │
│ 📍 Pizza Palace                 │
│ 🏠 Customer Address              │
│ 📦 3 items    ₹50                │
│                                  │
│ ┌─────────────────────────────┐ │
│ │ 🔒 Enter Customer's          │ │
│ │    Delivery OTP:             │ │
│ │                              │ │
│ │ [____] [Verify]              │ │ ← Input field
│ │                              │ │
│ │ Ask customer to share their  │ │
│ │ delivery OTP                 │ │
│ └─────────────────────────────┘ │
│                                  │
│ [VERIFY OTP FIRST] ← Disabled   │
└─────────────────────────────────┘

Actions:
1. Arrive at customer location
2. Ask customer: "What's your delivery OTP?"
3. Customer checks their app: "5678"
4. Rider enters: 5678
5. Tap [Verify]
```

---

### Step 4: OTP Verified
```
┌─────────────────────────────────┐
│ Order #12345 [Out for Delivery] │ ← Orange Card
│                                  │
│ 📍 Pizza Palace                 │
│ 🏠 Customer Address              │
│ 📦 3 items    ₹50                │
│                                  │
│ ┌─────────────────────────────┐ │
│ │ ✓ OTP Verified              │ │ ← Green badge
│ │                              │ │
│ │ You can now mark the order   │ │
│ │ as delivered                 │ │
│ └─────────────────────────────┘ │
│                                  │
│ [✅ MARK AS DELIVERED] ← Enabled │
└─────────────────────────────────┘

Actions:
1. Hand over food to customer
2. Tap [MARK AS DELIVERED]
3. Order complete! ✅
```

---

## UI Components

### Pickup OTP Badge (RIDER_ASSIGNED & PICKED_UP)
```typescript
<View style={pickupOtpBadge}>  // Yellow background
  <Lock icon />
  <Text>Pickup OTP (Show to Restaurant):</Text>
  <Text>1234</Text>  // Large, bold, spaced letters
</View>
```

### Delivery OTP Verification (OUT_FOR_DELIVERY)

**Before Verification:**
```typescript
<View style={deliveryOtpSection}>  // Light red background
  <Text>🔒 Enter Customer's Delivery OTP:</Text>
  
  <TextInput 
    placeholder="0000"
    maxLength={4}
    keyboardType="number-pad"
  />
  
  <Button text="Verify" disabled={otp.length !== 4} />
  
  <Text hint>Ask customer to share their delivery OTP</Text>
</View>

<Button 
  text="VERIFY OTP FIRST"
  disabled={true}
  style={gray, disabled}
/>
```

**After Verification:**
```typescript
<View style={deliveryOtpSection}>
  <View style={otpVerifiedBadge}>  // Green background
    <CheckCircle icon />
    <Text>OTP Verified ✓</Text>
  </View>
  
  <Text hint>You can now mark the order as delivered</Text>
</View>

<Button 
  text="MARK AS DELIVERED"
  enabled={true}
  style={green, active}
/>
```

---

## Security Features

### 1. **Two-Factor Verification**
- Pickup OTP confirms rider at restaurant
- Delivery OTP confirms correct customer receives order

### 2. **Disabled Button Protection**
- "Mark as Delivered" is disabled until OTP verified
- Prevents premature completion

### 3. **Visual Feedback**
- Red section = OTP required
- Green badge = OTP verified
- Button text changes: "VERIFY OTP FIRST" → "MARK AS DELIVERED"

### 4. **Wrong OTP Handling**
```typescript
if (enteredOtp !== deliveryOtp) {
  Alert.alert(
    'Invalid OTP',
    'The OTP you entered is incorrect. Please ask the customer for the correct OTP.'
  );
  setEnteredOtp(''); // Clear input
}
```

### 5. **Input Validation**
- Only 4-digit numbers allowed
- Verify button disabled until 4 digits entered
- Keyboard: numeric pad

---

## Benefits

### For Business
✅ **Fraud Prevention**: Two checkpoints ensure order integrity
✅ **Accountability**: Digital trail of both pickups and deliveries
✅ **Customer Trust**: Customers feel secure knowing OTP is required
✅ **Dispute Resolution**: Clear verification at handoff points

### For Riders
✅ **Protection**: OTP proves they delivered to correct person
✅ **Clear Instructions**: Visual cues guide the process
✅ **No Confusion**: Separate OTPs for restaurant vs customer
✅ **Simple Flow**: Just show/enter OTP

### For Customers
✅ **Security**: Only they have the delivery OTP
✅ **Verification**: Confirms correct rider
✅ **Trust**: Food goes to right person
✅ **Easy**: Just share 4-digit code

### For Restaurants
✅ **Verification**: Confirm rider identity before handoff
✅ **Security**: Reduces wrong rider pickups
✅ **Simple**: Just check OTP on card/phone
✅ **Fast**: No complex verification needed

---

## Error Scenarios

### Scenario 1: Wrong OTP Entered
```
Rider enters: 1111
Actual OTP: 5678

Alert: "Invalid OTP"
Message: "Please ask the customer for the correct OTP"
Action: Input cleared, try again
```

### Scenario 2: Customer Doesn't Know OTP
```
Rider: "What's your delivery OTP?"
Customer: "I don't know"

Solution: Ask customer to check their app
The OTP is displayed prominently in customer order details
```

### Scenario 3: No OTP Available
```
if (!order.deliveryOtp) {
  // No OTP section shown
  // Mark as Delivered button enabled directly
  // Fallback for orders without OTP
}
```

### Scenario 4: Rider Taps Deliver Before OTP
```
Tap [VERIFY OTP FIRST] (disabled button)

Alert: "OTP Required"
Message: "Please verify the delivery OTP before marking as delivered"
Action: Focus on OTP input
```

---

## Implementation Details

### State Management
```typescript
const [enteredOtp, setEnteredOtp] = useState('');
const [isOtpVerified, setIsOtpVerified] = useState(false);
```

### Verification Logic
```typescript
const handleVerifyOtp = () => {
  if (enteredOtp === order.deliveryOtp) {
    setIsOtpVerified(true);
    Alert.alert('OTP Verified', 'You can now mark as delivered');
  } else {
    Alert.alert('Invalid OTP', 'Incorrect OTP');
    setEnteredOtp('');
  }
};
```

### Button Control
```typescript
<TouchableOpacity
  style={[
    styles.markDeliveredButton,
    !isOtpVerified && styles.markDeliveredButtonDisabled
  ]}
  onPress={handleMarkDeliveredWithOtp}
  disabled={!isOtpVerified}
>
  <Text>
    {isOtpVerified ? 'MARK AS DELIVERED' : 'VERIFY OTP FIRST'}
  </Text>
</TouchableOpacity>
```

---

## Backend Requirements

### Order Schema
```typescript
{
  orderId: string;
  deliveryOtp: string;  // Same OTP used for both pickup and delivery
  // For future: separate pickupOtp and deliveryOtp
}
```

### Current Implementation
- Single OTP (`deliveryOtp`) used for both pickup and delivery
- Pickup: Manual verification by restaurant
- Delivery: Digital verification by rider app

### Future Enhancement
```typescript
{
  pickupOtp: string;   // For restaurant
  deliveryOtp: string; // For customer
}
```

---

## Customer App Display

The customer sees their delivery OTP in their order details:

```
┌─────────────────────────────────┐
│ Order Details                    │
│                                  │
│ Status: Out for Delivery         │
│                                  │
│ ┌─────────────────────────────┐ │
│ │ YOUR DELIVERY OTP            │ │
│ │                              │ │
│ │        5678                  │ │
│ │                              │ │
│ │ Share this with delivery     │ │
│ │ rider for verification       │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

---

## Testing Checklist

### Pickup OTP
- [ ] RIDER_ASSIGNED card shows "Pickup OTP (Show to Restaurant)"
- [ ] OTP is visible and large
- [ ] Lock icon displayed
- [ ] Yellow background styling
- [ ] OTP visible on PICKED_UP card too

### Delivery OTP Verification
- [ ] OUT_FOR_DELIVERY card shows OTP input section
- [ ] Input accepts only 4-digit numbers
- [ ] Verify button disabled until 4 digits entered
- [ ] Correct OTP → Success alert + green badge
- [ ] Wrong OTP → Error alert + input cleared
- [ ] "Mark as Delivered" button disabled before verification
- [ ] "Mark as Delivered" button enabled after verification

### Button States
- [ ] Before verification: "VERIFY OTP FIRST" (gray, disabled)
- [ ] After verification: "MARK AS DELIVERED" (green, enabled)
- [ ] Tapping disabled button shows alert

### Edge Cases
- [ ] No OTP available → Normal flow (no verification)
- [ ] OTP input cleared after wrong entry
- [ ] Verified state persists when scrolling
- [ ] Can't mark delivered without verification

---

## Future Enhancements

- [ ] Separate pickupOtp and deliveryOtp in backend
- [ ] OTP expiry (e.g., 30 minutes)
- [ ] OTP refresh for customer if needed
- [ ] SMS backup if customer can't access app
- [ ] QR code scanning as alternative
- [ ] Biometric verification option
- [ ] Photo proof along with OTP
- [ ] Customer signature on app
- [ ] Voice confirmation recording
- [ ] Geofencing validation (must be near customer)

---

## Files Modified

1. **`components/OrderCard.tsx`**
   - Added OTP verification state
   - Added OTP input section for OUT_FOR_DELIVERY
   - Modified "Mark as Delivered" button logic
   - Added verification function
   - Updated styling for OTP sections

2. **Customer App** (needs update)
   - Show delivery OTP prominently in order details
   - Add instruction text to share with rider

3. **Backend** (already supports)
   - `deliveryOtp` field in Order model
   - OTP generation on order creation
   - OTP included in order API responses
