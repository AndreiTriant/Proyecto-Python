from .auth import bp as auth_bp
from .diets import bp as diets_bp
from .meals import bp as meals_bp
from .ai import bp as ai_bp
from .tracking import bp as tracking_bp
from .progress import bp as progress_bp

__all__ = ["auth_bp", "diets_bp", "meals_bp", "ai_bp", "tracking_bp", "progress_bp"]
