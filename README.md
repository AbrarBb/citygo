# 🚌 CityGo - Smart Urban Bus System

CityGo is a comprehensive, modern smart bus management system designed to revolutionize urban transportation in Dhaka.  
It connects passengers, drivers, supervisors, and administrators through a unified platform featuring:

- Real-time tracking  
- Contactless NFC payments  
- Eco-friendly impact monitoring  

---

## 🏗️ System Architecture

The following diagram illustrates how the frontend connects with Supabase services and external APIs to deliver real-time features.

```mermaid
graph TD
    subgraph Client_Side
        UI[React UI (shadcn/ui)]
        State[State Management (Context/Query)]
        Map[Google Maps Integration]
    end

    subgraph Backend_Services_Supabase
        Auth[Authentication & RLS]
        DB[(PostgreSQL Database)]
        Realtime[Realtime Subscriptions]
    end

    subgraph External_APIs
        GMaps[Google Maps Platform]
        AirQual[Google Air Quality API]
    end

    UI --> State
    State -->|REST / RPC| DB
    State -->|Subscribe| Realtime
    State -->|Auth Requests| Auth
    Map -->|Tiles & Routing| GMaps
    UI -->|Fetch AQI| AirQual
