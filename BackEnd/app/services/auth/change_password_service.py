from app.db.user_repository import get_user_by_id, update_user_password, verify_password_for_local_db, hash_password_for_local_db
import re

def change_password(user_id: str, current_password: str, new_password: str):
    # Validaciones de la nueva contraseña
    if len(new_password) < 8:
        return {"error": "La contraseña debe tener mínimo 8 caracteres"}
    if not re.search(r"[A-Z]", new_password):
        return {"error": "La contraseña debe tener al menos una letra mayúscula"}
    if not re.search(r"[0-9]", new_password):
        return {"error": "La contraseña debe tener al menos un número"}
    
    # Buscar usuario
    user = get_user_by_id(user_id)
    if not user:
        return {"error": "Usuario no encontrado"}
    
    # Verificar contraseña actual
    if not verify_password_for_local_db(current_password, user["password"]):
        return {"error": "Contraseña actual incorrecta"}
    
    # Verificar que la nueva sea diferente a la actual
    if verify_password_for_local_db(new_password, user["password"]):
        return {"error": "La nueva contraseña no puede ser igual a la actual"}
    
    # Actualizar contraseña
    hashed_new_password = hash_password_for_local_db(new_password)
    update_user_password(user_id, hashed_new_password)
    
    return {"message": "Contraseña cambiada con éxito"}