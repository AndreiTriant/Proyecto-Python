"""
Modelos de base de datos. Usan db de extensions (sin importar app).
"""
import enum
from datetime import datetime, timezone

from config import (
    EMAIL_MAX_LEN,
    PASSWORD_MAX_LEN,
    PASSWORD_MIN_LEN,
    USUARIO_MAX_LEN,
)

from extensions import db


class Usuario(db.Model):
    """Usuario para login: usuario, email (único), contraseña hasheada."""
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    usuario = db.Column(db.String(USUARIO_MAX_LEN), nullable=False)
    email = db.Column(db.String(EMAIL_MAX_LEN), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relaciones
    meals = db.relationship("Meal", back_populates="user", lazy="select")
    diet_plans = db.relationship("DietPlan", back_populates="user", lazy="select")
    meal_templates = db.relationship("MealTemplate", back_populates="user", lazy="select")
    daily_checkins = db.relationship("DailyCheckin", back_populates="user", lazy="select")
    weight_entries = db.relationship("WeightEntry", back_populates="user", lazy="select")

    def to_dict(self):
        return {"id": self.id, "usuario": self.usuario, "email": self.email}


class FoodItem(db.Model):
    """
    Representa una porción completa de comida con sus valores nutricionales.
    Ejemplo: "avena con leche", "arroz con pollo", "yogur natural".
    """
    __tablename__ = "food_items"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(150), nullable=False)

    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(10), default="g")

    calories = db.Column(db.Float, nullable=False)
    protein = db.Column(db.Float)
    fat = db.Column(db.Float)
    carbs = db.Column(db.Float)
    sugar = db.Column(db.Float)
    fiber = db.Column(db.Float)

    meal_foods = db.relationship("MealFood", back_populates="food_item", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "quantity": self.quantity,
            "unit": self.unit,
            "calories": self.calories,
            "protein": self.protein,
            "fat": self.fat,
            "carbs": self.carbs,
            "sugar": self.sugar,
            "fiber": self.fiber,
        }


class Meal(db.Model):
    """
    Representa una comida de un usuario en un día concreto.
    order indica el orden en el que se consume durante el día.
    """
    __tablename__ = "meals"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    order = db.Column(db.Integer, nullable=False)

    date = db.Column(db.Date, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("user_id", "date", "order"),
        db.Index("idx_meal_user_date", "user_id", "date"),
    )

    # Relaciones
    user = db.relationship("Usuario", back_populates="meals", lazy="select")
    meal_foods = db.relationship("MealFood", back_populates="meal", lazy="select")
    diet_plan_meals = db.relationship(
        "DietPlanMeal", back_populates="meal", lazy="select"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "order": self.order,
            "date": self.date.isoformat(),
        }


class MealFood(db.Model):
    """
    Relación entre comidas y porciones de comida.
    meals_number indica cuántas comidas tiene la dieta ese día.
    """
    __tablename__ = "meal_foods"

    id = db.Column(db.Integer, primary_key=True)

    meal_id = db.Column(db.Integer, db.ForeignKey("meals.id"), nullable=False)
    food_item_id = db.Column(db.Integer, db.ForeignKey("food_items.id"), nullable=False)

    meals_number = db.Column(db.Integer, nullable=False)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relaciones
    meal = db.relationship("Meal", back_populates="meal_foods", lazy="select")
    food_item = db.relationship("FoodItem", back_populates="meal_foods", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "meal_id": self.meal_id,
            "food_item_id": self.food_item_id,
            "meals_number": self.meals_number,
        }


class DietPlan(db.Model):
    """Plan semanal reutilizable (Diet). Solo uno activo por usuario."""
    __tablename__ = "diet_plans"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    name = db.Column(db.String(100), nullable=True, default="Mi dieta")
    is_active = db.Column(db.Boolean, nullable=False, default=False)

    # Relaciones
    user = db.relationship("Usuario", back_populates="diet_plans", lazy="select")
    diet_plan_meals = db.relationship(
        "DietPlanMeal", back_populates="diet_plan", lazy="select"
    )
    diet_days = db.relationship(
        "DietDay", back_populates="diet_plan", lazy="select", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "is_active": self.is_active,
        }


