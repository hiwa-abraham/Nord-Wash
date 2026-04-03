## Route Mapping Feature

### Approach
- **Map library**: Leaflet + OpenStreetMap (free, no API key)
- **Routing**: OSRM (Open Source Routing Machine) for directions
- **Location**: Hybrid - browser geolocation + saved pickup addresses
- **Transport modes**: Walking, cycling, driving (OSRM supports these)

### Implementation Steps

1. **Install dependencies**: `leaflet`, `react-leaflet`, `@types/leaflet`

2. **Create `RouteMap` component** (`src/components/map/RouteMap.tsx`)
   - Leaflet map with two markers (user A & user B)
   - Route polyline between them
   - Transport mode selector (walk/bike/car)
   - Uses OSRM demo API for routing

3. **Create `RouteMapDialog` component** (`src/components/map/RouteMapDialog.tsx`)
   - Dialog wrapper for the map
   - Shows distance & estimated time
   - Can be opened from chat or order cards

4. **Create `useGeolocation` hook** (`src/hooks/useGeolocation.ts`)
   - Browser geolocation with fallback to saved address

5. **Integrate into ChatDialog** - Add a map button in the chat header

6. **Integrate into Orders page** - Add "View Route" button on order cards

7. **Add i18n translations** for all 5 languages
