"""
Relational Database Entities for ZERO ROOT.
Covers users, farmer profiles, commodities, storage parameters, batches,
inspections, facilities, zones, allocations, trucks, routes, simulations,
sensor readings, predictions, alerts, corrective actions, market prices,
forecasts, market events, profit scenarios, QR sessions, notifications, and audit logs.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from ..database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password = Column(String(256), nullable=False)
    full_name = Column(String(128), nullable=False)
    phone = Column(String(32), nullable=True)
    role = Column(String(32), default="FARMER") # FARMER, ADMIN, MANAGER
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False)
    batches = relationship("ProduceBatch", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")

class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    farm_name = Column(String(128), nullable=False)
    region = Column(String(64), nullable=False) # e.g. "Kolar", "Mandya", "Bengaluru Rural"
    contact_phone = Column(String(32), nullable=True)
    total_acreage = Column(Float, default=5.0)
    created_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="farmer_profile")
    batches = relationship("ProduceBatch", back_populates="farmer")

class Commodity(Base):
    __tablename__ = "commodities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(64), unique=True, index=True, nullable=False) # mango, banana, tomato, potato, onion
    category = Column(String(32), nullable=False) # Fruit, Vegetable, Bulb
    optimal_temp_c = Column(Float, nullable=False)
    optimal_rh_min = Column(Float, nullable=False)
    optimal_rh_max = Column(Float, nullable=False)
    max_shelf_life_days = Column(Float, nullable=False)
    chilling_injury_threshold_c = Column(Float, nullable=False)
    base_respiration_rate = Column(Float, default=0.05)
    created_at = Column(DateTime, default=utc_now)
    
    batches = relationship("ProduceBatch", back_populates="commodity_rel")
    parameters = relationship("CommodityStorageParameter", back_populates="commodity_rel", uselist=False)

class CommodityStorageParameter(Base):
    __tablename__ = "commodity_storage_parameters"
    id = Column(Integer, primary_key=True, index=True)
    commodity_id = Column(Integer, ForeignKey("commodities.id"), unique=True, nullable=False)
    dalton_o2_min_kpa = Column(Float, default=18.0)
    dalton_o2_max_kpa = Column(Float, default=21.5)
    ethylene_production_level = Column(String(32), default="MEDIUM") # LOW, MEDIUM, HIGH, CLIMACTERIC
    ethylene_sensitivity = Column(String(32), default="HIGH")
    co2_tolerance_pct = Column(Float, default=5.0)
    q10_factor = Column(Float, default=2.1)
    activation_energy_kj = Column(Float, default=50.0)
    
    commodity_rel = relationship("Commodity", back_populates="parameters")

class ProduceBatch(Base):
    __tablename__ = "produce_batches"
    id = Column(Integer, primary_key=True, index=True)
    batch_code = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    farmer_id = Column(Integer, ForeignKey("farmer_profiles.id"), nullable=True)
    commodity_id = Column(Integer, ForeignKey("commodities.id"), nullable=False)
    commodity_name = Column(String(64), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    harvest_date = Column(DateTime, default=utc_now)
    initial_quality_score = Column(Float, default=95.0)
    current_quality_score = Column(Float, default=95.0)
    storage_type = Column(String(32), default="TRADITIONAL") # TRADITIONAL, COLD_STORAGE, IN_TRANSIT
    current_location = Column(String(128), default="On-Farm Store")
    simulation_status = Column(String(32), default="ACTIVE") # ACTIVE, PAUSED, COMPLETED, TERMINATED
    last_executed_at = Column(DateTime, default=utc_now)
    remaining_shelf_life_days = Column(Float, default=14.0)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="batches")
    farmer = relationship("FarmerProfile", back_populates="batches")
    commodity_rel = relationship("Commodity", back_populates="batches")
    inspections = relationship("InspectionRecord", back_populates="batch", cascade="all, delete-orphan")
    allocations = relationship("StorageAllocation", back_populates="batch", cascade="all, delete-orphan")
    predictions = relationship("PredictionRecord", back_populates="batch", cascade="all, delete-orphan")
    qr_sessions = relationship("QRAccessSession", back_populates="batch", cascade="all, delete-orphan")

class InspectionRecord(Base):
    __tablename__ = "inspections"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("produce_batches.id"), nullable=True)
    classification = Column(String(32), nullable=False) # GOOD, MODERATELY_DAMAGED, REJECTED
    grade = Column(String(64), nullable=False)
    confidence_score = Column(Float, nullable=False)
    defect_surface_ratio_pct = Column(Float, default=0.0)
    defects_json = Column(Text, nullable=True)
    destination = Column(String(128), nullable=False)
    inspected_at = Column(DateTime, default=utc_now)
    
    batch = relationship("ProduceBatch", back_populates="inspections")
    results = relationship("InspectionResult", back_populates="inspection")

class InspectionResult(Base):
    __tablename__ = "inspection_results"
    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"), nullable=False)
    defect_type = Column(String(64), nullable=False) # NECROSIS, ROT, BRUISING, BLEMISH
    severity_pct = Column(Float, default=0.0)
    bounding_box_json = Column(Text, nullable=True)
    
    inspection = relationship("InspectionRecord", back_populates="results")

class StorageFacility(Base):
    __tablename__ = "storage_facilities"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    facility_type = Column(String(32), nullable=False) # TRADITIONAL, COLD_WAREHOUSE
    location = Column(String(128), nullable=False)
    total_capacity_kg = Column(Float, nullable=False)
    occupied_kg = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)
    
    zones = relationship("StorageZone", back_populates="facility")

class StorageZone(Base):
    __tablename__ = "storage_zones"
    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("storage_facilities.id"), nullable=False)
    zone_code = Column(String(32), nullable=False)
    name = Column(String(128), nullable=False)
    target_temp_c = Column(Float, nullable=False)
    target_rh_pct = Column(Float, nullable=False)
    capacity_crates = Column(Integer, default=100)
    allocated_crates = Column(Integer, default=0)
    
    facility = relationship("StorageFacility", back_populates="zones")
    allocations = relationship("StorageAllocation", back_populates="zone")

class StorageAllocation(Base):
    __tablename__ = "storage_allocations"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("produce_batches.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("storage_zones.id"), nullable=False)
    crates_count = Column(Integer, default=1)
    allocated_at = Column(DateTime, default=utc_now)
    released_at = Column(DateTime, nullable=True)
    
    batch = relationship("ProduceBatch", back_populates="allocations")
    zone = relationship("StorageZone", back_populates="allocations")

class Truck(Base):
    __tablename__ = "trucks"
    id = Column(Integer, primary_key=True, index=True)
    plate_number = Column(String(32), unique=True, index=True, nullable=False)
    driver_name = Column(String(128), default="Driver")
    driver_phone = Column(String(32), nullable=True)
    reefer_model = Column(String(64), default="ThermoKing V-500 Max")
    cargo_capacity_kg = Column(Float, default=5000.0)
    active_corridor = Column(String(128), default="Bengaluru -> Mandya")
    created_at = Column(DateTime, default=utc_now)

class TransportationRoute(Base):
    __tablename__ = "transportation_routes"
    id = Column(Integer, primary_key=True, index=True)
    origin = Column(String(128), nullable=False)
    destination = Column(String(128), nullable=False)
    distance_km = Column(Float, nullable=False)
    nominal_transit_minutes = Column(Float, nullable=False)
    waypoints_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class SimulationRecord(Base):
    __tablename__ = "simulations"
    id = Column(Integer, primary_key=True, index=True)
    sim_uuid = Column(String(64), unique=True, index=True, nullable=False)
    scenario_key = Column(String(64), default="NORMAL")
    is_running = Column(Boolean, default=True)
    speed_factor = Column(Float, default=1.0)
    started_at = Column(DateTime, default=utc_now)
    ended_at = Column(DateTime, nullable=True)
    
    states = relationship("SimulationStateRecord", back_populates="simulation")

class SimulationStateRecord(Base):
    __tablename__ = "simulation_states"
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"), nullable=False)
    sim_time_seconds = Column(Float, nullable=False)
    ambient_temp_c = Column(Float, nullable=False)
    ambient_rh_pct = Column(Float, nullable=False)
    state_payload = Column(Text, nullable=False)
    recorded_at = Column(DateTime, default=utc_now)
    
    simulation = relationship("SimulationRecord", back_populates="states")

class VirtualSensorReading(Base):
    __tablename__ = "virtual_sensor_readings"
    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(String(64), index=True, nullable=False)
    sensor_type = Column(String(32), nullable=False) # TEMPERATURE, HUMIDITY, OXYGEN, PRESSURE, GPS
    asset_id = Column(String(64), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(16), nullable=False)
    data_label = Column(String(16), default="SIMULATED")
    recorded_at = Column(DateTime, default=utc_now)

class PredictionRecord(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("produce_batches.id"), nullable=True)
    model_name = Column(String(64), nullable=False) # ARRHENIUS_Q10, PRICE_XGBOOST, OPENCV_HSV
    predicted_quality = Column(Float, nullable=True)
    remaining_shelf_life_days = Column(Float, nullable=True)
    spoilage_risk_pct = Column(Float, nullable=True)
    confidence_score = Column(Float, default=0.92)
    data_label = Column(String(16), default="PREDICTED")
    created_at = Column(DateTime, default=utc_now)
    
    batch = relationship("ProduceBatch", back_populates="predictions")

class AlertRecord(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    module = Column(String(64), nullable=False)
    severity = Column(String(32), nullable=False) # CRITICAL, WARNING, INFO
    title = Column(String(128), nullable=False)
    message = Column(Text, nullable=False)
    recommended_action = Column(Text, nullable=False)
    acknowledged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    
    actions = relationship("CorrectiveAction", back_populates="alert")

class CorrectiveAction(Base):
    __tablename__ = "corrective_actions"
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=True)
    action_type = Column(String(64), nullable=False) # ADJUST_COOLING, INSPECT_DOOR, EXPEDITE_SALE
    description = Column(Text, nullable=False)
    executed = Column(Boolean, default=False)
    executed_at = Column(DateTime, nullable=True)
    
    alert = relationship("AlertRecord", back_populates="actions")

class MarketPriceRecord(Base):
    __tablename__ = "market_prices"
    id = Column(Integer, primary_key=True, index=True)
    commodity_name = Column(String(64), index=True, nullable=False)
    market_name = Column(String(64), index=True, nullable=False)
    state = Column(String(64), default="Karnataka", index=True)
    district = Column(String(64), index=True, nullable=True)
    variety = Column(String(64), nullable=True)
    grade = Column(String(32), nullable=True)
    arrival_date = Column(String(32), nullable=True)
    min_price_inr = Column(Float, nullable=True)
    max_price_inr = Column(Float, nullable=True)
    modal_price_inr = Column(Float, nullable=True)
    min_price_per_kg_inr = Column(Float, nullable=True)
    max_price_per_kg_inr = Column(Float, nullable=True)
    modal_price_per_kg_inr = Column(Float, nullable=True)
    price_per_kg_inr = Column(Float, nullable=False)
    unit = Column(String(32), default="Rs/Quintal")
    observation_date = Column(DateTime, default=utc_now)
    api_queried_at = Column(DateTime, default=utc_now)
    source = Column(String(64), default="data.gov.in — Agmarknet")
    is_stale = Column(Boolean, default=False)
    data_label = Column(String(16), default="LIVE")

# Alias for MandiPriceRecord
MandiPriceRecord = MarketPriceRecord

class PriceForecastRecord(Base):
    __tablename__ = "price_forecasts"
    id = Column(Integer, primary_key=True, index=True)
    commodity_name = Column(String(64), index=True, nullable=False)
    market_name = Column(String(64), nullable=False)
    forecast_horizon_days = Column(Integer, nullable=False)
    forecast_date = Column(DateTime, nullable=False)
    predicted_price_inr = Column(Float, nullable=False)
    lower_bound_inr = Column(Float, nullable=False)
    upper_bound_inr = Column(Float, nullable=False)
    model_algorithm = Column(String(64), default="ARIMA_XGBoost_Ensemble")
    data_label = Column(String(16), default="PREDICTED")
    created_at = Column(DateTime, default=utc_now)

class MarketEvent(Base):
    __tablename__ = "market_events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    event_type = Column(String(64), nullable=False) # FESTIVAL, MONSOON, HIGHWAY_DISRUPTION, EXPORT_SURGE
    impact_factor = Column(Float, default=1.0)
    commodity_name = Column(String(64), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)

class ProfitScenario(Base):
    __tablename__ = "profit_scenarios"
    id = Column(Integer, primary_key=True, index=True)
    commodity_name = Column(String(64), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    sell_immediately_revenue_inr = Column(Float, nullable=False)
    store_later_revenue_inr = Column(Float, nullable=False)
    storage_cost_inr = Column(Float, nullable=False)
    spoilage_loss_inr = Column(Float, nullable=False)
    net_gain_inr = Column(Float, nullable=False)
    recommendation = Column(String(32), nullable=False) # SELL_NOW, STORE_AND_SELL_LATER
    evaluated_at = Column(DateTime, default=utc_now)

class QRAccessSession(Base):
    __tablename__ = "qr_access_sessions"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    batch_id = Column(Integer, ForeignKey("produce_batches.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    asset_type = Column(String(32), nullable=False) # TRUCK, COLD_STORAGE, BATCH
    asset_id = Column(String(64), nullable=False)
    asset_title = Column(String(128), nullable=False)
    target_url = Column(String(256), nullable=False)
    qr_data_url = Column(Text, nullable=False)
    access_count = Column(Integer, default=0)
    is_revoked = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=utc_now)
    
    batch = relationship("ProduceBatch", back_populates="qr_sessions")

class NotificationSubscription(Base):
    __tablename__ = "notification_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    endpoint = Column(Text, nullable=False)
    p256dh_key = Column(String(128), nullable=True)
    auth_key = Column(String(128), nullable=True)
    subscribed_at = Column(DateTime, default=utc_now)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(128), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="audit_logs")
