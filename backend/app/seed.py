"""
Database Seeder for ZERO ROOT.
Initializes tables and seeds ONLY canonical reference agricultural commodities
and generic facility physical parameters.

MANDATORY USER CREATION RULE:
- Zero users are created during startup, migration, or seeding.
- User accounts must ONLY be created via explicit registration or administrative account management.
"""
from datetime import datetime, timezone
from .database import engine, Base, SessionLocal
from .models.models import Commodity, StorageFacility, StorageZone

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # 1. Seed canonical commodities if not present
    if not db.query(Commodity).first():
        commodities = [
            Commodity(
                name="tomato", category="Vegetable",
                optimal_temp_c=12.0, optimal_rh_min=85.0, optimal_rh_max=90.0,
                max_shelf_life_days=16.0, chilling_injury_threshold_c=9.0, base_respiration_rate=0.055
            ),
            Commodity(
                name="mango", category="Fruit",
                optimal_temp_c=13.0, optimal_rh_min=85.0, optimal_rh_max=92.0,
                max_shelf_life_days=21.0, chilling_injury_threshold_c=10.0, base_respiration_rate=0.085
            ),
            Commodity(
                name="banana", category="Fruit",
                optimal_temp_c=14.0, optimal_rh_min=88.0, optimal_rh_max=95.0,
                max_shelf_life_days=18.0, chilling_injury_threshold_c=12.5, base_respiration_rate=0.075
            ),
            Commodity(
                name="potato", category="Vegetable",
                optimal_temp_c=8.0, optimal_rh_min=90.0, optimal_rh_max=95.0,
                max_shelf_life_days=120.0, chilling_injury_threshold_c=4.0, base_respiration_rate=0.020
            ),
            Commodity(
                name="onion", category="Bulb",
                optimal_temp_c=2.0, optimal_rh_min=65.0, optimal_rh_max=75.0,
                max_shelf_life_days=180.0, chilling_injury_threshold_c=-1.0, base_respiration_rate=0.015
            ),
            Commodity(
                name="apple", category="Fruit",
                optimal_temp_c=1.0, optimal_rh_min=90.0, optimal_rh_max=95.0,
                max_shelf_life_days=150.0, chilling_injury_threshold_c=-1.0, base_respiration_rate=0.035
            ),
            Commodity(
                name="grape", category="Fruit",
                optimal_temp_c=0.0, optimal_rh_min=90.0, optimal_rh_max=95.0,
                max_shelf_life_days=60.0, chilling_injury_threshold_c=-1.5, base_respiration_rate=0.030
            )
        ]
        db.add_all(commodities)
        db.commit()

    # 2. Seed generic storage facilities if not present
    if not db.query(StorageFacility).first():
        trad_fac = StorageFacility(
            code="TRAD_FAC_01",
            name="Rural On-Farm Post-Harvest Store #1",
            facility_type="TRADITIONAL",
            location="Mandya Farm Yard",
            total_capacity_kg=5000.0,
            occupied_kg=0.0
        )
        db.add(trad_fac)
        
        cold_fac = StorageFacility(
            code="COLD_HUB_01",
            name="Zero Root Central Multi-Chamber Cold Hub",
            facility_type="COLD_WAREHOUSE",
            location="Bengaluru Rural Logistics Cluster",
            total_capacity_kg=35000.0,
            occupied_kg=0.0
        )
        db.add(cold_fac)
        db.commit()
        
        z_a = StorageZone(facility_id=cold_fac.id, zone_code="CH_A", name="Chamber A — Tropical Fruits", target_temp_c=13.0, target_rh_pct=90.0, capacity_crates=150, allocated_crates=0)
        z_b = StorageZone(facility_id=cold_fac.id, zone_code="CH_B", name="Chamber B — Solanaceous Vegetables", target_temp_c=10.0, target_rh_pct=90.0, capacity_crates=150, allocated_crates=0)
        z_c = StorageZone(facility_id=cold_fac.id, zone_code="CH_C", name="Chamber C — Bulb Cold/Dry Storage", target_temp_c=2.0, target_rh_pct=70.0, capacity_crates=180, allocated_crates=0)
        db.add_all([z_a, z_b, z_c])
        db.commit()

    db.close()

if __name__ == "__main__":
    seed_database()