class WeekDay(enum.Enum):
    """Días de la semana para planificación de dietas."""
    lunes = "lunes"
    martes = "martes"
    miercoles = "miercoles"
    jueves = "jueves"
    viernes = "viernes"
    sabado = "sabado"
    domingo = "domingo"


class DietPlanMeal(db.Model):
    """
    Define qué comidas pertenecen a una dieta y en qué día de la semana.
    """
    __tablename__ = "diet_plan_meals"

    id = db.Column(db.Integer, primary_key=True)

    diet_plan_id = db.Column(db.Integer, db.ForeignKey("diet_plans.id"), nullable=False)
    meal_id = db.Column(db.Integer, db.ForeignKey("meals.id"), nullable=False)

    day = db.Column(db.Enum(WeekDay), nullable=False)

    quantity = db.Column(db.Float, nullable=False)

    # Relaciones
    diet_plan = db.relationship("DietPlan", back_populates="diet_plan_meals", lazy="select")
    meal = db.relationship("Meal", back_populates="diet_plan_meals", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "diet_plan_id": self.diet_plan_id,
            "meal_id": self.meal_id,
            "day": self.day.value,
            "quantity": self.quantity,
        }


# --- Nuevo dominio: plantillas de comida, días de dieta, seguimiento y peso ---


