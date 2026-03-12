"""
Script para insertar datos de ejemplo en la base de datos.
Se puede ejecutar varias veces sin duplicar entradas clave.
"""
from datetime import date

from app import app, db
from models import Usuario, FoodItem, Meal, MealFood, DietPlan, DietPlanMeal, WeekDay


def get_or_create_user(usuario: str, email: str, password_hash: str = "demo") -> Usuario:
    user = db.session.execute(
        db.select(Usuario).where(Usuario.email == email)
    ).scalar_one_or_none()
    if user:
        return user
    user = Usuario(usuario=usuario, email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()
    return user


def get_or_create_food_item(
    name: str,
    quantity: float,
    unit: str,
    calories: float,
    protein: float = 0,
    fat: float = 0,
    carbs: float = 0,
    sugar: float = 0,
    fiber: float = 0,
) -> FoodItem:
    item = db.session.execute(
        db.select(FoodItem).where(FoodItem.name == name)
    ).scalar_one_or_none()
    if item:
        return item
    item = FoodItem(
        name=name,
        quantity=quantity,
        unit=unit,
        calories=calories,
        protein=protein,
        fat=fat,
        carbs=carbs,
        sugar=sugar,
        fiber=fiber,
    )
    db.session.add(item)
    db.session.commit()
    return item


def seed():
    with app.app_context():
        # Usuario demo
        user = get_or_create_user("demo", "demo@example.com")

        # FoodItems básicos
        avena = get_or_create_food_item(
            "Avena con leche", 100, "g", calories=350, protein=12, fat=7, carbs=55, fiber=8
        )
        arroz_pollo = get_or_create_food_item(
            "Arroz con pollo", 200, "g", calories=420, protein=25, fat=10, carbs=55
        )
        yogur = get_or_create_food_item(
            "Yogur natural", 125, "g", calories=80, protein=5, fat=3, carbs=8
        )

        # Comidas para un día concreto
        today = date.today()

        def get_or_create_meal(user_id: int, d: date, order: int) -> Meal:
            meal = db.session.execute(
                db.select(Meal).where(
                    Meal.user_id == user_id,
                    Meal.date == d,
                    Meal.order == order,
                )
            ).scalar_one_or_none()
            if meal:
                return meal
            meal = Meal(user_id=user_id, date=d, order=order)
            db.session.add(meal)
            db.session.commit()
            return meal

        desayuno = get_or_create_meal(user.id, today, 1)
        comida = get_or_create_meal(user.id, today, 2)
        cena = get_or_create_meal(user.id, today, 3)

        def ensure_meal_food(meal: Meal, food_item: FoodItem, meals_number: int) -> None:
            existing = db.session.execute(
                db.select(MealFood).where(
                    MealFood.meal_id == meal.id,
                    MealFood.food_item_id == food_item.id,
                )
            ).scalar_one_or_none()
            if existing:
                return
            mf = MealFood(
                meal_id=meal.id,
                food_item_id=food_item.id,
                meals_number=meals_number,
            )
            db.session.add(mf)
            db.session.commit()

        ensure_meal_food(desayuno, avena, meals_number=1)
        ensure_meal_food(comida, arroz_pollo, meals_number=1)
        ensure_meal_food(cena, yogur, meals_number=1)

        # Dieta semanal sencilla reutilizando las meals del día actual
        plan = db.session.execute(
            db.select(DietPlan).where(DietPlan.user_id == user.id, DietPlan.name == "Plan semanal demo")
        ).scalar_one_or_none()
        if not plan:
            plan = DietPlan(user_id=user.id, name="Plan semanal demo")
            db.session.add(plan)
            db.session.commit()

        def ensure_plan_meal(p: DietPlan, d: WeekDay, meal: Meal, quantity: float) -> None:
            existing = db.session.execute(
                db.select(DietPlanMeal).where(
                    DietPlanMeal.diet_plan_id == p.id,
                    DietPlanMeal.meal_id == meal.id,
                    DietPlanMeal.day == d,
                )
            ).scalar_one_or_none()
            if existing:
                return
            dpm = DietPlanMeal(
                diet_plan_id=p.id,
                meal_id=meal.id,
                day=d,
                quantity=quantity,
            )
            db.session.add(dpm)
            db.session.commit()

        for weekday in WeekDay:
            ensure_plan_meal(plan, weekday, desayuno, 1.0)
            ensure_plan_meal(plan, weekday, comida, 1.0)
            ensure_plan_meal(plan, weekday, cena, 1.0)

        print("Datos de ejemplo insertados (o ya existentes) correctamente.")


if __name__ == "__main__":
    seed()

