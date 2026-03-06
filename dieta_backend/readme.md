## 1. Verificar instalación de Python

Windows instala el Python Launcher (`py`), pero no siempre configura el comando `python`. Comprueba si Python está instalado ejecutando:

```powershell
py --version
```

Si este comando funciona pero `python --version` falla, continúa con los pasos siguientes.

## 2. Añadir Python al PATH

Abre: Panel de control → Sistema → Configuración avanzada del sistema → Variables de entorno
En Variables del sistema, selecciona `Path` y pulsa Editar
Añade estas carpetas (ajusta según tu usuario y versión):

```
C:\Users\<TU_USUARIO>\AppData\Local\Programs\Python\Python313\
C:\Users\<TU_USUARIO>\AppData\Local\Programs\Python\Python313\Scripts\
```

Guarda con Aceptar en todas las ventanas.

## 3. Desactivar el alias de Python del Microsoft Store

Abre Configuración → Aplicaciones → Configuración avanzada de aplicaciones → Alias de ejecución de aplicaciones
Desactiva: `python.exe` y `python3.exe`

## 4. Reiniciar PowerShell

Cierra todas las ventanas de PowerShell y abre una nueva sesión. Comprueba:

```powershell
python --version
```

## 5. Crear un entorno virtual

Dentro del directorio de tu proyecto ejecuta:

```powershell
python -m venv venv
```

Esto generará una carpeta llamada `venv/`.

## 6. Activar el entorno virtual

Dentro del directorio de tu proyecto ejecuta: venv\Scripts\activate

## 7. Instalar dependencias básicas
pip install flask openai python-dotenv

## 8. Crear requirements.txt
pip freeze > requirements.txt