class MealTemplate(db.Model):
    """
    Comida reutilizable (plantilla), no anclada a una fecha.
    Ejemplo: "Arroz con pollo". Tiene totales nutricionales y componentes.
    """
    __tablename__ = "meal_templates"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    name = db.Column(db.String(150), nullable=False)
    meal_type = db.Column(db.String(50), default="")  # opcional: desayuno, comida, cena, snack
    notes = db.Column(db.String(500), default="")

    calories = db.Column(db.Float, default=0.0)
    protein = db.Column(db.Float, default=0.0)
    fat = db.Column(db.Float, default=0.0)
    carbs = db.Column(db.Float, default=0.0)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("Usuario", back_populates="meal_templates", lazy="select")
    components = db.relationship(
        "MealComponent", back_populates="meal_template", lazy="select", cascade="all, delete-orphan"
    )
    diet_day_meals = db.relationship(
        "DietDayMeal", back_populates="meal_template", lazy="select"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "meal_type": self.meal_type,
            "notes": self.notes,
            "calories": self.calories,
            "protein": self.protein,
            "fat": self.fat,
            "carbs": self.carbs,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MealComponent(db.Model):
    """
    Componente nutricional de una comida plantilla.
    Ejemplo: arroz 150 g, pollo 120 g. Incluye cantidad y valores por porción.
    """
    __tablename__ = "meal_components"

    id = db.Column(db.Integer, primary_key=True)
    meal_template_id = db.Column(
        db.Integer, db.ForeignKey("meal_templates.id"), nullable=False
    )

    name = db.Column(db.String(150), nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(10), default="g")

    calories = db.Column(db.Float, default=0.0)
    protein = db.Column(db.Float, default=0.0)
    fat = db.Column(db.Float, default=0.0)
    carbs = db.Column(db.Float, default=0.0)

    meal_template = db.relationship(
        "MealTemplate", back_populates="components", lazy="select"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "meal_template_id": self.meal_template_id,
            "name": self.name,
            "quantity": self.quantity,
            "unit": self.unit,
            "calories": self.calories,
            "protein": self.protein,
            "fat": self.fat,
            "carbs": self.carbs,
        }


class DietDay(db.Model):
    """Uno de los 7 días lógicos de una dieta (lunes..domingo)."""
    __tablename__ = "diet_days"

    id = db.Column(db.Integer, primary_key=True)
    diet_plan_id = db.Column(
        db.Integer, db.ForeignKey("diet_plans.id"), nullable=False
    )
    weekday = db.Column(db.Enum(WeekDay), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("diet_plan_id", "weekday", name="uq_diet_plan_weekday"),
    )

    diet_plan = db.relationship("DietPlan", back_populates="diet_days", lazy="select")
    diet_day_meals = db.relationship(
        "DietDayMeal",
        back_populates="diet_day",
        lazy="select",
        order_by="DietDayMeal.order",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "diet_plan_id": self.diet_plan_id,
            "weekday": self.weekday.value,
        }


class DietDayMeal(db.Model):
    """Asignación de una comida plantilla a un día de dieta, con orden y etiqueta."""
    __tablename__ = "diet_day_meals"

    id = db.Column(db.Integer, primary_key=True)
    diet_day_id = db.Column(
        db.Integer, db.ForeignKey("diet_days.id"), nullable=False
    )
    meal_template_id = db.Column(
        db.Integer, db.ForeignKey("meal_templates.id"), nullable=False
    )

    order = db.Column(db.Integer, nullable=False, default=0)
    label = db.Column(db.String(50), default="")  # ej: Desayuno, Comida, Cena

    diet_day = db.relationship("DietDay", back_populates="diet_day_meals", lazy="select")
    meal_template = db.relationship(
        "MealTemplate", back_populates="diet_day_meals", lazy="select"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "diet_day_id": self.diet_day_id,
            "meal_template_id": self.meal_template_id,
            "order": self.order,
            "label": self.label,
        }


class CheckinStatus(enum.Enum):
    """Estado de seguimiento del día."""
    followed_exact = "followed_exact"       # dieta seguida correctamente
    followed_other_day = "followed_other_day"  # siguió dieta usando comidas de otro día
    not_followed = "not_followed"           # dieta no seguida


class DailyCheckin(db.Model):
    """Registro diario de adherencia a la dieta (fecha calendario real)."""
    __tablename__ = "daily_checkins"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)

    status = db.Column(db.Enum(CheckinStatus), nullable=False)
    diet_plan_id = db.Column(db.Integer, db.ForeignKey("diet_plans.id"), nullable=True)
    weekday_used = db.Column(db.Enum(WeekDay), nullable=True)  # si siguió otro día
    notes = db.Column(db.String(500), default="")

    __table_args__ = (db.UniqueConstraint("user_id", "date", name="uq_user_date"),)

    user = db.relationship("Usuario", back_populates="daily_checkins", lazy="select")
    meal_logs = db.relationship(
        "DailyCheckinMealLog",
        back_populates="daily_checkin",
        lazy="select",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date": self.date.isoformat(),
            "status": self.status.value if self.status else None,
            "diet_plan_id": self.diet_plan_id,
            "weekday_used": self.weekday_used.value if self.weekday_used else None,
            "notes": self.notes,
        }


class DailyCheckinMealLog(db.Model):
    """Comida libre registrada cuando el usuario no siguió la dieta."""
    __tablename__ = "daily_checkin_meal_logs"

    id = db.Column(db.Integer, primary_key=True)
    daily_checkin_id = db.Column(
        db.Integer, db.ForeignKey("daily_checkins.id"), nullable=False
    )

    name = db.Column(db.String(200), nullable=False)
    calories_approx = db.Column(db.Float, nullable=True)

    daily_checkin = db.relationship(
        "DailyCheckin", back_populates="meal_logs", lazy="select"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "daily_checkin_id": self.daily_checkin_id,
            "name": self.name,
            "calories_approx": self.calories_approx,
        }


class WeightEntry(db.Model):
    """Registro de peso del usuario en una fecha."""
    __tablename__ = "weight_entries"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    weight_kg = db.Column(db.Float, nullable=False)
    note = db.Column(db.String(200), default="")

    user = db.relationship("Usuario", back_populates="weight_entries", lazy="select")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "date": self.date.isoformat(),
            "weight_kg": self.weight_kg,
            "note": self.note,
        }