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
    """Plantilla de dieta reutilizable."""
    __tablename__ = "diet_plans"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    name = db.Column(db.String(100))

    # Relaciones
    user = db.relationship("Usuario", back_populates="diet_plans", lazy="select")
    diet_plan_meals = db.relationship(
        "DietPlanMeal", back_populates="diet_plan", lazy="select"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
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